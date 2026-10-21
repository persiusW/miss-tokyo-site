"use server";

// Orders server actions (admin v2). Server actions are public endpoints that
// run on the service role, so each one checks the caller's role itself, with
// the same role lists the old Orders actions used: order staff (admin, owner,
// sales staff) for status changes, notes and reading; owners and admins for
// abandoned-cart reminders, invoices and pay links (as /api/abandoned/remind
// and the old Finance pages had it). Status still changes only through the
// existing updateOrderStatus / updateFulfillmentStatus / bulkUpdateOrderStatus,
// which keep status and fulfillment_status in step and reconcile stock.
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logActivity } from "@/lib/utils/logActivity";
import { logCause } from "@/lib/errors/apiError";
import { sendEmail } from "@/lib/email";
import { bulkUpdateOrderStatus, updateFulfillmentStatus, updateOrderStatus } from "@/app/(dashboard)/sales/orders/actions";
import { orderLines, planPack, unpackedUnits, type RefundItem } from "@/lib/orders/refundMath";
import { remindOne } from "@/lib/orders/abandonedCarts";
import {
    channelLabel, fulKeyOf, orderRef, parseOrdersQuery, payKeyOf, toCsv, type TimelineItem,
} from "@/lib/admin/v2/orders";
import {
    loadAbandoned, loadDocuments, loadOrderDetail, loadOrderTimeline, loadOrdersForExport, loadRiders,
    type AbandonedData, type DocumentRow, type LegacyLinkRow, type OrderDetail, type RiderOption,
} from "@/lib/admin/v2/ordersLoad";
import type { AbandonedRange } from "@/lib/admin/v2/orders";
import { FUL, PAY } from "@/components/admin/ui/status";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type Role = "admin" | "owner" | "sales_staff";
const ORDER_STAFF: Role[] = ["admin", "owner", "sales_staff"];
const FULL: Role[] = ["admin", "owner"];
const db = supabaseAdmin as any;

const DENIED = { ok: false as const, error: "Only the shop's team can do this. Please sign in again." };
const FULL_ONLY = { ok: false as const, error: "Only an owner or admin can do this." };
const FAILED = "We couldn't do that just now. Nothing was changed. Please try again.";
const GONE = "That order isn't there any more. Please refresh.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function me(roles: Role[] = ORDER_STAFF) {
    const a = await requireStaff(roles);
    return "status" in a ? null : a;
}

const refresh = (id?: string) => {
    revalidatePath("/orders", "layout");
    if (id) revalidatePath(`/sales/orders/${id}`, "page");
};

/** One order's panel. */
export async function getOrder(id: string): Promise<Result<{ detail: OrderDetail }>> {
    if (!(await me())) return DENIED;
    if (!UUID.test(id)) return { ok: false, error: GONE };
    try {
        const detail = await loadOrderDetail(id);
        return detail ? { ok: true, detail } : { ok: false, error: GONE };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.get" });
        return { ok: false, error: "We couldn't load this order. Please try again." };
    }
}

export async function getTimeline(id: string): Promise<Result<{ items: TimelineItem[] }>> {
    if (!(await me())) return DENIED;
    if (!UUID.test(id)) return { ok: false, error: GONE };
    try {
        return { ok: true, items: await loadOrderTimeline(id) };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.timeline" });
        return { ok: false, error: "We couldn't load the timeline. Please try again." };
    }
}

export async function getRiders(): Promise<Result<{ riders: RiderOption[] }>> {
    if (!(await me())) return DENIED;
    try {
        return { ok: true, riders: await loadRiders() };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.riders" });
        return { ok: false, error: "We couldn't load the riders. Please try again." };
    }
}

/** Staff notes on the order (orders.notes, the field the till writes). Saved on blur. */
export async function saveStaffNote(id: string, text: string): Promise<Result> {
    const m = await me();
    if (!m) return DENIED;
    if (!UUID.test(id)) return { ok: false, error: GONE };
    const notes = String(text ?? "").replace(/\r\n/g, "\n").trim().slice(0, 1000);
    const { data, error } = await db.from("orders").update({ notes: notes || null }).eq("id", id).select("id, ref").maybeSingle();
    if (error) { logCause("GEN-00", error, { where: "orders.note" }); return { ok: false, error: FAILED }; }
    if (!data) return { ok: false, error: GONE };
    after(() => logActivity({
        userId: m.userId, userRole: m.role, actionType: "STAFF_NOTE", resource: "order", resourceId: id,
        details: { order_number: orderRef(data), resource_name: `Order #${orderRef(data)}` },
    }));
    refresh(id);
    return { ok: true };
}

/**
 * Mark as packed, all of it or part of it (BACKEND_GAPS 5). The whole order,
 * or the last of it, goes through updateOrderStatus("packed") as before. A
 * parcel that leaves items out is an order_fulfilments row and fulfillment
 * 'partial' through updateFulfillmentStatus (status stays 'paid').
 */
export async function packOrder(id: string, items: RefundItem[] | "all"): Promise<Result<{ completes: boolean; units: number; left: number }>> {
    const m = await me();
    if (!m) return DENIED;
    if (!UUID.test(id)) return { ok: false, error: GONE };
    try {
        const { data: o, error } = await db.from("orders").select("id, ref, items, payment_status, status, fulfillment_status").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!o) return { ok: false, error: GONE };
        if (o.payment_status !== "paid") return { ok: false, error: "This order isn't paid yet, so it can't be packed." };
        if (!["unfulfilled", "partly"].includes(fulKeyOf(o))) return { ok: false, error: "This order has already been packed. Refresh to see where it is now." };
        const lines = orderLines(o.items);
        const { data: parcels, error: pErr } = await db.from("order_fulfilments").select("items").eq("order_id", id);
        if (pErr) throw pErr;
        const todo = unpackedUnits(lines, parcels ?? []);
        const ask = items === "all" ? [...todo].map(([index, quantity]) => ({ index, quantity })).filter(a => a.quantity > 0) : items;
        const plan = planPack(lines, parcels ?? [], Array.isArray(ask) ? ask : []);
        if (!plan.ok) return { ok: false, error: plan.error };

        // A parcel is recorded whenever the order has been (or is now being) split.
        const split = (parcels ?? []).length > 0 || !plan.completes;
        if (split) {
            const { error: insErr } = await db.from("order_fulfilments").insert({ order_id: id, items: plan.items, status: "packed", created_by: m.userId });
            if (insErr) throw insErr;
        }
        if (plan.completes) {
            const r = await updateOrderStatus(id, "packed");
            if (!r.success) return { ok: false, error: FAILED };
        } else {
            const r = await updateFulfillmentStatus(id, "partial");
            if (!r.success) return { ok: false, error: FAILED };
            after(() => logActivity({
                userId: m.userId, userRole: m.role, actionType: "PARTIAL_FULFILMENT", resource: "order", resourceId: id,
                details: { order_number: orderRef(o), resource_name: `Order #${orderRef(o)}`, units: plan.units, left: plan.left },
            }));
        }
        refresh(id);
        return { ok: true, completes: plan.completes, units: plan.units, left: plan.left };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.pack" });
        return { ok: false, error: FAILED };
    }
}

/** Mark as delivered / Mark as collected: status 'fulfilled', as the old Mark Fulfilled / Mark Collected did. */
export async function markFinished(id: string): Promise<Result> {
    if (!(await me())) return DENIED;
    if (!UUID.test(id)) return { ok: false, error: GONE };
    const r = await updateOrderStatus(id, "fulfilled");
    if (!r.success) return { ok: false, error: r.error === "Order not found" ? GONE : FAILED };
    refresh(id);
    return { ok: true };
}

/** Cancel without a refund (unpaid orders, or paid ones already paid back another way). Stock comes back through the same reconcile. */
export async function cancelOrder(id: string): Promise<Result> {
    if (!(await me())) return DENIED;
    if (!UUID.test(id)) return { ok: false, error: GONE };
    const { data: o } = await db.from("orders").select("status, fulfillment_status, payment_status, delivery_method").eq("id", id).maybeSingle();
    if (!o) return { ok: false, error: GONE };
    if (["delivered", "collected", "cancelled"].includes(fulKeyOf({ id, ...o }))) return { ok: false, error: "This order can't be cancelled now. Refresh to see where it is." };
    const r = await updateOrderStatus(id, "cancelled");
    if (!r.success) return { ok: false, error: FAILED };
    refresh(id);
    return { ok: true };
}

/** Bulk "Mark as packed": only paid orders still waiting to pack; the rest are skipped and counted. */
export async function bulkPack(ids: string[]): Promise<Result<{ packed: string[]; skipped: number }>> {
    if (!(await me())) return DENIED;
    const clean = [...new Set((ids ?? []).filter(i => typeof i === "string" && UUID.test(i)))].slice(0, 100);
    if (!clean.length) return { ok: true, packed: [], skipped: 0 };
    const { data, error } = await db.from("orders").select("id, payment_status, status, fulfillment_status, delivery_method").in("id", clean);
    if (error) { logCause("GEN-00", error, { where: "orders.bulkPack" }); return { ok: false, error: FAILED }; }
    // A partly packed order needs its own panel (which items), so bulk leaves it alone.
    const ok = (data ?? []).filter((o: any) => o.payment_status === "paid" && fulKeyOf(o) === "unfulfilled").map((o: any) => o.id);
    if (ok.length) {
        const r = await bulkUpdateOrderStatus(ok, "packed");
        if (!r.success) return { ok: false, error: FAILED };
    }
    refresh();
    return { ok: true, packed: ok, skipped: clean.length - ok.length };
}

/** Bulk "Mark as delivered" (the old Mark Fulfilled): paid orders that aren't cancelled or already finished. */
export async function bulkFinish(ids: string[]): Promise<Result<{ done: string[]; skipped: number }>> {
    if (!(await me())) return DENIED;
    const clean = [...new Set((ids ?? []).filter(i => typeof i === "string" && UUID.test(i)))].slice(0, 100);
    if (!clean.length) return { ok: true, done: [], skipped: 0 };
    const { data, error } = await db.from("orders").select("id, payment_status, status, fulfillment_status, delivery_method").in("id", clean);
    if (error) { logCause("GEN-00", error, { where: "orders.bulkFinish" }); return { ok: false, error: FAILED }; }
    const ok = (data ?? []).filter((o: any) => o.payment_status === "paid" && !["cancelled", "delivered", "collected"].includes(fulKeyOf(o))).map((o: any) => o.id);
    if (ok.length) {
        const r = await bulkUpdateOrderStatus(ok, "fulfilled");
        if (!r.success) return { ok: false, error: FAILED };
    }
    refresh();
    return { ok: true, done: ok, skipped: clean.length - ok.length };
}

/** The list (or the ticked orders) as CSV, up to 5000 rows. */
export async function exportOrders(search: string, ids?: string[] | null): Promise<Result<{ csv: string; count: number }>> {
    if (!(await me())) return DENIED;
    try {
        const pick = ids?.filter(i => UUID.test(i)) ?? null;
        const rows = await loadOrdersForExport(parseOrdersQuery(new URLSearchParams(search)), pick?.length ? pick : null);
        const head = ["Order", "Placed", "Customer", "Email", "Phone", "Channel", "Delivery", "Payment method", "Payment", "Fulfilment", "Items", "Delivery fee", "Discount", "Total", "Refunded", "Paystack fee", "Paystack reference"];
        const body = rows.map((o: any) => [
            orderRef(o), o.created_at, o.customer_name, o.customer_email, o.customer_phone, channelLabel(o.source),
            o.delivery_method, o.payment_method, PAY[payKeyOf(o)][0], FUL[fulKeyOf(o)][0],
            orderLines(o.items).map(l => `${l.quantity} × ${l.name}${l.variant ? ` (${l.variant})` : ""}`).join("; "),
            o.delivery_fee, o.discount_amount, o.total_amount, o.refunded_total, o.paystack_fee, o.paystack_reference,
        ]);
        return { ok: true, csv: toCsv([head, ...body]), count: rows.length };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.export" });
        return { ok: false, error: "We couldn't export the orders. Please try again." };
    }
}

export type SlipOrder = { id: string; ref: string; created_at: string; customer_name: string | null; customer_phone: string | null; delivery_method: string | null; address: string | null; notes: string | null; lines: { name: string; variant: string; quantity: number }[] };

/** What the packing slips print, for the ticked orders. */
export async function packingSlips(ids: string[]): Promise<Result<{ orders: SlipOrder[]; business: string }>> {
    if (!(await me())) return DENIED;
    const clean = (ids ?? []).filter(i => UUID.test(i)).slice(0, 100);
    const [{ data, error }, biz] = await Promise.all([
        db.from("orders").select("id, ref, created_at, customer_name, customer_phone, delivery_method, shipping_address, notes, items").in("id", clean).order("created_at"),
        db.from("business_settings").select("business_name").eq("id", "default").maybeSingle(),
    ]);
    if (error) { logCause("GEN-00", error, { where: "orders.slips" }); return { ok: false, error: FAILED }; }
    return {
        ok: true,
        business: biz.data?.business_name || "Miss Tokyo",
        orders: (data ?? []).map((o: any) => ({
            id: o.id, ref: orderRef(o), created_at: o.created_at, customer_name: o.customer_name, customer_phone: o.customer_phone,
            delivery_method: o.delivery_method, notes: o.notes,
            address: typeof o.shipping_address === "string" ? o.shipping_address : o.shipping_address?.text ?? null,
            lines: orderLines(o.items).map(l => ({ name: l.name, variant: l.variant, quantity: l.quantity })),
        })),
    };
}

// ── Abandoned checkouts ──────────────────────────────────────────────────────

export async function getAbandoned(range: AbandonedRange, page = 1): Promise<Result<{ data: AbandonedData }>> {
    if (!(await me())) return DENIED;
    try {
        return { ok: true, data: await loadAbandoned(range, Math.max(1, Math.floor(page) || 1)) };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.abandoned" });
        return { ok: false, error: "We couldn't load abandoned checkouts. Please try again." };
    }
}

/** "Send reminder" / "Send again". Owners and admins, as /api/abandoned/remind. */
export async function sendAbandonedReminder(orderId: string): Promise<Result<{ to: string }>> {
    const m = await me(FULL);
    if (!m) return (await me()) ? FULL_ONLY : DENIED;
    if (!UUID.test(orderId)) return { ok: false, error: GONE };
    const { data: o } = await db.from("orders").select("id, customer_name, customer_email, items, payment_status").eq("id", orderId).maybeSingle();
    if (!o) return { ok: false, error: GONE };
    if (o.payment_status === "paid") return { ok: false, error: "This checkout has been paid since. No reminder needed." };
    if (!o.customer_email) return { ok: false, error: "There's no email address on this checkout." };
    const sent = await remindOne(o);
    if (!sent) return { ok: false, error: "The email didn't go out. Please try again. (EML-01)" };
    refresh();
    return { ok: true, to: o.customer_email };
}

// ── Invoices, quotes and pay links ───────────────────────────────────────────

export async function getDocuments(): Promise<Result<{ docs: DocumentRow[]; links: LegacyLinkRow[]; taxRate: number; feePct: number; feeLabel: string }>> {
    if (!(await me(FULL))) return FULL_ONLY;
    try {
        return { ok: true, ...(await loadDocuments()) };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.documents" });
        return { ok: false, error: "We couldn't load invoices. Please try again." };
    }
}

export type DocInput = {
    id?: string | null;
    type: "invoice" | "quotation" | "pay_link";
    customer_name: string; customer_email: string;
    lines: { description: string; qty: number; unit_price: number }[];
    tax_rate: number; notes: string;
    status: "draft" | "pending";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The document total, worked out here from the lines: never trusted from the browser. */
function docTotal(lines: DocInput["lines"], taxRate: number): number {
    const sub = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
    return Math.round((sub + sub * (taxRate / 100)) * 100) / 100;
}

export async function saveDocument(input: DocInput): Promise<Result<{ id: string; amount: number }>> {
    const m = await me(FULL);
    if (!m) return FULL_ONLY;
    const type = ["invoice", "quotation", "pay_link"].includes(input?.type) ? input.type : null;
    if (!type) return { ok: false, error: "Choose invoice, quote or pay link." };
    const lines = (input.lines ?? [])
        .map(l => ({ description: String(l.description ?? "").trim().slice(0, 200), qty: Math.max(1, Math.floor(Number(l.qty) || 1)), unit_price: Math.round((Number(l.unit_price) || 0) * 100) / 100, mode: "custom" as const }))
        .filter(l => l.description || l.unit_price > 0);
    if (!lines.length || lines.some(l => l.unit_price <= 0 || !l.description)) return { ok: false, error: "Give every line a description and an amount." };
    const email = String(input.customer_email ?? "").trim().toLowerCase();
    if (email && !EMAIL_RE.test(email)) return { ok: false, error: "That email address doesn't look right." };
    const tax = Math.min(100, Math.max(0, Number(input.tax_rate) || 0));
    const amount = docTotal(lines, tax);
    const row = {
        type, amount, line_items: lines, tax_rate: tax, notes: String(input.notes ?? "").trim().slice(0, 1000) || null,
        customer_name: String(input.customer_name ?? "").trim().slice(0, 120) || null, customer_email: email || null,
        status: input.status === "draft" ? "draft" : "pending",
    };
    try {
        if (input.id) {
            if (!UUID.test(input.id)) return { ok: false, error: "That document isn't there any more. Please refresh." };
            const { data: cur } = await db.from("documents").select("status").eq("id", input.id).maybeSingle();
            if (!cur) return { ok: false, error: "That document isn't there any more. Please refresh." };
            if (cur.status !== "draft") return { ok: false, error: "Only a draft can be changed. Cancel it and make a new one." };
            const { error } = await db.from("documents").update(row).eq("id", input.id);
            if (error) throw error;
            refresh();
            return { ok: true, id: input.id, amount };
        }
        const { data, error } = await db.from("documents").insert(row).select("id").single();
        if (error) throw error;
        refresh();
        return { ok: true, id: data.id, amount };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.saveDocument" });
        return { ok: false, error: FAILED };
    }
}

/** Mark paid, cancel, or send a draft (status pending): the old invoice status buttons. */
export async function setDocumentStatus(id: string, status: "paid" | "cancelled" | "pending"): Promise<Result> {
    if (!(await me(FULL))) return FULL_ONLY;
    if (!UUID.test(id) || !["paid", "cancelled", "pending"].includes(status)) return { ok: false, error: FAILED };
    const { error } = await db.from("documents").update({ status }).eq("id", id);
    if (error) { logCause("GEN-00", error, { where: "orders.docStatus" }); return { ok: false, error: FAILED }; }
    refresh();
    return { ok: true };
}

/** Email the customer their invoice, quote or pay link (notification_log through sendEmail). */
export async function emailDocument(id: string, payUrl: string | null): Promise<Result<{ to: string }>> {
    if (!(await me(FULL))) return FULL_ONLY;
    if (!UUID.test(id)) return { ok: false, error: FAILED };
    const [{ data: d }, { data: biz }] = await Promise.all([
        db.from("documents").select("id, type, amount, customer_name, customer_email, status").eq("id", id).maybeSingle(),
        db.from("business_settings").select("business_name, email").eq("id", "default").maybeSingle(),
    ]);
    if (!d) return { ok: false, error: "That document isn't there any more. Please refresh." };
    if (!d.customer_email) return { ok: false, error: "Add the customer's email address first." };
    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    const view = `${site}/invoice/${d.id}`;
    // Only a Paystack page link is accepted for the Pay button; anything else is dropped.
    const pay = payUrl && /^https:\/\/(checkout\.)?paystack\.(com|co)\//.test(payUrl) ? payUrl : null;
    const kind = d.type === "quotation" ? "quote" : d.type === "pay_link" ? "payment link" : "invoice";
    const name = biz?.business_name || "Miss Tokyo";
    const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const r = await sendEmail({
        to: d.customer_email,
        subject: `Your ${kind} from ${name}`,
        ...(biz?.email ? { replyTo: biz.email } : {}),
        html: `<div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
          <h1 style="font-size:20px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 24px;">${esc(name)}</h1>
          <p style="font-size:15px;color:#171717;">Hello${d.customer_name ? ` ${esc(String(d.customer_name).split(/\s+/)[0])}` : ""},</p>
          <p style="font-size:14px;color:#525252;line-height:1.8;">Here is your ${kind} for GH&#8373; ${Number(d.amount).toFixed(2)}.</p>
          <p><a href="${view}" style="color:#171717;">View the ${kind}</a></p>
          ${pay ? `<div style="background:#171717;padding:14px 24px;display:inline-block;margin-top:12px;"><a href="${pay}" style="color:#fff;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;">Pay now</a></div>` : ""}
        </div></div>`,
    }, { event: `document:${d.type}` });
    if (!r.ok) return { ok: false, error: "The email didn't go out. Please try again. (EML-01)" };
    if (d.status === "draft") await db.from("documents").update({ status: "pending" }).eq("id", id);
    refresh();
    return { ok: true, to: d.customer_email };
}
