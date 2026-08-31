import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { confirmSale, fallbackDecrementFromItems } from "@/lib/inventory";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { zoneLabel } from "@/lib/delivery";
import { isReclaimableCancellation } from "@/lib/reclaimCancelled";

export { isReclaimableCancellation };

/**
 * Asking Paystack what really happened to an order, and acting on the answer.
 *
 * Shared by the nightly reconcile cron and the Verify button on the order page
 * so there is exactly one implementation of "this order was actually paid, put
 * it right" — it moves money-adjacent state and takes stock, and two copies of
 * that drifting apart is how the original bug went unnoticed for months.
 */

const PAYSTACK_VERIFY = "https://api.paystack.co/transaction/verify";

/** Paystack's verdict, plus enough detail for a human to judge it. */
export type PaystackVerdict = {
    /** "success" | "failed" | "abandoned" | "ongoing" | "reversed" | … */
    status: string;
    /** GHS, as charged by Paystack — includes the fee the store passes on. */
    amount: number | null;
    paidAt: string | null;
    channel: string | null;
    /** True when the reference itself could not be resolved at all. */
    unknown: boolean;
};

export async function verifyReference(reference: string): Promise<PaystackVerdict | null> {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";
    if (!secret) return null;

    try {
        const res = await fetch(`${PAYSTACK_VERIFY}/${encodeURIComponent(reference)}`, {
            headers: { Authorization: `Bearer ${secret}` },
            next: { revalidate: 0 },
        });
        const json = await res.json();

        // status:false means Paystack does not know this reference. That is a
        // real answer, not a failure to get one, so it is reported rather than
        // collapsed into null.
        if (!json.status || !json.data?.status) {
            return { status: "unknown", amount: null, paidAt: null, channel: null, unknown: true };
        }

        return {
            status: json.data.status,
            amount: json.data.amount != null ? json.data.amount / 100 : null,
            paidAt: json.data.paid_at ?? null,
            channel: json.data.channel ?? null,
            unknown: false,
        };
    } catch {
        // Network or parse failure — no verdict. Distinct from "unknown", which
        // is Paystack answering that it has never seen the reference.
        return null;
    }
}

type RestorableOrder = {
    id: string;
    ref?: string | null;
    customer_email?: string | null;
    total_amount?: number | string | null;
    items?: unknown;
    customer_metadata?: Record<string, unknown> | null;
    payment_status?: string | null;
    discount_code?: string | null;
    discount_amount?: number | string | null;
    delivery_fee?: number | string | null;
    delivery_zone?: string | null;
};

export type RestoreResult =
    | { applied: true; wasCancelled: boolean; emailed: boolean }
    | { applied: false; reason: "claimed_elsewhere" };

/**
 * Put a genuinely-paid order right: take the stock, mark it paid, confirm it.
 *
 * One direction only. Nothing here can cancel or refund an order — that is the
 * whole point of it being safe to expose behind a button.
 *
 * `notify` exists because the right answer differs by case. An order whose goods
 * already went out needs its books corrected and nothing else; telling that
 * customer their cancelled order is now confirmed, days after they received it,
 * is worse than silence.
 */
export async function applyPaystackSuccess(
    order: RestorableOrder,
    opts: { bizName: string; bizAddress: string; notify?: boolean; source: string },
): Promise<RestoreResult> {
    const { bizName, bizAddress, notify = true, source } = opts;
    const meta = (order.customer_metadata as Record<string, unknown>) ?? {};
    const wasCancelled = order.payment_status === "cancelled";

    // Claim it by moving to "processing" first. Only one caller can win, so a
    // concurrent cron pass, a late webhook and this call cannot each decrement
    // stock for the same order.
    const { data: claimed } = await supabaseAdmin
        .from("orders")
        .update({ payment_status: "processing" })
        .eq("id", order.id)
        .in("payment_status", ["pending", "processing", "cancelled"])
        .select("id");

    if (!claimed || claimed.length === 0) {
        return { applied: false, reason: "claimed_elsewhere" };
    }

    // A cancelled order gave its reservation back, so confirmSale finds nothing
    // to consume and the stored items are the only record of what was sold.
    let stockDecremented = false;
    try {
        stockDecremented = await confirmSale(order.id);
    } catch (e) {
        console.error(`[paystack-reconcile] confirmSale failed for ${order.id}:`, e);
    }
    if (!stockDecremented) {
        const items = Array.isArray(order.items) ? (order.items as any[]) : [];
        if (items.length > 0) {
            await fallbackDecrementFromItems(order.id, items).catch(e =>
                console.error(`[paystack-reconcile] fallback decrement failed for ${order.id}:`, e),
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
                reconciled_by: source,
                // Kept so staff can tell a repaired order from one that was paid
                // normally when it reappears in the Inbox days later.
                ...(wasCancelled ? { reconciled_from: "cancelled" } : {}),
            },
        })
        .eq("id", order.id)
        .eq("payment_status", "processing");

    let emailed = false;
    if (notify && !meta.webhook_email_sent && order.customer_email) {
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
        }).then(() => { emailed = true; })
          .catch(e => console.error(`[paystack-reconcile] confirmation email failed for ${order.id}:`, e));
    }

    revalidateTag("products", "max");

    return { applied: true, wasCancelled, emailed };
}

/** Business name and address, as the confirmation email needs them. */
export async function loadBizIdentity() {
    const { data } = await supabaseAdmin
        .from("business_settings")
        .select("business_name, address")
        .eq("id", "default")
        .single();
    return {
        bizName: data?.business_name || "Miss Tokyo",
        bizAddress: data?.address || "",
    };
}
