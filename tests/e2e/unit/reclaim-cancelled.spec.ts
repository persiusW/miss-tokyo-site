import { test, expect } from "@playwright/test";
import { isReclaimableCancellation } from "../../../src/lib/reclaimCancelled";

// A confirmed payment may undo a cancellation this system made on its own, and
// must never undo one a person made. Paystack retries webhooks for days, so
// getting this backwards would resurrect orders staff had deliberately settled.

test("reclaims an order the sync cron cancelled", () => {
    expect(isReclaimableCancellation({
        payment_status: "cancelled",
        customer_metadata: { auto_cancelled_at: "2026-08-29T14:00:00Z", auto_cancelled_by: "cron:sync-payment-status" },
    })).toBe(true);
});

test("refuses an order a person cancelled", () => {
    // What the owner did to E619C97F on 2026-08-29: paid -> cancelled by hand,
    // no marker. A retried webhook must leave it alone.
    expect(isReclaimableCancellation({
        payment_status: "cancelled",
        customer_metadata: { webhook_email_sent: true },
    })).toBe(false);
});

test("refuses a cancellation with no metadata at all", () => {
    expect(isReclaimableCancellation({ payment_status: "cancelled", customer_metadata: null })).toBe(false);
    expect(isReclaimableCancellation({ payment_status: "cancelled" })).toBe(false);
});

test("every historical cancellation stays final", () => {
    // Nothing before this change carries the marker, so the 600-odd already in
    // the table cannot be woken up by a stray webhook.
    expect(isReclaimableCancellation({ payment_status: "cancelled", customer_metadata: {} })).toBe(false);
});

test("leaves settled orders alone", () => {
    for (const status of ["paid", "refunded", "pending", "processing"]) {
        expect(isReclaimableCancellation({
            payment_status: status,
            customer_metadata: { auto_cancelled_at: "2026-08-29T14:00:00Z" },
        })).toBe(false);
    }
});

test("a refund after an auto-cancel is not reclaimable", () => {
    expect(isReclaimableCancellation({
        payment_status: "refunded",
        customer_metadata: { auto_cancelled_at: "2026-08-29T14:00:00Z" },
    })).toBe(false);
});

test("handles a missing order", () => {
    expect(isReclaimableCancellation(null)).toBe(false);
    expect(isReclaimableCancellation(undefined)).toBe(false);
});

// ── The lifecycle that makes the marker safe ─────────────────────────────────
// The predicate cannot tell on its own whether the LAST cancellation was
// automatic — it only reads a flag. What makes it correct is that every path
// leaving a cron cancellation clears that flag. These pin the sequence that
// would otherwise resurrect a deliberate staff cancellation.

/** What the sync cron writes when it gives up on an order. */
const afterAutoCancel = { payment_status: "cancelled", customer_metadata: { auto_cancelled_at: "2026-08-20T14:02:00Z", auto_cancelled_by: "cron:sync-payment-status" } };

/** What applyPaystackSuccess and the Verify button leave behind. */
const afterRestore = { payment_status: "paid", customer_metadata: { auto_cancelled_at: null, reconciled_at: "2026-08-31T09:00:00Z" } };

/** What updateOrderStatus leaves behind when a person cancels. */
const afterStaffCancel = { payment_status: "cancelled", customer_metadata: { auto_cancelled_at: null, reconciled_at: "2026-08-31T09:00:00Z" } };

test("auto-cancel → restore → staff cancel is NOT reclaimable", () => {
    // The sequence that would otherwise let a retried charge.success undo a
    // deliberate cancellation months after the original automatic one.
    expect(isReclaimableCancellation(afterAutoCancel)).toBe(true);
    expect(isReclaimableCancellation(afterRestore)).toBe(false);
    expect(isReclaimableCancellation(afterStaffCancel)).toBe(false);
});

test("a restored order is not reclaimable while it is paid", () => {
    expect(isReclaimableCancellation(afterRestore)).toBe(false);
});

test("an explicit null marker reads as absent, not as present", () => {
    // The clearing paths write null rather than deleting the key, so falsiness
    // is what the predicate must rely on.
    expect(isReclaimableCancellation({ payment_status: "cancelled", customer_metadata: { auto_cancelled_at: null } })).toBe(false);
    expect(isReclaimableCancellation({ payment_status: "cancelled", customer_metadata: { auto_cancelled_at: "" } })).toBe(false);
});
