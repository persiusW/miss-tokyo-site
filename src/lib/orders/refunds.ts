// Refunding an order, full or partial (BACKEND_GAPS 4). Server only.
//
// Order of work, so a failure part-way never moves money twice:
//   1. claim a refunds row by the caller's idempotency key (a repeat tap or a
//      retried request finds the row and gets the same answer back);
//   2. Paystack Refund API for card / Mobile money, only while
//      store_settings.refunds_live is on; cash, gift card and "already
//      refunded in the Paystack dashboard" are recorded only;
//   3. the order: refunded_total, and status/payment_status 'refunded' (or
//      'cancelled' + 'refunded' from the cancel panel) once nothing is left;
//   4. stock through reconcileOrderStock, which nets refunds out;
//   5. the refund email (notification_log through sendEmail) and the log.
//
// The amount comes from planRefund over the order as stored, never from the
// request alone, and can't exceed what was charged minus earlier refunds.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { reconcileOrderStock } from "@/lib/inventory";
import { logActivity } from "@/lib/utils/logActivity";
import { sendEmail } from "@/lib/email";
import { PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/checkout/createCheckoutOrder";
import { notifyCustomerOnWhatsApp } from "@/lib/whatsapp/templateSendLive";
import { fillTemplate, firstNameOf, ghs } from "@/lib/whatsapp/templates";
import { createPaystackRefund, type PaystackRefundResult } from "./paystackRefund";
import { REFUND_REASONS, orderLines, planRefund, refundedSoFar, round2, type RefundItem, type RefundMode, type RefundRow } from "./refundMath";

export type RefundBody = {
    mode: RefundMode;
    amount?: number | string | null;
    items?: RefundItem[] | null;
    restock?: boolean;
    reason?: string | null;
    notify?: boolean;
    /** Paystack orders: the money already went back through the Paystack dashboard. */
    recordOnly?: boolean;
    /** From the cancel panel: refund everything and cancel the order in one step. */
    cancel?: boolean;
    idempotencyKey: string;
};

export type RefundOutcome =
    | { ok: true; replay: boolean; refundId: string; amount: number; method: string; status: string; fully: boolean; stockMoved: number | null; emailed: boolean }
    | { ok: false; status: number; error: string; code?: "PAY-08" | "PAY-01" | "GEN-00" };

type Deps = { refund?: (a: { reference: string; amountGhs: number; note?: string | null }) => Promise<PaystackRefundResult> };

const KEY_RE = /^[A-Za-z0-9_-]{8,100}$/;
const fail = (status: number, error: string, code?: "PAY-08" | "PAY-01" | "GEN-00"): RefundOutcome => ({ ok: false, status, error, code });

export async function refundsLive(): Promise<boolean> {
    const { data } = await supabaseAdmin.from("store_settings").select("refunds_live").eq("id", "default").maybeSingle();
    return data?.refunds_live === true;
}

export async function refundOrder(orderId: string, body: RefundBody, actor: { userId: string; role: string }, deps: Deps = {}): Promise<RefundOutcome> {
    const mode = body.mode;
    if (!["full", "items", "amount"].includes(mode)) return fail(400, "Choose what to refund.");
    if (typeof body.idempotencyKey !== "string" || !KEY_RE.test(body.idempotencyKey)) return fail(400, "Please refresh and try again.");
    const reason = body.reason == null || body.reason === "" ? null : String(body.reason);
    if (reason && !(REFUND_REASONS as readonly string[]).includes(reason)) return fail(400, "Choose a reason from the list.");

    // A repeat of a refund already made: same answer, nothing moves again.
    const prior = await supabaseAdmin.from("refunds").select("id, order_id, amount_ghs, method, status").eq("idempotency_key", body.idempotencyKey).maybeSingle();
    if (prior.error) return fail(500, "", "GEN-00");
    if (prior.data) {
        if (prior.data.order_id !== orderId) return fail(409, "Please refresh and try again.");
        return { ok: true, replay: true, refundId: prior.data.id, amount: Number(prior.data.amount_ghs), method: prior.data.method, status: prior.data.status, fully: false, stockMoved: null, emailed: false };
    }

    const { data: order, error: oErr } = await supabaseAdmin
        .from("orders")
        .select("id, ref, status, payment_status, total_amount, items, payment_method, paystack_reference, customer_email, customer_name, customer_phone, customer_metadata")
        .eq("id", orderId)
        .maybeSingle();
    if (oErr) return fail(500, "", "GEN-00");
    if (!order) return fail(404, "That order isn't there any more. Please refresh.");
    if (order.payment_status !== "paid") return fail(409, "Only a paid order can be refunded. Refresh to see where this order is now.");

    const { data: rows, error: rErr } = await supabaseAdmin.from("refunds").select("amount_ghs, items, restock, status").eq("order_id", orderId);
    if (rErr) return fail(500, "", "GEN-00");
    const lines = orderLines(order.items);
    const ask = body.cancel ? { mode: "full" as const } : { mode, amount: body.amount, items: body.items };
    const plan = planRefund(order.total_amount, lines, (rows ?? []) as RefundRow[], ask);
    if (!plan.ok) return fail(409, plan.error);

    // How the money goes back.
    const pm = (order.payment_method ?? "paystack").toLowerCase();
    let method: "paystack" | "cash" | "gift_card" | "recorded";
    if (pm === "cash") method = "cash";
    else if (pm === "gift_card") method = "gift_card";
    else if (body.recordOnly) method = "recorded";
    else {
        const ref = (order.paystack_reference ?? "").trim();
        if (!ref || ref === "dummy-ref") return fail(409, "This order has no Paystack payment to refund. If you've paid the customer back another way, record the refund instead.");
        if (!(await refundsLive())) return fail(409, "Refunds through Paystack are switched off. Refund it in your Paystack dashboard, then record it here.");
        method = "paystack";
    }

    const restock = !!body.restock && plan.items.length > 0;
    const items = plan.items.map(i => {
        const l = lines.find(x => x.index === i.index)!;
        return { index: i.index, quantity: i.quantity, product_id: l.productId, variant_id: l.variantId, name: l.name, price: l.price };
    });

    // 1. Claim. The unique key makes a double tap land on one row.
    const { data: row, error: insErr } = await supabaseAdmin.from("refunds").insert({
        order_id: orderId, amount_ghs: plan.amount, items, reason, restock, method,
        status: method === "paystack" ? "pending" : "recorded",
        notify: !!body.notify, actor: actor.userId, idempotency_key: body.idempotencyKey,
    }).select("id").single();
    if (insErr || !row) {
        if (insErr?.code === "23505") return refundOrder(orderId, body, actor, deps);
        return fail(500, "", "GEN-00");
    }

    // 2. Paystack.
    let status = method === "paystack" ? "pending" : "recorded";
    if (method === "paystack") {
        const call = deps.refund ?? ((a) => createPaystackRefund(a, { secret: process.env.PAYSTACK_SECRET_KEY }));
        const r = await call({ reference: order.paystack_reference!, amountGhs: plan.amount, note: reason });
        if (!r.ok) {
            if (r.reason === "rejected" || r.reason === "not_configured") {
                await supabaseAdmin.from("refunds").update({ status: "failed", failure: r.detail.slice(0, 200), updated_at: new Date().toISOString() }).eq("id", row.id);
                return fail(502, "", "PAY-08");
            }
            // No answer: Paystack may or may not have taken it. The row stays
            // pending and counts against what can still be refunded, so a
            // second try can't send the money twice; the webhook settles it.
            await supabaseAdmin.from("refunds").update({ failure: "no answer from Paystack", updated_at: new Date().toISOString() }).eq("id", row.id);
            return fail(502, "We didn't hear back from Paystack. Check the refund in your Paystack dashboard before trying again.");
        }
        status = r.status;
        await supabaseAdmin.from("refunds").update({ paystack_refund_ref: r.refundRef, status, updated_at: new Date().toISOString() }).eq("id", row.id);
    }

    // 3. The order.
    const total = refundedSoFar([...((rows ?? []) as RefundRow[]), { amount_ghs: plan.amount, status, items, restock }]);
    const patch: Record<string, unknown> = { refunded_total: round2(total) };
    if (plan.fully) {
        patch.payment_status = "refunded";
        patch.status = body.cancel ? "cancelled" : "refunded";
        // A person decided this; a retried charge.success must never undo it.
        patch.customer_metadata = { ...((order.customer_metadata as object) ?? {}), auto_cancelled_at: null };
    }
    const { error: upErr } = await supabaseAdmin.from("orders").update(patch).eq("id", orderId);
    if (upErr) console.error("[refund] recorded but the order wasn't updated", { orderId, code: upErr.code });

    // 4. Stock. Not fatal, like every status change: the nightly drift report catches a miss.
    let stockMoved: number | null = null;
    if (plan.fully || restock) {
        try {
            stockMoved = await reconcileOrderStock(orderId, `refund ${row.id} by ${actor.userId}`);
        } catch (e) {
            console.error("[refund] stock reconciliation failed", { orderId, err: String(e).slice(0, 200) });
        }
    }

    // 5. Tell the customer, and keep the record.
    let emailed = false;
    const to = (order.customer_email ?? "").trim();
    if (body.notify && to && !to.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)) {
        const r = await sendEmail({
            to,
            subject: `Your refund for order #${order.ref ?? orderId.slice(0, 8).toUpperCase()}`,
            html: refundEmailHtml({
                name: order.customer_name, ref: order.ref ?? orderId.slice(0, 8).toUpperCase(), amount: plan.amount,
                viaPaystack: method === "paystack",
            }),
        }, { event: "refund", orderId });
        emailed = r.ok;
    }
    // WhatsApp too, best effort: the refund is recorded whatever happens here.
    if (body.notify && order.customer_phone) {
        const values = [firstNameOf(order.customer_name), ghs(plan.amount), order.ref ?? orderId.slice(0, 8).toUpperCase()];
        await notifyCustomerOnWhatsApp(
            { phone: order.customer_phone, freeText: fillTemplate("refund_sent", values)?.text ?? null, templates: [{ key: "refund_sent", values }] },
            { event: "refund", orderId },
        );
    }

    after(() => logActivity({
        userId: actor.userId, userRole: actor.role, actionType: body.cancel ? "CANCEL_ORDER" : "REFUND_ORDER",
        resource: "order", resourceId: orderId,
        details: {
            order_number: order.ref ?? orderId.slice(0, 8), resource_name: `Order #${order.ref ?? orderId.slice(0, 8)}`,
            refund_id: row.id, amount: plan.amount, method, refund_status: status, fully: plan.fully, restock,
            units: items.reduce((s, i) => s + i.quantity, 0), reason, customer_notified: emailed,
            previous_status: order.status, new_status: plan.fully ? (body.cancel ? "cancelled" : "refunded") : order.status,
        },
    }));
    revalidatePath(`/sales/orders/${orderId}`, "page");
    revalidatePath("/sales/orders", "page");

    return { ok: true, replay: false, refundId: row.id, amount: plan.amount, method, status, fully: plan.fully, stockMoved, emailed };
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function refundEmailHtml(a: { name: string | null; ref: string; amount: number; viaPaystack: boolean }): string {
    const first = (a.name ?? "").trim().split(/\s+/)[0];
    const how = a.viaPaystack
        ? "It goes back to the card or Mobile money wallet you paid with. It usually arrives within 5 to 10 working days."
        : "We've recorded it on your order.";
    return `
    <div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
        <h1 style="font-size:20px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px;">Miss Tokyo</h1>
        <p style="color:#737373;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 36px;">Refund</p>
        <p style="font-size:15px;color:#171717;margin:0 0 16px;">Hello${first ? ` ${esc(first)}` : ""},</p>
        <p style="font-size:14px;color:#525252;line-height:1.8;margin:0 0 16px;">
          We've refunded GH&#8373; ${a.amount.toFixed(2)} on order #${esc(a.ref)}. ${how}
        </p>
        <p style="font-size:14px;color:#525252;line-height:1.8;margin:0;">If you have any questions, just reply to this email.</p>
      </div>
    </div>`;
}
