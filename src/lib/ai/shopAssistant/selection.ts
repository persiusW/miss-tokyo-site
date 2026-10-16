// What find_products may show. Pure: stock is already worked out.
//
// - Only pieces in stock are suggested.
// - A sold-out piece comes back only when the customer named it (by SKU, or a
//   name that matches just a few products), marked sold out, with whether it
//   takes pre-orders and up to 3 similar pieces in stock: same category,
//   nearest price, the asked-for colour first.
// - SKUs match however they are written: "SKU: D7", "d-07" and "D7" are one.

export type Shown = {
    product_id: string; name: string; price_ghs: number;
    options?: { size: string | null; colour: string | null; brand: string | null; stock: string }[];
    stock?: string;
    takes_preorders: boolean;
};
export type Candidate<T extends Shown> = { out: T; categories: string[] };

/** At most this many name matches still count as the customer naming a product. */
export const NAMED_MAX = 3;
export const SIMILAR_MAX = 3;
export const RESULTS_MAX = 6;

export function inStock(p: Shown): boolean {
    if (p.options) return p.options.some(o => o.stock !== "Sold out");
    return p.stock !== "Sold out";
}

/** "SKU: D-07" → "D7": letters, then the number without leading zeros. */
export function normaliseSku(raw: unknown): string | null {
    const s = String(raw ?? "").toUpperCase().replace(/^\s*SKU\s*[:#.\-]?\s*/, "").replace(/[^A-Z0-9]/g, "");
    const m = s.match(/^([A-Z]+)0*(\d+)$/);
    if (m) return `${m[1]}${m[2]}`;
    return s || null;
}

export function skuMatches(stored: unknown, asked: unknown): boolean {
    const a = normaliseSku(asked), b = normaliseSku(stored);
    return !!a && a === b;
}

/** The categories a product sits in: its category, its extra categories, and its type. */
export function categoriesOf(row: Record<string, unknown>): string[] {
    const out = new Set<string>();
    if (typeof row.category_id === "string" && row.category_id) out.add(row.category_id);
    if (Array.isArray(row.category_ids)) for (const c of row.category_ids) if (typeof c === "string" && c) out.add(c);
    if (typeof row.category_type === "string" && row.category_type.trim()) out.add(`type:${row.category_type.trim().toLowerCase()}`);
    return [...out];
}

const hasColour = (p: Shown, colour: string | null) =>
    !!colour && !!p.options?.some(o => o.stock !== "Sold out" && (o.colour ?? "").toLowerCase() === colour.toLowerCase());

/** Up to 3 pieces in stock like `target`: same category, nearest price, the asked-for colour first. */
export function similarTo<T extends Shown>(target: Candidate<T>, pool: Candidate<T>[], colour: string | null): T[] {
    return pool
        .filter(c => c.out.product_id !== target.out.product_id && inStock(c.out) && c.categories.some(k => target.categories.includes(k)))
        .sort((a, b) =>
            Number(hasColour(b.out, colour)) - Number(hasColour(a.out, colour))
            || Math.abs(a.out.price_ghs - target.out.price_ghs) - Math.abs(b.out.price_ghs - target.out.price_ghs))
        .slice(0, SIMILAR_MAX)
        .map(c => c.out);
}

export type Picked<T extends Shown> = {
    products: (T & { in_stock: boolean; similar_in_stock?: T[] })[];
    note?: string;
};

/**
 * `named`: the customer asked for these exact products (a SKU, or a name that
 * matched only a few). Otherwise this is browsing, and only stock is shown.
 */
export function pickResults<T extends Shown>(matches: Candidate<T>[], pool: Candidate<T>[], a: { named: boolean; colour: string | null }): Picked<T> {
    if (a.named) {
        const products = matches.slice(0, RESULTS_MAX).map(c => inStock(c.out)
            ? { ...c.out, in_stock: true }
            : { ...c.out, in_stock: false, similar_in_stock: similarTo(c, pool, a.colour) });
        return { products };
    }
    const available = matches.filter(c => inStock(c.out)).slice(0, RESULTS_MAX).map(c => ({ ...c.out, in_stock: true }));
    return available.length > 0 ? { products: available } : { products: [], note: "Nothing matching is in stock right now. Do not suggest sold-out pieces; offer to look at another style, size or colour." };
}

// ── Word search ─────────────────────────────────────────────────────────────
// Product text is thin (names and a type such as "Footwear"; few
// descriptions), so a search is split into words and each word matched on its
// own, singular: "red bodycon dresses" finds "Lindsy Bodycon" in "Dresses".

const STOP = new Set(["a", "an", "the", "and", "or", "for", "with", "in", "of", "to", "my", "me", "i", "some", "any", "do", "you", "have", "is", "it", "on", "at", "by"]);
export const MAX_WORDS = 5;

/** A word without its plural ending: "dresses" → "dress", "heels" → "heel". */
export function stem(w: string): string {
    if (w.length > 4 && /(ss|sh|ch|x)es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
    return w;
}

/** The words a search is matched on: lower case, no stop words, singular, at most MAX_WORDS. */
export function searchWords(query: string): string[] {
    const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 2 && !STOP.has(w)).map(stem);
    return [...new Set(words)].slice(0, MAX_WORDS);
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** How many of the words a product's name, type or brand contains. */
export function wordScore(row: { name?: unknown; category_type?: unknown; brand?: unknown }, words: string[]): number {
    const text = `${norm(row.name)} ${norm(row.category_type)} ${norm(row.brand)}`;
    return words.filter(w => text.includes(w)).length;
}

/** Products whose name holds the whole phrase: the customer naming them, when there are only a few. */
export function phraseMatches<T extends { name?: unknown }>(rows: T[], query: string): T[] {
    const q = norm(query);
    return q.length >= 2 ? rows.filter(r => norm(r.name).includes(q)) : [];
}
