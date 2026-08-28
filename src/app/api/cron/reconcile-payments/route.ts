export const maxDuration = 300; // 5 min — may re-verify a full day of references

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyReference, applyPaystackSuccess, loadBizIdentity } from "@/lib/paystackReconcile";

/**
 * End-of-day payment reconciliation.
 *
 * /api/cron/sync-payment-status runs every 30 minutes and only ever moves an
 * order one way: unpaid verdict in, cancelled out. Nothing has ever checked its
 * work. Two things slip past it:
 *
 *  1. An order it cancelled while the customer was still paying. The customer
 *     then completes the payment, but charge.success only updates orders whose
 *     payment_status is pending or processing — a cancelled one does not match,
 *     so the money lands and the order stays cancelled, silently.
 *  2. An order left pending because Paystack was unreachable, or the webhook and
 *     the sync pass both missed it.
 *
 * This sweeps a whole lookback window against Paystack and repairs both. It is
 * deliberately one-directional: it only ever turns an order INTO paid, never
 * out of it. An order this restores is left with a marker in customer_metadata
 * so a human can see it was repaired rather than paid normally.
 */

/** How far back to re-check. A full day plus slack for a late-running cron. */
const LOOKBACK_HOURS = Number(process.env.PAYMENT_RECONCILE_LOOKBACK_HOURS || 36);

export async function GET(req: Request) {
    const auth = req.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
        return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not configured" }, { status: 500 });
    }

    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

    // Everything the /30 pass has already had its chance at, in either resting
    // state it could have left behind. "paid" is not fetched — this job never
    // reverses a payment, only completes one.
    const { data: candidates, error } = await supabaseAdmin
        .from("orders")
        .select("id, ref, created_at, customer_email, customer_name, total_amount, items, customer_metadata, paystack_reference, discount_code, discount_amount, delivery_fee, delivery_zone, status, payment_status, fulfillment_status")
        .in("payment_status", ["pending", "processing", "cancelled"])
        .gte("created_at", since)
        .not("paystack_reference", "is", null)
        .neq("paystack_reference", "")
        .neq("paystack_reference", "dummy-ref");

    if (error) {
        console.error("[reconcile-payments] DB fetch failed:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders = candidates ?? [];
    const results = { checked: orders.length, restored: 0, settled: 0, unchanged: 0, errors: 0 };
    const repaired: Array<{ ref: string; was: string; amount: number }> = [];

    const { bizName, bizAddress } = await loadBizIdentity();

    await Promise.allSettled(orders.map(async (order) => {
        try {
            const verdict = await verifyReference(order.paystack_reference!);

            // Only a confirmed success is acted on. Anything else — unpaid, a
            // reference Paystack cannot resolve, or Paystack being unreachable —
            // is left exactly as it is. The /30 pass owns cancelling; this job
            // never does.
            if (!verdict || verdict.status !== "success") {
                results.unchanged++;
                return;
            }

            const wasCancelled = order.payment_status === "cancelled";

            // An order whose goods already went out needs its books corrected
            // and nothing else. A confirmation for an order the customer
            // received days ago reads as a mistake, because it is one.
            const alreadyFulfilled =
                ["delivered", "fulfilled"].includes(order.fulfillment_status ?? "") ||
                ["delivered", "fulfilled"].includes(order.status ?? "");

            const outcome = await applyPaystackSuccess(order, {
                bizName,
                bizAddress,
                notify: !alreadyFulfilled,
                source: "cron:reconcile-payments",
            });

            if (!outcome.applied) {
                results.unchanged++;
                return;
            }

            repaired.push({
                ref: order.ref || order.id.substring(0, 8).toUpperCase(),
                was: order.payment_status,
                amount: Number(order.total_amount ?? 0),
            });

            if (wasCancelled) results.restored++;
            else results.settled++;

        } catch (e) {
            console.error(`[reconcile-payments] error on order ${order.id}:`, e);
            results.errors++;
        }
    }));

    // A restored order means a customer paid and the store showed them a
    // cancellation. Worth shouting about in the logs, not just counting.
    if (results.restored > 0) {
        console.error(
            `[reconcile-payments] RESTORED ${results.restored} paid order(s) that had been cancelled:`,
            repaired.filter(r => r.was === "cancelled"),
        );
    }

    console.log(`[reconcile-payments] done — window=${LOOKBACK_HOURS}h`, results);
    return NextResponse.json({ window_hours: LOOKBACK_HOURS, results, repaired });
}
