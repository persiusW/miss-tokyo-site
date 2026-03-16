import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { fetchOrderStats, fetchRecentActivity } from "@/lib/utils/metrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
        { label: "Orders",    value: stats.totalOrders,                                                 h: 100 },
        { label: "Paid",      value: stats.revenueOrderCount,                                          h: Math.round((stats.revenueOrderCount / funnelMax) * 100) },
        { label: "Fulfilled", value: stats.fulfilledCount,                                             h: Math.round((stats.fulfilledCount / funnelMax) * 100) },
    ];

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Overview</h1>
                <p className="text-neutral-500">Welcome back. Here is what is happening at the atelier today.</p>
            </header>

            {/* KPI Cards — all sourced from fetchOrderStats() in metrics.ts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white border border-neutral-200 p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Total Revenue</span>
                    <span className="text-3xl font-serif">GH₵ {stats.totalRevenue.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">LIFETIME SALES</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Unfulfilled</span>
                    <span className="text-3xl font-serif text-amber-600">
                        {stats.pendingCount + stats.processingCount}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">PAID · AWAITING SHIP</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Fulfilled</span>
                    <span className="text-3xl font-serif text-green-700">{stats.fulfilledCount}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">SHIPPED · DELIVERED</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Avg. Order Value</span>
                    <span className="text-3xl font-serif">GH₵ {stats.avgOrderValue.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">PER PAID ORDER</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Products by Category */}
                <div className="bg-white border border-neutral-200 p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Catalog by Category</h2>
                    {categoryEntries.length === 0 ? (
                        <p className="text-neutral-400 italic text-sm font-serif">No active products yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {categoryEntries.map(([cat, count]) => {
                                const pct = totalProducts > 0 ? Math.round((count / totalProducts) * 100) : 0;
                                return (
                                    <div key={cat}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-neutral-600 capitalize">{cat}</span>
                                            <span className="font-medium">{count} ({pct}%)</span>
                                        </div>
                                        <div className="w-full bg-neutral-100 h-2">
                                            <div className="bg-black h-2 transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Live Conversion Funnel */}
                <div className="bg-white border border-neutral-200 p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Conversion Funnel</h2>
                    {stats.totalOrders === 0 ? (
                        <p className="text-neutral-400 italic text-sm font-serif">No activity yet. Funnel will populate as orders come in.</p>
                    ) : (
                        <>
                            <div className="flex h-32 items-end gap-4">
                                {funnelSteps.map((step, i) => (
                                    <div key={step.label} className="flex-1 flex flex-col items-center gap-2 relative">
                                        <span className="text-xs font-semibold text-neutral-800 absolute -top-6">{step.value}</span>
                                        <div
                                            className="w-full transition-all duration-500"
                                            style={{
                                                height: `${Math.max(step.h, 4)}%`,
                                                backgroundColor: i === 0 ? "#d4d4d4" : i === 1 ? "#737373" : "#000",
                                            }}
                                        />
                                        <span className="text-[10px] uppercase tracking-widest text-neutral-500 absolute -bottom-6 text-center w-full">
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-10 text-center border-t border-neutral-100 pt-4">
                                <span className="text-xs text-neutral-500 tracking-wider">
                                    Order Conversion Rate:{" "}
                                    <strong className="text-black text-sm">{stats.conversionRate}%</strong>
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Order Status Breakdown */}
            {Object.keys(statusMap).length > 0 && (
                <div className="bg-white border border-neutral-200 p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Order Status Breakdown</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(statusMap).map(([status, count]) => {
                            const color =
                                ["paid", "fulfilled", "delivered"].includes(status)
                                    ? "text-green-700 bg-green-50"
                                    : status === "processing"
                                    ? "text-blue-700 bg-blue-50"
                                    : status === "pending"
                                    ? "text-amber-700 bg-amber-50"
                                    : status === "cancelled"
                                    ? "text-red-600 bg-red-50"
                                    : "text-neutral-600 bg-neutral-100";
                            return (
                                <div key={status} className={`p-4 rounded ${color}`}>
                                    <div className="text-2xl font-serif font-semibold">{count}</div>
                                    <div className="text-[10px] uppercase tracking-widest mt-1 capitalize">{status}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white border border-neutral-200">
                <div className="px-6 py-4 border-b border-neutral-200">
                    <h2 className="text-xs font-semibold uppercase tracking-widest">Recent Activity</h2>
                </div>
                {recentActivity.length === 0 ? (
                    <div className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                        No recent activity to display.
                    </div>
                ) : (
                    <ul className="divide-y divide-neutral-100">
                        {recentActivity.map((item) => (
                            <li key={`${item.type}-${item.id}`} className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                                <div>
                                    <p className="text-sm text-neutral-900">
                                        <span className="font-medium">{item.label}</span>
                                        {" "}
                                        placed an order.
                                    </p>
                                    <p className="text-xs text-neutral-400 mt-0.5">{item.sub}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <span className="text-[10px] uppercase tracking-widest bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                                        {item.status}
                                    </span>
                                    <p className="text-[10px] text-neutral-400 mt-2">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Low Stock Alert — max 15, with View All link */}
            {lowStockProducts && lowStockProducts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
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
                            <div key={p.id} className="bg-white border border-amber-100 px-4 py-3">
                                <div className="text-sm font-medium text-neutral-800 truncate">{p.name}</div>
                                <div className={`text-xs mt-1 font-semibold ${p.inventory_count === 0 ? "text-red-600" : "text-amber-600"}`}>
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
