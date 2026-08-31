/**
 * May a confirmed payment undo this order's cancellation?
 *
 * Only when the cancellation was automatic. The /30 sync job cancels on an
 * unpaid verdict, and Paystack reports "abandoned" for a payment merely still
 * in progress — so a customer finishing late leaves money against a cancelled
 * order. Paystack confirming the money moved outranks that guess, and the job
 * stamps auto_cancelled_at precisely so the reversal can be limited to its own
 * decisions.
 *
 * A person cancelling an order is a deliberate act, usually paired with a
 * refund, and Paystack retries webhooks for days. Undoing that silently would
 * resurrect orders staff had settled, so an unstamped cancellation is final.
 *
 * The marker means "the MOST RECENT cancellation was automatic", not "this
 * order was auto-cancelled once". It is therefore cleared by everything that
 * moves an order out of a cron cancellation — the webhook reclaim below,
 * applyPaystackSuccess, and every staff status change. Without that, an order
 * auto-cancelled in August and restored, then deliberately cancelled by staff
 * in September, would still look reclaimable and a retried webhook would
 * resurrect it. Callers clearing the marker are what makes this predicate safe;
 * it cannot tell on its own.
 */
export function isReclaimableCancellation(order: {
    payment_status?: string | null;
    customer_metadata?: unknown;
} | null | undefined): boolean {
    if (!order || order.payment_status !== "cancelled") return false;
    const meta = (order.customer_metadata as Record<string, unknown> | null) ?? {};
    return Boolean(meta.auto_cancelled_at);
}
