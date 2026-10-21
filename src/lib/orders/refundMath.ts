// Refund and partial-fulfilment arithmetic for one order. Pure: no database,
// no network, so the refund endpoint, the order panel and the unit tests all
// run the same rules.
//
// The limits never move: a refund can't be more than what the order was
// charged minus what has been refunded already, and a line can't give back
// more units than it had (less what earlier refunds took). Amounts are kept to
// the pesewa.

export type OrderLine = {
    /** Position in orders.items. Refunds and fulfilments key lines by it. */
    index: number;
    productId: string | null;
    variantId: string | null;
    name: string;
    /** "M · Black · Tonal", whatever the line carries. */
    variant: string;
    quantity: number;
    /** Unit price as charged on the line. */
    price: number;
    image: string | null;
    preorder: boolean;
};

const num = (v: unknown, d = 0): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
};
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Pesewa rounding, so 0.1 + 0.2 never shows as an amount staff can't type. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const CENT = 0.005;

/** orders.items as typed lines. Anything that isn't an object is skipped, never guessed. */
export function orderLines(items: unknown): OrderLine[] {
    if (!Array.isArray(items)) return [];
    const out: OrderLine[] = [];
    items.forEach((raw, index) => {
        if (!raw || typeof raw !== "object") return;
        const i = raw as Record<string, unknown>;
        out.push({
            index,
            productId: str(i.productId) || str(i.product_id) || null,
            variantId: str(i.variantId) || str(i.variant_id) || null,
            name: str(i.name) || "Item",
            variant: [str(i.size), str(i.color), str(i.brand)].filter(Boolean).join(" · "),
            quantity: Math.max(1, Math.floor(num(i.quantity, 1))),
            price: num(i.price),
            image: str(i.imageUrl) || str(i.image_url) || null,
            preorder: i.isPreOrder === true || i.is_preorder === true,
        });
    });
    return out;
}

export type RefundItem = { index: number; quantity: number };
export type RefundRow = {
    amount_ghs: number | string;
    items?: unknown;
    restock?: boolean | null;
    status: string;
};

/** Refunds that count: everything except the ones Paystack reported as failed. */
export const liveRefunds = <T extends RefundRow>(rows: T[]): T[] => rows.filter(r => r.status !== "failed");

export function refundedSoFar(rows: RefundRow[]): number {
    return round2(liveRefunds(rows).reduce((s, r) => s + num(r.amount_ghs), 0));
}

/** What can still be refunded: the order total less live refunds, never below zero. */
export function refundable(total: number | string | null | undefined, rows: RefundRow[]): number {
    return round2(Math.max(0, num(total) - refundedSoFar(rows)));
}

function refundItems(r: RefundRow): RefundItem[] {
    if (!Array.isArray(r.items)) return [];
    return r.items
        .map(x => (x && typeof x === "object" ? x as Record<string, unknown> : null))
        .filter((x): x is Record<string, unknown> => !!x)
        .map(x => ({ index: Math.floor(num(x.index, -1)), quantity: Math.max(0, Math.floor(num(x.quantity))) }))
        .filter(x => x.index >= 0 && x.quantity > 0);
}

/** Units already refunded per line, optionally only those put back (or not put back) in stock. */
export function refundedUnits(rows: RefundRow[], restock?: boolean): Map<number, number> {
    const m = new Map<number, number>();
    for (const r of liveRefunds(rows)) {
        if (restock !== undefined && !!r.restock !== restock) continue;
        for (const it of refundItems(r)) m.set(it.index, (m.get(it.index) ?? 0) + it.quantity);
    }
    return m;
}

export const REFUND_REASONS = [
    "Customer changed their mind",
    "Wrong size",
    "Item faulty or damaged",
    "Item never arrived",
    "Other",
] as const;

export type RefundMode = "full" | "items" | "amount";

export type RefundAsk = {
    mode: RefundMode;
    /** Only read for mode "amount". */
    amount?: number | string | null;
    /** Only read for mode "items". */
    items?: RefundItem[] | null;
};

export type RefundPlan =
    | { ok: true; amount: number; items: RefundItem[]; fully: boolean; left: number }
    | { ok: false; error: string };

/**
 * What a refund request would actually do, or why it can't.
 * "full" takes every unit not refunded yet and everything left to refund.
 * "items" values the chosen units at their line price, capped at what's left.
 * "amount" is a sum of money with no items (delivery, a goodwill amount…).
 */
export function planRefund(total: number | string | null | undefined, lines: OrderLine[], rows: RefundRow[], ask: RefundAsk): RefundPlan {
    const left = refundable(total, rows);
    if (left <= 0) return { ok: false, error: "This order has nothing left to refund." };
    const done = refundedUnits(rows);
    const remaining = (l: OrderLine) => Math.max(0, l.quantity - (done.get(l.index) ?? 0));

    if (ask.mode === "full") {
        const items = lines.map(l => ({ index: l.index, quantity: remaining(l) })).filter(i => i.quantity > 0);
        return { ok: true, amount: left, items, fully: true, left };
    }

    if (ask.mode === "items") {
        const want = (ask.items ?? []).filter(i => i && Number(i.quantity) > 0);
        if (!want.length) return { ok: false, error: "Choose at least one item to refund." };
        const seen = new Set<number>();
        let value = 0;
        const items: RefundItem[] = [];
        for (const w of want) {
            const line = lines.find(l => l.index === Number(w.index));
            const q = Math.floor(Number(w.quantity));
            if (!line || seen.has(line.index) || !Number.isFinite(q) || q < 1) return { ok: false, error: "One of those items isn't on this order. Please refresh." };
            if (q > remaining(line)) return { ok: false, error: `Only ${remaining(line)} of ${line.name} can still be refunded.` };
            seen.add(line.index);
            value += line.price * q;
            items.push({ index: line.index, quantity: q });
        }
        const amount = round2(Math.min(value, left));
        if (amount <= 0) return { ok: false, error: "Those items have no price to refund. Refund an amount instead." };
        return { ok: true, amount, items, fully: left - amount <= CENT, left };
    }

    const amount = round2(num(ask.amount, NaN));
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter the amount to refund." };
    if (amount - left > CENT) return { ok: false, error: `You can refund up to GH₵ ${left.toFixed(2)} on this order.` };
    return { ok: true, amount: Math.min(amount, left), items: [], fully: left - amount <= CENT, left };
}

/**
 * The order lines as reconcileOrderStock should see them once refunds exist,
 * so a later status change never undoes a restock or brings back units that
 * were written off.
 *
 * While the order holds stock, each line holds its quantity less the units
 * refunded back into stock. Once it doesn't (cancelled, fully refunded), it
 * still holds the units refunded WITHOUT a restock: those are gone (damaged,
 * kept by the customer), so they never come back on sale. With no refunds
 * this returns the lines unchanged and the caller keeps today's behaviour.
 */
export function stockTarget<T extends { quantity?: number }>(items: T[], rows: RefundRow[], holding: boolean): { items: T[]; hold: boolean } {
    if (!liveRefunds(rows).length) return { items, hold: holding };
    const back = refundedUnits(rows, true);
    const gone = refundedUnits(rows, false);
    const out = items.map((it, index) => {
        const q = Math.max(1, Math.floor(num(it?.quantity, 1)));
        const keep = holding ? Math.max(0, q - (back.get(index) ?? 0)) : Math.min(q, gone.get(index) ?? 0);
        return { ...it, quantity: keep };
    });
    // A target of all zeros is the same as "hold nothing"; say so plainly so the
    // ledger function writes reversals, exactly as it did before refunds existed.
    const any = out.some(i => (i.quantity ?? 0) > 0);
    return { items: out, hold: any };
}

// ── Partial fulfilment ───────────────────────────────────────────────────────

export type FulfilmentRow = { items?: unknown; created_at?: string | null };

/** Units packed so far per line, across every parcel. */
export function packedUnits(rows: FulfilmentRow[]): Map<number, number> {
    const m = new Map<number, number>();
    for (const r of rows) {
        for (const it of refundItems({ amount_ghs: 0, items: r.items, status: "x" })) m.set(it.index, (m.get(it.index) ?? 0) + it.quantity);
    }
    return m;
}

/** Units still to pack per line (never below zero). */
export function unpackedUnits(lines: OrderLine[], rows: FulfilmentRow[]): Map<number, number> {
    const done = packedUnits(rows);
    return new Map(lines.map(l => [l.index, Math.max(0, l.quantity - (done.get(l.index) ?? 0))]));
}

export type PackPlan =
    | { ok: true; items: RefundItem[]; completes: boolean; units: number; left: number }
    | { ok: false; error: string };

/** A parcel: the units going in now, and whether it finishes the order. */
export function planPack(lines: OrderLine[], rows: FulfilmentRow[], ask: RefundItem[]): PackPlan {
    const todo = unpackedUnits(lines, rows);
    const items: RefundItem[] = [];
    const seen = new Set<number>();
    for (const a of ask) {
        const q = Math.floor(Number(a?.quantity));
        if (!Number.isFinite(q) || q <= 0) continue;
        const idx = Number(a.index);
        if (!todo.has(idx) || seen.has(idx)) return { ok: false, error: "One of those items isn't on this order. Please refresh." };
        if (q > (todo.get(idx) ?? 0)) return { ok: false, error: "That's more than is left to pack. Please refresh." };
        seen.add(idx);
        items.push({ index: idx, quantity: q });
    }
    const units = items.reduce((s, i) => s + i.quantity, 0);
    if (!units) return { ok: false, error: "Choose at least one item to pack." };
    const totalLeft = [...todo.values()].reduce((s, n) => s + n, 0);
    return { ok: true, items, completes: units === totalLeft, units, left: totalLeft - units };
}
