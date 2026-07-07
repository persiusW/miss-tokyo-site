import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { fetchOrderStats, fetchRecentActivity } from "@/lib/utils/metrics";
import { CategoryDonutChart, ConversionFunnelChart } from "@/components/ui/miss-tokyo/OverviewCharts";
import { PushNotificationBanner } from "@/components/ui/PushNotificationBanner";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_CLASS: Record<string, string> = {
    paid:        "ac-badge-paid",
    fulfilled:   "ac-badge-fulfilled",
    delivered:   "ac-badge-delivered",
    processing:  "ac-badge-processing",
    pending:     "ac-badge-pending",
    packed:      "ac-badge-packed",
    shipped:     "ac-badge-shipped",
    cancelled:   "ac-badge-cancelled",
    refunded:    "ac-badge-refunded",
    failed:      "ac-badge-failed",
};

export default async function DashboardOverviewPage() {
    const [
        stats,
        recentActivity,
        productRowsRes,
        orderStatusesRes,
        lowStockProductsRes,
    ] = await Promise.all([
        fetchOrderStats(),
        fetchRecentActivity(8),
        supabase.from("products").select("id, category_type").eq("is_active", true),
        supabase.from("orders").select("status"),
        supabase.from("products")
            .select("id, name, inventory_count")
            .eq("is_active", true)
            .eq("track_inventory", true)
            .lt("inventory_count", 5)
            .order("inventory_count"),
    ]);

    const { data: productRows } = productRowsRes;
    const { data: orderStatuses } = orderStatusesRes;
    const { data: lowStockProducts } = lowStockProductsRes;

    const categoryMap: Record<string, number> = {};
    for (const p of (productRows ?? [])) {
        const key = (p as any).category_type || "Uncategorised";
        categoryMap[key] = (categoryMap[key] ?? 0) + 1;
    }
    const totalProducts = productRows?.length ?? 0;
    const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    const statusMap: Record<string, number> = {};
    for (const o of (orderStatuses ?? [])) {
        statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
    }

    const funnelMax = Math.max(stats.totalOrders, 1);
    const funnelSteps = [
        { label: "Orders",    value: stats.totalOrders,        h: 100 },
        { label: "Paid",      value: stats.revenueOrderCount,  h: Math.round((stats.revenueOrderCount / funnelMax) * 100) },
        { label: "Fulfilled", value: stats.fulfilledCount,     h: Math.round((stats.fulfilledCount / funnelMax) * 100) },
    ];

    const kpis = [
        {
            label: "Total Revenue",
            prefix: "GH₵",
            value: stats.totalRevenue.toFixed(2),
            sub: "Paid · Processing · Fulfilled",
        },
        {
            label: "Unfulfilled",
            value: String(stats.pendingCount + stats.processingCount),
            sub: `${stats.pendingCount} Pending · ${stats.processingCount} Processing`,
            accent: "warn",
        },
        {
            label: "Fulfilled",
            value: String(stats.fulfilledCount),
            sub: "Shipped · Delivered",
            accent: "ok",
        },
        {
            label: "Avg. Order Value",
            prefix: "GH₵",
            value: stats.avgOrderValue.toFixed(2),
            sub: "Per Paid Order",
        },
    ];

    return (
        <>
            <PushNotificationBanner />

            {/* Page heading */}
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Overview <em>·</em></h1>
                    <p className="ac-page-sub">
                        Welcome back. Here is what&apos;s happening at the atelier.
                        <span className="ac-live">Live</span>
                    </p>
                </div>
                <Link href="/sales/orders" className="ac-btn ac-btn-ghost">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 6h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 6Z"/></svg>
                    View Orders
                </Link>
            </div>

            {/* KPI strip */}
            <div className="ac-kpi-grid">
                {kpis.map(({ label, prefix, value, sub, accent }) => (
                    <div key={label} className="ac-kpi">
                        <div className="ac-kpi-label">{label}</div>
                        <div
                            className="ac-kpi-value"
                            style={accent ? { color: accent === "warn" ? "var(--ac-warn)" : "var(--ac-accent)" } : {}}
                        >
                            {prefix && <span className="ac-kpi-ccy">{prefix}</span>}
                            {value}
                        </div>
                        <div className="ac-kpi-sub">{sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="ac-card">
                    <div className="ac-card-head">
                        <h2 className="ac-card-title">Catalog by Category</h2>
                    </div>
                    <CategoryDonutChart categoryEntries={categoryEntries} totalProducts={totalProducts} />
                </div>
                <div className="ac-card">
                    <div className="ac-card-head">
                        <h2 className="ac-card-title">Conversion Funnel</h2>
                    </div>
                    <ConversionFunnelChart funnelSteps={funnelSteps} conversionRate={stats.conversionRate} />
                </div>
            </div>

            {/* Order status breakdown */}
            {Object.keys(statusMap).length > 0 && (
                <div className="ac-card">
                    <div className="ac-card-head">
                        <h2 className="ac-card-title">Order Status Breakdown</h2>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                        {Object.entries(statusMap).map(([status, count]) => (
                            <div
                                key={status}
                                style={{
                                    background: "var(--ac-panel-2)",
                                    border: "1px solid var(--ac-line)",
                                    borderRadius: "var(--r-md)",
                                    padding: "14px 16px",
                                }}
                            >
                                <span className={`ac-badge ${STATUS_CLASS[status] ?? "ac-badge-info"}`} style={{ marginBottom: 10, display: "inline-flex" }}>
                                    {status === "ready_for_pickup" ? "Ready" : status}
                                </span>
                                <div style={{ fontFamily: "var(--f-display)", fontSize: 32, color: "var(--ac-ink)", lineHeight: 1 }}>
                                    {count}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Low stock alert */}
            {lowStockProducts && lowStockProducts.length > 0 && (
                <div className="ac-card" style={{ borderColor: "color-mix(in oklab, var(--ac-warn) 30%, var(--ac-line))" }}>
                    <div className="ac-card-head">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ac-warn)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3.5 22 19H2L12 3.5Z"/><path d="M12 10v4M12 17v.5"/></svg>
                            <h2 className="ac-card-title" style={{ color: "var(--ac-warn)" }}>Low Stock Alert</h2>
                            <span className="ac-badge ac-badge-warn">{lowStockProducts.length}{lowStockProducts.length === 15 ? "+" : ""}</span>
                        </div>
                        <Link href="/catalog/products/low-stock" className="ac-text-link">View All →</Link>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                        {lowStockProducts.slice(0, 16).map(p => (
                            <div
                                key={p.id}
                                style={{
                                    background: "var(--ac-panel-2)",
                                    border: "1px solid var(--ac-line)",
                                    borderRadius: "var(--r-sm)",
                                    padding: "10px 12px",
                                }}
                            >
                                <div style={{ fontSize: 13, color: "var(--ac-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {p.name}
                                </div>
                                <div style={{ fontSize: 11, marginTop: 4, fontFamily: "var(--f-mono)", letterSpacing: ".06em", color: p.inventory_count === 0 ? "var(--ac-danger)" : "var(--ac-warn)" }}>
                                    {p.inventory_count === 0 ? "Out of stock" : `${p.inventory_count} left`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent activity */}
            <div className="ac-card flush">
                <div className="ac-card-head" style={{ padding: "16px 20px 0" }}>
                    <h2 className="ac-card-title">Recent Activity</h2>
                </div>
                {recentActivity.length === 0 ? (
                    <div className="ac-empty">
                        <div className="ac-empty-title">No recent activity</div>
                    </div>
                ) : (
                    <div>
                        {recentActivity.map((item) => (
                            <div
                                key={`${item.type}-${item.id}`}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "13px 20px", borderTop: "1px solid var(--ac-line)",
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 13, color: "var(--ac-ink-2)" }}>
                                        <span style={{ color: "var(--ac-ink)", fontWeight: 500 }}>{item.label}</span>
                                        {" "}placed an order
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2, fontFamily: "var(--f-mono)" }}>
                                        {item.sub}
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                    <span className={`ac-badge ${STATUS_CLASS[item.status] ?? "ac-badge-info"}`}>
                                        {item.status}
                                    </span>
                                    <span style={{ fontSize: 10, color: "var(--ac-ink-4)", fontFamily: "var(--f-mono)" }}>
                                        {new Date(item.created_at).toLocaleDateString("en-GB")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
