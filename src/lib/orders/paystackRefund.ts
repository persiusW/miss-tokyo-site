// The one call that sends money back through Paystack (POST /refund).
//
// No database and no imports with side effects: the secret and fetch are
// passed in, so the unit tests drive it with a fake fetch and the live API is
// never touched while testing. Never throws; every outcome is a value.
//
// Paystack takes the transaction reference and an amount in pesewas, and
// answers with the refund's id and status ("pending" or "processed"). A
// pending refund is settled later by the refund.processed / refund.failed
// webhook events.

export type PaystackRefundResult =
    | { ok: true; refundRef: string | null; status: "pending" | "processed" }
    | { ok: false; reason: "unreachable" | "rejected" | "not_configured"; detail: string };

export async function createPaystackRefund(
    a: { reference: string; amountGhs: number; note?: string | null },
    deps: { secret: string | null | undefined; fetchImpl?: typeof fetch },
): Promise<PaystackRefundResult> {
    if (!deps.secret) return { ok: false, reason: "not_configured", detail: "no secret key" };
    const amount = Math.round(a.amountGhs * 100);
    if (!a.reference || !Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "rejected", detail: "bad request" };
    const f = deps.fetchImpl ?? fetch;
    let res: Response;
    try {
        res = await f("https://api.paystack.co/refund", {
            method: "POST",
            headers: { Authorization: `Bearer ${deps.secret}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                transaction: a.reference,
                amount,
                currency: "GHS",
                ...(a.note ? { merchant_note: a.note.slice(0, 200) } : {}),
            }),
        });
    } catch (e) {
        return { ok: false, reason: "unreachable", detail: String(e).slice(0, 200) };
    }
    let body: { status?: boolean; message?: string; data?: { id?: number | string; status?: string } } | null = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok || !body?.status) {
        // 5xx is Paystack being down; anything else is Paystack saying no.
        return { ok: false, reason: res.status >= 500 ? "unreachable" : "rejected", detail: String(body?.message ?? res.status).slice(0, 200) };
    }
    const st = String(body.data?.status ?? "").toLowerCase();
    return {
        ok: true,
        refundRef: body.data?.id != null ? String(body.data.id) : null,
        status: st === "processed" ? "processed" : "pending",
    };
}

/** What a refund.* webhook says about one refund, or null when it isn't one. */
export function refundEventOf(event: unknown): { status: "processed" | "failed" | "pending"; refundRef: string | null; reference: string | null; amountGhs: number | null } | null {
    if (!event || typeof event !== "object") return null;
    const e = event as { event?: unknown; data?: Record<string, unknown> };
    const kind = typeof e.event === "string" ? e.event : "";
    const status = kind === "refund.processed" ? "processed" : kind === "refund.failed" ? "failed" : kind === "refund.pending" ? "pending" : null;
    if (!status) return null;
    const d = e.data ?? {};
    const tx = d.transaction && typeof d.transaction === "object" ? d.transaction as Record<string, unknown> : null;
    const reference = typeof d.transaction_reference === "string" ? d.transaction_reference
        : typeof tx?.reference === "string" ? tx.reference : null;
    const id = d.id ?? d.refund_id ?? null;
    const amount = Number(d.amount);
    return {
        status,
        refundRef: id != null && id !== "" ? String(id) : null,
        reference,
        amountGhs: Number.isFinite(amount) ? amount / 100 : null,
    };
}
