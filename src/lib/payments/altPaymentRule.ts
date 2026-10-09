// When Miss Tokyo AI may suggest another way to pay (spec B Part 5). The tool
// decides with this; the prompt only explains the answer. Owner thresholds,
// 2026-10-09. Cash is deliberately not an option and cannot be expressed.

export const FAILURES_BEFORE_ALTERNATIVE = 2;
export const OUTAGE_ERRORS = 2;
export const OUTAGE_WINDOW_MINUTES = 10;

export type AltOption = "new_link" | "card_or_momo" | "gift_card_plus_link";
export type AltChannel = "pos" | "online" | "ai" | "pay_link" | "invoice";
export type AltResult = { allowed: boolean; reason: "REPEATED_FAILURES" | "OUTAGE" | null; options: AltOption[] };

export function altPayment(i: { owed: boolean; channel: AltChannel; failures: number; outageErrors: number }): AltResult {
    if (!i.owed) return { allowed: false, reason: null, options: [] };
    const reason = i.outageErrors >= OUTAGE_ERRORS ? "OUTAGE"
        : i.failures >= FAILURES_BEFORE_ALTERNATIVE ? "REPEATED_FAILURES"
        : null;
    if (!reason) return { allowed: false, reason: null, options: [] };
    const options: AltOption[] = ["new_link", "card_or_momo"];
    if (i.channel === "pos") options.push("gift_card_plus_link");
    return { allowed: true, reason, options };
}

/** Is money still owed, given a till session status or an order payment status? */
export function owedFrom(status: string | null | undefined): boolean {
    return status === "draft" || status === "pending_payment" || status === "pending" || status === "processing";
}
