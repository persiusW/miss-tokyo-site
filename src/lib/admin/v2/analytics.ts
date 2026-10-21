// Analytics' time maths, labels and report tables. Pure: no database, so every
// rule is unit-tested (tests/e2e/unit/admin-v2-analytics.spec.ts). The shop
// runs on Accra time; nothing here reads the server's or the browser's zone.
import { deltaPct, plural } from "@/components/admin/ui/format";
import { SHOP_TZ, startOfShopDay } from "./homeText";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// ── The URL ────────────────────────────────────────────────────────────────

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";
export type CmpKey = "prev" | "year";
export type Scope = "range" | "all";
export type ReportKey =
    | "product" | "variant" | "channel" | "discounts" | "payments" | "riders" | "cash" | "writeoffs"
    | "customers" | "timing" | "regions";

export const RANGES: { v: RangeKey; l: string }[] = [
    { v: "today", l: "Today" }, { v: "7d", l: "7 days" }, { v: "30d", l: "30 days" }, { v: "90d", l: "90 days" }, { v: "custom", l: "Custom" },
];
export const CMPS: { v: CmpKey; l: string }[] = [
    { v: "prev", l: "Compare with the previous period" },
    { v: "year", l: "Compare with the same period last year" },
];
const PRESET_DAYS: Record<Exclude<RangeKey, "custom">, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };

export type AnalyticsQuery = {
    range: RangeKey;
    /** Custom range, shop dates YYYY-MM-DD, both days included. */
    from: string | null;
    to: string | null;
    cmp: CmpKey;
    report: ReportKey | null;
    rider: string | null;
    /** Payments and Riders can also show all time, as their old pages did. */
    scope: Scope;
};

export const DEFAULT_QUERY: AnalyticsQuery = { range: "7d", from: null, to: null, cmp: "prev", report: null, rider: null, scope: "range" };

export const REPORTS: { k: ReportKey; t: string; d: string }[] = [
    { k: "product", t: "Sales by product", d: "Units and money per product, best sellers first." },
    { k: "variant", t: "Sales by size and colour", d: "Which sizes and colours sell, to plan the next cut." },
    { k: "channel", t: "Sales by channel", d: "Online shop, POS, WhatsApp and pay links." },
    { k: "discounts", t: "Discounts", d: "Orders, sales and money given away per discount." },
    { k: "payments", t: "Payments received", d: "Every payment by method: Paystack (card or Mobile money), cash and gift card." },
    { k: "riders", t: "Riders", d: "Deliveries per rider, and each rider's orders." },
    { k: "cash", t: "Cash taken at the POS", d: "What should be in the drawer at close, by day." },
    { k: "writeoffs", t: "Stock written off", d: "Items taken off stock by hand: damaged, lost or corrected." },
    { k: "customers", t: "Customers", d: "Unique and repeat buyers, new customers, sign-ups and top customers." },
    { k: "timing", t: "When people buy", d: "Orders by day, by hour and by day of the week." },
    { k: "regions", t: "Where orders go", d: "Paid orders per delivery region." },
];
const REPORT_KEYS = REPORTS.map(r => r.k);
/** Reports that can also be read for all time. */
export const ALL_TIME_REPORTS: ReportKey[] = ["payments", "riders"];

const YMD = /^\d{4}-\d{2}-\d{2}$/;
function validYmd(v: unknown): string | null {
    if (typeof v !== "string" || !YMD.test(v)) return null;
    const [y, m, d] = v.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? v : null;
}
const one = (v: string | string[] | undefined | null) => (Array.isArray(v) ? v[0] : v) ?? null;

/** Reads the page's URL query. Anything unknown falls back to the default. */
export function parseQuery(sp: Record<string, string | string[] | undefined> | URLSearchParams): AnalyticsQuery {
    const get = (k: string) => (sp instanceof URLSearchParams ? sp.get(k) : one(sp[k]));
    const range = (RANGES.map(r => r.v) as string[]).includes(get("range") ?? "") ? (get("range") as RangeKey) : DEFAULT_QUERY.range;
    const report = (REPORT_KEYS as string[]).includes(get("report") ?? "") ? (get("report") as ReportKey) : null;
    const rider = report === "riders" && /^[0-9a-f-]{8,40}$/i.test(get("rider") ?? "") ? get("rider") : null;
    let from = validYmd(get("from"));
    let to = validYmd(get("to"));
    if (range === "custom" && from && to && from > to) [from, to] = [to, from];
    return {
        range,
        from: range === "custom" ? from : null,
        to: range === "custom" ? to : null,
        cmp: get("cmp") === "year" ? "year" : "prev",
        report,
        rider,
        scope: report && ALL_TIME_REPORTS.includes(report) && get("scope") === "all" ? "all" : "range",
    };
}

/** "?range=30d&report=payments": only what differs from the defaults. */
export function querySearch(q: AnalyticsQuery, patch: Partial<AnalyticsQuery> = {}): string {
    const n = { ...q, ...patch };
    const s = new URLSearchParams();
    if (n.range !== DEFAULT_QUERY.range) s.set("range", n.range);
    if (n.range === "custom") {
        if (n.from) s.set("from", n.from);
        if (n.to) s.set("to", n.to);
    }
    if (n.cmp !== "prev") s.set("cmp", n.cmp);
    if (n.report) {
        s.set("report", n.report);
        if (n.report === "riders" && n.rider) s.set("rider", n.rider);
        if (ALL_TIME_REPORTS.includes(n.report) && n.scope === "all") s.set("scope", "all");
    }
    const str = s.toString();
    return str ? `?${str}` : "";
}

// ── Dates ──────────────────────────────────────────────────────────────────

/** The shop date (YYYY-MM-DD) an instant falls on. */
export function shopYmd(d: Date, tz = SHOP_TZ): string {
    return d.toLocaleDateString("en-CA", { timeZone: tz });
}

/** Shop midnight at the start of a YYYY-MM-DD. */
export function shopMidnight(ymd: string, tz = SHOP_TZ): Date {
    const [y, m, d] = ymd.split("-").map(Number);
    return startOfShopDay(new Date(Date.UTC(y, m - 1, d, 12)), tz);
}

/** The same instant one calendar year earlier; 29 February becomes the 28th. */
export function minusYear(d: Date): Date {
    const x = new Date(d.getTime());
    const month = x.getUTCMonth();
    x.setUTCFullYear(x.getUTCFullYear() - 1);
    if (x.getUTCMonth() !== month) x.setUTCDate(0);
    return x;
}

export type Range = {
    from: Date;
    to: Date;
    cmpFrom: Date;
    cmpTo: Date;
    /** Shop days the range spans (1 for Today). */
    days: number;
    /** Chart bucket: an hour for a single day, otherwise a day. */
    step: number;
    buckets: number;
};

/**
 * The dates for the page. Presets end now and start at the shop's midnight
 * (Today) or that many days back including today, like Home. Custom runs from
 * the first day's midnight to the end of the last day, or to now when the last
 * day is today. "Previous period" is the same stretch straight before, cut at
 * the same time of day; "same period last year" is both ends a year back.
 * Every range is half-open [from, to).
 */
export function analyticsRange(q: Pick<AnalyticsQuery, "range" | "from" | "to" | "cmp">, now: Date, tz = SHOP_TZ): Range {
    let from: Date, to: Date, days: number;
    const today = startOfShopDay(now, tz);
    if (q.range === "custom") {
        const fallbackFrom = shopYmd(new Date(today.getTime() - 29 * DAY), tz);
        const a = q.from ?? fallbackFrom;
        const b = q.to ?? shopYmd(now, tz);
        from = shopMidnight(a, tz);
        const end = new Date(shopMidnight(b, tz).getTime() + DAY);
        to = end.getTime() > now.getTime() ? now : end;
        if (to.getTime() <= from.getTime()) to = new Date(from.getTime() + 1);
        days = Math.max(1, Math.round((shopMidnight(b, tz).getTime() - from.getTime()) / DAY) + 1);
    } else {
        days = PRESET_DAYS[q.range];
        from = new Date(today.getTime() - (days - 1) * DAY);
        to = now;
    }
    const step = days === 1 ? HOUR : DAY;
    const buckets = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / step));
    const [cmpFrom, cmpTo] = q.cmp === "year"
        ? [minusYear(from), minusYear(to)]
        : [new Date(from.getTime() - days * DAY), new Date(to.getTime() - days * DAY)];
    return { from, to, cmpFrom, cmpTo, days, step, buckets };
}

/** All time, for Payments and Riders: from the first order to now. */
export function allTimeRange(now: Date): { from: Date; to: Date } {
    return { from: new Date(Date.UTC(2000, 0, 1)), to: now };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "15 Oct", or "15 Oct 2026" with the year. Fixed month names: en-GB says "Sept" in some runtimes. */
export function dayMonth(d: Date, year = false, tz = SHOP_TZ): string {
    const [y, m, day] = shopYmd(d, tz).split("-").map(Number);
    return `${day} ${MONTHS[m - 1]}${year ? " " + y : ""}`;
}

/** "15–21 Oct 2026", "28 Sep – 4 Oct 2026", "21 Oct 2026". `to` is exclusive. */
export function datesText(from: Date, to: Date, tz = SHOP_TZ): string {
    const last = new Date(Math.max(from.getTime(), to.getTime() - 1));
    const [fy, fm, fd] = shopYmd(from, tz).split("-");
    const [ly, lm, ld] = shopYmd(last, tz).split("-");
    if (fy === ly && fm === lm && fd === ld) return dayMonth(from, true, tz);
    if (fy === ly && fm === lm) return `${Number(fd)}–${dayMonth(last, true, tz)}`;
    if (fy === ly) return `${dayMonth(from, false, tz)} – ${dayMonth(last, true, tz)}`;
    return `${dayMonth(from, true, tz)} – ${dayMonth(last, true, tz)}`;
}

export const PAID_ONLY = "Paid orders only. Cancelled and refunded orders are left out.";

/** Label for chart bucket i: "09:00" by the hour, "15 Oct" by the day. */
export function bucketLabel(r: Pick<Range, "from" | "step">, i: number, tz = SHOP_TZ): string {
    const d = new Date(r.from.getTime() + i * r.step);
    if (r.step === HOUR) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz });
    return dayMonth(d, false, tz);
}

// ── KPIs ───────────────────────────────────────────────────────────────────

export type Figures = {
    sales: number; orders: number; items: number; aov: number;
    known_orders: number; returning_orders: number; customers: number;
};

export function figures(v: unknown): Figures | null {
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const n = (k: keyof Figures) => (Number.isFinite(Number(o[k])) ? Number(o[k]) : 0);
    return {
        sales: n("sales"), orders: n("orders"), items: n("items"), aov: n("aov"),
        known_orders: n("known_orders"), returning_orders: n("returning_orders"), customers: n("customers"),
    };
}

/** Whole-percent share of orders from known customers who had ordered before; null with no known orders. */
export function returningRate(f: Pick<Figures, "known_orders" | "returning_orders">): number | null {
    return f.known_orders > 0 ? Math.round((f.returning_orders / f.known_orders) * 100) : null;
}

export type Deltas = { sales: number | null; orders: number | null; aov: number | null; returning: number | null };

/** Sales, orders and average order change in percent; the returning share changes in percentage points. */
export function deltas(cur: Figures, prev: Figures | null): Deltas {
    if (!prev) return { sales: null, orders: null, aov: null, returning: null };
    const a = returningRate(cur), b = returningRate(prev);
    return {
        sales: deltaPct(cur.sales, prev.sales),
        orders: deltaPct(cur.orders, prev.orders),
        aov: deltaPct(cur.aov, prev.aov),
        returning: a != null && b != null ? a - b : null,
    };
}

/** The KPI's comparison line. */
export function cmpText(q: Pick<AnalyticsQuery, "range" | "cmp">, days: number): string {
    if (q.cmp === "year") return "vs same period last year";
    if (q.range === "today") return "vs same time yesterday";
    return days === 1 ? "vs the day before" : `vs previous ${days} days`;
}

/** The line when there's no arrow because the other period had none. */
export function noneText(q: Pick<AnalyticsQuery, "range" | "cmp">, days: number, what = "none"): string {
    if (q.cmp === "year") return `${what} in the same period last year`;
    if (q.range === "today") return `${what} by this time yesterday`;
    return days === 1 ? `${what} the day before` : `${what} in the previous ${days} days`;
}

export function kpiCtx(q: Pick<AnalyticsQuery, "range" | "cmp">, days: number, delta: number | null, prevValue: number | null): string {
    if (delta == null && prevValue === 0) return noneText(q, days);
    return cmpText(q, days);
}

/** "of 140 orders with an email" for the Returning customers KPI. */
export function returningCtx(cur: Pick<Figures, "known_orders">): string {
    return cur.known_orders > 0 ? `of ${plural(cur.known_orders, "order")} with a customer email` : "no orders with a customer email yet";
}

/** Sparse SQL buckets → one value per bucket, zero where nothing sold. */
export function fillSeries(points: unknown, buckets: number, key: "sales" | "orders" = "sales"): number[] {
    const out = new Array<number>(Math.max(0, buckets)).fill(0);
    if (!Array.isArray(points)) return out;
    for (const p of points as { i?: unknown; sales?: unknown; orders?: unknown }[]) {
        const i = Number(p?.i);
        if (Number.isInteger(i) && i >= 0 && i < out.length) out[i] += Number(p[key]) || 0;
    }
    return out;
}

// ── Labels ─────────────────────────────────────────────────────────────────

export const CHANNEL_LABEL: Record<string, string> = {
    storefront: "Online shop", pos: "POS", pay_link: "Pay link", whatsapp: "WhatsApp", web_chat: "Shop assistant",
};
export const channelName = (c: string) => CHANNEL_LABEL[c] ?? "Other";

/** Paystack doesn't tell us whether a payment was a card or Mobile money, so the label says both. */
export const METHOD_LABEL: Record<string, string> = {
    paystack: "Paystack (card or Mobile money)", cash: "Cash", gift_card: "Gift card",
};
export const methodName = (m: string | null | undefined) => METHOD_LABEL[m ?? ""] ?? "Other";

/** What each stock-ledger reason in the write-off report means. */
export const WRITEOFF_REASON: Record<string, string> = {
    write_off: "Written off (damaged or lost)",
    admin_adjust: "Taken off by hand",
    correction: "Correction",
};
export const writeoffReason = (r: string) => WRITEOFF_REASON[r] ?? r;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Tables and CSV ─────────────────────────────────────────────────────────

export type ColKind = "text" | "int" | "money" | "pct" | "date";
export type Col = { h: string; kind: ColKind };
export type Cell = string | number | null;
export type Table = { cols: Col[]; rows: Cell[][]; foot?: Cell[] };

const T = (h: string): Col => ({ h, kind: "text" });
const I = (h: string): Col => ({ h, kind: "int" });
const M = (h: string): Col => ({ h, kind: "money" });
const P = (h: string): Col => ({ h, kind: "pct" });
const D = (h: string): Col => ({ h, kind: "date" });

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const sum = (rows: Cell[][], i: number) => rows.reduce((s, r) => s + num(r[i]), 0);
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

export function productTable(rows: unknown): Table {
    const r = arr(rows).map(x => [str(x.name) || "Unknown", num(x.units), num(x.sales)] as Cell[]);
    return { cols: [T("Product"), I("Units"), M("Sales")], rows: r, foot: ["Total", sum(r, 1), sum(r, 2)] };
}

export function variantTable(rows: unknown): Table {
    const r = arr(rows).map(x => [str(x.name) || "Unknown", str(x.size) || "—", str(x.color) || "—", num(x.units), num(x.sales)] as Cell[]);
    return { cols: [T("Product"), T("Size"), T("Colour"), I("Units"), M("Sales")], rows: r, foot: ["Total", null, null, sum(r, 3), sum(r, 4)] };
}

export function channelTable(rows: unknown): Table {
    const xs = arr(rows);
    const paid = xs.reduce((s, x) => s + num(x.orders), 0);
    const r = xs.map(x => [channelName(str(x.channel)), num(x.orders), paid > 0 ? Math.round((num(x.orders) / paid) * 100) : 0, num(x.sales), num(x.placed)] as Cell[]);
    return {
        cols: [T("Channel"), I("Paid orders"), P("Share"), M("Sales"), I("Orders placed, any status")],
        rows: r,
        foot: ["Total", sum(r, 1), paid > 0 ? 100 : 0, sum(r, 3), sum(r, 4)],
    };
}

export function discountTable(rows: unknown): Table {
    const r = arr(rows).map(x => [str(x.label), x.type === "auto" ? "Automatic" : "Code", num(x.uses), num(x.given), num(x.sales)] as Cell[]);
    return { cols: [T("Discount"), T("Type"), I("Orders"), M("Given away"), M("Sales")], rows: r, foot: ["Total", null, sum(r, 2), sum(r, 3), sum(r, 4)] };
}

export function paymentMethodTable(rows: unknown): Table {
    const r = arr(rows).map(x => [methodName(str(x.method)), num(x.payments), num(x.amount)] as Cell[]);
    return { cols: [T("Method"), I("Payments"), M("Amount")], rows: r, foot: ["Total", sum(r, 1), sum(r, 2)] };
}

/** Order number as staff see it: the ref, or the first 8 of the id. */
export const orderRef = (x: { ref?: unknown; id?: unknown }) => (str(x.ref) || str(x.id).slice(0, 8)).toUpperCase();

/** Every payment, newest first (the old Payments page). */
export function paymentListTable(rows: unknown): Table {
    const r = arr(rows).map(x => [
        orderRef(x), str(x.paystack_reference) || "—", str(x.customer_name) || "—", str(x.customer_email) || "—",
        methodName(str(x.payment_method)), num(x.total_amount), str(x.created_at),
    ] as Cell[]);
    return { cols: [T("Order"), T("Paystack ref"), T("Customer"), T("Email"), T("Method"), M("Amount"), D("Date")], rows: r };
}

/** An order's status in words, for the rider report. */
export const ORDER_STATUS: Record<string, string> = {
    pending: "Waiting for payment", paid: "Paid", processing: "Paid", packed: "Packed", shipped: "On the way",
    ready_for_pickup: "Ready for collection", fulfilled: "Delivered", delivered: "Delivered", refunded: "Refunded",
    cancelled: "Cancelled", failed: "Payment failed", reservation_expired: "Expired",
};

/** One rider's orders (the old rider page). */
export function riderOrdersTable(rows: unknown): Table {
    const r = arr(rows).map(x => {
        const a = (x.shipping_address && typeof x.shipping_address === "object" ? x.shipping_address : {}) as Record<string, unknown>;
        return [
            orderRef(x), str(x.customer_name) || str(x.customer_email) || "—", str(x.customer_phone) || "—",
            str(a.text) || str(a.address) || str(a.city) || "—", num(x.total_amount), ORDER_STATUS[str(x.status)] ?? str(x.status), str(x.created_at),
        ] as Cell[];
    });
    return { cols: [T("Order"), T("Customer"), T("Phone"), T("Address"), M("Amount"), T("Status"), D("Date")], rows: r };
}

/**
 * Discounted orders → one line per order and discount: an order with a code
 * and an automatic discount appears under each, with that discount's amount.
 * Codes are matched without case, as fn_analytics_report groups them.
 */
export function discountOrderLines(orders: unknown): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = [];
    for (const o of arr(orders)) {
        const base = { id: o.id, ref: o.ref, customer: str(o.customer_name) || str(o.customer_email) || null, amount: num(o.total_amount), at: o.created_at };
        if (str(o.discount_code)) out.push({ ...base, label: str(o.discount_code).toUpperCase(), type: "code", given: num(o.discount_amount) });
        if (str(o.auto_discount_title)) out.push({ ...base, label: str(o.auto_discount_title), type: "auto", given: num(o.auto_discount_amount) });
    }
    return out;
}

/** The orders behind discounts, one line per order and discount (the old discount export). */
export function discountOrdersTable(rows: unknown): Table {
    const r = arr(rows).map(x => [
        str(x.label), x.type === "auto" ? "Automatic" : "Code", orderRef(x), str(x.customer) || "—", num(x.amount), num(x.given), str(x.at),
    ] as Cell[]);
    return { cols: [T("Discount"), T("Type"), T("Order"), T("Customer"), M("Order amount"), M("Given away"), D("Date")], rows: r };
}

export function cashTable(rows: unknown): Table {
    const r = arr(rows).map(x => [str(x.d), num(x.till_sales), num(x.cash_orders), num(x.cash)] as Cell[]);
    return { cols: [D("Day"), I("POS sales"), I("Paid in cash"), M("Cash")], rows: r, foot: ["Total", sum(r, 1), sum(r, 2), sum(r, 3)] };
}

export function writeoffTable(rows: unknown): Table {
    const r = arr(rows).map(x => [
        str(x.at), str(x.product) || "Deleted product",
        [str(x.size), str(x.color)].filter(Boolean).join(" / ") || "—",
        num(x.qty), writeoffReason(str(x.reason)), str(x.note) || "—", str(x.by) || "—",
    ] as Cell[]);
    return {
        cols: [D("Date"), T("Product"), T("Size / colour"), I("Items"), T("Why"), T("Note"), T("By")],
        rows: r,
        foot: ["Total", null, null, sum(r, 3), null, null, null],
    };
}

export function riderTable(rows: unknown): Table {
    const r = arr(rows).map(x => [
        str(x.name), str(x.phone) || "—", str(x.bike_reg) || "—", num(x.total), num(x.in_transit), num(x.delivered), num(x.cancelled), num(x.value),
        x.active === true ? "Active" : "Inactive", str(x.last_at) || null,
    ] as Cell[]);
    return {
        cols: [T("Rider"), T("Phone"), T("Bike reg"), I("Orders"), I("On the way"), I("Delivered"), I("Cancelled"), M("Order value"), T("Status"), D("Last order")],
        rows: r,
        foot: ["Total", null, null, sum(r, 3), sum(r, 4), sum(r, 5), sum(r, 6), sum(r, 7), null, null],
    };
}

export function regionTable(rows: unknown): Table {
    const r = arr(rows).map(x => [str(x.region), num(x.orders), num(x.sales)] as Cell[]);
    return { cols: [T("Region"), I("Paid orders"), M("Sales")], rows: r, foot: ["Total", sum(r, 1), sum(r, 2)] };
}

export function topCustomerTable(rows: unknown): Table {
    const r = arr(rows).map(x => [str(x.name) === str(x.email) ? "—" : str(x.name), str(x.email), num(x.orders), num(x.sales)] as Cell[]);
    return { cols: [T("Customer"), T("Email"), I("Paid orders"), M("Spent")] , rows: r };
}

export type CustomerFigures = { unique: number; repeat: number; repeatRate: number | null; avgPerCustomer: number | null };
/** The old Insights figures, over customers with an email. */
export function customerFigures(v: unknown): CustomerFigures {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    const unique = num(o.unique), repeat = num(o.repeat), sales = num(o.sales);
    return {
        unique, repeat,
        repeatRate: unique > 0 ? Math.round((repeat / unique) * 100) : null,
        avgPerCustomer: unique > 0 ? sales / unique : null,
    };
}

export function hourTable(rows: unknown): Table {
    const by = new Map(arr(rows).map(x => [num(x.h), x]));
    const r = Array.from({ length: 24 }, (_, h) => [`${String(h).padStart(2, "0")}:00`, num(by.get(h)?.n), num(by.get(h)?.sales)] as Cell[]);
    return { cols: [T("Hour"), I("Paid orders"), M("Sales")], rows: r };
}

export function weekdayTable(rows: unknown): Table {
    const by = new Map(arr(rows).map(x => [num(x.wd), x]));
    const r = WEEKDAYS.map((l, i) => [l, num(by.get(i + 1)?.n), num(by.get(i + 1)?.sales)] as Cell[]);
    return { cols: [T("Day"), I("Paid orders"), M("Sales")], rows: r };
}

export function dayTable(rows: unknown): Table {
    const r = arr(rows).map(x => [str(x.d), num(x.paid), num(x.sales), num(x.placed)] as Cell[]);
    return { cols: [D("Day"), I("Paid orders"), M("Sales"), I("Orders placed, any status")], rows: r, foot: ["Total", sum(r, 1), sum(r, 2), sum(r, 3)] };
}

/** A timestamp as the shop's "YYYY-MM-DD HH:MM"; a plain date stays as it is. */
export function csvDate(v: string, tz = SHOP_TZ): string {
    if (YMD.test(v)) return v;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz });
    return `${shopYmd(d, tz)} ${time}`;
}

/** A shop date "YYYY-MM-DD", not a timestamp. */
export function isYmd(v: string): boolean {
    return YMD.test(v);
}

/** One CSV cell. Text that a spreadsheet would run as a formula is prefixed with '. */
export function csvCell(v: Cell, kind: ColKind = "text"): string {
    if (v == null) return "";
    if (typeof v === "number") return kind === "money" ? v.toFixed(2) : String(v);
    let s = kind === "date" ? csvDate(v) : v;
    if (/^[=+@\t\r]/.test(s) || /^-(?![\d.])/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const colHead = (c: Col) => (c.kind === "money" ? `${c.h} (GH₵)` : c.kind === "pct" ? `${c.h} (%)` : c.h);

/** A table as CSV, header first, the total row last. */
export function tableCsv(t: Table): string {
    const line = (cells: Cell[]) => t.cols.map((c, i) => csvCell(cells[i] ?? null, c.kind)).join(",");
    return [t.cols.map(c => csvCell(colHead(c))).join(","), ...t.rows.map(line), ...(t.foot ? [line(t.foot)] : [])].join("\n");
}

/** Several titled tables in one file, a blank line between them. */
export function sectionsCsv(parts: { title: string; table: Table }[]): string {
    return parts.map(p => `${csvCell(p.title)}\n${tableCsv(p.table)}`).join("\n\n");
}

/** "sales-by-product_2026-10-15_2026-10-21.csv". */
export function csvName(slug: string, from: Date, to: Date, tz = SHOP_TZ): string {
    const last = new Date(Math.max(from.getTime(), to.getTime() - 1));
    return `${slug}_${shopYmd(from, tz)}_${shopYmd(last, tz)}.csv`;
}

export function reportSlug(k: ReportKey): string {
    return (REPORTS.find(r => r.k === k)?.t ?? k).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The overview as CSV: the four KPIs for both periods, then sales per bucket. */
export function overviewCsv(o: {
    cur: Figures; prev: Figures | null; labels: string[]; cmpLabels: string[]; sales: number[]; orders: number[]; prevSales: number[] | null; prevOrders: number[] | null;
}): string {
    const rate = (f: Figures | null) => (f ? returningRate(f) : null);
    const kpis: Table = {
        cols: [T("Figure"), T("This period"), T("Compared period")],
        rows: [
            ["Sales (GH₵)", o.cur.sales.toFixed(2), o.prev ? o.prev.sales.toFixed(2) : null],
            ["Paid orders", String(o.cur.orders), o.prev ? String(o.prev.orders) : null],
            ["Items sold", String(o.cur.items), o.prev ? String(o.prev.items) : null],
            ["Average order (GH₵)", o.cur.aov.toFixed(2), o.prev ? o.prev.aov.toFixed(2) : null],
            ["Returning customers (% of orders with an email)", rate(o.cur)?.toString() ?? null, rate(o.prev)?.toString() ?? null],
        ],
    };
    const series: Table = {
        cols: [T("Period"), M("Sales"), I("Paid orders"), T("Compared with"), M("Compared sales"), I("Compared orders")],
        rows: o.labels.map((l, i) => [l, o.sales[i] ?? 0, o.orders[i] ?? 0, o.cmpLabels[i] ?? null, o.prevSales?.[i] ?? null, o.prevOrders?.[i] ?? null]),
    };
    return sectionsCsv([{ title: "Summary", table: kpis }, { title: "Sales over time", table: series }]);
}
