// What happens to a new WhatsApp message until the shop assistant answers on
// WhatsApp. Nothing here runs while whatsapp_enabled is off.
//
// - Anything but text (images, voice notes, locations, buttons...): the chat
//   goes to a person and the customer is told once.
// - Text: the chat goes to a person with no automatic reply, so switching the
//   channel on early never leaves a customer talking to silence unseen.
import type { MessagingResult } from "@/lib/messaging/provider";
import type { Conversation, InboundMessage } from "./pipeline";

export const UNSUPPORTED_TEXT = "Thanks! I can only read text messages right now. A member of our team will follow up here shortly.";

export type HandlerTools = {
    send: (to: string, text: string) => Promise<MessagingResult>;
    /** True only for the call that moved the chat to a person. */
    handOff: (conversationId: string, reason: string) => Promise<boolean>;
};

export function createInterimHandler(tools: HandlerTools) {
    return async (m: InboundMessage, c: Conversation): Promise<void> => {
        if (m.type !== "text") {
            const moved = await tools.handOff(c.id, "unsupported_message");
            if (moved && m.from) {
                const r = await tools.send(m.from, UNSUPPORTED_TEXT);
                if (!r.ok) console.error("[whatsapp] could not send the text-only note", { code: r.code });
            }
            return;
        }
        // The shop assistant on WhatsApp replaces this branch.
        await tools.handOff(c.id, "awaiting_assistant");
    };
}
