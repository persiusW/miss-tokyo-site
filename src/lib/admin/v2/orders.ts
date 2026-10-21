// Admin v2 Orders: the list's URL state, the view chips, the labels, the
// order's progress and next step, the Timeline wording and the abandoned
// checkout figures. Pure, so the page, the server code and the tests agree.
//
// The DB values never change; only what the team reads does (README ›
// Orders › Status language, and src/components/admin/ui/status.tsx).
import { fulKey, payKey, type FulKey, type PayKey } from "@/components/admin/ui/status";

export const PAGE_SIZE = 25;
/** notification_log.event for a note staff send from an order. */
export const NOTE_EVENT = "order_note";

export type OrderViewKey = "all" | "to-pack" | "packed" | "out" | "ready" | "done" | "unpaid" | "closed";
export const ORDER_VIEWS: readonly { v: OrderViewKey; l: string; empty: string }[] = [
    { v: "all", l: "All", empty: "No orders yet" },
    { v: "to-pack", l: "Waiting to pack", empty: "Nothing waiting to pack" },
    { v: "packed", l: "Packed", empty: "Nothing packed and waiting" },
    { v: "out", l: "Out for delivery", empty: "Nothing out for delivery" },
    { v: "ready", l: "Ready for collection", empty: "Nothing ready for collection" },
    { v: "done", l: "Delivered or collected", empty: "Nothing delivered yet" },
    { v: "unpaid", l: "Waiting for payment", empty: "Nothing waiting for payment" },
    { v: "closed", l: "Cancelled and refunded", empty: "Nothing cancelled or refunded" },
];

/** The old list's ?tab= values, so bookmarks from /sales/orders land on the same orders. */
const LEGACY_TAB: Record<string, OrderViewKey> = {
    all: "to-pack", packed: "packed", pickups: "ready", shipped: "out", fulfilled: "done",
    cancelled: "closed", refunded: "closed", "all-orders": "all",
};

export type PayFilter = "all" | "paystack" | "cash" | "gift_card";
export const PAY_FILTERS: readonly { v: PayFilter; l: string }[] = [
    { v: "all", l: "All payment methods" },
    { v: "paystack", l: "Card or Mobile money" },
    { v: "cash", l: "Cash" },
    { v: "gift_card", l: "Gift card" },
];

export type ChannelFilter = "all" | "storefront" | "pos" | "whatsapp" | "web_chat";
export const CHANNELS: readonly { v: ChannelFilter; l: string }[] = [
    { v: "all", l: "All channels" },
    { v: "storefront", l: "Online shop" },
    { v: "pos", l: "POS" },
    { v: "whatsapp", l: "WhatsApp" },
    { v: "web_chat", l: "Shop assistant" },
];
const CHANNEL_LABEL: Record<string, string> = {
    storefront: "Online shop", web: "Online shop", pos: "POS", whatsapp: "WhatsApp", web_chat: "Shop assistant",
    pay_link: "Pay link", invoice: "Invoice", dashboard: "Admin",
};
export const channelLabel = (source: string | null | undefined) => CHANNEL_LABEL[(source ?? "storefront").toLowerCase()] ?? "Online shop";

export type OrdersQuery = {
    view: OrderViewKey; q: string; pay: PayFilter; channel: ChannelFilter; preorder: boolean; from: string; to: string; page: number;
};

type Params = URLSearchParams | Record<string, string | string[] | undefined>;
function get(sp: Params, k: string): string {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? "";
    const v = sp[k];
    return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseOrdersQuery(sp: Params): OrdersQuery {
    const view = get(sp, "view");
    const tab = get(sp, "tab");
    const pay = get(sp, "pay") || get(sp, "payment");
    const channel = get(sp, "channel");
    const from = get(sp, "from");
    const to = get(sp, "to");
    const page = Number.parseInt(get(sp, "page"), 10);
    return {
        view: ORDER_VIEWS.some(v => v.v === view) ? view as OrderViewKey : LEGACY_TAB[tab] ?? "all",
        q: get(sp, "q").slice(0, 80),
        pay: PAY_FILTERS.some(p => p.v === pay) ? pay as PayFilter : "all",
        channel: CHANNELS.some(c => c.v === channel) ? channel as ChannelFilter : "all",
        preorder: get(sp, "preorder") === "1",
        from: DATE.test(from) ? from : "",
        to: DATE.test(to) ? to : "",
        page: Number.isFinite(page) && page > 1 ? Math.min(page, 10_000) : 1,
    };
}

/** "" or "?view=to-pack&q=ama". Changing anything but the page goes back to page 1. */
export function ordersSearch(q: OrdersQuery, patch: Partial<OrdersQuery> = {}): string {
    const n = { ...q, ...patch };
    if (!("page" in patch)) n.page = 1;
    const p = new URLSearchParams();
    if (n.view !== "all") p.set("view", n.view);
    if (n.q.trim()) p.set("q", n.q.trim());
    if (n.pay !== "all") p.set("pay", n.pay);
    if (n.channel !== "all") p.set("channel", n.channel);
    if (n.preorder) p.set("preorder", "1");
    if (n.from) p.set("from", n.from);
    if (n.to) p.set("to", n.to);
    if (n.page > 1) p.set("page", String(n.page));
    const s = p.toString();
    return s ? `?${s}` : "";
}

export const filtersActive = (q: OrdersQuery) => Boolean(q.q.trim() || q.pay !== "all" || q.channel !== "all" || q.preorder || q.from || q.to);

/** /orders/<id> paths, so the list knows which panel is open. Null for /orders, /orders/abandoned… */
export function orderIdFromPath(path: string): string | null {
    const m = /^\/orders\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i.exec(path);
    return m ? m[1].toLowerCase() : null;
}

// ── One order ────────────────────────────────────────────────────────────────

export type OrderStatusFields = {
    id: string;
    ref?: string | null;
    status?: string | null;
    payment_status?: string | null;
    fulfillment_status?: string | null;
    delivery_method?: string | null;
    refunded_total?: number | string | null;
};

export const orderRef = (o: { id: string; ref?: string | null }) => (o.ref || o.id.slice(0, 8)).toUpperCase();
export const isPickup = (o: { delivery_method?: string | null }) => (o.delivery_method ?? "").toLowerCase().includes("pick");

/** Payment badge, with "Partly refunded" for a paid order that has refunds. */
export function payKeyOf(o: OrderStatusFields): PayKey {
    const k = payKey(o);
    return k === "paid" && Number(o.refunded_total ?? 0) > 0 ? "partly_refunded" : k;
}
export const fulKeyOf = (o: OrderStatusFields): FulKey => fulKey(o);

export const STEPS_DELIVERY = ["Placed", "Paid", "Packed", "Out for delivery", "Delivered"] as const;
export const STEPS_PICKUP = ["Placed", "Paid", "Packed", "Ready for collection", "Collected"] as const;

/** Where the order is on its steps: -1 when cancelled (no steps shown). */
export function stepIndex(o: OrderStatusFields): number {
    const f = fulKeyOf(o);
    if (f === "cancelled") return -1;
    if (["unpaid", "failed", "void"].includes(payKey(o))) return 0;
    return ({ unfulfilled: 1, partly: 2, packed: 2, shipped: 3, ready: 3, delivered: 4, collected: 4 } as Record<string, number>)[f] ?? 1;
}

export type NextStep = "check" | "pack" | "send-rest" | "ready" | "ship" | "delivered" | "collected" | null;

/** The one primary action an order offers (README › Order panel › Footer). */
export function nextStep(o: OrderStatusFields): NextStep {
    const pay = payKeyOf(o);
    const ful = fulKeyOf(o);
    if (ful === "cancelled" || pay === "refunded" || pay === "void") return null;
    if (pay === "unpaid" || pay === "failed") return "check";
    if (ful === "unfulfilled") return "pack";
    if (ful === "partly") return "send-rest";
    if (ful === "packed") return isPickup(o) ? "ready" : "ship";
    if (ful === "shipped") return "delivered";
    if (ful === "ready") return "collected";
    return null;
}

export const isClosed = (o: OrderStatusFields) => fulKeyOf(o) === "cancelled" || ["refunded", "void"].includes(payKeyOf(o));
export const canCancel = (o: OrderStatusFields) => !isClosed(o) && !["delivered", "collected"].includes(fulKeyOf(o));
export const canRefund = (o: OrderStatusFields) => ["paid", "partly_refunded"].includes(payKeyOf(o));

/** Whole days between two instants, never negative. */
export function daysBetween(fromIso: string | null | undefined, now = new Date()): number | null {
    if (!fromIso) return null;
    const t = new Date(fromIso).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/** Context banner for an unpaid order: shown once it's been waiting a day or more. */
export function unpaidFor(o: OrderStatusFields & { created_at?: string | null }, now = new Date()): string | null {
    if (payKeyOf(o) !== "unpaid") return null;
    const d = daysBetween(o.created_at, now);
    if (d == null || d < 1) return null;
    return d === 1 ? "Unpaid for a day" : `Unpaid for ${d} days`;
}

// ── Timeline (BACKEND_GAPS 21) ───────────────────────────────────────────────

export type TimelineItem = { at: string; text: string; tone: "" | "ok" | "warn" | "danger" };

export type TimelineSources = {
    order: { created_at: string; paid_at?: string | null; ready_at?: string | null; source?: string | null; total_amount?: number | string | null; payment_method?: string | null };
    /** activity_logs rows already worded (lib/admin/activityText), with who did it. */
    activity: { at: string; who: string | null; what: string }[];
    notifications: { created_at: string; channel: string; event: string | null; status: string; recipient?: string | null; body?: string | null }[];
    attempts: { created_at: string; status: string; amount_ghs?: number | string | null; channel?: string | null; error_code?: string | null }[];
    refunds: { created_at: string; updated_at?: string | null; amount_ghs: number | string; method: string; status: string; reason?: string | null; who?: string | null; restock?: boolean; units?: number }[];
    fulfilments: { created_at: string; units: number; of: number; who?: string | null }[];
};

const gh = (n: unknown) => `GH₵ ${Number(n ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CH: Record<string, string> = { email: "email", sms: "SMS", whatsapp: "WhatsApp" };

/** What one notification_log row was, in words. */
export function notificationText(n: TimelineSources["notifications"][number]): string {
    const via = CH[n.channel] ?? n.channel;
    const e = (n.event ?? "").toLowerCase();
    let what: string;
    if (e === NOTE_EVENT) what = `Note sent to the customer by ${via}${n.body ? `: “${n.body.slice(0, 140)}${n.body.length > 140 ? "…" : ""}”` : ""}`;
    else if (e.includes("order_confirmed") || e.includes("order-confirmed")) what = `Order confirmation sent by ${via}`;
    else if (e === "refund") what = `Refund receipt sent by ${via}`;
    else if (e.includes("abandoned")) what = `Checkout reminder sent by ${via}`;
    else if (e.includes("pickup")) what = `Customer told by ${via} that the order is ready to collect`;
    else if (e.includes("dispatch") || e.includes("shipped")) what = `Customer told by ${via} that the order is on its way`;
    else if (e.includes("packed")) what = `Customer told by ${via} that the order is being packed`;
    else if (e.includes("fulfilled") || e.includes("delivered")) what = `Delivery message sent by ${via}`;
    else if (e.includes("cancelled")) what = `Cancellation message sent by ${via}`;
    else if (e.includes("pay_link") || e.includes("unpaid")) what = `Payment link sent by ${via}`;
    else if (e.startsWith("order_update:")) what = `Order update sent on WhatsApp`;
    else what = `Message sent to the customer by ${via}`;
    return n.status === "failed" ? `${what.replace(/ sent /, " not sent ").replace(/^Customer told/, "Couldn't tell the customer")} (it didn't go through)` : what;
}

const ATTEMPT: Record<string, [string, TimelineItem["tone"]]> = {
    started: ["Payment started", ""], pending: ["Payment started", ""], paid: ["Payment went through", "ok"],
    failed: ["Payment didn't go through", "warn"], unfinished: ["Payment not finished", "warn"], expired: ["Payment link expired", "warn"], error: ["Payment couldn't start", "warn"],
};
const REFUND_HOW: Record<string, string> = {
    paystack: "through Paystack", cash: "in cash", gift_card: "to the gift card", recorded: "outside the admin (recorded here)",
};

/** Every event for one order, newest first, in plain language. */
export function buildTimeline(s: TimelineSources): TimelineItem[] {
    const out: TimelineItem[] = [];
    out.push({ at: s.order.created_at, text: `Order placed on ${channelLabel(s.order.source).replace("Online shop", "the online shop").replace("POS", "the POS").replace("Shop assistant", "the shop assistant")}`, tone: "" });
    if (s.order.paid_at) out.push({ at: s.order.paid_at, text: `Payment of ${gh(s.order.total_amount)} confirmed`, tone: "ok" });
    if (s.order.ready_at) out.push({ at: s.order.ready_at, text: "Ready for collection", tone: "" });
    for (const a of s.activity) out.push({ at: a.at, text: a.who ? `${a.who} ${a.what}` : a.what.charAt(0).toUpperCase() + a.what.slice(1), tone: "" });
    for (const n of s.notifications) out.push({ at: n.created_at, text: notificationText(n), tone: n.status === "failed" ? "warn" : "" });
    for (const p of s.attempts) {
        const [t, tone] = ATTEMPT[p.status] ?? ["Payment attempt", ""];
        out.push({ at: p.created_at, text: `${t}${p.amount_ghs != null ? ` · ${gh(p.amount_ghs)}` : ""}`, tone });
    }
    for (const r of s.refunds) {
        const how = REFUND_HOW[r.method] ?? "";
        const who = r.who ? `${r.who} refunded` : "Refunded";
        const stock = r.units ? ` · ${r.units} ${r.units === 1 ? "item" : "items"} ${r.restock ? "back in stock" : "not put back in stock"}` : "";
        // Pushed first so that, at the same instant, the failure reads above the refund.
        if (r.status === "failed") out.push({ at: r.updated_at ?? r.created_at, text: `Paystack couldn't complete the refund of ${gh(r.amount_ghs)}. Refund it in the Paystack dashboard.`, tone: "danger" });
        out.push({ at: r.created_at, text: `${who} ${gh(r.amount_ghs)} ${how}${r.reason ? ` · ${r.reason}` : ""}${stock}`.replace(/\s+·/g, " ·"), tone: r.status === "failed" ? "danger" : "ok" });
        if (r.status === "processed" && r.method === "paystack" && r.updated_at && r.updated_at !== r.created_at) {
            out.push({ at: r.updated_at, text: `Paystack finished the refund of ${gh(r.amount_ghs)}`, tone: "ok" });
        }
    }
    for (const f of s.fulfilments) {
        out.push({ at: f.created_at, text: `${f.who ? `${f.who} packed` : "Packed"} ${f.units} of ${f.of} ${f.of === 1 ? "item" : "items"}`, tone: "" });
    }
    return out
        .filter(i => i.at && Number.isFinite(new Date(i.at).getTime()))
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ── Abandoned checkouts (BACKEND_GAPS 22) ────────────────────────────────────

export const RECOVERY_DAYS = 7;

/**
 * Reminders followed by a paid order from the same email within 7 days.
 * Each reminder counts once however many orders followed it.
 */
export function recoveredReminders(
    reminders: { customer_email: string | null; reminded_at: string | null }[],
    paid: { customer_email: string | null; created_at: string | null }[],
): { sent: number; recovered: number } {
    const byEmail = new Map<string, number[]>();
    for (const o of paid) {
        const e = (o.customer_email ?? "").trim().toLowerCase();
        const t = o.created_at ? new Date(o.created_at).getTime() : NaN;
        if (!e || !Number.isFinite(t)) continue;
        byEmail.set(e, [...(byEmail.get(e) ?? []), t]);
    }
    let recovered = 0;
    const valid = reminders.filter(r => r.reminded_at && Number.isFinite(new Date(r.reminded_at).getTime()));
    for (const r of valid) {
        const e = (r.customer_email ?? "").trim().toLowerCase();
        const t = new Date(r.reminded_at!).getTime();
        if ((byEmail.get(e) ?? []).some(p => p > t && p - t <= RECOVERY_DAYS * 86_400_000)) recovered++;
    }
    return { sent: valid.length, recovered };
}

export type AbandonedRange = "today" | "7d" | "30d" | "all";
export const ABANDONED_RANGES: readonly { v: AbandonedRange; l: string; ctx: string }[] = [
    { v: "today", l: "Today", ctx: "today" },
    { v: "7d", l: "7 days", ctx: "in the last 7 days" },
    { v: "30d", l: "30 days", ctx: "in the last 30 days" },
    { v: "all", l: "All time", ctx: "since the shop opened" },
];
export function rangeStart(r: AbandonedRange, now = new Date()): string | null {
    if (r === "all") return null;
    if (r === "today") {
        const d = new Date(now.toLocaleDateString("en-CA", { timeZone: "Africa/Accra" }) + "T00:00:00Z");
        return d.toISOString();
    }
    return new Date(now.getTime() - (r === "7d" ? 7 : 30) * 86_400_000).toISOString();
}

// ── CSV ──────────────────────────────────────────────────────────────────────

const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // A leading = + - @ would run as a formula in a spreadsheet.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export function toCsv(rows: unknown[][]): string {
    return rows.map(r => r.map(cell).join(",")).join("\n");
}
