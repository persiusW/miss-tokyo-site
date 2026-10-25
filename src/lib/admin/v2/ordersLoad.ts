// Admin v2 Orders data from the database: the list (paged and counted on the
// server), the view chip counts, one order's panel and Timeline, abandoned
// checkouts and invoices. Server only (service role); callers check the role.
//
// The Waiting to pack, Waiting for payment and Ready for collection views use
// orderViews.ts, the same filters Home and the side-nav count use, so the
// numbers a person taps on and the list they land on always agree.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildSearchClause, sanitiseTerm } from "@/lib/refSearch";
import { activityText, hideAdminRows } from "@/lib/admin/activityText";
import { canManageRole } from "@/components/admin/v2/staff/staffCopy";
import { orderLines, refundable, packedUnits, type OrderLine } from "@/lib/orders/refundMath";
import { applyReady, applyToPack, applyUnpaid } from "./orderViews";
import {
    ABANDONED_RANGES, ORDER_VIEWS, PAGE_SIZE, buildTimeline, rangeStart, recoveredReminders,
    type AbandonedRange, type OrderViewKey, type OrdersQuery, type TimelineItem,
} from "./orders";

const db = supabaseAdmin as any;

export const LIST_FIELDS =
    "id, ref, created_at, customer_name, customer_email, customer_phone, delivery_method, source, payment_method, payment_status, status, fulfillment_status, total_amount, refunded_total, has_preorder, is_mixed_order";

export type OrderListRow = {
    id: string; ref: string | null; created_at: string; customer_name: string | null; customer_email: string | null; customer_phone: string | null;
    delivery_method: string | null; source: string | null; payment_method: string | null; payment_status: string | null; status: string | null;
    fulfillment_status: string | null; total_amount: number; refunded_total: number; has_preorder: boolean; is_mixed_order: boolean | null;
};

function applyView(x: any, view: OrderViewKey) {
    switch (view) {
        case "to-pack": return applyToPack(x);
        case "unpaid": return applyUnpaid(x);
        case "ready": return applyReady(x);
        case "packed": return x.eq("status", "packed");
        case "out": return x.eq("status", "shipped");
        case "done": return x.in("status", ["fulfilled", "delivered"]);
        case "closed": return x.or("status.in.(cancelled,failed,refunded),payment_status.eq.refunded,refunded_total.gt.0");
        default: return x;
    }
}

/** Every filter but the view: search, payment method, channel, pre-orders, dates. */
function applyFilters(x: any, q: OrdersQuery) {
    const term = sanitiseTerm(q.q);
    if (term) x = x.or(buildSearchClause(term, ["customer_name", "customer_email", "customer_phone", "paystack_reference"], { includeRef: true }));
    if (q.pay !== "all") x = x.eq("payment_method", q.pay);
    if (q.channel !== "all") x = x.eq("source", q.channel);
    if (q.preorder) x = x.eq("has_preorder", true);
    // Accra is UTC all year, so a calendar day is the same in the database.
    if (q.from) x = x.gte("created_at", `${q.from}T00:00:00.000Z`);
    if (q.to) x = x.lte("created_at", `${q.to}T23:59:59.999Z`);
    return x;
}

const toListRow = (r: any): OrderListRow => ({ ...r, total_amount: Number(r.total_amount ?? 0), refunded_total: Number(r.refunded_total ?? 0) });

export async function loadOrderList(q: OrdersQuery): Promise<{ rows: OrderListRow[]; total: number }> {
    const from = (q.page - 1) * PAGE_SIZE;
    const { data, count, error } = await applyView(applyFilters(db.from("orders").select(LIST_FIELDS, { count: "exact" }), q), q.view)
        .order("created_at", { ascending: false }).order("id")
        .range(from, from + PAGE_SIZE - 1);
    if (error?.code === "PGRST103") return { rows: [], total: 0 };
    if (error) throw error;
    return { rows: (data ?? []).map(toListRow), total: count ?? 0 };
}

export async function loadViewCounts(q: OrdersQuery): Promise<Record<OrderViewKey, number>> {
    const res = await Promise.all(ORDER_VIEWS.map(v => applyView(applyFilters(db.from("orders").select("id", { count: "exact", head: true }), q), v.v)));
    const out = {} as Record<OrderViewKey, number>;
    ORDER_VIEWS.forEach((v, i) => {
        if (res[i].error) throw res[i].error;
        out[v.v] = res[i].count ?? 0;
    });
    return out;
}

/** Pre-orders view context (the old Pre-Orders page's figures), counted in SQL. */
export async function loadPreorderStats(): Promise<{ waiting: number; sent: number; cancelled: number }> {
    const base = () => db.from("orders").select("id", { count: "exact", head: true }).eq("has_preorder", true);
    const [w, s, c] = await Promise.all([
        base().in("status", ["paid", "pending", "processing", "packed"]),
        base().in("status", ["fulfilled", "delivered", "shipped"]),
        base().in("status", ["cancelled", "failed", "refunded"]),
    ]);
    for (const r of [w, s, c]) if (r.error) throw r.error;
    return { waiting: w.count ?? 0, sent: s.count ?? 0, cancelled: c.count ?? 0 };
}

/** Up to `cap` rows for the CSV, paged past PostgREST's 1000-row limit. */
export async function loadOrdersForExport(q: OrdersQuery, ids: string[] | null, cap = 5000): Promise<any[]> {
    const cols = `${LIST_FIELDS}, delivery_fee, delivery_zone, discount_code, discount_amount, paystack_reference, paystack_fee, shipping_address, items`;
    if (ids) {
        const { data, error } = await db.from("orders").select(cols).in("id", ids.slice(0, 500)).order("created_at", { ascending: false });
        if (error) throw error;
        return data ?? [];
    }
    const out: any[] = [];
    for (let off = 0; off < cap; off += 1000) {
        const { data, error } = await applyView(applyFilters(db.from("orders").select(cols), q), q.view)
            .order("created_at", { ascending: false }).order("id").range(off, Math.min(off + 999, cap - 1));
        if (error) throw error;
        out.push(...(data ?? []));
        if (!data || data.length < 1000) break;
    }
    return out;
}

// ── One order ────────────────────────────────────────────────────────────────

export const DETAIL_FIELDS =
    "id, ref, created_at, updated_at, customer_name, customer_email, customer_phone, customer_metadata, delivery_method, delivery_fee, delivery_zone, shipping_address, source, " +
    "payment_method, payment_status, status, fulfillment_status, total_amount, refunded_total, items, discount_code, discount_amount, auto_discount_title, auto_discount_amount, " +
    "paystack_reference, paystack_charged, paystack_fee, paid_at, ready_at, has_preorder, is_mixed_order, notes, assigned_rider_id, packed_by, recorded_by";

export type RefundView = {
    id: string; created_at: string; updated_at: string | null; amount_ghs: number; method: string; status: string; reason: string | null;
    restock: boolean; items: { index: number; quantity: number }[]; who: string | null;
};
export type FulfilmentView = { id: string; created_at: string; items: { index: number; quantity: number }[]; who: string | null };

export type OrderDetail = {
    order: any;
    lines: (OrderLine & { image: string | null; sku: string | null; packed: number })[];
    rider: { id: string; full_name: string; phone_number: string; bike_reg: string | null } | null;
    refunds: RefundView[];
    fulfilments: FulfilmentView[];
    refundable: number;
    refundsLive: boolean;
    pickup: { instructions: string; address: string; phone: string; wait: string } | null;
    business: { name: string; address: string | null; contact: string | null; email: string | null };
    /** Discounts as the old page showed them: code amount and automatic discount. */
    subtotal: number;
};

/** First names by id. An admin's name is left out unless the viewer is an admin (staffCopy seesAdmins). */
async function names(ids: (string | null | undefined)[], viewer: string): Promise<Map<string, string>> {
    const u = [...new Set(ids.filter((x): x is string => !!x))];
    if (!u.length) return new Map();
    const { data } = await db.from("profiles").select("id, full_name, email, role, staff_deactivated_role").in("id", u);
    return new Map((data ?? [])
        .filter((p: any) => canManageRole(viewer, p.role) && canManageRole(viewer, p.staff_deactivated_role))
        .map((p: any) => [p.id, (p.full_name || p.email || "").trim().split(/\s+/)[0] || "Someone"]));
}

/** One order and everything its panel shows. Null when there's no such order. Throws on a database error. */
export async function loadOrderDetail(id: string, viewer: string): Promise<OrderDetail | null> {
    const { data: order, error } = await db.from("orders").select(DETAIL_FIELDS).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!order) return null;
    const lines = orderLines(order.items);
    const pIds = [...new Set(lines.map(l => l.productId).filter(Boolean))] as string[];
    const [prod, rider, refunds, ful, ss, biz, store] = await Promise.all([
        pIds.length ? db.from("products").select("id, sku, image_urls").in("id", pIds) : Promise.resolve({ data: [] }),
        order.assigned_rider_id ? db.from("riders").select("id, full_name, phone_number, bike_reg").eq("id", order.assigned_rider_id).maybeSingle() : Promise.resolve({ data: null }),
        db.from("refunds").select("id, created_at, updated_at, amount_ghs, method, status, reason, restock, items, actor").eq("order_id", id).order("created_at"),
        db.from("order_fulfilments").select("id, created_at, items, created_by").eq("order_id", id).order("created_at"),
        db.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").maybeSingle(),
        db.from("business_settings").select("business_name, email, contact, address").eq("id", "default").maybeSingle(),
        db.from("store_settings").select("refunds_live").eq("id", "default").maybeSingle(),
    ]);
    if (refunds.error) throw refunds.error;
    if (ful.error) throw ful.error;
    const who = await names([...(refunds.data ?? []).map((r: any) => r.actor), ...(ful.data ?? []).map((f: any) => f.created_by)], viewer);
    const byProduct = new Map<string, any>((prod.data ?? []).map((p: any) => [p.id, p]));
    const packed = packedUnits(ful.data ?? []);
    const refundRows: RefundView[] = (refunds.data ?? []).map((r: any) => ({
        id: r.id, created_at: r.created_at, updated_at: r.updated_at, amount_ghs: Number(r.amount_ghs), method: r.method, status: r.status,
        reason: r.reason, restock: !!r.restock, items: Array.isArray(r.items) ? r.items : [], who: who.get(r.actor) ?? null,
    }));
    const b = biz.data ?? {};
    const s = ss.data;
    const discount = Number(order.discount_amount ?? 0) + Number(order.auto_discount_amount ?? 0);
    return {
        order,
        lines: lines.map(l => {
            const p = l.productId ? byProduct.get(l.productId) : null;
            return { ...l, image: l.image || p?.image_urls?.[0] || null, sku: p?.sku ?? null, packed: packed.get(l.index) ?? 0 };
        }),
        rider: rider.data ?? null,
        refunds: refundRows,
        fulfilments: (ful.data ?? []).map((f: any) => ({ id: f.id, created_at: f.created_at, items: Array.isArray(f.items) ? f.items : [], who: who.get(f.created_by) ?? null })),
        refundable: refundable(order.total_amount, refundRows),
        refundsLive: store.data?.refunds_live === true,
        pickup: s?.pickup_enabled ? {
            instructions: s.pickup_instructions || "", address: s.pickup_address || b.address || "", phone: s.pickup_contact_phone || b.contact || "", wait: s.pickup_estimated_wait || "",
        } : null,
        business: { name: b.business_name || "Miss Tokyo", address: b.address ?? null, contact: b.contact ?? null, email: b.email ?? null },
        subtotal: Number(order.total_amount ?? 0) - Number(order.delivery_fee ?? 0) + discount,
    };
}

// Activity rows the Timeline already shows from their own tables.
const COVERED = new Set(["REFUND_ORDER", "PARTIAL_FULFILMENT", "NOTE_TO_CUSTOMER"]);

/** Every event for one order (BACKEND_GAPS 21), newest first. Throws on a database error. */
export async function loadOrderTimeline(id: string, viewer: string): Promise<TimelineItem[]> {
    const [o, act, notes, att, sale, refunds, ful] = await Promise.all([
        db.from("orders").select("created_at, paid_at, ready_at, source, total_amount, payment_method, items").eq("id", id).maybeSingle(),
        hideAdminRows(db.from("activity_logs").select("created_at, user_id, action_type, resource, resource_id, details").eq("resource", "order").eq("resource_id", id), viewer).order("created_at", { ascending: false }).limit(200),
        db.from("notification_log").select("created_at, channel, event, status, body").eq("order_id", id).order("created_at", { ascending: false }).limit(200),
        db.from("payment_attempts").select("created_at, status, amount_ghs").eq("order_id", id).limit(100),
        db.from("sale_payment_attempts").select("created_at, status, amount_ghs, channel, error_code").eq("order_id", id).limit(100),
        db.from("refunds").select("created_at, updated_at, amount_ghs, method, status, reason, restock, items, actor").eq("order_id", id),
        db.from("order_fulfilments").select("created_at, items, created_by").eq("order_id", id),
    ]);
    for (const r of [o, act, notes, att, sale, refunds, ful]) if (r.error) throw r.error;
    if (!o.data) return [];
    const who = await names([...(act.data ?? []).map((a: any) => a.user_id), ...(refunds.data ?? []).map((r: any) => r.actor), ...(ful.data ?? []).map((f: any) => f.created_by)], viewer);
    const total = orderLines(o.data.items).reduce((s, l) => s + l.quantity, 0);
    const units = (items: unknown) => (Array.isArray(items) ? items : []).reduce((s: number, i: any) => s + (Number(i?.quantity) || 0), 0);
    return buildTimeline({
        order: o.data,
        activity: (act.data ?? []).filter((a: any) => !COVERED.has(a.action_type) && a.details?.new_fulfillment_status !== "partial").map((a: any) => ({ at: a.created_at, who: who.get(a.user_id) ?? null, what: activityText(a).what })),
        notifications: notes.data ?? [],
        attempts: [...(att.data ?? []), ...(sale.data ?? [])],
        refunds: (refunds.data ?? []).map((r: any) => ({ ...r, who: who.get(r.actor) ?? null, units: units(r.items) })),
        fulfilments: (ful.data ?? []).map((f: any) => ({ created_at: f.created_at, units: units(f.items), of: total, who: who.get(f.created_by) ?? null })),
    });
}

// ── Riders ───────────────────────────────────────────────────────────────────

export type RiderOption = { id: string; full_name: string; phone_number: string; bike_reg: string | null; trips: number };

/** Active riders, with how many orders each was given this calendar month. */
export async function loadRiders(): Promise<RiderOption[]> {
    const start = new Date();
    start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
    const [r, o] = await Promise.all([
        db.from("riders").select("id, full_name, phone_number, bike_reg").eq("is_active", true).order("full_name"),
        db.from("orders").select("assigned_rider_id").not("assigned_rider_id", "is", null).gte("created_at", start.toISOString()).limit(1000),
    ]);
    if (r.error) throw r.error;
    const trips = new Map<string, number>();
    for (const x of o.data ?? []) trips.set(x.assigned_rider_id, (trips.get(x.assigned_rider_id) ?? 0) + 1);
    return (r.data ?? []).map((x: any) => ({ ...x, trips: trips.get(x.id) ?? 0 }));
}

// ── Abandoned checkouts ──────────────────────────────────────────────────────

// A checkout that never became a payment: still pending with no Paystack
// reference (what the old page and the reminder cron look for), or reached
// Paystack and was cancelled by the unpaid-order sweep (auto_cancelled_at).
// Till sales are left out: nobody left a cart there.
const ABANDONED_OR = "and(status.eq.pending,paystack_reference.is.null),and(status.eq.cancelled,customer_metadata->>auto_cancelled_at.not.is.null)";
const abandonedBase = (x: any, from: string | null) => {
    let q = x.or(ABANDONED_OR).neq("source", "pos").neq("payment_status", "paid");
    if (from) q = q.gte("created_at", from);
    return q;
};

export type AbandonedRow = {
    id: string; ref: string | null; created_at: string; customer_name: string | null; customer_email: string | null; total_amount: number; units: number;
    reminded_at: string | null; paid_later: boolean;
};
export type AbandonedData = {
    rows: AbandonedRow[]; total: number; value: number; reminders: { sent: number; recovered: number }; range: AbandonedRange;
};

export async function loadAbandoned(range: AbandonedRange, page: number): Promise<AbandonedData> {
    const from = rangeStart(range);
    const off = (page - 1) * PAGE_SIZE;
    const list = await abandonedBase(db.from("orders").select("id, ref, created_at, customer_name, customer_email, total_amount, items", { count: "exact" }), from)
        .order("created_at", { ascending: false }).order("id").range(off, off + PAGE_SIZE - 1);
    if (list.error && list.error.code !== "PGRST103") throw list.error;
    const rows = list.data ?? [];

    // Value in carts: every row in the range, paged.
    let value = 0;
    for (let o = 0; o < 20_000; o += 1000) {
        const { data, error } = await abandonedBase(db.from("orders").select("total_amount"), from).order("id").range(o, o + 999);
        if (error) throw error;
        for (const r of data ?? []) value += Number(r.total_amount ?? 0);
        if (!data || data.length < 1000) break;
    }

    const ids = rows.map((r: any) => r.id);
    const emails = [...new Set(rows.map((r: any) => r.customer_email).filter(Boolean))] as string[];
    let hist = db.from("abandoned_history").select("order_id, customer_email, reminded_at").order("reminded_at", { ascending: false }).limit(1000);
    if (from) hist = hist.gte("reminded_at", from);
    const [h, pageHist, laterPaid] = await Promise.all([
        hist,
        ids.length ? db.from("abandoned_history").select("order_id, reminded_at").in("order_id", ids) : Promise.resolve({ data: [] }),
        emails.length ? db.from("orders").select("customer_email, created_at").eq("payment_status", "paid").in("customer_email", emails).limit(1000) : Promise.resolve({ data: [] }),
    ]);
    if (h.error) throw h.error;
    const reminders = h.data ?? [];
    const remEmails = [...new Set(reminders.map((r: any) => r.customer_email).filter(Boolean))] as string[];
    const paidAfter = remEmails.length
        ? await db.from("orders").select("customer_email, created_at").eq("payment_status", "paid").in("customer_email", remEmails.slice(0, 500)).limit(1000)
        : { data: [] };
    const lastReminder = new Map<string, string>();
    for (const r of pageHist.data ?? []) if (!lastReminder.has(r.order_id) || r.reminded_at > lastReminder.get(r.order_id)!) lastReminder.set(r.order_id, r.reminded_at);
    const paid = laterPaid.data ?? [];

    return {
        rows: rows.map((r: any) => ({
            id: r.id, ref: r.ref, created_at: r.created_at, customer_name: r.customer_name, customer_email: r.customer_email,
            total_amount: Number(r.total_amount ?? 0), units: orderLines(r.items).reduce((s, l) => s + l.quantity, 0),
            reminded_at: lastReminder.get(r.id) ?? null,
            paid_later: paid.some((p: any) => p.customer_email === r.customer_email && p.created_at > r.created_at),
        })),
        total: list.count ?? 0,
        value: Math.round(value * 100) / 100,
        reminders: recoveredReminders(reminders, paidAfter.data ?? []),
        range: ABANDONED_RANGES.some(x => x.v === range) ? range : "7d",
    };
}

// ── Invoices, quotes and pay links ───────────────────────────────────────────

export type DocumentRow = {
    id: string; type: string; amount: number; status: string; customer_name: string | null; customer_email: string | null;
    line_items: { description?: string; qty?: number; unit_price?: number }[]; tax_rate: number; notes: string | null; created_at: string;
};
export type LegacyLinkRow = { id: string; email: string; amount: number; description: string | null; paystack_url: string | null; status: string; created_at: string };

export async function loadDocuments(): Promise<{ docs: DocumentRow[]; links: LegacyLinkRow[]; taxRate: number; feePct: number; feeLabel: string }> {
    const [d, l, b, f] = await Promise.all([
        db.from("documents").select("id, type, amount, status, customer_name, customer_email, line_items, tax_rate, notes, created_at").order("created_at", { ascending: false }).limit(500),
        db.from("pay_links").select("id, email, amount, description, paystack_url, status, created_at").order("created_at", { ascending: false }).limit(200),
        db.from("business_settings").select("tax_rate").eq("id", "default").maybeSingle(),
        // The fee the Paystack link adds (api/invoice/paystack-link reads the same row).
        db.from("store_settings").select("platform_fee_percentage, platform_fee_label").eq("id", "default").maybeSingle(),
    ]);
    if (d.error) throw d.error;
    if (l.error) throw l.error;
    return {
        docs: (d.data ?? []).map((x: any) => ({ ...x, amount: Number(x.amount ?? 0), tax_rate: Number(x.tax_rate ?? 0), line_items: Array.isArray(x.line_items) ? x.line_items : [] })),
        links: (l.data ?? []).map((x: any) => ({ ...x, amount: Number(x.amount ?? 0) })),
        taxRate: Number(b.data?.tax_rate ?? 0),
        feePct: Number(f.data?.platform_fee_percentage ?? 0),
        feeLabel: f.data?.platform_fee_label || "Service Charge",
    };
}

/** The Abandoned checkouts tab's figure: checkouts not finished in the last 7 days. */
export async function loadAbandonedCount(): Promise<number | null> {
    const { count, error } = await abandonedBase(db.from("orders").select("id", { count: "exact", head: true }), rangeStart("7d"));
    return error ? null : count ?? 0;
}
