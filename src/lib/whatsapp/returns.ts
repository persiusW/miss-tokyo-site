// Returns and exchanges asked for in a WhatsApp chat. The assistant reads the
// policy, confirms the order, asks what is wrong and what the customer would
// like, then start_return saves the request and hands the chat to the team,
// who decide (the 72-hour window runs from delivery, which orders don't
// record, so it is theirs to judge). Pure.

export const RETURN_REASONS = ["wrong_size", "faulty", "not_as_described", "wrong_item", "changed_mind", "other"] as const;
export const RETURN_WANTS = ["exchange", "store_credit", "unsure"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];
export type ReturnWant = (typeof RETURN_WANTS)[number];
export const RETURN_DETAILS_MAX = 500;

const REASON_WORDS: Record<ReturnReason, string> = {
    wrong_size: "wrong size", faulty: "faulty or damaged", not_as_described: "not as described",
    wrong_item: "wrong item sent", changed_mind: "changed their mind", other: "other",
};
const WANT_WORDS: Record<ReturnWant, string> = { exchange: "an exchange", store_credit: "store credit", unsure: "not sure yet" };

/** Only a paid order that has reached the customer can be returned. */
export function returnable(r: { status: string; payment_status: string | null }): boolean {
    return r.payment_status === "paid" && ["fulfilled", "delivered"].includes(r.status);
}

/** One line for the team: the order, why, what they want, their words, and when the order last changed. */
export function returnSummary(a: { ref: string; reason: ReturnReason; wants: ReturnWant; details: string | null; lastUpdate: string | null }): string {
    const when = a.lastUpdate ? ` Order last updated ${a.lastUpdate.slice(0, 10)}.` : "";
    const said = a.details ? ` They said: "${a.details.replace(/\s+/g, " ").replace(/"/g, "'").slice(0, 200)}".` : "";
    return `Return request for order ${a.ref}: ${REASON_WORDS[a.reason]}; wants ${WANT_WORDS[a.wants]}.${said}${when}`;
}
