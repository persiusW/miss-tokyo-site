export const maxDuration = 300; // 5 min — may verify hundreds of orders

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { confirmSale, releaseReservation } from "@/lib/inventory";
import { sendOrderConfirmation } from "@/lib/orderEmail";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_VERIFY = "https://api.paystack.co/transaction/verify";

async function verifyReference(ref: string): Promise<string | null> {
    try {
        const res = await fetch(`${PAYSTACK_VERIFY}/${encodeURIComponent(ref)}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
            next: { revalidate: 0 },
        });
        const json = await res.json();
        // json.status=false means reference not found or API error
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

    // Fetch orders still needing resolution:
    // - payment_status="pending": normal unresolved orders
    // - payment_status="processing": verify/webhook claimed it but may have crashed before finalising
    //   (only pick up if stuck > 5 min to avoid racing with an in-flight verify call)
    const stuckCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const ghostCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: pendingOrders, error } = await supabaseAdmin
        .from("orders")
        .select("id, created_at, customer_email, customer_name, customer_phone, total_amount, items, customer_metadata, paystack_reference, discount_code, discount_amount, delivery_method, payment_status")
        .or(`payment_status.eq.pending,and(payment_status.eq.processing,created_at.lt.${stuckCutoff})`)
        .not("paystack_reference", "is", null)
        .neq("paystack_reference", "")
        .neq("paystack_reference", "dummy-ref");

    if (error) {
        console.error("[sync-payment-status] DB fetch failed:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders = pendingOrders ?? [];
    const results = { success: 0, failed: 0, abandoned: 0, skipped: 0, errors: 0 };

    // Fetch biz settings once — used for confirmation emails
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

            if (!paystackStatus) {
                // Paystack doesn't know this reference. If the order is older than 24h
                // it's a ghost (test order, failed init, etc.) — cancel and clean up.
                const orderAge = new Date(order.created_at!);
                if (orderAge < new Date(ghostCutoff)) {
                    await supabaseAdmin
                        .from("orders")
                        .update({ status: "cancelled", payment_status: "cancelled" })
                        .eq("id", order.id)
                        .in("payment_status", ["pending", "processing"]);
                    await releaseReservation(order.id).catch(() => {});
                    results.abandoned++;
                } else {
                    results.skipped++;
                }
                return;
            }

            if (paystackStatus === "success") {
                const meta = (order.customer_metadata as Record<string, unknown>) ?? {};
                const emailAlreadySent = !!meta.webhook_email_sent;

                // confirmSale is idempotent — no-op if reservation already consumed
                await confirmSale(order.id).catch(e =>
                    console.warn(`[sync-cron] confirmSale no-op for ${order.id}:`, e)
                );

                // Mark paid — handles both "pending" and stuck "processing" orders
                await supabaseAdmin
                    .from("orders")
                    .update({
                        status: "paid",
                        payment_status: "paid",
                        customer_metadata: {
                            ...meta,
                            webhook_email_sent: true,
                            sync_confirmed_at: new Date().toISOString(),
                        },
                    })
                    .eq("id", order.id)
                    .in("payment_status", ["pending", "processing"]);

                if (!emailAlreadySent && order.customer_email) {
                    const orderRef = order.id.substring(0, 8).toUpperCase();
                    const amountGHS = Number(order.total_amount ?? 0);
                    const items = Array.isArray(order.items) ? order.items : [];
                    await sendOrderConfirmation({
                        customerEmail: order.customer_email,
                        bizName,
                        bizAddress,
                        items,
                        orderRef,
                        amount: amountGHS,
                        discountCode: order.discount_code ?? undefined,
                        discountAmount: Number(order.discount_amount) || undefined,
                    }).catch(e =>
                        console.error(`[sync-cron] confirmation email failed for ${order.id}:`, e)
                    );
                }

                revalidateTag("products", "max");
                results.success++;

            } else if (paystackStatus === "failed") {
                await supabaseAdmin
                    .from("orders")
                    .update({ status: "cancelled", payment_status: "cancelled" })
                    .eq("id", order.id)
                    .in("payment_status", ["pending", "processing"]);

                await releaseReservation(order.id).catch(() => {});
                results.failed++;

            } else if (paystackStatus === "abandoned") {
                await supabaseAdmin
                    .from("orders")
                    .update({ status: "cancelled", payment_status: "cancelled" })
                    .eq("id", order.id)
                    .in("payment_status", ["pending", "processing"]);

                await releaseReservation(order.id).catch(() => {});
                results.abandoned++;

            } else {
                // "ongoing" or unknown — leave as-is
                results.skipped++;
            }
        } catch (e) {
            console.error(`[sync-cron] error processing order ${order.id}:`, e);
            results.errors++;
        }
    }));

    console.log(`[sync-payment-status] done — total=${orders.length}`, results);
    return NextResponse.json({ total: orders.length, results });
}
