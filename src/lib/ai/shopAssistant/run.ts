// One Ask Miss Tokyo turn: cap check, model loop with customer tools, save,
// meter. The website route and (later) the WhatsApp webhook both call this.
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AI_MODEL } from "@/lib/ai/pricing";
import type { AiSettings } from "@/lib/ai/settings";
import { todaySpendUsd, withinCap } from "@/lib/ai/spend";
import { logCause } from "@/lib/errors/apiError";
import { runShopTurn } from "./engine";
import { SHOP_SYSTEM_PROMPT } from "./prompt";
import { CUSTOMER_TOOL_DEFS } from "./toolDefs";
import { runCustomerTool, type ShopToolContext } from "./tools";
import { mergeChatState, trimTranscript } from "./limits";
import { dedupeButtons, talkButton, waSummary } from "./format";
import { LINES } from "./lines";
import { settleQuote } from "./guards";
import { loadChat, saveChat, saveStateOnly } from "./store";
import type { ShopButton, ShopChannel, ShopChat, ShopIdentity } from "./types";

const RESERVE_USD = 0.08;

export type ShopRunResult = { reply: string; buttons: ShopButton[]; chat: ShopChat; failed: boolean };

export async function runShopAssistant(args: {
    channel: ShopChannel; identity: ShopIdentity; chat: ShopChat; text: string;
    settings: AiSettings; whatsappNumber: string | null;
}, deps: { client?: Pick<Anthropic, "messages"> } = {}): Promise<ShopRunResult> {
    const { chat, settings } = args;
    const talk = (notes: { topic: string | null; orderRef: string | null }) => {
        const b = talkButton(args.whatsappNumber, waSummary(notes));
        return b ? [b] : [];
    };
    const cant = (): ShopRunResult => ({ reply: LINES.cantChat, buttons: talk({ topic: null, orderRef: null }), chat, failed: false });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!settings.shop.enabled || !apiKey) return cant();
    const [spentToday, spentShop] = await Promise.all([todaySpendUsd(), todaySpendUsd("web")]);
    if (spentToday === null || spentShop === null) return cant();
    const shareCapGhs = settings.dailySpendCapGhs * settings.shop.capSharePct / 100;
    const fits = (runningUsd: number) =>
        withinCap({ capGhs: settings.dailySpendCapGhs, spentTodayUsd: spentToday, runningUsd, reserveUsd: RESERVE_USD }) &&
        withinCap({ capGhs: shareCapGhs, spentTodayUsd: spentShop, runningUsd, reserveUsd: RESERVE_USD });
    if (!fits(0)) return cant();

    const work: ShopChat = { ...chat, verifiedOrders: [...chat.verifiedOrders], openOrders: [...chat.openOrders], payLinks: { ...chat.payLinks } };
    const ctx: ShopToolContext = { chat: work, identity: args.identity, channel: args.channel, buttons: [], notes: { topic: null, orderRef: null }, whatsappNumber: args.whatsappNumber };
    const messages = trimTranscript([...chat.transcript, { role: "user", content: args.text }]);

    const result = await runShopTurn(
        { messages, system: SHOP_SYSTEM_PROMPT, tools: CUSTOMER_TOOL_DEFS, model: AI_MODEL },
        { client: deps.client ?? new Anthropic({ apiKey, maxRetries: 0 }), runTool: (n, i) => runCustomerTool(n, i, ctx), fits },
    );

    const u = result.usage;
    if (u.input + u.output + u.cacheRead + u.cacheWrite > 0 || u.toolCalls.length > 0) {
        // shop_chat_id is not in the generated Supabase types until the migration is applied.
        const { error } = await (supabaseAdmin as any).from("ai_turns").insert({
            channel: args.channel, shop_chat_id: chat.id, user_id: null, model: AI_MODEL,
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
        transcript: result.ok ? result.messages : chat.transcript,
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
        return { reply: LINES.busy, buttons: dedupeButtons([...ctx.buttons.filter(b => b.kind === "pay_now"), ...talk(ctx.notes)]), chat: merged, failed: false };
    }
    if (!result.ok) {
        logCause("SHOP-01", result.cause, { chat: chat.id.slice(0, 8) });
        return { reply: LINES.generic, buttons: dedupeButtons([...ctx.buttons.filter(b => b.kind === "pay_now"), ...talk(ctx.notes)]), chat: next, failed: true };
    }
    const wantsTalk = result.fixed || ctx.buttons.some(b => b.kind === "talk_to_us");
    const buttons = dedupeButtons(wantsTalk ? [...ctx.buttons.filter(b => b.kind !== "talk_to_us"), ...talk(ctx.notes)] : ctx.buttons);
    return { reply: result.reply, buttons, chat: { ...next, turns: chat.turns + 1 }, failed: false };
}
