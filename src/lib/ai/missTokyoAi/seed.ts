// "Ask Miss Tokyo AI" from a payment error toast: the browser sends a seed
// (a code and the sale it is about), never the toast's text. Pure checks;
// the agent route does the visibility and rate-limit checks.
import { ERRORS, isErrorCode, type ErrorCode } from "@/lib/errors/catalogue";

export const SEED_WINDOW_MINUTES = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Seed = { code: ErrorCode; posSessionId?: string; orderId?: string; saleKey?: string };

export function parseSeed(raw: unknown): Seed | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (!isErrorCode(r.code) || !(ERRORS[r.code] as { aiHelp?: boolean }).aiHelp) return null;
    const out: Seed = { code: r.code };
    for (const k of ["posSessionId", "orderId", "saleKey"] as const) {
        if (r[k] === undefined || r[k] === null) continue;
        if (typeof r[k] !== "string" || !UUID.test(r[k] as string)) return null;
        out[k] = (r[k] as string).toLowerCase();
    }
    if (!out.posSessionId && !out.orderId && !out.saleKey) return null;
    return out;
}

export function seedKey(s: Seed): string {
    return `${s.code}:${s.posSessionId ?? s.orderId ?? s.saleKey}`;
}

/** The server-written first line of a seeded chat, with the ids payment_help needs. */
export function seedLine(s: Seed, label: string): string {
    const ids = [
        s.posSessionId && `pos_session_id ${s.posSessionId}`,
        s.orderId && `order_ref ${s.orderId}`,
        s.saleKey && `sale_key ${s.saleKey}`,
    ].filter(Boolean).join(", ");
    return `[Payment problem: ${s.code} on ${label} — ${ids}]`;
}
