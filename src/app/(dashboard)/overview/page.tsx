import { supabase } from "@/lib/supabase";

export default async function DashboardOverviewPage() {
    const [
        { count: pendingOrdersCount },
        { count: totalOrdersCount },
        { count: totalCustomRequests },
        { data: revenueData },
        { data: recentRequests },
        { data: productRows },
        { data: orderStatuses },
        { data: lowStockProducts },
    ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("custom_requests").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total_amount").eq("status", "paid"),
        supabase.from("custom_requests")
            .select("id, customer_name, customer_email, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        supabase.from("products").select("category_type").eq("is_active", true),
        supabase.from("orders").select("status"),
        supabase.from("products").select("id, name, inventory_count").eq("is_active", true).lt("inventory_count", 5).order("inventory_count"),
    ]);

    const totalRevenue = (revenueData || []).reduce((sum: number, o: { total_amount: string | number }) => sum + Number(o.total_amount), 0);
    const paidCount = revenueData?.length || 0;
    const total = totalOrdersCount || 0;
    const inquiries = (totalCustomRequests || 0) + total;

    // Products by category
    const categoryMap: Record<string, number> = {};
    for (const p of (productRows || [])) {
        const key = p.category_type || "Uncategorised";
        categoryMap[key] = (categoryMap[key] || 0) + 1;
    }
    const totalProducts = productRows?.length || 0;
    const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    // Order status counts
    const statusMap: Record<string, number> = {};
    for (const o of (orderStatuses || [])) {
        statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    }

    // Funnel heights — proportional
    const funnelMax = Math.max(inquiries, 1);
    const funnelSteps = [
        { label: "Inquiries", value: inquiries, h: 100 },
        { label: "Orders", value: total, h: Math.round((total / funnelMax) * 100) },
        { label: "Paid", value: paidCount, h: Math.round((paidCount / funnelMax) * 100) },
    ];
    const conversionRate = total > 0 ? ((paidCount / total) * 100).toFixed(1) : "0.0";

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Overview</h1>
                <p className="text-neutral-500">Welcome back. Here is what is happening at the atelier today.</p>
            </header>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-neutral-200 p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Total Revenue (GHS)</span>
                    <span className="text-3xl font-serif">GH₵ {totalRevenue.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">LIFETIME SALES</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Pending Orders</span>
                    <span className="text-3xl font-serif">{pendingOrdersCount || 0}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">AWAITING FULFILLMENT</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Active Custom Requests</span>
                    <span className="text-3xl font-serif">{totalCustomRequests || 0}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">NEEDS ATTENTION</span>
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
                    {inquiries === 0 ? (
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
                                    Order Conversion Rate: <strong className="text-black text-sm">{conversionRate}%</strong>
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
                                status === "paid" ? "text-green-700 bg-green-50" :
                                status === "pending" ? "text-amber-700 bg-amber-50" :
                                status === "cancelled" ? "text-red-600 bg-red-50" :
                                "text-neutral-600 bg-neutral-100";
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

            {/* Low Stock Alert */}
            {lowStockProducts && lowStockProducts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-700">Low Stock Alert</span>
                        <span className="bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 font-semibold rounded-full">{lowStockProducts.length}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {lowStockProducts.map(p => (
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

            {/* Recent Activity */}
            <div className="bg-white border border-neutral-200">
                <div className="px-6 py-4 border-b border-neutral-200">
                    <h2 className="text-xs font-semibold uppercase tracking-widest">Recent Custom Requests</h2>
                </div>
                {(!recentRequests || recentRequests.length === 0) ? (
                    <div className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                        No recent activity to display.
                    </div>
                ) : (
                    <ul className="divide-y divide-neutral-100">
                        {recentRequests.map((req) => (
                            <li key={req.id} className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                                <p className="text-sm text-neutral-900">
                                    <span className="font-medium">{req.customer_name || req.customer_email || "A client"}</span>
                                    {" "}submitted a custom request.
                                </p>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <span className="text-[10px] uppercase tracking-widest bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                                        {req.status || "Received"}
                                    </span>
                                    <p className="text-[10px] text-neutral-400 mt-2">
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
