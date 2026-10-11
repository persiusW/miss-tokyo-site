// Pure rules that protect money and privacy in the chat.
import type { QuoteStamp } from "./types";

export const QUOTE_TTL_MS = 10 * 60_000;
export const MAX_OPEN_ORDERS = 2;
export const TRACK_LOCK_AT = 5;

export type QuoteParts = {
    items: { product_id: string; size?: string | null; colour?: string | null; brand?: string | null; quantity: number }[];
    delivery_method: string | null;
    delivery_zone: string | null;
    discount_code: string | null;
};

const n = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** What the price depends on. Customer name, phone and address don't change it. */
export function quoteKey(q: QuoteParts): string {
    const items = q.items
        .map(i => [n(i.product_id), n(i.size), n(i.colour), n(i.brand), Number(i.quantity) || 0].join("|"))
        .sort();
    return JSON.stringify({ items, method: n(q.delivery_method), zone: n(q.delivery_zone), code: n(q.discount_code) });
}

export function quoteHolds(last: QuoteStamp | null, key: string, now: number, currentTurn: number): boolean {
    // The total must have been quoted in an earlier customer message than this one.
    return !!last && last.turn < currentTurn && last.key === key && now >= last.at && now - last.at <= QUOTE_TTL_MS;
}

/** The stamp price_order saves. Re-checking an unchanged, fresh total keeps the original turn so the customer's earlier yes still counts. */
export function stampQuote(last: QuoteStamp | null, key: string, total: number, now: number, turn: number): QuoteStamp {
    if (last && last.key === key && sameTotal(last.total, total) && now >= last.at && now - last.at <= QUOTE_TTL_MS) {
        return { ...last, at: now };
    }
    return { key, total, at: now, turn };
}

export const sameTotal = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100);
export const canOpenAnother = (openCount: number) => openCount < MAX_OPEN_ORDERS;
export const trackLocked = (wrongTries: number) => wrongTries >= TRACK_LOCK_AT;
