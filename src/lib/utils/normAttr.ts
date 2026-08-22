export function normAttr(s: string | null | undefined): string {
    if (s == null) return "null";
    const n = s.replace(/\s*[—–-]\s*/g, "-").trim().toLowerCase();
    // A blank attribute and an absent one mean the same thing. Left apart, a
    // cart line carrying "" never matches a variant row holding NULL.
    return n === "" ? "null" : n;
}

/**
 * The size half of a variant key.
 *
 * A product with colours but no sizes has variant rows with `size = NULL`,
 * while the storefront puts the literal string "One Size" on the cart line —
 * QuickAddModal (`selectedSize || "One Size"`) and the shop grid's quick add.
 * `normAttr` maps those to "null" and "one size", so the key never matched and
 * every such product read as sold out with its variants never decrementing.
 *
 * "One Size" is a label for the absence of a size, so it folds to the same
 * token as NULL. Applied to BOTH sides of the comparison, never one.
 */
const NO_SIZE = new Set(["null", "one size", "one-size", "onesize"]);

export function normSize(s: string | null | undefined): string {
    const n = normAttr(s);
    return NO_SIZE.has(n) ? "null" : n;
}

/**
 * The one place a variant lookup key is built. Both the variant row and the
 * cart/order line must go through this — a key built by hand on one side is
 * how "One Size" went unnoticed.
 */
export function variantKey(
    productId: string,
    attrs: { size?: string | null; color?: string | null; brand?: string | null },
): string {
    return `${productId}|${normSize(attrs.size)}|${normAttr(attrs.color)}|${normAttr(attrs.brand)}`;
}

/**
 * Whether a line carries enough to identify a variant. A variant-tracked
 * product must read its stock from the variant row, not the product roll-up —
 * gating on `size` alone sent colour-only products to the roll-up, which would
 * advertise every unit of every colour as available in each one.
 */
export function hasVariantAttrs(attrs: { size?: string | null; color?: string | null; brand?: string | null }): boolean {
    return Boolean(
        (attrs.size && normSize(attrs.size) !== "null") ||
        (attrs.color && normAttr(attrs.color) !== "null") ||
        (attrs.brand && normAttr(attrs.brand) !== "null"),
    );
}
