// The assistant's basket on WhatsApp: what a customer collects across messages
// before checkout. Pure: merging, limits, freshness, and how it is shown to the
// model each turn.

export type CartLine = {
    product_id: string; name: string; sku: string | null;
    size: string | null; colour: string | null; brand: string | null; quantity: number;
};

/** Lines in one basket (the chat checkout's own limit). */
export const MAX_CART_LINES = 20;
/** Of one line. */
export const MAX_LINE_QTY = 20;
/** A basket untouched this long is treated as empty. */
export const CART_TTL_MS = 24 * 3600_000;

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/** Same piece in the same options. Options left out of `match` match any. */
export function sameLine(a: Pick<CartLine, "product_id" | "size" | "colour" | "brand">, match: { product_id: string; size?: string | null; colour?: string | null; brand?: string | null }): boolean {
    if (a.product_id !== match.product_id) return false;
    return (["size", "colour", "brand"] as const).every(k => match[k] == null || match[k] === "" || norm(a[k]) === norm(match[k]));
}

export type CartChange = { ok: true; lines: CartLine[] } | { ok: false; error: string };

export function addLine(lines: CartLine[], line: CartLine): CartChange {
    // The same piece in exactly the same options adds up; another option is another line.
    const i = lines.findIndex(l => l.product_id === line.product_id
        && norm(l.size) === norm(line.size) && norm(l.colour) === norm(line.colour) && norm(l.brand) === norm(line.brand));
    if (i >= 0) {
        const quantity = Math.min(MAX_LINE_QTY, lines[i].quantity + line.quantity);
        return { ok: true, lines: lines.map((l, j) => (j === i ? { ...l, quantity } : l)) };
    }
    if (lines.length >= MAX_CART_LINES) return { ok: false, error: `The basket holds at most ${MAX_CART_LINES} different pieces. Ask the customer to check out first, or to order the rest on the website.` };
    return { ok: true, lines: [...lines, { ...line, quantity: Math.min(MAX_LINE_QTY, Math.max(1, line.quantity)) }] };
}

/** Sets a line's quantity; 0 removes it. Matches the first line for that piece (and options, when given). */
export function setQuantity(lines: CartLine[], match: { product_id: string; size?: string | null; colour?: string | null; brand?: string | null }, quantity: number): CartChange {
    const i = lines.findIndex(l => sameLine(l, match));
    if (i < 0) return { ok: false, error: "That piece isn't in the basket. Show the basket to see what is." };
    if (quantity <= 0) return { ok: true, lines: lines.filter((_, j) => j !== i) };
    return { ok: true, lines: lines.map((l, j) => (j === i ? { ...l, quantity: Math.min(MAX_LINE_QTY, quantity) } : l)) };
}

export const isFresh = (updatedAt: string | null | undefined, now: number) => !!updatedAt && now - Date.parse(updatedAt) < CART_TTL_MS;

export function lineLabel(l: CartLine): string {
    const opts = [l.size ? `size ${l.size}` : null, l.colour, l.brand].filter(Boolean).join(", ");
    return `${l.quantity}× ${l.name}${l.sku ? ` (SKU ${l.sku})` : ""}${opts ? ` · ${opts}` : ""}`;
}

/** The basket line in the per-turn facts: the model sees it every turn, however long the chat. */
export function cartFact(lines: CartLine[]): string {
    if (lines.length === 0) return "- Their basket is empty.";
    return `- Their basket (from our records): ${lines.map(lineLabel).join("; ")}. Change it with update_cart; price and place it with from_cart true.`;
}
