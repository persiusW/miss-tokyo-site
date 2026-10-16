// Tappable choices for the WhatsApp assistant. Pure.
//
// Up to 3 short options go as reply buttons (WhatsApp's limit, 20 characters
// each), up to 10 as a list (24 characters each). Chatbots Africa does not
// return our button ids on a tap (live, 2026-10-15: its own number, the
// title, and context.id naming the tapped message), so a tap is matched by
// its title against the options we logged for that message. Titles must be
// unique, and never hold "|", which separates them in the log.
import type { ListMessage, QuickReply } from "@/lib/messaging/provider";

export const MAX_BUTTONS = 3;
export const BUTTON_TITLE_MAX = 20;
export const MAX_ROWS = 10;
export const ROW_TITLE_MAX = 24;
export const QUESTION_MAX = 1000;
export const LIST_BUTTON_LABEL = "Choose";
export const LIST_SECTION_TITLE = "Options";
/** Chatbots Africa answers 500 to a quick reply without a caption (live probe, 2026-10-15). */
export const BUTTON_CAPTION = "Tap a button to reply";

export type ChoicePlan = { kind: "buttons" | "list"; question: string; options: string[] };

const clean = (s: unknown): string => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

/** The question and options the model gave → buttons, a list, or an error it can fix. */
export function planChoices(question: unknown, options: unknown): ChoicePlan | { error: string } {
    const q = typeof question === "string" ? question.trim() : "";
    if (!q) return { error: "Give the question to ask." };
    if (q.length > QUESTION_MAX) return { error: `Keep the question under ${QUESTION_MAX} characters.` };
    if (!Array.isArray(options)) return { error: "Give the options as a list." };
    const titles = options.map(clean).filter(Boolean);
    if (titles.length < 2) return { error: "Give at least two options." };
    if (titles.length > MAX_ROWS) return { error: `Give at most ${MAX_ROWS} options; ask a narrower question first.` };
    if (new Set(titles.map(t => t.toLowerCase())).size !== titles.length) return { error: "Each option must be different." };
    if (titles.some(t => t.includes("|"))) return { error: 'Don\'t use "|" in an option.' };
    if (titles.some(t => t.length > ROW_TITLE_MAX)) {
        return { error: `Keep each option to ${ROW_TITLE_MAX} characters or fewer (shorten it, e.g. "Medium", "Lindsy Bodycon, red").` };
    }
    const kind = titles.length <= MAX_BUTTONS && titles.every(t => t.length <= BUTTON_TITLE_MAX) ? "buttons" : "list";
    return { kind, question: q, options: titles };
}

/** How an offer is logged and kept in the transcript: the question, then the options (titles only). */
export function offeredText(plan: Pick<ChoicePlan, "question" | "options">): string {
    return `${plan.question}\n[options: ${plan.options.join(" | ")}]`;
}

/** The options of a logged offer; [] when the text is not one. */
export function optionsFrom(logged: string | null | undefined): string[] {
    const m = String(logged ?? "").match(/\n\[options: ([^\]\n]*)\]$/);
    return m ? m[1].split(" | ").map(s => s.trim()).filter(Boolean) : [];
}

/** The same options as numbered text, when interactive messages can't be sent. */
export function numberedText(plan: Pick<ChoicePlan, "question" | "options">): string {
    return `${plan.question}\n${plan.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
}

/**
 * A tap as the model reads it: "[tapped: Medium]" when the title is exactly
 * one of the options we offered on that message; otherwise the title as if
 * typed, since it can't be tied to an offer.
 */
export function tapText(title: string, offered: string[]): string {
    return offered.filter(o => o === title).length === 1 ? `[tapped: ${title}]` : title;
}

/** The provider message for a plan. List row ids are positional; Chatbots Africa may not return them, so taps match by title. */
export function providerMessage(plan: ChoicePlan): { kind: "buttons"; message: QuickReply } | { kind: "list"; message: ListMessage } {
    if (plan.kind === "buttons") return { kind: "buttons", message: { text: plan.question, caption: BUTTON_CAPTION, options: plan.options } };
    return {
        kind: "list",
        message: {
            body: plan.question,
            button: LIST_BUTTON_LABEL,
            sections: [{ title: LIST_SECTION_TITLE, rows: plan.options.map((title, i) => ({ id: `choice:${i + 1}`, title })) }],
        },
    };
}
