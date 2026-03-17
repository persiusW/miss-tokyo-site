import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { fetchOrderStats, fetchRecentActivity } from "@/lib/utils/metrics";
import { Wallet, Package, CheckCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { CategoryDonutChart, ConversionFunnelChart } from "@/components/ui/badu/OverviewCharts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    paid:        { bg: "bg-emerald-50",  text: "text-emerald-700",  dot: "bg-emerald-400" },
    fulfilled:   { bg: "bg-blue-50",     text: "text-blue-700",     dot: "bg-blue-400" },
    delivered:   { bg: "bg-blue-50",     text: "text-blue-700",     dot: "bg-blue-400" },
    processing:  { bg: "bg-blue-50",     text: "text-blue-700",     dot: "bg-blue-400" },
    pending:     { bg: "bg-amber-50",    text: "text-amber-700",    dot: "bg-amber-400" },
    packed:      { bg: "bg-purple-50",   text: "text-purple-700",   dot: "bg-purple-400" },
    cancelled:   { bg: "bg-rose-50",     text: "text-rose-700",     dot: "bg-rose-400" },
    refunded:    { bg: "bg-rose-50",     text: "text-rose-700",     dot: "bg-rose-400" },
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
        fetchRecentActivity(5),
        supabase.from("products").select("id").eq("is_active", true),
        supabase.from("orders").select("status"),
        supabase.from("products")
            .select("id, name, inventory_count")
            .eq("is_active", true)
            .eq("track_inventory", true)
            .lt("inventory_count", 5)
            .order("inventory_count"),
    ]);

    const { data: productRows, error: productRowsError } = productRowsRes;
    const { data: orderStatuses, error: orderStatusesError } = orderStatusesRes;
    const { data: lowStockProducts, error: lowStockProductsError } = lowStockProductsRes;

    if (orderStatusesError) {
        console.error("Supabase Fetch Error (orders):", orderStatusesError.message, orderStatusesError.details, orderStatusesError.hint);
    }
    if (productRowsError) {
        console.error("Supabase Fetch Error (productRows):", productRowsError.message, productRowsError.details, productRowsError.hint);
    }
    if (lowStockProductsError) {
        console.error("Supabase Fetch Error (lowStockProducts):", lowStockProductsError.message, lowStockProductsError.details, lowStockProductsError.hint);
    }

    // Products by category (catalog distribution, not revenue)
    const categoryMap: Record<string, number> = {};
    for (const p of (productRows ?? [])) {
        const key = (p as any).category_type || "Uncategorised";
        categoryMap[key] = (categoryMap[key] ?? 0) + 1;
    }
    const totalProducts = productRows?.length ?? 0;
    const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    // Order status counts
    const statusMap: Record<string, number> = {};
    for (const o of (orderStatuses ?? [])) {
        statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
    }

    // Conversion funnel
    const funnelMax = Math.max(stats.totalOrders, 1);
    const funnelSteps = [
        { label: "Orders",    value: stats.totalOrders,        h: 100 },
        { label: "Paid",      value: stats.revenueOrderCount,  h: Math.round((stats.revenueOrderCount / funnelMax) * 100) },
        { label: "Fulfilled", value: stats.fulfilledCount,     h: Math.round((stats.fulfilledCount / funnelMax) * 100) },
    ];

    const kpiCards = [
        {
            label: "Total Revenue",
            value: `GH₵ ${stats.totalRevenue.toFixed(2)}`,
            sub: "Lifetime Sales",
            Icon: Wallet,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
        },
        {
            label: "Unfulfilled",
            value: String(stats.pendingCount + stats.processingCount),
            sub: "Paid · Awaiting Ship",
            Icon: Package,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            valueColor: "text-amber-600",
        },
        {
            label: "Fulfilled",
            value: String(stats.fulfilledCount),
            sub: "Shipped · Delivered",
            Icon: CheckCircle,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            valueColor: "text-blue-600",
        },
        {
            label: "Avg. Order Value",
            value: `GH₵ ${stats.avgOrderValue.toFixed(2)}`,
            sub: "Per Paid Order",
            Icon: TrendingUp,
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600",
        },
    ];

    return (
        <div className="space-y-10">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Overview</h1>
                <p className="text-neutral-500">Welcome back. Here is what is happening at the atelier today.</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpiCards.map(({ label, value, sub, Icon, iconBg, iconColor, valueColor }) => (
                    <div
                        key={label}
                        className="bg-white rounded-2xl shadow-sm p-6 flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-shadow duration-200"
                    >
                        <div className={`absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`}>
                            <Icon size={16} className={iconColor} />
                        </div>
                        <span className="text-xs font-semibold text-neutral-400 mb-6 block">{label}</span>
                        <span className={`text-3xl font-serif ${valueColor ?? "text-neutral-900"}`}>{value}</span>
                        <span className="text-[10px] text-neutral-400 mt-2 block uppercase tracking-wider">{sub}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Products by Category — Donut Chart */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6">Catalog by Category</h2>
                    <CategoryDonutChart categoryEntries={categoryEntries} totalProducts={totalProducts} />
                </div>

                {/* Live Conversion Funnel */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6">Conversion Funnel</h2>
                    <ConversionFunnelChart funnelSteps={funnelSteps} conversionRate={stats.conversionRate} />
                </div>
            </div>

            {/* Order Status Breakdown */}
            {Object.keys(statusMap).length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6">Order Status Breakdown</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(statusMap).map(([status, count]) => {
                            const style = STATUS_STYLES[status] ?? { bg: "bg-neutral-50", text: "text-neutral-600", dot: "bg-neutral-400" };
                            return (
                                <div
                                    key={status}
                                    className={`p-5 rounded-xl ${style.bg} hover:shadow-md transition-all duration-200 cursor-default`}
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                        <span className={`text-[10px] uppercase tracking-widest font-semibold ${style.text} capitalize`}>
                                            {status}
                                        </span>
                                    </div>
                                    <div className={`text-3xl font-serif ${style.text}`}>{count}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Recent Activity</h2>
                </div>
                {recentActivity.length === 0 ? (
                    <div className="px-6 py-12 text-center text-neutral-400 italic font-serif">
                        No recent activity to display.
                    </div>
                ) : (
                    <ul className="divide-y divide-neutral-50">
                        {recentActivity.map((item) => (
                            <li
                                key={`${item.type}-${item.id}`}
                                className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                            >
                                <div>
                                    <p className="text-sm text-neutral-900">
                                        <span className="font-medium">{item.label}</span>
                                        {" "}placed an order.
                                    </p>
                                    <p className="text-xs text-neutral-400 mt-0.5">{item.sub}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    {(() => {
                                        const style = STATUS_STYLES[item.status] ?? { bg: "bg-neutral-100", text: "text-neutral-600" };
                                        return (
                                            <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-medium ${style.bg} ${style.text}`}>
                                                {item.status}
                                            </span>
                                        );
                                    })()}
                                    <p className="text-[10px] text-neutral-400 mt-2">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts && lowStockProducts.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={16} className="text-amber-600" />
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-700">Low Stock Alert</span>
                            <span className="bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 font-semibold rounded-full">
                                {lowStockProducts.length}{lowStockProducts.length === 15 ? "+" : ""}
                            </span>
                        </div>
                        <a
                            href="/catalog/products/low-stock"
                            className="text-[10px] uppercase tracking-widest font-semibold text-amber-700 hover:text-amber-900 border-b border-amber-400 hover:border-amber-700 transition-colors pb-0.5"
                        >
                            View All →
                        </a>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {lowStockProducts.slice(0, 15).map(p => (
                            <div key={p.id} className="bg-white rounded-xl border border-amber-100 px-4 py-3 hover:shadow-sm transition-shadow">
                                <div className="text-sm font-medium text-neutral-800 truncate">{p.name}</div>
                                <div className={`text-xs mt-1 font-semibold ${p.inventory_count === 0 ? "text-rose-600" : "text-amber-600"}`}>
                                    {p.inventory_count === 0 ? "Out of stock" : `${p.inventory_count} remaining`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
