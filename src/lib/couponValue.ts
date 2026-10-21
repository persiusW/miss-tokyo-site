// What a discount code is worth against a real basket. Pure, no server imports,
// so the charge path (lib/discountValidation), the preview endpoint
// (/api/checkout/validate-code), the checkout page and the till all run this
// one function and cannot disagree.
//
// Two kinds of code:
//
//   Whole-cart codes: percentage, fixed and free_shipping with no category.
//     Exactly computeDiscountSplit against the amount the caller passes (the
//     goods after automatic discounts), as they always were. Every live code
//     was one of these when this module was written, and a unit test runs real
//     baskets through both paths to prove they still give the same figure.
//
//   Item codes: anything with a category, plus sale_price and buy_x_get_y.
//     Their worth depends on which items are in the basket, so they need the
//     basket's lines. They reach only lines no automatic discount covers (the
//     rule autoDiscount.ts states for codes), and only lines in the code's
//     category when it has one. They come off those items alone, never the
//     delivery fee, and never more than those items cost.
//
//     percentage   that percent of the qualifying items.
//     fixed        that amount, at most what the qualifying items cost.
//     sale_price   each qualifying item sells at the code's price: every unit
//                  priced above it comes down to it, units at or under it stay
//                  as they are. ("Sale Price" with a GH₵ value on the old form.)
//     buy_x_get_y  for every X + Y qualifying items in the basket, Y are free,
//                  and the free ones are the cheapest qualifying items. Buy 2
//                  get 1 with 7 items: 2 free, the 2 cheapest.
//
// A category on a free_shipping code is ignored (neither admin form lets one be
// set): it waives the delivery fee as before.

import { computeDiscountSplit, type DiscountSplit } from "./discountSplit";

export type CouponTerms = {
    discount_type: string;
    discount_value: number | string | null;
    /** The category the old page and the new panel both write. */
    category_id?: string | null;
    /** An older column for the same thing. Read when category_id is empty; saves keep the two equal. */
    target_category_id?: string | null;
    buy_quantity?: number | string | null;
    get_quantity?: number | string | null;
};

/** One basket line, priced the way the caller charges it. */
export type CodeLine = {
    productId: string;
    /** GHS per unit after sale and wholesale pricing, before any discount. */
    unitPrice: number;
    quantity: number;
    /** products.category_ids, the membership automatic discounts use too. */
    categoryIds?: readonly string[] | null;
    /** An automatic discount already covers this product. */
    covered?: boolean;
};

const ZERO: DiscountSplit = { amount: 0, subtotalAmount: 0, deliveryAmount: 0 };
const round = (n: number) => parseFloat(n.toFixed(2));
const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
const units = (q: unknown) => Math.max(0, Math.floor(num(q)));

const ITEM_TYPES = new Set(["sale_price", "buy_x_get_y"]);
const CATEGORY_TYPES = new Set(["percentage", "fixed", "sale_price", "buy_x_get_y"]);

/** The category a code is limited to, or null for the whole cart. */
export function couponCategoryId(t: CouponTerms): string | null {
    if (!CATEGORY_TYPES.has(t.discount_type)) return null;
    return t.category_id || t.target_category_id || null;
}

/** True when the code's worth depends on the basket's lines, not just its total. */
export function isItemCoupon(t: CouponTerms): boolean {
    return ITEM_TYPES.has(t.discount_type) || couponCategoryId(t) !== null;
}

/** Buy X get Y as whole numbers of 1 or more, or null when the code is incomplete. */
export function bxgyTerms(t: CouponTerms): { buy: number; get: number } | null {
    const buy = units(t.buy_quantity), get = units(t.get_quantity);
    return buy >= 1 && get >= 1 ? { buy, get } : null;
}

/** The lines an item code reaches: no automatic discount, in its category if it has one. */
export function qualifyingLines(t: CouponTerms, lines: readonly CodeLine[]): CodeLine[] {
    const cat = couponCategoryId(t);
    return lines.filter(l =>
        !l.covered
        && units(l.quantity) > 0
        && num(l.unitPrice) > 0
        && (!cat || (l.categoryIds ?? []).includes(cat)));
}

const linesTotal = (lines: readonly CodeLine[]) => lines.reduce((s, l) => s + num(l.unitPrice) * units(l.quantity), 0);

/** The value of the free items: floor(n / (X+Y)) × Y of the cheapest qualifying units. */
function bxgyFreeValue(lines: readonly CodeLine[], buy: number, get: number): number {
    const total = lines.reduce((s, l) => s + units(l.quantity), 0);
    let free = Math.floor(total / (buy + get)) * get;
    if (free <= 0) return 0;
    let value = 0;
    for (const l of [...lines].sort((a, b) => num(a.unitPrice) - num(b.unitPrice))) {
        const take = Math.min(free, units(l.quantity));
        value += take * num(l.unitPrice);
        free -= take;
        if (free === 0) break;
    }
    return value;
}

/**
 * The single rule for what a coupon is worth against a basket.
 *
 * `subtotal` is the goods after automatic discounts, exactly what the charge
 * path has always passed; whole-cart codes are split against it unchanged.
 * Item codes are also capped by it, so a code can never take the goods below
 * zero. Gift cards don't come through here (computeDiscountSplit "gift_card").
 */
export function computeCouponSplit(args: {
    terms: CouponTerms;
    subtotal: number;
    deliveryFee: number;
    lines?: readonly CodeLine[] | null;
}): DiscountSplit {
    const { terms, subtotal, deliveryFee } = args;
    if (!isItemCoupon(terms)) {
        return computeDiscountSplit({
            discountType: terms.discount_type,
            value: Number(terms.discount_value),
            subtotal,
            deliveryFee,
        });
    }

    const lines = qualifyingLines(terms, args.lines ?? []);
    const base = linesTotal(lines);
    if (base <= 0) return ZERO;
    const value = num(terms.discount_value);

    let off = 0;
    switch (terms.discount_type) {
        case "percentage":
            off = (base * Math.min(100, Math.max(0, value))) / 100;
            break;
        case "fixed":
            off = Math.max(0, value);
            break;
        case "sale_price":
            // A sale price of 0 or less would give the goods away; it is a broken row, not a deal.
            off = value > 0 ? lines.reduce((s, l) => s + Math.max(0, num(l.unitPrice) - value) * units(l.quantity), 0) : 0;
            break;
        case "buy_x_get_y": {
            const bx = bxgyTerms(terms);
            off = bx ? bxgyFreeValue(lines, bx.buy, bx.get) : 0;
            break;
        }
        default:
            off = 0;
    }

    const subtotalAmount = round(Math.min(Math.max(0, off), base, Math.max(0, num(subtotal))));
    return { amount: subtotalAmount, subtotalAmount, deliveryAmount: 0 };
}

export type ItemCouponShortfall = "no_items" | "covered" | "need_more" | "below_sale_price";

/**
 * Why an item code is worth nothing on this basket, or null when it is worth
 * something (or is a whole-cart code, which keeps its old behaviour).
 */
export function itemCouponShortfall(terms: CouponTerms, lines: readonly CodeLine[]): { reason: ItemCouponShortfall; needed?: number } | null {
    if (!isItemCoupon(terms)) return null;
    if (computeCouponSplit({ terms, subtotal: Number.MAX_SAFE_INTEGER, deliveryFee: 0, lines }).amount > 0) return null;
    const qualifying = qualifyingLines(terms, lines);
    if (qualifying.length === 0) {
        const uncovered = qualifyingLines(terms, lines.map(l => ({ ...l, covered: false })));
        return { reason: uncovered.length > 0 ? "covered" : "no_items" };
    }
    if (terms.discount_type === "buy_x_get_y") {
        const bx = bxgyTerms(terms);
        const have = qualifying.reduce((s, l) => s + units(l.quantity), 0);
        if (bx && have < bx.buy + bx.get) return { reason: "need_more", needed: bx.buy + bx.get - have };
    }
    return { reason: "below_sale_price" };
}

const ghs = (v: unknown) => `GH₵ ${num(v).toFixed(2)}`;

/** Customer-facing words for a shortfall. Calm and specific. */
export function itemCouponShortfallText(
    s: { reason: ItemCouponShortfall; needed?: number },
    terms: CouponTerms,
    categoryName?: string | null,
): string {
    const scope = couponCategoryId(terms) ? (categoryName ? `${categoryName} items` : "items in one category") : "items";
    switch (s.reason) {
        case "no_items":
            return `This code is for ${scope} only, and nothing in your cart qualifies.`;
        case "covered":
            return `This code doesn't apply to ${scope} that already have an automatic discount.`;
        case "need_more": {
            const bx = bxgyTerms(terms);
            const n = s.needed ?? 1;
            return bx
                ? `Add ${n} more qualifying ${n === 1 ? "item" : "items"} to use this code: buy ${bx.buy}, get ${bx.get} free.`
                : "This code takes nothing off this cart.";
        }
        default:
            return terms.discount_type === "sale_price"
                ? `Everything this code covers in your cart already costs ${ghs(terms.discount_value)} or less.`
                : "This code takes nothing off this cart.";
    }
}

/** The label shown next to an applied code, e.g. "20% off Dresses". */
export function couponLabel(terms: CouponTerms, categoryName?: string | null): string {
    const on = couponCategoryId(terms) ? ` ${categoryName ?? "selected items"}` : "";
    const v = num(terms.discount_value);
    switch (terms.discount_type) {
        case "percentage": return on ? `${v}% Off${on}` : `${v}% Off`;
        case "fixed": return `${ghs(v)} Off${on}`;
        case "free_shipping": return "Free Shipping";
        case "sale_price": return `Sale Price ${ghs(v)}${on ? ` on${on}` : ""}`;
        case "buy_x_get_y": {
            const bx = bxgyTerms(terms);
            return bx ? `Buy ${bx.buy}, Get ${bx.get} Free${on ? ` on${on}` : ""}` : "Discount Applied";
        }
        case "bogo": return "Buy One, Get One Free (applied at dispatch)";
        default: return "Discount Applied";
    }
}

/** A product's categories for a code, the same membership automatic discounts use. */
export const productCategoryIds = (p: { category_ids?: unknown } | null | undefined): string[] =>
    Array.isArray(p?.category_ids) ? (p!.category_ids as unknown[]).filter((x): x is string => typeof x === "string") : [];

/** What a page keeps about a code it has applied (the validate-code reply). */
export type AppliedCodeTerms = {
    discount_type: string;
    discount_amount: number;
    /** Percent for a percentage coupon, GHS for every other type. */
    raw_value?: number;
    /** Present for an item code only. */
    terms?: CouponTerms | null;
    /** productId → category ids, for an item code only. */
    line_categories?: Record<string, string[]> | null;
};

/**
 * A page's re-split of a code it has applied, on every render, so a change of
 * region or basket never leaves the screen showing a stale figure. Whole-cart
 * codes and gift cards: computeDiscountSplit, exactly as the pages did before.
 * Item codes: computeCouponSplit over the page's own lines.
 */
export function splitAppliedCode(
    a: AppliedCodeTerms,
    args: { subtotal: number; deliveryFee: number; lines: readonly Omit<CodeLine, "categoryIds">[] },
): DiscountSplit {
    if (a.terms && isItemCoupon(a.terms)) {
        return computeCouponSplit({
            terms: a.terms,
            subtotal: args.subtotal,
            deliveryFee: args.deliveryFee,
            lines: args.lines.map(l => ({ ...l, categoryIds: a.line_categories?.[l.productId] ?? [] })),
        });
    }
    return computeDiscountSplit({
        discountType: a.discount_type,
        value: a.raw_value ?? a.discount_amount,
        subtotal: args.subtotal,
        deliveryFee: args.deliveryFee,
    });
}

/** True when a line's product has no categories on record yet, so the page should ask the server again. */
export const needsRecheck = (a: AppliedCodeTerms, productIds: readonly string[]) =>
    !!a.terms && isItemCoupon(a.terms) && productIds.some(id => !(id in (a.line_categories ?? {})));
