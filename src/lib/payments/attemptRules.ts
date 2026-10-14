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

export type LiveState = "waiting" | "paid" | "settling" | "declined" | "expired";

/** What the till shows for a sent link. Settlement is the webhook's job; "settling" bridges the gap. */
export function liveState(i: { sessionStatus: string; expiresAt: string | null; attemptStatus: string | null; now: number }): LiveState {
    if (i.sessionStatus === "paid") return "paid";
    if (i.attemptStatus === "paid") return "settling";
    if (i.sessionStatus === "expired" || i.sessionStatus === "cancelled") return "expired";
    if (i.expiresAt && Date.parse(i.expiresAt) < i.now) return "expired";
    if (i.attemptStatus === "failed") return "declined";
    return "waiting";
}

/** "Paid, finishing up" waits for the webhook; after this long the till stops asking. */
export const SETTLING_POLL_LIMIT_MS = 2 * 60_000;

export function stopPolling(i: { state: string; httpStatus: number; settlingSince: number | null; now: number }): boolean {
    if (i.httpStatus === 401 || i.httpStatus === 403) return true;
    if (i.state === "paid" || i.state === "expired") return true;
    return i.state === "settling" && i.settlingSince !== null && i.now - i.settlingSince > SETTLING_POLL_LIMIT_MS;
}

/** A sale key whose sale already paid can't be reused: the next order is a new sale. */
export function saleKeyFor(requested: string, alreadyPaid: boolean): string {
    return alreadyPaid ? cleanSaleKey(undefined) : requested;
}

/**
 * When the server replaced the key, tell the caller: the checkout page keeps
 * its key in sessionStorage and would otherwise start a fresh sale every retry.
 */
export function withSaleKey<T extends { status: number; body: any }>(result: T, requested: string, used: string): T {
    if (used === requested || !result.body || typeof result.body !== "object") return result;
    return { ...result, body: { ...result.body, saleKey: used } };
}
