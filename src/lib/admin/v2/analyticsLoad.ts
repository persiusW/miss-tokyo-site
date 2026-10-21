// Server side of admin v2 Analytics: every figure comes from SQL
// (fn_sales_summary, fn_sales_series, fn_analytics_report) or a paged read, so
// nothing stops quietly at PostgREST's 1000-row cap. Service role, after the
// caller's staff check.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PAID_LEGACY_STATUSES } from "./customers";
import {
    allTimeRange, analyticsRange, figures, shopMidnight, shopYmd, type AnalyticsQuery, type Figures, type ReportKey,
} from "./analytics";

export const LIST_PAGE = 50;
const READ_CHUNK = 1000;

/** The paid rule of fn_sales_summary and customer_spend, as a PostgREST filter. */
export const PAID_FILTER = `payment_status.eq.paid,and(payment_status.is.null,status.in.(${PAID_LEGACY_STATUSES.join(",")}))`;

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabaseAdmin.rpc(fn, args);
    if (error) throw error;
    return data as T;
}

const report = (kind: string, from: Date, to: Date, key?: string) =>
    rpc<Record<string, unknown>>("fn_analytics_report", { p_kind: kind, p_from: from.toISOString(), p_to: to.toISOString(), ...(key ? { p_key: key } : {}) });

export type Overview = {
    from: string; to: string; cmpFrom: string; cmpTo: string; step: number; buckets: number; days: number;
    cur: Figures; prev: Figures | null;
    series: { cur: unknown; prev: unknown };
    top: { key: string; name: string; units: number; sales: number }[];
    productCount: number;
    channels: { channel: string; orders: number; sales: number; placed: number }[];
};

export async function loadOverview(q: AnalyticsQuery, now: Date): Promise<Overview> {
    const r = analyticsRange(q, now);
    const span = { p_from: r.from.toISOString(), p_to: r.to.toISOString(), p_cmp_from: r.cmpFrom.toISOString(), p_cmp_to: r.cmpTo.toISOString() };
    const [summary, series, products, channels] = await Promise.all([
        rpc<{ current?: unknown; compare?: unknown }>("fn_sales_summary", span),
        rpc<{ current?: unknown; compare?: unknown }>("fn_sales_series", { ...span, p_step_seconds: r.step / 1000 }),
        report("products", r.from, r.to),
        report("channels", r.from, r.to),
    ]);
    const rows = (Array.isArray(products?.rows) ? products.rows : []) as Overview["top"];
    return {
        from: r.from.toISOString(), to: r.to.toISOString(), cmpFrom: r.cmpFrom.toISOString(), cmpTo: r.cmpTo.toISOString(),
        step: r.step, buckets: r.buckets, days: r.days,
        cur: figures(summary?.current) ?? figures({})!,
        prev: figures(summary?.compare),
        series: { cur: series?.current ?? [], prev: series?.compare ?? null },
        top: rows.slice(0, 5),
        productCount: rows.length,
        channels: (Array.isArray(channels?.rows) ? channels.rows : []) as Overview["channels"],
    };
}

type Page<T> = { rows: T[]; total: number; page: number; size: number };

/** One page of a list, or every row (in chunks of 1000) for a CSV. */
async function paged<T>(build: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown; error: unknown; count?: number | null }> }, page: number, all: boolean): Promise<Page<T>> {
    if (!all) {
        const from = (page - 1) * LIST_PAGE;
        const { data, error, count } = await build().range(from, from + LIST_PAGE - 1);
        if (error) throw error;
        return { rows: (data ?? []) as T[], total: count ?? 0, page, size: LIST_PAGE };
    }
    const rows: T[] = [];
    let total = 0;
    for (let at = 0; ; at += READ_CHUNK) {
        const { data, error, count } = await build().range(at, at + READ_CHUNK - 1);
        if (error) throw error;
        const got = (data ?? []) as T[];
        rows.push(...got);
        total = count ?? rows.length;
        if (got.length < READ_CHUNK || rows.length >= total) break;
    }
    return { rows, total, page: 1, size: rows.length };
}

export type ReportOpts = { page?: number; all?: boolean; discount?: string | null };

export async function loadReport(key: ReportKey, q: AnalyticsQuery, now: Date, opts: ReportOpts = {}): Promise<Record<string, unknown>> {
    const r = q.scope === "all" ? allTimeRange(now) : analyticsRange(q, now);
    const from = r.from.toISOString(), to = r.to.toISOString();
    const page = Math.max(1, Math.floor(opts.page ?? 1));
    const all = opts.all === true;

    switch (key) {
        case "product": return report("products", r.from, r.to);
        case "variant": return report("variants", r.from, r.to);
        case "channel": return report("channels", r.from, r.to);
        case "cash": return report("cash", r.from, r.to);
        case "writeoffs": return report("writeoffs", r.from, r.to);
        case "regions": return report("regions", r.from, r.to);
        case "customers": return report("customers", r.from, r.to);
        case "timing": return report("timing", r.from, r.to);

        case "discounts": {
            if (opts.discount) return report("discount_orders", r.from, r.to, opts.discount);
            const summary = await report("discounts", r.from, r.to);
            if (!all) return summary;
            // The CSV lists every order behind every discount, as the old export did.
            const orders = await paged<Record<string, unknown>>(() => supabaseAdmin.from("orders")
                .select("id, ref, customer_name, customer_email, total_amount, discount_code, discount_amount, auto_discount_title, auto_discount_amount, created_at", { count: "exact" })
                .or(PAID_FILTER).or("discount_code.not.is.null,auto_discount_title.not.is.null")
                .gte("created_at", from).lt("created_at", to)
                .order("created_at", { ascending: false }).order("id"), 1, true);
            return { ...summary, orders: orders.rows };
        }

        case "payments": {
            const monthStart = shopMidnight(shopYmd(now).slice(0, 8) + "01");
            const [summary, month, list] = await Promise.all([
                report("payments", r.from, r.to),
                rpc<{ current?: unknown }>("fn_sales_summary", { p_from: monthStart.toISOString(), p_to: now.toISOString() }),
                paged<Record<string, unknown>>(() => supabaseAdmin.from("orders")
                    .select("id, ref, customer_name, customer_email, total_amount, paystack_reference, payment_method, created_at", { count: "exact" })
                    .or(PAID_FILTER).gte("created_at", from).lt("created_at", to)
                    .order("created_at", { ascending: false }).order("id"), page, all),
            ]);
            return { ...summary, month: figures(month?.current), list };
        }

        case "riders": {
            const summary = await report("riders", r.from, r.to);
            if (!q.rider) return summary;
            const list = await paged<Record<string, unknown>>(() => supabaseAdmin.from("orders")
                .select("id, ref, customer_name, customer_email, customer_phone, shipping_address, total_amount, status, created_at, delivery_method", { count: "exact" })
                .eq("assigned_rider_id", q.rider!).gte("created_at", from).lt("created_at", to)
                .order("created_at", { ascending: false }).order("id"), page, all);
            return { ...summary, orders: list };
        }
    }
}
