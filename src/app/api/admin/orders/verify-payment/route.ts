import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { logActivity } from "@/lib/utils/logActivity";
import { verifyReference, applyPaystackSuccess, loadBizIdentity } from "@/lib/paystackReconcile";

/**
 * POST /api/admin/orders/verify-payment
 *
 * Ask Paystack what actually happened to one order, from the order page.
 *
 * Two steps on purpose. Without `apply` it only reports, so a staff member can
 * see the verdict before anything moves; with `apply` it puts a genuinely-paid
 * order right. It can never cancel or refund — the only state change available
 * here is into paid.
 */
export async function POST(req: NextRequest) {
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: caller } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!caller || !["admin", "owner", "sales_staff"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Applying takes stock and can email a customer, so it needs more than a
    // till login behind it.
    const { orderId, apply = false, notify = true } = await req.json();
    if (!orderId) {
        return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }
    if (apply && !["admin", "owner"].includes(caller.role)) {
        return NextResponse.json(
            { error: "Only an admin or owner can apply a payment correction." },
            { status: 403 },
        );
    }

    const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, ref, status, payment_status, fulfillment_status, total_amount, items, customer_email, customer_metadata, paystack_reference, discount_code, discount_amount, delivery_fee, delivery_zone")
        .eq("id", orderId)
        .single();

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (!order.paystack_reference || ["", "dummy-ref"].includes(order.paystack_reference)) {
        return NextResponse.json({
            checked: false,
            reason: "no_reference",
            message: "This order has no Paystack reference — it never reached the payment page, so there is nothing to verify.",
        });
    }

    const verdict = await verifyReference(order.paystack_reference);

    if (!verdict) {
        return NextResponse.json({
            checked: false,
            reason: "unreachable",
            message: "Could not reach Paystack just now. Nothing has been changed — please try again shortly.",
        }, { status: 502 });
    }

    const isPaidHere = order.payment_status === "paid";
    const paidAtPaystack = verdict.status === "success";
    const mismatch = paidAtPaystack && !isPaidHere;

    // Goods already out means the customer has everything and only the books are
    // wrong. Surfaced so the UI can default to not emailing them.
    const alreadyFulfilled =
        ["delivered", "fulfilled"].includes(order.fulfillment_status ?? "") ||
        ["delivered", "fulfilled"].includes(order.status ?? "");

    const base = {
        checked: true,
        reference: order.paystack_reference,
        paystack: verdict,
        order: {
            ref: order.ref,
            status: order.status,
            payment_status: order.payment_status,
            fulfillment_status: order.fulfillment_status,
            total_amount: Number(order.total_amount ?? 0),
        },
        mismatch,
        alreadyFulfilled,
        canApply: mismatch,
    };

    if (!apply) {
        return NextResponse.json(base);
    }

    if (!mismatch) {
        return NextResponse.json({
            ...base,
            applied: false,
            message: paidAtPaystack
                ? "This order is already marked paid — nothing to correct."
                : `Paystack reports "${verdict.status}", not a payment. Nothing has been changed.`,
        });
    }

    const { bizName, bizAddress } = await loadBizIdentity();
    const result = await applyPaystackSuccess(order, {
        bizName,
        bizAddress,
        // Never email about an order the customer already received.
        notify: notify && !alreadyFulfilled,
        source: `order-page:${user.id}`,
    });

    if (!result.applied) {
        return NextResponse.json({
            ...base,
            applied: false,
            message: "Another process updated this order a moment ago. Reload to see its current state.",
        });
    }

    after(() => logActivity({
        userId: user.id,
        userRole: caller.role,
        actionType: "UPDATE_STATUS",
        resource: "order",
        resourceId: order.id,
        details: {
            order_number: order.ref ?? order.id.slice(0, 8),
            resource_name: `Order #${order.ref ?? order.id.slice(0, 8)}`,
            previous_status: order.status,
            new_status: "paid",
            verified_against_paystack: true,
            paystack_amount: verdict.amount,
            paystack_paid_at: verdict.paidAt,
        },
    }));

    return NextResponse.json({
        ...base,
        applied: true,
        emailed: result.emailed,
        message: result.wasCancelled
            ? `Restored. Paystack confirms GH₵ ${verdict.amount?.toFixed(2)} was paid${verdict.paidAt ? ` on ${new Date(verdict.paidAt).toLocaleString()}` : ""}.`
            : "Marked paid against the Paystack record.",
    });
}
