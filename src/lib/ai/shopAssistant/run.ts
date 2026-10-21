// One Ask Miss Tokyo turn: cap check, model loop with customer tools, save,
// meter. The website route and the WhatsApp pipeline both call this. Each
// channel has its own switch; both share the shop's slice of the daily cap.
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AI_MODEL } from "@/lib/ai/pricing";
import type { AiSettings } from "@/lib/ai/settings";
import { todaySpendUsd, withinCap } from "@/lib/ai/spend";
import { logCause } from "@/lib/errors/apiError";
import { runShopTurn } from "./engine";
import { systemPromptFor } from "./prompt";
import { CUSTOMER_TOOL_DEFS, NOTIFY_WHEN_BACK_TOOL, OFFER_CHOICES_TOOL, START_RETURN_TOOL, UPDATE_CART_TOOL } from "./toolDefs";
import { cartFact } from "./cartRules";
import { loadCart } from "./cartStore";
import type { ChoicePlan } from "@/lib/whatsapp/choices";
import { runCustomerTool, type ShopToolContext } from "./tools";
import { mergeChatState, photoAsNote, trimTranscript } from "./limits";
import { dropPastThinking } from "@/lib/ai/pastThinking";
import { dedupeButtons, talkButton, waSummary } from "./format";
import { LINES } from "./lines";
import { settleQuote } from "./guards";
import { loadChat, saveChat, saveStateOnly } from "./store";
import { activeLessonsText } from "@/lib/ai/teach/lessons";
import type { ShopButton, ShopChannel, ShopChat, ShopIdentity } from "./types";

const RESERVE_USD = 0.08;

/**
 * choices: WhatsApp only, a tappable question to send after the reply (the turn ended on it).
 * handoff: WhatsApp only, why the chat goes to a person when a tool decided it.
 */
export type ShopRunResult = { reply: string; buttons: ShopButton[]; chat: ShopChat; failed: boolean; choices?: ChoicePlan; handoff?: "return_request" };

export async function runShopAssistant(args: {
    channel: ShopChannel; identity: ShopIdentity; chat: ShopChat; text: string;
    settings: AiSettings; whatsappNumber: string | null;
    /** WhatsApp only: the whatsapp_conversations row, so the turn is metered against it. */
    waConversationId?: string | null;
    /** WhatsApp only: facts from our records for this turn (date, what we know about the number, gap). */
    facts?: string | null;
    /** WhatsApp only: a member of our team has the chat; the assistant answers what it can. */
    withTeam?: boolean;
    /** WhatsApp only: photos the customer sent with this message, read in this turn only. */
    images?: { data: string; mediaType: "image/jpeg" | "image/png" }[];
}, deps: { client?: Pick<Anthropic, "messages"> } = {}): Promise<ShopRunResult> {
    const { chat, settings } = args;
    const talk = (notes: { topic: string | null; orderRef: string | null }) => {
        const b = talkButton(args.whatsappNumber, waSummary(notes));
        return b ? [b] : [];
    };
    const cant = (): ShopRunResult => ({ reply: LINES.cantChat, buttons: talk({ topic: null, orderRef: null }), chat, failed: false });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const switchedOn = args.channel === "whatsapp" ? settings.whatsappEnabled : settings.shop.enabled;
    if (!switchedOn || !apiKey) return cant();
    // The shop chat and WhatsApp share one slice of the daily cap.
    const [spentToday, spentWeb, spentWa] = await Promise.all([todaySpendUsd(), todaySpendUsd("web"), todaySpendUsd("whatsapp")]);
    if (spentToday === null || spentWeb === null || spentWa === null) return cant();
    const spentShop = spentWeb + spentWa;
    const shareCapGhs = settings.dailySpendCapGhs * settings.shop.capSharePct / 100;
    const fits = (runningUsd: number) =>
        withinCap({ capGhs: settings.dailySpendCapGhs, spentTodayUsd: spentToday, runningUsd, reserveUsd: RESERVE_USD }) &&
        withinCap({ capGhs: shareCapGhs, spentTodayUsd: spentShop, runningUsd, reserveUsd: RESERVE_USD });
    if (!fits(0)) return cant();

    const work: ShopChat = { ...chat, verifiedOrders: [...chat.verifiedOrders], openOrders: [...chat.openOrders], payLinks: { ...chat.payLinks } };
    const ctx: ShopToolContext = {
        chat: work, identity: args.identity, channel: args.channel, buttons: [], notes: { topic: null, orderRef: null }, whatsappNumber: args.whatsappNumber,
        waConversationId: args.channel === "whatsapp" ? args.waConversationId ?? null : null,
    };
    // Stored thinking is signed against the prompt it was made with; earlier turns go without it.
    const messages = trimTranscript([...dropPastThinking(chat.transcript), { role: "user", content: args.text }]);
    if (args.images && args.images.length > 0) {
        const last = messages.length - 1;
        messages[last] = { role: "user", content: [
            ...args.images.map(i => ({ type: "image" as const, source: { type: "base64" as const, media_type: i.mediaType, data: i.data } })),
            { type: "text", text: args.text },
        ] };
    }

    const wa = args.channel === "whatsapp";
    const choices = wa && settings.whatsappChoices;
    const restock = wa && settings.whatsappRestockAlerts && !!ctx.waConversationId;
    const returns = wa && settings.whatsappReturns && !!ctx.waConversationId;
    const result = await runShopTurn(
        {
            messages, model: AI_MODEL,
            system: systemPromptFor(args.channel, args.identity.phone, { choices, restock, returns, withTeam: wa && !!args.withTeam }),
            lessons: await activeLessonsText(),
            // The basket rides in the facts every WhatsApp turn, so a long chat never loses it.
            facts: wa ? [args.facts, await loadCart(chat.visitorKey).then(cartFact).catch(() => null)].filter(Boolean).join("\n") : null,
            // Optional tools after the customer tools, so their cached prefix is unchanged.
            tools: [
                ...CUSTOMER_TOOL_DEFS, ...(choices ? [OFFER_CHOICES_TOOL] : []), ...(restock ? [NOTIFY_WHEN_BACK_TOOL] : []),
                ...(returns ? [START_RETURN_TOOL] : []),
                ...(wa ? [UPDATE_CART_TOOL] : []),
            ],
        },
        { client: deps.client ?? new Anthropic({ apiKey, maxRetries: 0 }), runTool: (n, i) => runCustomerTool(n, i, ctx), fits },
    );

    const u = result.usage;
    if (u.input + u.output + u.cacheRead + u.cacheWrite > 0 || u.toolCalls.length > 0) {
        // shop_chat_id is not in the generated Supabase types until the migration is applied.
        const { error } = await (supabaseAdmin as any).from("ai_turns").insert({
            channel: args.channel, shop_chat_id: chat.id, user_id: null, model: AI_MODEL,
            ...(args.channel === "whatsapp" && args.waConversationId ? { conversation_id: args.waConversationId } : {}),
            input_tokens: u.input, output_tokens: u.output, cache_read_tokens: u.cacheRead, cache_write_tokens: u.cacheWrite,
            cost_usd: parseFloat(u.costUsd.toFixed(6)), tool_calls: u.toolCalls,
        });
        if (error) console.error("[shop-assistant] could not log ai_turn", error.code);
    }

    // Orders, lockouts and verified refs are kept even when the reply failed;
    // the transcript only when the turn completed. A total quoted this turn
    // stands only if the customer saw it (the model's own reply, not a fixed line).
    const shown = result.ok && !result.fixed;
    const next: ShopChat = {
        ...work,
        lastQuote: settleQuote(chat.lastQuote, work.lastQuote, chat.turns, shown),
        transcript: result.ok ? photoAsNote(result.messages) : chat.transcript,
    };
    let saved = false;
    try { saved = await saveChat(next, chat.turns, result.ok); } catch (e) { logCause("SHOP-01", e, { chat: chat.id.slice(0, 8), step: "save" }); }
    if (!saved) {
        if (!result.ok) logCause("SHOP-01", result.cause, { chat: chat.id.slice(0, 8) });
        // The chat moved on under us. Keep what this turn did to orders (never lose a placed order), then ask to retry.
        let merged: ShopChat = next;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const latest = await loadChat(chat.id);
                if (!latest) break;
                merged = mergeChatState(latest, work);
                if (await saveStateOnly(merged, latest.turns)) break;
            } catch (e) { logCause("SHOP-01", e, { chat: chat.id.slice(0, 8), step: "merge" }); break; }
        }
        // On WhatsApp "talk to us" hands the chat to a person; a lost save is not a reason to.
        return { reply: LINES.busy, buttons: dedupeButtons([...ctx.buttons.filter(b => b.kind === "pay_now"), ...(wa ? [] : talk(ctx.notes))]), chat: merged, failed: false };
    }
    if (!result.ok) {
        logCause("SHOP-01", result.cause, { chat: chat.id.slice(0, 8) });
        return { reply: LINES.generic, buttons: dedupeButtons([...ctx.buttons.filter(b => b.kind === "pay_now"), ...talk(ctx.notes)]), chat: next, failed: true };
    }
    const wantsTalk = result.fixed || ctx.buttons.some(b => b.kind === "talk_to_us");
    const buttons = dedupeButtons(wantsTalk ? [...ctx.buttons.filter(b => b.kind !== "talk_to_us"), ...talk(ctx.notes)] : ctx.buttons);
    return {
        reply: result.reply, buttons, chat: { ...next, turns: chat.turns + 1 }, failed: false,
        ...(result.ended && ctx.choices ? { choices: ctx.choices } : {}),
        ...(ctx.handoff ? { handoff: ctx.handoff } : {}),
    };
}
