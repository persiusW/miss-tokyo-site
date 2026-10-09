// Pure rules for recorded payment attempts (spec B Part 4). "abandoned" is
// NOT final at Paystack — MoMo can still complete — so it is "unfinished" and
// never counts as a decline on its own.
export type AttemptStatus = "started" | "paid" | "failed" | "unfinished" | "error";
export const OUTAGE_WINDOW_MINUTES = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function statusFromPaystack(s: unknown): "paid" | "failed" | "unfinished" {
    if (s === "success") return "paid";
    if (s === "failed") return "failed";
    return "unfinished";
}

export function resultPatch(tx: { status?: unknown; log?: { errors?: unknown } | null }) {
    const errors = Number(tx.log?.errors);
    return {
        status: statusFromPaystack(tx.status),
        paystack_status: typeof tx.status === "string" ? tx.status : null,
        ...(Number.isInteger(errors) && errors > 0 ? { paystack_errors: errors } : {}),
    };
}

export function countFailures(rows: { status: string; paystack_errors: number; error_code: string | null }[]): number {
    let n = 0;
    for (const r of rows) {
        if (r.status === "error") { if (r.error_code === "PAY-02") n += 1; continue; }
        if (r.paystack_errors > 0) n += r.paystack_errors;
        else if (r.status === "failed") n += 1;
    }
    return n;
}

export function cleanSaleKey(v: unknown): string {
    return typeof v === "string" && UUID.test(v) ? v.toLowerCase() : crypto.randomUUID();
}

export function channelFor(source: string): "online" | "ai" | "pos" {
    if (source === "pos") return "pos";
    if (source === "dashboard") return "ai";
    return "online";
}
