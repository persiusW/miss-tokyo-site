import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { fetchOrderStats, fetchMonthlyRevenue, fetchSalesByCategory } from "@/lib/utils/metrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage() {
    const [
        stats,
        monthlyData,
        categoryData,
        { count: totalProducts },
        revenueOrdersRes,
        dispatchOrdersRes,
    ] = await Promise.all([
        fetchOrderStats(),
        fetchMonthlyRevenue(6),
        fetchSalesByCategory(),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("items").in("status", ["paid", "processing", "fulfilled", "delivered"]),
        supabase.from("orders")
            .select("id, customer_name, status, total_amount, created_at, assigned_rider_id, riders(name, phone)")
            .not("assigned_rider_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(20),
    ]);

    // Items Sold — count quantities from all revenue orders
    const itemsSold = (revenueOrdersRes.data ?? [])
        .flatMap((o: any) => Array.isArray(o.items) ? o.items : [])
        .reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0);

    const dispatchOrders = (dispatchOrdersRes.data ?? []) as any[];

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
        { label: "Total Revenue",       value: `GH₵ ${stats.totalRevenue.toFixed(2)}`, sub: "All time" },
        { label: "Total Orders",        value: String(stats.totalOrders),               sub: "All statuses" },
        { label: "Items Sold",          value: String(itemsSold),                       sub: "Units dispatched" },
        { label: "Avg. Order Value",    value: `GH₵ ${stats.avgOrderValue.toFixed(2)}`, sub: "Per paid order" },
        { label: "Successful Payments", value: String(stats.revenueOrderCount),         sub: "Paid & fulfilled" },
    ];

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Analytics</h1>
                <p className="text-neutral-500">Revenue performance and conversion insights.</p>
            </header>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
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
                            ["Active Products",      totalProducts ?? 0],
                            ["Total Orders",         stats.totalOrders],
                            ["Successful Payments",  stats.revenueOrderCount],
                            ["Items Sold",           itemsSold],
                            ["Avg. Order Value",     `GH₵ ${stats.avgOrderValue.toFixed(2)}`],
                        ].map(([label, val]) => (
                            <div key={String(label)} className="flex justify-between items-center py-3 text-sm">
                                <span className="text-neutral-600">{label}</span>
                                <span className="font-semibold text-neutral-900">{val}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Dispatch Performance */}
            <div className="bg-white border border-neutral-200">
                <div className="px-8 py-5 border-b border-neutral-100">
                    <h2 className="text-xs font-semibold uppercase tracking-widest">Dispatch Performance</h2>
                </div>
                {dispatchOrders.length === 0 ? (
                    <div className="px-8 py-10 text-neutral-400 italic font-serif text-sm text-center">
                        No dispatched orders yet. Rider assignments will appear here.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Order</th>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Customer</th>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Rider</th>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Phone</th>
                                <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Amount</th>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Status</th>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {dispatchOrders.map((o: any) => (
                                <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-neutral-600">{o.id.substring(0, 8).toUpperCase()}</td>
                                    <td className="px-6 py-4 text-neutral-800">{o.customer_name || "—"}</td>
                                    <td className="px-6 py-4 text-neutral-800">{o.riders?.name || "—"}</td>
                                    <td className="px-6 py-4 text-neutral-500 text-xs">{o.riders?.phone || "—"}</td>
                                    <td className="px-6 py-4 text-right font-medium">GH₵ {Number(o.total_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded font-semibold ${
                                            ["fulfilled","delivered"].includes(o.status) ? "bg-green-50 text-green-700"
                                            : o.status === "processing" ? "bg-blue-50 text-blue-700"
                                            : "bg-neutral-100 text-neutral-500"
                                        }`}>{o.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400 text-xs">
                                        {new Date(o.created_at).toLocaleDateString("en-GB")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
