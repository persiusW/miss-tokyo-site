// A new WhatsApp message, once the pipeline has stored and deduplicated it.
// Text goes to Ask Miss Tokyo and the reply comes back as one WhatsApp text.
// Anything else (photos, voice notes, files, locations, buttons) goes to a
// person and the customer is told once that only text is read for now.
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
import type { HandoffReason } from "./handoff";
import type { Conversation, InboundMessage } from "./pipeline";
import { renderForWhatsApp, WA_LINES } from "./render";

export type AssistantDeps = {
    send: (to: string, text: string) => Promise<MessagingResult>;
    sendImage: (to: string, url: string, caption: string) => Promise<MessagingResult>;
    /** True only for the call that moved the chat to a person (it also forwards the chat to the team). */
    handOff: (conversationId: string, reason: HandoffReason) => Promise<boolean>;
    logOutbound: (conversationId: string, text: string, waMessageId: string | null, type?: string) => Promise<void>;
    chatFor: (c: Conversation, phone: string) => Promise<{ chat: ShopChat; customerId: string | null }>;
    counts: (chat: ShopChat) => Promise<{ lastMinute: number; today: number } | null>;
    perDay: number;
    run: (a: { chat: ShopChat; text: string; phone: string; customerId: string | null; conversationId: string }) => Promise<ShopRunResult>;
    siteUrl: string;
};

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

    return async (m: InboundMessage, c: Conversation): Promise<void> => {
        if (m.type !== "text") {
            const moved = await deps.handOff(c.id, "unsupported_message");
            if (moved && m.from) await reply(c, m.from, WA_LINES.textOnly);
            return;
        }
        if (!m.from) return;
        const text = cleanCustomerText(m.text ?? "") ?? cleanCustomerText((m.text ?? "").slice(0, 1000));
        if (!text) return;

        const { chat, customerId } = await deps.chatFor(c, m.from);
        const counts = await deps.counts(chat);
        if (!counts) return toPerson(c, m.from, "assistant_failed", WA_LINES.cantChat);
        if (visitorOver({ ...counts, perDay: deps.perDay })) return toPerson(c, m.from, "daily_limit", WA_LINES.limit);

        const result = await deps.run({ chat, text, phone: m.from, customerId, conversationId: c.id });
        const out = renderForWhatsApp(result.reply, result.buttons, deps.siteUrl);
        if (result.failed) return toPerson(c, m.from, "assistant_failed", out.text);
        if (out.wantsPerson) return toPerson(c, m.from, "customer_asked", out.text);
        if (!(await reply(c, m.from, out.text))) { await deps.handOff(c.id, "assistant_failed"); return; }
        // Photos after the answer. A photo that fails is only logged: the text already has the links.
        for (const img of out.images) {
            const r = await deps.sendImage(m.from, img.url, img.caption);
            if (r.ok) await deps.logOutbound(c.id, img.caption, r.messageId, "image");
            else console.error("[whatsapp] product photo not sent", { code: r.code });
        }
    };
}
