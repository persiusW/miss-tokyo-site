// src/lib/posContact.ts
//
// Walk-in customers at the till often have no email address, so a POS sale can
// carry a null `customer_email`. Two things still insist on one:
//
//   1. Paystack — `transaction/initialize` rejects a request without `email`.
//   2. The pre-migration database — `pos_sessions.customer_email` was created
//      NOT NULL, and `orders.customer_email` may be too.
//
// Both are handled by falling back to the store's own address. It is a real,
// deliverable mailbox, so nothing bounces, and receipts for anonymous walk-ins
// land with the store rather than in a black hole.

/** The store's own mailbox. Stands in wherever an address is structurally required. */
export const POS_FALLBACK_EMAIL =
    process.env.POS_FALLBACK_EMAIL || "studio@misstokyo.shop";

/** Trim to a real address, or null. Blank strings from the till count as absent. */
export function normaliseEmail(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/**
 * True when Postgres rejected a write because a column we deliberately left
 * null is still NOT NULL — i.e. the additive migration has not been applied yet.
 * Lets the till keep selling against an un-migrated database instead of failing
 * the sale, at the cost of storing the fallback address on that row.
 */
export function isNotNullViolation(
    error: { code?: string; message?: string } | null | undefined,
    column: string,
): boolean {
    if (!error) return false;
    return error.code === "23502" && (error.message ?? "").includes(column);
}
