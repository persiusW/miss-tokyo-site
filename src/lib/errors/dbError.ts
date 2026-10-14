// Database errors staff can fix themselves get their own plain message; the
// rest stay GEN-00. Pure, so it can be tested.
export function uniqueViolationMessage(err: unknown): string | null {
    const e = err as { code?: unknown; message?: unknown } | null | undefined;
    if (!e || e.code !== "23505") return null;
    const m = typeof e.message === "string" ? e.message : "";
    if (m.includes("products_slug_key")) return "That web address (slug) is already used by another product. Change it and save again.";
    if (m.includes("product_variants")) return "Two variants have the same size, colour and brand. Remove the duplicate and save again.";
    return "That value is already used by another product. Change it and save again.";
}
