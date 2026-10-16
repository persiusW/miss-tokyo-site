// A new WhatsApp message, once the pipeline has stored and deduplicated it.
// Text, photos and taps on our own buttons go to Ask Miss Tokyo and the reply
// comes back as one WhatsApp text (or a tappable question, ending the turn).
// Anything else (voice notes, files, locations) goes to a person and the
// customer is told once that only text is read for now.
//
// A person takes the chat when the customer asks for one (the assistant's
// "talk to us"), when the assistant fails, or at the daily limit. The bot then
// stays quiet in that chat until staff hand it back from the inbox.
//
// A reply that could not be sent is not retried (that would run the model
// again): the chat goes to a person instead, so the message is never ignored.
import { cleanCustomerText, visitorOver } from "@/lib/ai/shopAssistant/limits";
import type { ShopRunResult } from "@/lib/ai/shopAssistant/run";
import type { ShopChat } from "@/lib/ai/shopAssistant/types";
import type { MessagingResult } from "@/lib/messaging/provider";
import { WA_LIMITS } from "@/lib/messaging/chatbotsAfrica";
import { numberedText, offeredText, tapText, type ChoicePlan } from "./choices";
import type { ModelPhoto } from "./photo";
import type { HandoffReason } from "./handoff";
import type { Conversation, InboundMessage } from "./pipeline";
import { renderForWhatsApp, WA_LINES, type WhatsAppReply } from "./render";

export type AssistantDeps = {
    send: (to: string, text: string) => Promise<MessagingResult>;
    sendImage: (to: string, url: string, caption: string) => Promise<MessagingResult>;
    /** A tappable question: reply buttons or a list. */
    sendChoices: (to: string, plan: ChoicePlan) => Promise<MessagingResult>;
    /** The options we offered on one of our messages in this conversation; [] when it wasn't an offer. */
    offered: (conversationId: string, waMessageId: string) => Promise<string[]>;
    /** True only for the call that moved the chat to a person (it also forwards the chat to the team). */
    handOff: (conversationId: string, reason: HandoffReason) => Promise<boolean>;
    logOutbound: (conversationId: string, text: string, waMessageId: string | null, type?: string) => Promise<void>;
    chatFor: (c: Conversation, phone: string) => Promise<{ chat: ShopChat; customerId: string | null }>;
    /** Order updates off (STOP) or back on (START) for this conversation. */
    setOptOut: (conversationId: string, optedOut: boolean) => Promise<void>;
    /** What a quoted message said, from our own records for this conversation. */
    quoted: (conversationId: string, waMessageId: string) => Promise<string | null>;
    counts: (chat: ShopChat) => Promise<{ lastMinute: number; today: number } | null>;
    perDay: number;
    run: (a: { chat: ShopChat; text: string; phone: string; customerId: string | null; conversationId: string; image?: ModelPhoto | null }) => Promise<ShopRunResult>;
    /** A customer's photo, ready for the model; null when it can't be fetched or isn't an image. */
    fetchPhoto: (mediaId: string) => Promise<ModelPhoto | null>;
    siteUrl: string;
};

/**
 * "[tapped: …]" and "[Replying to: …]" are written by us and trusted by the
 * model, so customer text never carries them. Stripped until stable: removing
 * one can join the text around it into another.
 */
export function stripOurMarkers(text: string): string {
    let out = text;
    for (;;) {
        const next = out.replace(/\[\s*(tapped|replying\s+to)\s*:[^\]]*(\]|$)/gi, "");
        if (next === out) return out.trim();
        out = next;
    }
}

export function createWhatsAppHandler(deps: AssistantDeps) {
    async function reply(c: Conversation, to: string, text: string): Promise<boolean> {
        const r = await deps.send(to, text);
        if (r.ok) await deps.logOutbound(c.id, text, r.messageId);
        else console.error("[whatsapp] reply not sent", { code: r.code });
        return r.ok;
    }

    async function toPerson(c: Conversation, to: string, reason: HandoffReason, said: string | null): Promise<void> {
        const moved = await deps.handOff(c.id, reason);
        const text = [said, moved ? WA_LINES.handedOff : null].filter(Boolean).join("\n\n");
        if (text) await reply(c, to, text);
    }

    // Product photos after a reply. A photo that fails is only logged: the text already has the links.
    async function sendImages(c: Conversation, to: string, out: WhatsAppReply): Promise<void> {
        for (const img of out.images) {
            const r = await deps.sendImage(to, img.url, img.caption);
            if (r.ok) await deps.logOutbound(c.id, img.caption, r.messageId, "image");
            else console.error("[whatsapp] product photo not sent", { code: r.code });
        }
    }

    // The reply and photos first, the question last, so it is the message to tap.
    // One message when it fits; buttons that won't send go as numbered text.
    async function ask(c: Conversation, to: string, out: WhatsAppReply, plan: ChoicePlan): Promise<void> {
        const joined = out.text ? `${out.text}\n\n${plan.question}` : plan.question;
        const together = out.images.length === 0 && joined.length <= WA_LIMITS.interactiveBody;
        if (!together) {
            if (out.text && !(await reply(c, to, out.text))) { await deps.handOff(c.id, "assistant_failed"); return; }
            await sendImages(c, to, out);
        }
        const q: ChoicePlan = together ? { ...plan, question: joined } : plan;
        const r = await deps.sendChoices(to, q);
        if (r.ok) { await deps.logOutbound(c.id, offeredText(q), r.messageId, "interactive"); return; }
        console.error("[whatsapp] choices not sent", { kind: q.kind, code: r.code });
        if (!(await reply(c, to, numberedText(q)))) await deps.handOff(c.id, "assistant_failed");
    }

    async function notReadable(c: Conversation, m: InboundMessage): Promise<void> {
        const moved = await deps.handOff(c.id, "unsupported_message");
        if (moved && m.from) await reply(c, m.from, WA_LINES.textOnly);
    }

    return async (m: InboundMessage, c: Conversation): Promise<void> => {
        // Photos are read (a screenshot's SKU, or the style and colour); voice notes, files and the rest go to a person.
        let photo: ModelPhoto | null = null;
        let tapped: string | null = null;   // "[tapped: …]": an option we offered, so ours
        let typed = m.text ?? "";
        if (m.type === "interactive" && m.tap) {
            // A tap answers the question it was tapped on; any other title reads as if typed.
            const offered = m.replyTo ? await deps.offered(c.id, m.replyTo).catch(() => []) : [];
            const t = tapText(m.tap.title, offered);
            if (t === m.tap.title) typed = m.tap.title; else tapped = t;
        } else if (m.type === "image") {
            photo = m.mediaId ? await deps.fetchPhoto(m.mediaId).catch(() => null) : null;
            if (!photo) return notReadable(c, m);
        } else if (m.type !== "text") {
            return notReadable(c, m);
        }
        if (!m.from) return;
        const raw = tapped ?? stripOurMarkers(typed);
        const caption = cleanCustomerText(raw) ?? cleanCustomerText(raw.slice(0, 1000)) ?? "";
        if (!caption && !photo) return;
        // STOP / START: order updates off or on, answered without the assistant.
        if (!photo && !m.tap && /^\s*(stop|unsubscribe)\s*[.!]?\s*$/i.test(caption)) {
            await deps.setOptOut(c.id, true);
            await reply(c, m.from, WA_LINES.stopped);
            return;
        }
        if (!photo && !m.tap && /^\s*(start|subscribe)\s*[.!]?\s*$/i.test(caption)) {
            await deps.setOptOut(c.id, false);
            await reply(c, m.from, WA_LINES.started);
            return;
        }
        const text = caption || "(The customer sent this photo.)";

        // The quote comes from our records, never from the customer, so the model may trust it.
        // A tap's context is the question it answers, already in the chat; it is not a quote.
        const quote = m.replyTo && !m.tap ? await deps.quoted(c.id, m.replyTo).catch(() => null) : null;
        const said = quote ? `[Replying to: "${quote}"]\n${text}` : text;

        const { chat, customerId } = await deps.chatFor(c, m.from);
        const counts = await deps.counts(chat);
        if (!counts) return toPerson(c, m.from, "assistant_failed", WA_LINES.cantChat);
        if (visitorOver({ ...counts, perDay: deps.perDay })) return toPerson(c, m.from, "daily_limit", WA_LINES.limit);

        const result = await deps.run({ chat, text: said, phone: m.from, customerId, conversationId: c.id, image: photo });
        const out = renderForWhatsApp(result.reply, result.buttons, deps.siteUrl);
        if (result.failed) return toPerson(c, m.from, "assistant_failed", out.text);
        if (out.wantsPerson) return toPerson(c, m.from, "customer_asked", out.text);
        if (result.choices) return ask(c, m.from, out, result.choices);
        if (!(await reply(c, m.from, out.text))) { await deps.handOff(c.id, "assistant_failed"); return; }
        await sendImages(c, m.from, out);
    };
}
