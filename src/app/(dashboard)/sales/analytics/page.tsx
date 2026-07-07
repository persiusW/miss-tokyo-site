"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { RevenueLineChart, OrdersBarChart, TopItemsList, type DailyPoint, type TopItem } from "./HighlightsTab";
import { SalesByItemTable, SalesByVariantTable, SalesBySourceTable, DiscountPerformanceTable, type ItemRow, type VariantRow, type SourceRow, type DiscountRow } from "./ReportsTab";
import { TrafficTab, type HourlyPoint, type WeekdayPoint, type RegionRow, type NewCustomerPoint, type DemandSignals } from "./TrafficTab";

type Preset = "today" | "yesterday" | "7d" | "30d" | "ytd" | "custom";
type Tab = "highlights" | "traffic" | "reports" | "insights";

const PRESETS: { key: Preset; label: string }[] = [
    { key: "today",     label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "7d",        label: "Past 7 Days" },
    { key: "30d",       label: "Past 30 Days" },
    { key: "ytd",       label: "Year to Date" },
    { key: "custom",    label: "Custom" },
];

const TABS: { key: Tab; label: string }[] = [
    { key: "highlights", label: "Highlights" },
    { key: "traffic",    label: "Traffic" },
    { key: "reports",    label: "Reports" },
    { key: "insights",  label: "Insights" },
];

function getPresetRange(preset: Preset): { start: Date; end: Date } {
    const now = new Date();
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

type RawOrder = { id: string; status: string; payment_status?: string; total_amount: number; items: any; created_at: string; customer_email?: string; customer_name?: string; source?: string; discount_code?: string | null; discount_amount?: number | null; auto_discount_title?: string | null; paystack_reference?: string | null; shipping_address?: any };

function aggregateData(revenueOrders: RawOrder[], allOrders: RawOrder[]) {
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

    const revByDate: Record<string, number> = {};
    for (const o of revenueOrders) {
        const d = o.created_at.substring(0, 10);
        revByDate[d] = (revByDate[d] ?? 0) + Number(o.total_amount ?? 0);
    }
    const revenueChart: DailyPoint[] = Object.entries(revByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date: fmtDate(date), value: Math.round(value * 100) / 100 }));

    const ordByDate: Record<string, number> = {};
    for (const o of allOrders) {
        const d = o.created_at.substring(0, 10);
        ordByDate[d] = (ordByDate[d] ?? 0) + 1;
    }
    const ordersChart: DailyPoint[] = Object.entries(ordByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date: fmtDate(date), value }));

    const itemMap: Record<string, ItemRow> = {};
    const variantMap: Record<string, VariantRow> = {};

    for (const order of revenueOrders) {
        const items = order.items;
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
    const itemsSold = revenueOrders.flatMap(o => o.items)
        .reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0);

    return { revenueChart, ordersChart, topItems, itemRows, variantRows, totalRevenue, itemsSold };
}

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

    const dateLabel = preset === "custom" ? `${customStart}_${customEnd}` : preset;

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { start, end } = dateRange;

        const SELECT_FIELDS = "id, status, payment_status, total_amount, items, created_at, customer_email, customer_name, source, discount_code, discount_amount, auto_discount_title, paystack_reference, shipping_address";

        const { data: allOrders } = await supabase
            .from("orders")
            .select(SELECT_FIELDS)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .order("created_at");

        const [{ count: newsletterCount }, { count: inquiryCount }] = await Promise.all([
            supabase.from("newsletter_subs").select("id", { count: "exact", head: true })
                .gte("created_at", start.toISOString())
                .lte("created_at", end.toISOString()),
            supabase.from("custom_requests").select("id", { count: "exact", head: true })
                .gte("created_at", start.toISOString())
                .lte("created_at", end.toISOString()),
        ]);

        const rows = (allOrders ?? []) as RawOrder[];

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

        const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayMap: Record<number, number> = {};
        for (const o of rows) {
            const d = new Date(o.created_at).getDay();
            dayMap[d] = (dayMap[d] ?? 0) + 1;
        }
        setWeekdayOrders(
            [1, 2, 3, 4, 5, 6, 0].map(d => ({ day: DAY_LABELS[d], value: dayMap[d] ?? 0 }))
        );

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

        const discMap: Record<string, { name: string; type: string; uses: number; savings: number; revenue: number; orders: { orderId: string; reference: string | null; customer: string; amount: number; date: string }[] }> = {};
        for (const o of revenueRows) {
            if (!o.discount_code) continue;
            const code = o.discount_code.toUpperCase();
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

        const customerMap: Record<string, { name: string; orders: number; revenue: number }> = {};
        for (const o of revenueRows) {
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

        setInsightsData({
            uniqueCustomers,
            repeatBuyers,
            repeatRate: uniqueCustomers > 0 ? Math.round((repeatBuyers / uniqueCustomers) * 100) : 0,
            topCustomers: allCustomers
                .sort(([, a], [, b]) => b.revenue - a.revenue)
                .slice(0, 5)
                .map(([email, v]) => ({ email, name: v.name, orders: v.orders, revenue: v.revenue })),
            avgRevenuePerCustomer: uniqueCustomers > 0 ? totalRevForAvg / uniqueCustomers : 0,
        });

        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preset, customStart, customEnd]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const avgOrder = paidOrdersCount > 0 ? (totalRevenue / paidOrdersCount) : 0;

    const kpis = [
        { label: "Revenue",    value: `GH₵ ${totalRevenue.toFixed(2)}`, sub: "Paid orders" },
        { label: "Orders",     value: String(totalOrders),               sub: "All statuses" },
        { label: "Items Sold", value: String(itemsSold),                 sub: "Paid orders" },
        { label: "Avg. Order", value: `GH₵ ${avgOrder.toFixed(2)}`,     sub: "Per paid order" },
    ];

    return (
        <>
            {/* Page heading */}
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Analytics</h1>
                    <p className="ac-page-sub">Revenue performance, order flow, and product insights.</p>
                </div>
            </div>

            {/* Date Range Picker */}
            <div className="ac-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ac-ink-4)" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)" }}>Date Range</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {PRESETS.map(p => (
                        <button
                            key={p.key}
                            onClick={() => setPreset(p.key)}
                            className={`ac-btn ac-btn-sm ${preset === p.key ? "ac-btn-primary" : "ac-btn-ghost"}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                {preset === "custom" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--ac-line)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)", whiteSpace: "nowrap" }}>From</label>
                            <input
                                type="date"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                className="ac-input"
                                style={{ width: "auto" }}
                            />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)", whiteSpace: "nowrap" }}>To</label>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                className="ac-input"
                                style={{ width: "auto" }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Strip */}
            <div className="ac-kpi-grid">
                {kpis.map(({ label, value, sub }) => (
                    <div key={label} className="ac-kpi">
                        <div className="ac-kpi-label">{label}</div>
                        <div className="ac-kpi-value">
                            {loading
                                ? <span style={{ display: "inline-block", width: 80, height: 28, background: "var(--ac-panel-2)", borderRadius: "var(--r-sm)", animation: "pulse 1.5s infinite" }} />
                                : value}
                        </div>
                        <div className="ac-kpi-sub">{sub}</div>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="ac-tabs">
                {TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`ac-tab ${activeTab === key ? "active" : ""}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "highlights" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div className="ac-card" style={{ padding: 24 }}>
                            <h2 className="ac-card-title" style={{ marginBottom: 20 }}>Total Revenue over Time</h2>
                            {loading
                                ? <div style={{ height: 220, background: "var(--ac-panel-2)", borderRadius: "var(--r-md)" }} />
                                : <RevenueLineChart data={revenueChart} />}
                        </div>
                        <div className="ac-card" style={{ padding: 24 }}>
                            <h2 className="ac-card-title" style={{ marginBottom: 20 }}>Orders over Time</h2>
                            {loading
                                ? <div style={{ height: 220, background: "var(--ac-panel-2)", borderRadius: "var(--r-md)" }} />
                                : <OrdersBarChart data={ordersChart} />}
                        </div>
                    </div>
                    <div className="ac-card" style={{ padding: 24 }}>
                        <h2 className="ac-card-title" style={{ marginBottom: 20 }}>Top Selling Items</h2>
                        {loading
                            ? <div style={{ height: 160, background: "var(--ac-panel-2)", borderRadius: "var(--r-md)" }} />
                            : <TopItemsList items={topItems} />}
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
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {loading ? (
                        <>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="ac-card" style={{ height: 64 }} />
                            ))}
                        </>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {loading || !insightsData ? (
                        <div className="ac-card" style={{ height: 192 }} />
                    ) : (
                        <>
                            <div className="ac-kpi-grid">
                                {[
                                    { label: "Unique Customers",    value: String(insightsData.uniqueCustomers) },
                                    { label: "Repeat Buyers",       value: String(insightsData.repeatBuyers) },
                                    { label: "Repeat Rate",         value: `${insightsData.repeatRate}%` },
                                    { label: "Avg Rev / Customer",  value: `GH₵ ${insightsData.avgRevenuePerCustomer.toFixed(2)}` },
                                ].map(({ label, value }) => (
                                    <div key={label} className="ac-kpi">
                                        <div className="ac-kpi-label">{label}</div>
                                        <div className="ac-kpi-value">{value}</div>
                                    </div>
                                ))}
                            </div>
                            {insightsData.topCustomers.length > 0 && (
                                <div className="ac-card flush">
                                    <div className="ac-card-head" style={{ padding: "16px 20px 0" }}>
                                        <h2 className="ac-card-title">Top Customers by Revenue</h2>
                                    </div>
                                    <div className="ac-table-wrap">
                                        <table className="ac-table">
                                            <thead>
                                                <tr>
                                                    <th>Customer</th>
                                                    <th className="r">Orders</th>
                                                    <th className="r">Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {insightsData.topCustomers.map((c, i) => (
                                                    <tr key={i}>
                                                        <td>
                                                            <div style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{c.name !== c.email ? c.name : "—"}</div>
                                                            <div style={{ fontSize: 11, color: "var(--ac-ink-4)", fontFamily: "var(--f-mono)" }}>{c.email}</div>
                                                        </td>
                                                        <td className="r" style={{ fontWeight: 600 }}>{c.orders}</td>
                                                        <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12 }}>GH₵ {c.revenue.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {insightsData.uniqueCustomers === 0 && (
                                <div className="ac-card" style={{ padding: 48, textAlign: "center" }}>
                                    <div className="ac-empty">
                                        <div className="ac-empty-title">No order data for this period.</div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
}
