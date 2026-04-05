"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, TrendingUp, BarChart2, FileText, Lightbulb } from "lucide-react";
import { RevenueLineChart, OrdersBarChart, TopItemsList, type DailyPoint, type TopItem } from "./HighlightsTab";
import { SalesByItemTable, SalesByVariantTable, SalesBySourceTable, DiscountPerformanceTable, type ItemRow, type VariantRow, type SourceRow, type DiscountRow } from "./ReportsTab";
import { TrafficTab, type HourlyPoint, type WeekdayPoint, type RegionRow, type NewCustomerPoint, type DemandSignals } from "./TrafficTab";

// ─── Constants ────────────────────────────────────────────────────────────────
// After dual-status migration, filter by payment_status directly in the query.
// REVENUE_STATUSES is no longer needed for the primary filter.
// const REVENUE_STATUSES = ["paid", "packed", "processing", "ready for pickup", "shipped", "fulfilled", "delivered"];

type Preset = "today" | "yesterday" | "7d" | "30d" | "ytd" | "custom";
type Tab = "highlights" | "traffic" | "reports" | "insights";

const PRESETS: { key: Preset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "7d", label: "Past 7 Days" },
    { key: "30d", label: "Past 30 Days" },
    { key: "ytd", label: "Year to Date" },
    { key: "custom", label: "Custom" },
];

const TABS: { key: Tab; label: string; Icon: any }[] = [
    { key: "highlights", label: "Highlights", Icon: TrendingUp },
    { key: "traffic", label: "Traffic", Icon: BarChart2 },
    { key: "reports", label: "Reports", Icon: FileText },
    { key: "insights", label: "Insights", Icon: Lightbulb },
];

function getPresetRange(preset: Preset): { start: Date; end: Date } {
    const now = new Date();
    // Use UTC midnight so date boundaries match Supabase's UTC-stored timestamps
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    switch (preset) {
        case "today":
            return { start: todayUTC, end: now };
        case "yesterday": {
            const y = new Date(todayUTC);
            y.setUTCDate(y.getUTCDate() - 1);
            return { start: y, end: todayUTC };
        }
        case "7d": {
            const d = new Date(todayUTC);
            d.setUTCDate(d.getUTCDate() - 7);
            return { start: d, end: now };
        }
        case "30d": {
            const d = new Date(todayUTC);
            d.setUTCDate(d.getUTCDate() - 30);
            return { start: d, end: now };
        }
        case "ytd":
            return { start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), end: now };
        default: {
            const d = new Date(todayUTC);
            d.setUTCDate(d.getUTCDate() - 30);
            return { start: d, end: now };
        }
    }
}

function fmtDate(iso: string) {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
}

function toInputDate(d: Date) {
    return d.toISOString().substring(0, 10);
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────
type RawOrder = { id: string; status: string; payment_status?: string; total_amount: number; items: any; created_at: string; customer_email?: string; customer_name?: string; source?: string; discount_code?: string | null; discount_amount?: number | null; auto_discount_title?: string | null; paystack_reference?: string | null; shipping_address?: any };

// function aggregateData(orders: RawOrder[], allOrders: RawOrder[]) {
//     // const revenueOrders = orders.filter(o => REVENUE_STATUSES.includes(o.status));

//     // Revenue by date
//     const revByDate: Record<string, number> = {};
//     for (const o of revenueOrders) {
//         const d = o.created_at.substring(0, 10);
//         revByDate[d] = (revByDate[d] ?? 0) + Number(o.total_amount ?? 0);
//     }
//     const revenueChart: DailyPoint[] = Object.entries(revByDate)
//         .sort(([a], [b]) => a.localeCompare(b))
//         .map(([date, value]) => ({ date: fmtDate(date), value: Math.round(value * 100) / 100 }));

//     // Orders by date (all statuses)
//     const ordByDate: Record<string, number> = {};
//     for (const o of allOrders) {
//         const d = o.created_at.substring(0, 10);
//         ordByDate[d] = (ordByDate[d] ?? 0) + 1;
//     }
//     const ordersChart: DailyPoint[] = Object.entries(ordByDate)
//         .sort(([a], [b]) => a.localeCompare(b))
//         .map(([date, value]) => ({ date: fmtDate(date), value }));

//     // Top items + sales by item/variant
//     const itemMap: Record<string, ItemRow> = {};
//     const variantMap: Record<string, VariantRow> = {};

//     // for (const order of revenueOrders) {
//     //     const items: any[] = Array.isArray(order.items) ? order.items : [];
//     //     const lineSum = items.reduce((s: number, i: any) => s + Number(i.price ?? 0) * Number(i.quantity ?? 1), 0);
//     for (const order of revenueOrders) {
//         // BULLETPROOF JSON PARSING: Handles strings, arrays, and nested objects
//         let items: any[] = [];
//         try {
//             const rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
//             // Sometimes it's saved as an array directly
//             if (Array.isArray(rawItems)) {
//                 items = rawItems;
//             }
//             // Sometimes it's nested inside a property like { items: [] } or { products: [] }
//             else if (rawItems && typeof rawItems === 'object') {
//                 items = rawItems.items || rawItems.products || rawItems.cart || [];
//             }
//         } catch (e) {
//             console.error("Failed to parse order items:", e);
//         }

//         const lineSum = items.reduce((s: number, i: any) => s + Number(i.price ?? 0) * Number(i.quantity ?? 1), 0);
//         for (const item of items) {
//             const qty = Number(item.quantity ?? 1);
//             const lineAmt = Number(item.price ?? 0) * qty;
//             const share = lineSum > 0 ? lineAmt / lineSum : 1 / items.length;
//             const rev = Number(order.total_amount ?? 0) * share;
//             const iKey = item.productId || item.name || "Unknown";
//             const name = item.name || iKey.substring(0, 20) || "Unknown";

//             if (!itemMap[iKey]) itemMap[iKey] = { name, productId: iKey, units: 0, revenue: 0 };
//             itemMap[iKey].units += qty;
//             itemMap[iKey].revenue += rev;

//             const size = item.size || "";
//             const color = item.color || "";
//             const vKey = `${iKey}|${size}|${color}`;
//             if (!variantMap[vKey]) variantMap[vKey] = { name, productId: iKey, size, color, units: 0, revenue: 0 };
//             variantMap[vKey].units += qty;
//             variantMap[vKey].revenue += rev;
//         }
//     }

//     const topItems: TopItem[] = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
//     const itemRows: ItemRow[] = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
//     const variantRows: VariantRow[] = Object.values(variantMap).sort((a, b) => b.revenue - a.revenue);

//     const totalRevenue = revenueOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
//     const itemsSold = revenueOrders.flatMap(o => Array.isArray(o.items) ? o.items : [])
//         .reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0);

//     return { revenueChart, ordersChart, topItems, itemRows, variantRows, totalRevenue, itemsSold };
// }

function aggregateData(revenueOrders: RawOrder[], allOrders: RawOrder[]) {
    // 1. THE FIX: Force parse the database strings into real arrays
    for (const o of revenueOrders) {
        if (typeof o.items === "string") {
            try { o.items = JSON.parse(o.items); } catch (e) { o.items = []; }
        }
        if (!Array.isArray(o.items)) o.items = [];
    }
    for (const o of allOrders) {
        if (typeof o.items === "string") {
            try { o.items = JSON.parse(o.items); } catch (e) { o.items = []; }
        }
        if (!Array.isArray(o.items)) o.items = [];
    }

    // 2. Revenue by date
    const revByDate: Record<string, number> = {};
    for (const o of revenueOrders) {
        const d = o.created_at.substring(0, 10);
        revByDate[d] = (revByDate[d] ?? 0) + Number(o.total_amount ?? 0);
    }
    const revenueChart: DailyPoint[] = Object.entries(revByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date: fmtDate(date), value: Math.round(value * 100) / 100 }));

    // 3. Orders by date (all statuses)
    const ordByDate: Record<string, number> = {};
    for (const o of allOrders) {
        const d = o.created_at.substring(0, 10);
        ordByDate[d] = (ordByDate[d] ?? 0) + 1;
    }
    const ordersChart: DailyPoint[] = Object.entries(ordByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date: fmtDate(date), value }));

    // 4. Top items + sales by item/variant
    const itemMap: Record<string, ItemRow> = {};
    const variantMap: Record<string, VariantRow> = {};

    for (const order of revenueOrders) {
        const items = order.items; // This is safely guaranteed to be an array now!
        const lineSum = items.reduce((s: number, i: any) => s + Number(i.price ?? 0) * Number(i.quantity ?? 1), 0);

        for (const item of items) {
            const qty = Number(item.quantity ?? 1);
            const lineAmt = Number(item.price ?? 0) * qty;
            const share = lineSum > 0 ? lineAmt / lineSum : 1 / items.length;
            const rev = Number(order.total_amount ?? 0) * share;

            const iKey = item.productId || item.name || "Unknown";
            const name = item.name || iKey.substring(0, 20) || "Unknown";

            if (!itemMap[iKey]) itemMap[iKey] = { name, productId: iKey, units: 0, revenue: 0 };
            itemMap[iKey].units += qty;
            itemMap[iKey].revenue += rev;

            const size = item.size || "";
            const color = item.color || "";
            const vKey = `${iKey}|${size}|${color}`;
            if (!variantMap[vKey]) variantMap[vKey] = { name, productId: iKey, size, color, units: 0, revenue: 0 };
            variantMap[vKey].units += qty;
            variantMap[vKey].revenue += rev;
        }
    }

    const topItems: TopItem[] = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const itemRows: ItemRow[] = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
    const variantRows: VariantRow[] = Object.values(variantMap).sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = revenueOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

    // 5. Items Sold calculation (This will now properly count the items!)
    const itemsSold = revenueOrders.flatMap(o => o.items)
        .reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0);

    return { revenueChart, ordersChart, topItems, itemRows, variantRows, totalRevenue, itemsSold };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("highlights");
    const [preset, setPreset] = useState<Preset>("30d");
    const [customStart, setCustomStart] = useState(toInputDate(getPresetRange("30d").start));
    const [customEnd, setCustomEnd] = useState(toInputDate(new Date()));
    const [loading, setLoading] = useState(true);
    const [revenueChart, setRevenueChart] = useState<DailyPoint[]>([]);
    const [ordersChart, setOrdersChart] = useState<DailyPoint[]>([]);
    const [topItems, setTopItems] = useState<TopItem[]>([]);
    const [itemRows, setItemRows] = useState<ItemRow[]>([]);
    const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [itemsSold, setItemsSold] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [paidOrdersCount, setPaidOrdersCount] = useState(0);

    // Reports + Traffic
    const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
    const [discountRows, setDiscountRows] = useState<DiscountRow[]>([]);
    const [hourlyOrders, setHourlyOrders] = useState<HourlyPoint[]>([]);
    const [weekdayOrders, setWeekdayOrders] = useState<WeekdayPoint[]>([]);
    const [newCustomers, setNewCustomers] = useState<NewCustomerPoint[]>([]);
    const [regionRows, setRegionRows] = useState<RegionRow[]>([]);
    const [demandSignals, setDemandSignals] = useState<DemandSignals>({ newsletterSignups: 0, customRequests: 0, uniqueCustomers: 0, repeatBuyers: 0 });

    const [insightsData, setInsightsData] = useState<{
        uniqueCustomers: number;
        repeatBuyers: number;
        repeatRate: number;
        topCustomers: { email: string; name: string; orders: number; revenue: number }[];
        avgRevenuePerCustomer: number;
    } | null>(null);

    const dateRange = preset === "custom"
        ? { start: new Date(customStart), end: new Date(customEnd + "T23:59:59") }
        : getPresetRange(preset);

    const dateLabel = preset === "custom"
        ? `${customStart}_${customEnd}`
        : preset;

    // const fetchData = useCallback(async () => {
    //     setLoading(true);
    //     const { start, end } = dateRange;

    //     const { data: allOrders } = await supabase
    //         .from("orders")
    //         .select("id, status, total_amount, items, created_at, customer_email, customer_name")
    //         .gte("created_at", start.toISOString())
    //         .lte("created_at", end.toISOString())
    //         .order("created_at");

    //     const rows = (allOrders ?? []) as RawOrder[];
    //     const revenueRows = rows.filter(o => REVENUE_STATUSES.includes(o.status));

    //     const agg = aggregateData(revenueRows, rows);
    //     setRevenueChart(agg.revenueChart);
    //     setOrdersChart(agg.ordersChart);
    //     setTopItems(agg.topItems);
    //     setItemRows(agg.itemRows);
    //     setVariantRows(agg.variantRows);
    //     setTotalRevenue(agg.totalRevenue);
    //     setItemsSold(agg.itemsSold);
    //     setTotalOrders(rows.length);
    //     // Compute customer insights
    //     const revenueRowsForInsights = rows.filter(o => REVENUE_STATUSES.includes(o.status));
    //     const customerMap: Record<string, { name: string; orders: number; revenue: number }> = {};
    //     for (const o of revenueRowsForInsights) {
    //         const email = o.customer_email || "unknown";
    //         if (!customerMap[email]) customerMap[email] = { name: o.customer_name || email, orders: 0, revenue: 0 };
    //         customerMap[email].orders += 1;
    //     }
    //     for (const o of revenueRowsForInsights) {
    //         const email = o.customer_email || "unknown";
    //         if (customerMap[email]) customerMap[email].revenue += Number(o.total_amount ?? 0);
    //     }
    //     const allCustomers = Object.entries(customerMap);
    //     const uniqueCustomers = allCustomers.length;
    //     const repeatBuyers = allCustomers.filter(([, v]) => v.orders > 1).length;
    //     const totalRevForAvg = allCustomers.reduce((s, [, v]) => s + v.revenue, 0);
    //     setInsightsData({
    //         uniqueCustomers,
    //         repeatBuyers,
    //         repeatRate: uniqueCustomers > 0 ? Math.round((repeatBuyers / uniqueCustomers) * 100) : 0,
    //         topCustomers: allCustomers
    //             .sort(([, a], [, b]) => b.orders - a.orders)
    //             .slice(0, 5)
    //             .map(([email, v]) => ({ email, name: v.name, orders: v.orders, revenue: v.revenue })),
    //         avgRevenuePerCustomer: uniqueCustomers > 0 ? totalRevForAvg / uniqueCustomers : 0,
    //     });
    //     setLoading(false);
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [preset, customStart, customEnd]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { start, end } = dateRange;

        const SELECT_FIELDS = "id, status, payment_status, total_amount, items, created_at, customer_email, customer_name, source, discount_code, discount_amount, auto_discount_title, paystack_reference, shipping_address";

        // Fetch all orders (for order-count + traffic patterns)
        const { data: allOrders } = await supabase
            .from("orders")
            .select(SELECT_FIELDS)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .order("created_at");

        // Demand signals: newsletter signups + bespoke inquiries in this period
        const [{ count: newsletterCount }, { count: inquiryCount }] = await Promise.all([
            supabase.from("newsletter_subs").select("id", { count: "exact", head: true })
                .gte("created_at", start.toISOString())
                .lte("created_at", end.toISOString()),
            supabase.from("custom_requests").select("id", { count: "exact", head: true })
                .gte("created_at", start.toISOString())
                .lte("created_at", end.toISOString()),
        ]);

        const rows = (allOrders ?? []) as RawOrder[];

        // Revenue orders: prefer payment_status='paid'; fall back to legacy status
        // for orders created before the dual-status migration (payment_status may be null).
        const LEGACY_PAID = ["paid", "processing", "fulfilled", "delivered", "packed", "ready_for_pickup", "shipped"];
        const revenueRows = rows.filter(o =>
            o.payment_status === "paid" ||
            (!o.payment_status && LEGACY_PAID.includes(o.status))
        );

        const agg = aggregateData(revenueRows, rows);
        setRevenueChart(agg.revenueChart);
        setOrdersChart(agg.ordersChart);
        setTopItems(agg.topItems);
        setItemRows(agg.itemRows);
        setVariantRows(agg.variantRows);
        setTotalRevenue(agg.totalRevenue);
        setItemsSold(agg.itemsSold);
        setTotalOrders(rows.length);
        setPaidOrdersCount(revenueRows.length);

        // ── Traffic & Reports aggregations ─────────────────────────────────

        // Peak ordering hours (0–23, from all orders)
        const hourMap: Record<number, number> = {};
        for (const o of rows) {
            const h = new Date(o.created_at).getHours();
            hourMap[h] = (hourMap[h] ?? 0) + 1;
        }
        setHourlyOrders(
            Array.from({ length: 24 }, (_, h) => ({
                hour: String(h).padStart(2, "0"),
                value: hourMap[h] ?? 0,
            }))
        );

        // Peak ordering days (Mon–Sun, from all orders)
        const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayMap: Record<number, number> = {};
        for (const o of rows) {
            const d = new Date(o.created_at).getDay();
            dayMap[d] = (dayMap[d] ?? 0) + 1;
        }
        // Reorder Mon–Sun
        setWeekdayOrders(
            [1, 2, 3, 4, 5, 6, 0].map(d => ({ day: DAY_LABELS[d], value: dayMap[d] ?? 0 }))
        );

        // New customer acquisition (first order per email per day, from all orders)
        const seenEmails = new Set<string>();
        const newCustByDate: Record<string, number> = {};
        for (const o of rows) {
            const email = (o.customer_email || "").toLowerCase().trim();
            if (email && !seenEmails.has(email)) {
                seenEmails.add(email);
                const d = o.created_at.substring(0, 10);
                const [, m, dd] = d.split("-");
                newCustByDate[`${dd}/${m}`] = (newCustByDate[`${dd}/${m}`] ?? 0) + 1;
            }
        }
        setNewCustomers(
            Object.entries(newCustByDate).map(([date, value]) => ({ date, value }))
        );

        // Sales by source (all orders for counts, paid orders for revenue)
        const srcMap: Record<string, { orders: number; revenue: number }> = {};
        for (const o of rows) {
            const s = o.source || "storefront";
            if (!srcMap[s]) srcMap[s] = { orders: 0, revenue: 0 };
            srcMap[s].orders += 1;
        }
        for (const o of revenueRows) {
            const s = o.source || "storefront";
            if (!srcMap[s]) srcMap[s] = { orders: 0, revenue: 0 };
            srcMap[s].revenue += Number(o.total_amount ?? 0);
        }
        setSourceRows(
            Object.entries(srcMap)
                .map(([source, v]) => ({ source, orders: v.orders, revenue: v.revenue }))
                .sort((a, b) => b.revenue - a.revenue)
        );

        // Discount performance (paid orders only) — with order-level details
        const discMap: Record<string, { name: string; type: string; uses: number; savings: number; revenue: number; orders: { orderId: string; reference: string | null; customer: string; amount: number; date: string }[] }> = {};
        for (const o of revenueRows) {
            if (!o.discount_code) continue;
            const code = o.discount_code.toUpperCase();
            // auto_discount_title is set on the order for automatic discounts; null/absent = manual coupon
            const isAuto = !!o.auto_discount_title;
            const name = isAuto ? o.auto_discount_title! : code;
            if (!discMap[code]) discMap[code] = { name, type: isAuto ? "automatic" : "coupon", uses: 0, savings: 0, revenue: 0, orders: [] };
            discMap[code].uses += 1;
            discMap[code].savings += Number(o.discount_amount ?? 0);
            discMap[code].revenue += Number(o.total_amount ?? 0);
            const dateStr = o.created_at.substring(0, 10);
            const [yr, m, d] = dateStr.split("-");
            discMap[code].orders.push({
                orderId: o.id,
                reference: o.paystack_reference || null,
                customer: o.customer_name || o.customer_email || "—",
                amount: Number(o.total_amount ?? 0),
                date: `${d}/${m}/${yr.substring(2)}`,
            });
        }
        setDiscountRows(
            Object.entries(discMap)
                .map(([code, v]) => ({ code, ...v }))
                .sort((a, b) => b.revenue - a.revenue)
        );

        // Geographic breakdown from shipping_address.region
        const regionMap: Record<string, number> = {};
        for (const o of rows) {
            const addr = (o as any).shipping_address;
            const region = addr?.region || addr?.city || null;
            if (!region) continue;
            const key = String(region).trim();
            if (key) regionMap[key] = (regionMap[key] ?? 0) + 1;
        }
        setRegionRows(
            Object.entries(regionMap)
                .map(([region, orders]) => ({ region, orders }))
                .sort((a, b) => b.orders - a.orders)
        );

        // Demand signals
        const uniqueCusts = new Set(revenueRows.map(o => (o.customer_email || "").toLowerCase().trim()).filter(Boolean));
        const custOrderCounts: Record<string, number> = {};
        for (const o of revenueRows) {
            const e = (o.customer_email || "").toLowerCase().trim();
            if (e) custOrderCounts[e] = (custOrderCounts[e] ?? 0) + 1;
        }
        const repeatBuyerCount = Object.values(custOrderCounts).filter(c => c > 1).length;
        setDemandSignals({
            newsletterSignups: newsletterCount ?? 0,
            customRequests: inquiryCount ?? 0,
            uniqueCustomers: uniqueCusts.size,
            repeatBuyers: repeatBuyerCount,
        });

        // BULLETPROOF INSIGHTS CALCULATION
        const customerMap: Record<string, { name: string; orders: number; revenue: number }> = {};

        // Notice we are iterating over revenueRows here, NOT rows!
        for (const o of revenueRows) {
            // Lowercase the email so capitalization doesn't create duplicate users
            const email = (o.customer_email || "unknown").toLowerCase().trim();

            if (!customerMap[email]) {
                customerMap[email] = { name: o.customer_name || email, orders: 0, revenue: 0 };
            }
            customerMap[email].orders += 1;
            customerMap[email].revenue += Number(o.total_amount ?? 0);
        }

        const allCustomers = Object.entries(customerMap);
        const uniqueCustomers = allCustomers.length;
        const repeatBuyers = allCustomers.filter(([, v]) => v.orders > 1).length;
        const totalRevForAvg = allCustomers.reduce((s, [, v]) => s + v.revenue, 0);

        // setInsightsData({
        //     uniqueCustomers,
        //     repeatBuyers,
        //     repeatRate: uniqueCustomers > 0 ? Math.round((repeatBuyers / uniqueCustomers) * 100) : 0,
        //     topCustomers: allCustomers
        //         .sort(([, a], [, b]) => b.orders - a.orders)
        //         .slice(0, 5)
        //         .map(([email, v]) => ({ email, name: v.name, orders: v.orders, revenue: v.revenue })),
        //     avgRevenuePerCustomer: uniqueCustomers > 0 ? totalRevForAvg / uniqueCustomers : 0,
        // });

        setInsightsData({
            uniqueCustomers,
            repeatBuyers,
            repeatRate: uniqueCustomers > 0 ? Math.round((repeatBuyers / uniqueCustomers) * 100) : 0,
            topCustomers: allCustomers
                // FIX: Now sorts by Total Revenue instead of Order Count!
                .sort(([, a], [, b]) => b.revenue - a.revenue)
                .slice(0, 5)
                .map(([email, v]) => ({ email, name: v.name, orders: v.orders, revenue: v.revenue })),
            avgRevenuePerCustomer: uniqueCustomers > 0 ? totalRevForAvg / uniqueCustomers : 0,
        });

        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preset, customStart, customEnd]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // const avgOrder = totalOrders > 0
    //     ? (totalRevenue / revenueChart.reduce((s, d) => s + (d.value > 0 ? 1 : 0), 0) || totalRevenue)
    //     : 0;

    const avgOrder = paidOrdersCount > 0 ? (totalRevenue / paidOrdersCount) : 0;

    const kpis = [
        { label: "Revenue", value: `GH₵ ${totalRevenue.toFixed(2)}` },
        { label: "Orders", value: String(totalOrders) },
        { label: "Items Sold", value: String(itemsSold) },
        // { label: "Avg. Order", value: `GH₵ ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00"}` },
        { label: "Avg. Order", value: `GH₵ ${avgOrder.toFixed(2)}` },
    ];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Analytics</h1>
                <p className="text-neutral-500">Revenue performance, order flow, and product insights.</p>
            </header>

            {/* Date Range Picker */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Calendar size={14} className="text-neutral-400" />
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Date Range</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {PRESETS.map(p => (
                        <button
                            key={p.key}
                            onClick={() => setPreset(p.key)}
                            className={`px-4 py-2 text-[11px] uppercase tracking-widest font-semibold rounded-lg transition-all ${preset === p.key
                                ? "bg-black text-white"
                                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                {preset === "custom" && (
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-100">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 whitespace-nowrap">From</label>
                            <input
                                type="date"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                className="border-b border-neutral-300 bg-transparent py-1 px-2 outline-none focus:border-black text-sm transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 whitespace-nowrap">To</label>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                className="border-b border-neutral-300 bg-transparent py-1 px-2 outline-none focus:border-black text-sm transition-colors"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm p-5">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-3">{label}</span>
                        <span className="text-2xl font-serif text-neutral-900">
                            {loading ? <span className="inline-block w-20 h-6 bg-neutral-100 rounded animate-pulse" /> : value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-white rounded-2xl shadow-sm p-1.5">
                {TABS.map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${activeTab === key
                            ? "bg-black text-white shadow-sm"
                            : "text-neutral-400 hover:text-black"
                            }`}
                    >
                        <Icon size={13} />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "highlights" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6">Total Revenue over Time</h2>
                            {loading ? <div className="h-[220px] bg-neutral-50 rounded-xl animate-pulse" /> : <RevenueLineChart data={revenueChart} />}
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6">Orders over Time</h2>
                            {loading ? <div className="h-[220px] bg-neutral-50 rounded-xl animate-pulse" /> : <OrdersBarChart data={ordersChart} />}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6">Top Selling Items</h2>
                        {loading ? <div className="h-40 bg-neutral-50 rounded-xl animate-pulse" /> : <TopItemsList items={topItems} />}
                    </div>
                </div>
            )}

            {activeTab === "traffic" && (
                <TrafficTab
                    loading={loading}
                    hourlyOrders={hourlyOrders}
                    weekdayOrders={weekdayOrders}
                    sourceRows={sourceRows}
                    regionRows={regionRows}
                    newCustomers={newCustomers}
                    demandSignals={demandSignals}
                />
            )}

            {activeTab === "reports" && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white rounded-2xl shadow-sm h-16 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <SalesByItemTable items={itemRows} dateLabel={dateLabel} />
                            <SalesByVariantTable variants={variantRows} dateLabel={dateLabel} />
                            <SalesBySourceTable rows={sourceRows} dateLabel={dateLabel} />
                            <DiscountPerformanceTable rows={discountRows} dateLabel={dateLabel} />
                        </>
                    )}
                </div>
            )}

            {activeTab === "insights" && (
                <div className="space-y-6">
                    {loading || !insightsData ? (
                        <div className="bg-white rounded-2xl shadow-sm h-48 animate-pulse" />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Unique Customers", value: String(insightsData.uniqueCustomers) },
                                    { label: "Repeat Buyers", value: String(insightsData.repeatBuyers) },
                                    { label: "Repeat Rate", value: `${insightsData.repeatRate}%` },
                                    { label: "Avg Rev / Customer", value: `GH₵ ${insightsData.avgRevenuePerCustomer.toFixed(2)}` },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-white rounded-2xl shadow-sm p-5">
                                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-3">{label}</span>
                                        <span className="text-2xl font-serif text-neutral-900">{value}</span>
                                    </div>
                                ))}
                            </div>
                            {insightsData.topCustomers.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm p-6">
                                    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6">Top Customers by Revenue</h2>
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-100">
                                                <th className="pb-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Customer</th>
                                                <th className="pb-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold text-right">Orders</th>
                                                <th className="pb-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-50">
                                            {insightsData.topCustomers.map((c, i) => (
                                                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                                                    <td className="py-3">
                                                        <div className="font-medium text-neutral-900">{c.name !== c.email ? c.name : "—"}</div>
                                                        <div className="text-[11px] text-neutral-400 font-mono">{c.email}</div>
                                                    </td>
                                                    <td className="py-3 text-right font-semibold text-neutral-800">{c.orders}</td>
                                                    <td className="py-3 text-right font-mono text-neutral-700">GH₵ {c.revenue.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {insightsData.uniqueCustomers === 0 && (
                                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                                    <Lightbulb size={40} className="mx-auto text-neutral-200 mb-4" />
                                    <p className="text-neutral-400 italic font-serif">No order data for this period.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
