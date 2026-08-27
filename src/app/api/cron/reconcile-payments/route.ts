export const maxDuration = 300; // 5 min — may re-verify a full day of references

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { confirmSale, fallbackDecrementFromItems } from "@/lib/inventory";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { zoneLabel } from "@/lib/delivery";

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

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_VERIFY = "https://api.paystack.co/transaction/verify";

/** How far back to re-check. A full day plus slack for a late-running cron. */
const LOOKBACK_HOURS = Number(process.env.PAYMENT_RECONCILE_LOOKBACK_HOURS || 36);

async function verifyReference(ref: string): Promise<string | null> {
    try {
        const res = await fetch(`${PAYSTACK_VERIFY}/${encodeURIComponent(ref)}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
            next: { revalidate: 0 },
        });
        const json = await res.json();
        if (!json.status || !json.data?.status) return null;
        return json.data.status as string; // "success" | "failed" | "abandoned" | "ongoing"
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    const auth = req.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!PAYSTACK_SECRET) {
        return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not configured" }, { status: 500 });
    }

    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

    // Everything the /30 pass has already had its chance at, in either resting
    // state it could have left behind. "paid" is not fetched — this job never
    // reverses a payment, only completes one.
    const { data: candidates, error } = await supabaseAdmin
        .from("orders")
        .select("id, ref, created_at, customer_email, customer_name, total_amount, items, customer_metadata, paystack_reference, discount_code, discount_amount, delivery_fee, delivery_zone, status, payment_status")
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

    const { data: biz } = await supabaseAdmin
        .from("business_settings")
        .select("business_name, address")
        .eq("id", "default")
        .single();
    const bizName = biz?.business_name || "Miss Tokyo";
    const bizAddress = biz?.address || "";

    await Promise.allSettled(orders.map(async (order) => {
        try {
            const paystackStatus = await verifyReference(order.paystack_reference!);

            // Only a confirmed success is acted on. Anything else — unpaid, or a
            // reference Paystack cannot resolve — is left exactly as it is. The
            // /30 pass owns cancelling; this job never does.
            if (paystackStatus !== "success") {
                results.unchanged++;
                return;
            }

            const wasCancelled = order.payment_status === "cancelled";
            const meta = (order.customer_metadata as Record<string, unknown>) ?? {};

            // Claim it the same way verify does, so a concurrent /30 pass or a
            // late webhook cannot both decrement stock for this order.
            const { data: claimed } = await supabaseAdmin
                .from("orders")
                .update({ payment_status: "processing" })
                .eq("id", order.id)
                .in("payment_status", ["pending", "processing", "cancelled"])
                .select("id");

            if (!claimed || claimed.length === 0) {
                results.unchanged++;
                return;
            }

            // A cancelled order gave its reservation back, so confirmSale finds
            // nothing to consume and the stored items are the only record of what
            // was sold. Same fallback the verify route uses.
            let stockDecremented = false;
            try {
                stockDecremented = await confirmSale(order.id);
            } catch (e) {
                console.error(`[reconcile-payments] confirmSale failed for ${order.id}:`, e);
            }
            if (!stockDecremented) {
                const items = Array.isArray(order.items) ? (order.items as any[]) : [];
                if (items.length > 0) {
                    await fallbackDecrementFromItems(order.id, items).catch(e =>
                        console.error(`[reconcile-payments] fallback decrement failed for ${order.id}:`, e),
                    );
                }
            }

            await supabaseAdmin
                .from("orders")
                .update({
                    status: "paid",
                    payment_status: "paid",
                    fulfillment_status: "inbox",
                    customer_metadata: {
                        ...meta,
                        webhook_email_sent: true,
                        reconciled_at: new Date().toISOString(),
                        // Kept so staff can tell a repaired order from a normal
                        // one when it reappears in the Inbox days later.
                        ...(wasCancelled ? { reconciled_from: "cancelled" } : {}),
                    },
                })
                .eq("id", order.id)
                .eq("payment_status", "processing");

            if (!meta.webhook_email_sent && order.customer_email) {
                await sendOrderConfirmation({
                    customerEmail: order.customer_email,
                    bizName,
                    bizAddress,
                    items: Array.isArray(order.items) ? (order.items as any[]) : [],
                    orderRef: order.ref || order.id.substring(0, 8).toUpperCase(),
                    amount: Number(order.total_amount ?? 0),
                    deliveryFee: Number(order.delivery_fee) || undefined,
                    deliveryLabel: order.delivery_zone ? zoneLabel(order.delivery_zone) : undefined,
                    discountCode: order.discount_code ?? undefined,
                    discountAmount: Number(order.discount_amount) || undefined,
                }).catch(e =>
                    console.error(`[reconcile-payments] confirmation email failed for ${order.id}:`, e),
                );
            }

            repaired.push({
                ref: order.ref || order.id.substring(0, 8).toUpperCase(),
                was: order.payment_status,
                amount: Number(order.total_amount ?? 0),
            });

            if (wasCancelled) results.restored++;
            else results.settled++;

            revalidateTag("products", "max");
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
