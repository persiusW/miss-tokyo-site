import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { fetchOrderStats, fetchMonthlyRevenue, fetchSalesByCategory, REVENUE_STATUSES } from "@/lib/utils/metrics";

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
        allOrdersRes,
        couponsRes,
    ] = await Promise.all([
        fetchOrderStats(),
        fetchMonthlyRevenue(6),
        fetchSalesByCategory(),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("items, total_amount").in("status", [...REVENUE_STATUSES]),
        supabase.from("orders")
            .select("id, customer_name, status, total_amount, created_at, assigned_rider_id, riders(full_name, phone_number)")
            .not("assigned_rider_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(20),
        supabase.from("orders").select("status, delivery_method, created_at"),
        supabase.from("coupons").select("code, discount_type, used_count, discount_value, is_active").order("used_count", { ascending: false }).limit(10),
    ]);

    // ── Items Sold ──────────────────────────────────────────────────────────
    const revenueOrders = revenueOrdersRes.data ?? [];
    const itemsSold = revenueOrders
        .flatMap((o: any) => Array.isArray(o.items) ? o.items : [])
        .reduce((sum: number, item: any) => sum + (Number(item.quantity) || 1), 0);

    // ── Top Products ────────────────────────────────────────────────────────
    const productRevenue: Record<string, { name: string; revenue: number; units: number }> = {};
    for (const order of revenueOrders) {
        const items: any[] = Array.isArray(order.items) ? order.items : [];
        const lineSum = items.reduce((s: number, i: any) => s + Number(i.price ?? 0) * Number(i.quantity ?? 1), 0);
        for (const item of items) {
            const key = item.productId || item.name || "Unknown";
            const name = item.name || item.productId?.substring(0, 12) || "Unknown";
            const lineAmt = Number(item.price ?? 0) * Number(item.quantity ?? 1);
            const share = lineSum > 0 ? lineAmt / lineSum : 1 / items.length;
            if (!productRevenue[key]) productRevenue[key] = { name, revenue: 0, units: 0 };
            productRevenue[key].revenue += Number(order.total_amount ?? 0) * share;
            productRevenue[key].units += Number(item.quantity ?? 1);
        }
    }
    const topProducts = Object.values(productRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);
    const maxProductRevenue = Math.max(...topProducts.map(p => p.revenue), 1);

    // ── Delivery vs Pickup ──────────────────────────────────────────────────
    const allOrders = allOrdersRes.data ?? [];
    const pickupCount  = allOrders.filter(o => o.delivery_method?.toLowerCase().includes("pickup")).length;
    const deliveryCount = allOrders.length - pickupCount;

    // ── Order Status Breakdown ──────────────────────────────────────────────
    const dispatchOrders = (dispatchOrdersRes.data ?? []) as any[];
    const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);
    const maxCatRevenue = Math.max(...categoryData.map(c => c.revenue), 1);

    const statusEntries: [string, number][] = [
        ["pending",           allOrders.filter(o => o.status === "pending").length],
        ["processing",        allOrders.filter(o => o.status === "processing").length],
        ["packed",            allOrders.filter(o => o.status === "packed").length],
        ["shipped",           allOrders.filter(o => o.status === "shipped").length],
        ["fulfilled",         allOrders.filter(o => ["fulfilled", "delivered"].includes(o.status)).length],
        ["ready for pickup",  allOrders.filter(o => o.status === "ready_for_pickup").length],
        ["cancelled",         allOrders.filter(o => ["cancelled", "refunded"].includes(o.status)).length],
    ].filter(([, count]) => (count as number) > 0) as [string, number][];
    const statusTotal = statusEntries.reduce((s, [, c]) => s + c, 0);

    const kpis = [
        { label: "Total Revenue",       value: `GH₵ ${stats.totalRevenue.toFixed(2)}`, sub: "All time" },
        { label: "Total Orders",        value: String(stats.totalOrders),               sub: "All statuses" },
        { label: "Items Sold",          value: String(itemsSold),                       sub: "Units dispatched" },
        { label: "Avg. Order Value",    value: `GH₵ ${stats.avgOrderValue.toFixed(2)}`, sub: "Per paid order" },
        { label: "Conversion Rate",     value: `${stats.conversionRate}%`,              sub: "Paid / total" },
    ];

    const coupons = couponsRes.data ?? [];

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
                <div className="bg-white border border-neutral-200 p-8">
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
                <div className="bg-white border border-neutral-200 p-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Order Status</h2>
                    <div className="space-y-4">
                        {statusEntries.map(([status, count]) => {
                            const pct = statusTotal > 0 ? Math.round((count / statusTotal) * 100) : 0;
                            const barColor =
                                ["fulfilled"].includes(status) ? "bg-green-500"
                                : status === "shipped"       ? "bg-blue-400"
                                : status === "processing"    ? "bg-yellow-400"
                                : status === "pending"       ? "bg-amber-400"
                                : status === "cancelled"     ? "bg-red-300"
                                : "bg-neutral-900";
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
                <div className="bg-white border border-neutral-200 p-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Atelier Summary</h2>
                    <div className="space-y-4 divide-y divide-neutral-100">
                        {[
                            ["Active Products",      totalProducts ?? 0],
                            ["Total Orders",         stats.totalOrders],
                            ["Successful Payments",  stats.revenueOrderCount],
                            ["Items Sold",           itemsSold],
                            ["Conversion Rate",      `${stats.conversionRate}%`],
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

            {/* Top Products + Delivery Split */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top Products */}
                <div className="bg-white border border-neutral-200 p-8 md:col-span-2">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Top Products by Revenue</h2>
                    {topProducts.length === 0 ? (
                        <p className="text-neutral-400 italic text-sm font-serif">No sales data yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {topProducts.map(({ name, revenue, units }) => {
                                const pct = Math.round((revenue / maxProductRevenue) * 100);
                                return (
                                    <div key={name}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-neutral-700 truncate max-w-[60%]">{name}</span>
                                            <span className="text-neutral-500">{units} units · <span className="font-medium text-neutral-800">GH₵ {revenue.toFixed(0)}</span></span>
                                        </div>
                                        <div className="w-full bg-neutral-100 h-1.5">
                                            <div className="bg-neutral-900 h-1.5 transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Delivery vs Pickup */}
                <div className="bg-white border border-neutral-200 p-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Fulfillment Method</h2>
                    <div className="space-y-6">
                        {[
                            { label: "Delivery", count: deliveryCount, color: "bg-black" },
                            { label: "Pickup",   count: pickupCount,  color: "bg-neutral-400" },
                        ].map(({ label, count, color }) => {
                            const total = deliveryCount + pickupCount;
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                                <div key={label}>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-neutral-600">{label}</span>
                                        <span className="font-semibold">{count} <span className="text-neutral-400 font-normal">({pct}%)</span></span>
                                    </div>
                                    <div className="w-full bg-neutral-100 h-2">
                                        <div className={`${color} h-2`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        <div className="pt-2 border-t border-neutral-100 text-xs text-neutral-400">
                            {allOrders.length} total orders
                        </div>
                    </div>
                </div>
            </div>

            {/* Coupon Performance */}
            <div className="bg-white border border-neutral-200">
                <div className="px-8 py-5 border-b border-neutral-100">
                    <h2 className="text-xs font-semibold uppercase tracking-widest">Coupon Usage</h2>
                </div>
                {coupons.length === 0 ? (
                    <div className="px-8 py-10 text-neutral-400 italic font-serif text-sm text-center">
                        No coupons created yet.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Code</th>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Type</th>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Value</th>
                                <th className="px-6 py-3 text-center text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Uses</th>
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {coupons.map((c: any) => (
                                <tr key={c.code} className="hover:bg-neutral-50">
                                    <td className="px-6 py-4 font-mono font-semibold text-sm">{c.code}</td>
                                    <td className="px-6 py-4 text-neutral-500 capitalize text-xs">{c.discount_type.replace(/_/g, " ")}</td>
                                    <td className="px-6 py-4 text-neutral-700 text-xs">
                                        {c.discount_type === "percentage" ? `${c.discount_value}%` :
                                         c.discount_type === "free_shipping" ? "Free Shipping" :
                                         c.discount_value ? `GH₵ ${c.discount_value}` : "—"}
                                    </td>
                                    <td className="px-6 py-4 text-center font-semibold">{c.used_count}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${c.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-400"}`}>
                                            {c.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
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
                                    <td className="px-6 py-4 text-neutral-800">{(o.riders as any)?.full_name || "—"}</td>
                                    <td className="px-6 py-4 text-neutral-500 text-xs">{(o.riders as any)?.phone_number || "—"}</td>
                                    <td className="px-6 py-4 text-right font-medium">GH₵ {Number(o.total_amount).toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded font-semibold ${
                                            ["fulfilled","delivered"].includes(o.status) ? "bg-green-50 text-green-700"
                                            : o.status === "shipped" ? "bg-blue-50 text-blue-700"
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
