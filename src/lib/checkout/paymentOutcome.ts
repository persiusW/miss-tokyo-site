// What a returning shopper's payment came to, from /api/paystack/verify.
//
// Paystack sends every customer back to /checkout/success, paid or not. Only
// "success" is a sale. "failed" is a decline (nothing was charged).
// "abandoned" is NOT final: a MoMo approval can still complete after it, so it
// is treated like "ongoing" — not finished yet. The cart is cleared only once
// the outcome is "paid".

export type PaymentOutcome = "checking" | "paid" | "declined" | "unfinished" | "unknown";

export function outcomeFrom(data: unknown): PaymentOutcome {
    if (!data || typeof data !== "object") return "unknown";
    const d = data as { status?: unknown; paystackStatus?: unknown };
    if (d.status === "skipped") return "paid"; // no Paystack key: local/dev only
    const ps = typeof d.paystackStatus === "string" ? d.paystackStatus : null;
    if (ps === "success" || (!ps && d.status === "paid")) return "paid";
    if (ps === "failed") return "declined";
    if (ps) return "unfinished";
    return "unknown";
}
