import { supabase } from "@/lib/supabase";
import { fetchOrderStats, fetchMonthlyRevenue, fetchSalesByCategory } from "@/lib/utils/metrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage() {
    const [
        stats,
        monthlyData,
        categoryData,
        { count: totalProducts },
        { count: totalCustomRequests },
    ] = await Promise.all([
        fetchOrderStats(),
        fetchMonthlyRevenue(6),
        fetchSalesByCategory(),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("custom_requests").select("*", { count: "exact", head: true }),
    ]);

    const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);
    const maxCatRevenue = Math.max(...categoryData.map(c => c.revenue), 1);

    // Status breakdown from stats
    const statusEntries: [string, number][] = [
        ["pending",    stats.pendingCount],
        ["processing", stats.processingCount],
        ["fulfilled",  stats.fulfilledCount],
        ["cancelled",  stats.cancelledCount],
    ].filter(([, count]) => (count as number) > 0) as [string, number][];
    const statusTotal = statusEntries.reduce((s, [, c]) => s + c, 0);

    const kpis = [
        { label: "Total Revenue",  value: `GH₵ ${stats.totalRevenue.toFixed(2)}`, sub: "All time" },
        { label: "Revenue Orders", value: String(stats.revenueOrderCount),         sub: "Confirmed" },
        { label: "Avg. Order",     value: `GH₵ ${stats.avgOrderValue.toFixed(2)}`, sub: "Per transaction" },
        { label: "Conversion",     value: `${stats.conversionRate}%`,              sub: "Revenue / Total" },
    ];

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Analytics</h1>
                <p className="text-neutral-500">Revenue performance and conversion insights.</p>
            </header>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {kpis.map(({ label, value, sub }) => (
                    <div key={label} className="bg-white border border-neutral-200 p-6">
                        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">{label}</span>
                        <span className="text-2xl font-serif">{value}</span>
                        <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider uppercase">{sub}</span>
                    </div>
                ))}
            </div>

            {/* Monthly Revenue Chart */}
            <div className="bg-white border border-neutral-200 p-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-10">Monthly Revenue (Last 6 Months)</h2>
                <div className="flex items-end gap-3 h-40">
                    {monthlyData.map(({ label, revenue }) => (
                        <div key={label} className="flex-1 flex flex-col items-center gap-2">
                            <span className="text-[10px] text-neutral-500 font-medium">
                                {revenue > 0 ? `₵${revenue >= 1000 ? `${(revenue / 1000).toFixed(1)}k` : revenue.toFixed(0)}` : ""}
                            </span>
                            <div className="w-full bg-neutral-100 relative" style={{ height: "128px" }}>
                                <div
                                    className="absolute bottom-0 w-full bg-black transition-all duration-500"
                                    style={{ height: `${(revenue / maxRevenue) * 100}%` }}
                                />
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</span>
                        </div>
                    ))}
                </div>
                {stats.totalRevenue === 0 && (
                    <p className="text-center text-neutral-400 italic text-sm mt-6 font-serif">Revenue data will populate as orders are completed.</p>
                )}
            </div>

            {/* Bottom Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Revenue by Category */}
                <div className="bg-white border border-neutral-200 p-8 md:col-span-1">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Revenue by Category</h2>
                    {categoryData.length === 0 ? (
                        <p className="text-neutral-400 italic text-sm font-serif">No sales data yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {categoryData.map(({ category, revenue }) => {
                                const pct = Math.round((revenue / maxCatRevenue) * 100);
                                return (
                                    <div key={category}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-neutral-600 capitalize">{category}</span>
                                            <span className="font-medium">GH₵ {revenue.toFixed(0)}</span>
                                        </div>
                                        <div className="w-full bg-neutral-100 h-1.5">
                                            <div className="bg-black h-1.5 transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Order Status Breakdown */}
                <div className="bg-white border border-neutral-200 p-8 md:col-span-1">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Order Status</h2>
                    <div className="space-y-4">
                        {statusEntries.map(([status, count]) => {
                            const pct = statusTotal > 0 ? Math.round((count / statusTotal) * 100) : 0;
                            const barColor =
                                ["paid", "fulfilled", "delivered"].includes(status) ? "bg-black"
                                : status === "processing" ? "bg-blue-400"
                                : status === "pending" ? "bg-amber-400"
                                : "bg-neutral-300";
                            return (
                                <div key={status}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="capitalize text-neutral-600">{status}</span>
                                        <span className="font-medium">{count} ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-neutral-100 h-1.5">
                                        <div className={`${barColor} h-1.5`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {statusEntries.length === 0 && (
                            <p className="text-neutral-400 italic text-sm font-serif">No order data yet.</p>
                        )}
                    </div>
                </div>

                {/* Atelier Summary */}
                <div className="bg-white border border-neutral-200 p-8 md:col-span-1">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Atelier Summary</h2>
                    <div className="space-y-4 divide-y divide-neutral-100">
                        {[
                            ["Active Products",   totalProducts ?? 0],
                            ["Total Orders",      stats.totalOrders],
                            ["Custom Requests",   totalCustomRequests ?? 0],
                            ["Revenue Orders",    stats.revenueOrderCount],
                            ["Avg. Order Value",  `GH₵ ${stats.avgOrderValue.toFixed(2)}`],
                        ].map(([label, val]) => (
                            <div key={String(label)} className="flex justify-between items-center py-3 text-sm">
                                <span className="text-neutral-600">{label}</span>
                                <span className="font-semibold text-neutral-900">{val}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
