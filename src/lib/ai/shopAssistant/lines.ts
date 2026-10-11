// Every fixed line a customer can see from Ask Miss Tokyo. Calm, no codes,
// never cash — tests/e2e/unit/shop-assistant.spec.ts checks each one.
import { looksRaw } from "@/lib/errors/looksRaw";
import { scrubReply } from "@/lib/ai/missTokyoAi/scrub";

export const LINES = {
    cantChat: "Ask Miss Tokyo can't chat right now. You can message us on WhatsApp instead.",
    generic: "Something happened. Please try again shortly.",
    wrongDetails: "I couldn't find an order with those details. Please check the number and the email or phone you used.",
    trackLocked: "I can't look up more orders in this chat. Please message us on WhatsApp and we'll help you.",
    payProblem: "Please try again, or pay another way.",
    openOrderWaiting: "You already have an order waiting for payment.",
    held: "Your items are held for 15 minutes.",
    busy: "Just a moment, I'm still answering your last message.",
    slowDown: "You're sending messages quickly. Please wait a minute and try again.",
    tooLong: "Please keep your message under 1000 characters.",
    empty: "Please type a question.",
    refresh: "Please refresh the page and try again.",
    slow: "I couldn't finish that one. Could you ask it a different way?",
    refusal: "I can't help with that one. You can message us on WhatsApp.",
    greeting: "Hi, I'm Ask Miss Tokyo. I can help you find a piece in your size, check delivery, track an order, or place one.",
} as const;

export const BUTTON_LABELS = {
    talk: "Talk to us on WhatsApp",
    pay: "Pay now",
    open: "View",
    add: "Add to bag",
} as const;

/** The model's text as a customer may see it: plain, short, nothing internal or technical. */
export function safeReply(text: string): string {
    const t = scrubReply(String(text ?? ""), 1200);
    if (!t || looksRaw(t)) return LINES.generic;
    return t;
}
