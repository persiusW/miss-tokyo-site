import { supabase } from "@/lib/supabase";

export default async function AnalyticsPage() {
    const now = new Date();

    const [
        { data: paidOrders },
        { count: totalOrders },
        { count: totalProducts },
        { count: totalCustomRequests },
        { data: allOrderStatuses },
    ] = await Promise.all([
        supabase.from("orders").select("total_amount, created_at").eq("status", "paid").order("created_at", { ascending: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("custom_requests").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("status"),
    ]);

    const totalRevenue = (paidOrders || []).reduce((sum, o) => sum + Number(o.total_amount), 0);
    const paidCount = paidOrders?.length || 0;
    const avgOrderValue = paidCount > 0 ? totalRevenue / paidCount : 0;
    const conversionRate = totalOrders ? ((paidCount / totalOrders) * 100).toFixed(1) : "0.0";

    // Status breakdown
    const statusCounts = (allOrderStatuses || []).reduce((acc: Record<string, number>, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
    }, {});

    // Monthly revenue — last 6 months
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const revenue = (paidOrders || [])
            .filter(o => {
                const od = new Date(o.created_at);
                return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
            })
            .reduce((sum, o) => sum + Number(o.total_amount), 0);
        return { label, revenue };
    });

    const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);

    const metrics = [
        { label: "Total Revenue", value: `GH₵ ${totalRevenue.toFixed(2)}`, sub: "All time" },
        { label: "Paid Orders", value: String(paidCount), sub: "Confirmed" },
        { label: "Avg. Order", value: `GH₵ ${avgOrderValue.toFixed(2)}`, sub: "Per transaction" },
        { label: "Conversion", value: `${conversionRate}%`, sub: "Paid / Total" },
    ];

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Analytics</h1>
                <p className="text-neutral-500">Revenue performance and conversion insights.</p>
            </header>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {metrics.map(({ label, value, sub }) => (
                    <div key={label} className="bg-white border border-neutral-200 p-6">
                        <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">{label}</span>
                        <span className="text-2xl font-serif">{value}</span>
                        <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider uppercase">{sub}</span>
                    </div>
                ))}
            </div>

            {/* Revenue Chart */}
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
                {totalRevenue === 0 && (
                    <p className="text-center text-neutral-400 italic text-sm mt-6 font-serif">Revenue data will populate as orders are completed.</p>
                )}
            </div>

            {/* Bottom Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Status Breakdown */}
                <div className="bg-white border border-neutral-200 p-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Order Status Breakdown</h2>
                    <div className="space-y-4">
                        {Object.entries(statusCounts).map(([status, count]) => {
                            const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            const barColor = status === "paid" ? "bg-black" : status === "pending" ? "bg-amber-400" : "bg-neutral-300";
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
                        {Object.keys(statusCounts).length === 0 && (
                            <p className="text-neutral-400 italic text-sm font-serif">No order data yet.</p>
                        )}
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-white border border-neutral-200 p-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Atelier Summary</h2>
                    <div className="space-y-4 divide-y divide-neutral-100">
                        {[
                            ["Active Products", totalProducts ?? 0],
                            ["Total Orders", totalOrders ?? 0],
                            ["Custom Requests", totalCustomRequests ?? 0],
                            ["Paid Transactions", paidCount],
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
