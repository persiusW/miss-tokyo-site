import { supabase } from "@/lib/supabase";

export default async function DashboardOverviewPage() {
    const [
        { count: pendingOrdersData, error: pendingError },
        { count: activeCustomRequestsData, error: customRequestsError },
        { data: revenueData },
        { data: recentRequests },
    ] = await Promise.all([
        supabase.from("orders").select("*", { count: 'exact', head: true }).eq("status", "pending"),
        supabase.from("custom_requests").select("*", { count: 'exact', head: true }).in("status", ["inquiry", "material_confirmation", "production"]),
        supabase.from("orders").select("total_amount").eq("status", "paid"),
        supabase.from("custom_requests").select("id, customer_name, customer_email, status, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    const pendingOrdersCount = pendingError ? 0 : pendingOrdersData;
    const activeCustomRequestsCount = customRequestsError ? 0 : activeCustomRequestsData;
    const totalRevenue = (revenueData || []).reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Overview</h1>
                <p className="text-neutral-500">Welcome back. Here is what is happening at the atelier today.</p>
            </header>

            {/* Metrics Grid */}
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
                    <span className="text-3xl font-serif">{activeCustomRequestsCount || 0}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">NEEDS ATTENTION</span>
                </div>
            </div>

            {/* Analytics Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales by Category Chart */}
                <div className="bg-white border border-neutral-200 p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Sales by Category</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-neutral-600">Footwear</span>
                                <span className="font-medium">65%</span>
                            </div>
                            <div className="w-full bg-neutral-100 h-2">
                                <div className="bg-black h-2" style={{ width: '65%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-neutral-600">Future Apparel</span>
                                <span className="font-medium">25%</span>
                            </div>
                            <div className="w-full bg-neutral-100 h-2">
                                <div className="bg-neutral-600 h-2" style={{ width: '25%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-neutral-600">Accessories</span>
                                <span className="font-medium">10%</span>
                            </div>
                            <div className="w-full bg-neutral-100 h-2">
                                <div className="bg-neutral-400 h-2" style={{ width: '10%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-white border border-neutral-200 p-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6">Conversion Funnel</h2>
                    <div className="flex h-32 items-end space-x-2">
                        <div className="w-1/3 group relative">
                            <div className="bg-neutral-200 h-full w-full transition-colors group-hover:bg-neutral-300"></div>
                            <span className="text-[10px] uppercase tracking-widest text-neutral-500 absolute -bottom-6 left-0 right-0 text-center">Visitors</span>
                            <span className="text-xs font-bold absolute -top-6 left-0 right-0 text-center">3.2k</span>
                        </div>
                        <div className="w-1/3 group relative">
                            <div className="bg-neutral-400 h-3/5 w-full transition-colors group-hover:bg-neutral-500"></div>
                            <span className="text-[10px] uppercase tracking-widest text-neutral-500 absolute -bottom-6 left-0 right-0 text-center">Added Space</span>
                            <span className="text-xs font-bold absolute -top-6 left-0 right-0 text-center">450</span>
                        </div>
                        <div className="w-1/3 group relative">
                            <div className="bg-black h-1/5 w-full transition-colors group-hover:bg-neutral-800"></div>
                            <span className="text-[10px] uppercase tracking-widest text-neutral-500 absolute -bottom-6 left-0 right-0 text-center">Purchased</span>
                            <span className="text-xs font-bold absolute -top-6 left-0 right-0 text-center">85</span>
                        </div>
                    </div>
                    <div className="mt-10 text-center border-t border-neutral-100 pt-4">
                        <span className="text-xs text-neutral-500 tracking-wider">Overall Conversion Rate: <strong className="text-black text-sm">2.65%</strong></span>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-neutral-200">
                <div className="px-6 py-4 border-b border-neutral-200">
                    <h2 className="text-xs font-semibold uppercase tracking-widest">Recent Activity</h2>
                </div>

                {(!recentRequests || recentRequests.length === 0) ? (
                    <div className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                        No recent activity to display.
                    </div>
                ) : (
                    <ul className="divide-y divide-neutral-100">
                        {recentRequests.map((req) => (
                            <li key={req.id} className="px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                                <div>
                                    <p className="text-sm text-neutral-900 mb-1">
                                        <span className="font-medium">{req.customer_name || req.customer_email || "A client"}</span> submitted a custom request.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] uppercase tracking-widest bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                                        {req.status || 'Received'}
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
