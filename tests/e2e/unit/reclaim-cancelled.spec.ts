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
