import { supabase } from "@/lib/supabase";

export default async function DashboardOverviewPage() {
    // Fetch pending orders (simulated with a simple query if you have an orders table, 
    // but we'll fallback to 0 if it doesn't exist for now or isn't populated).
    const { count: pendingOrdersCount } = await supabase
        .from("orders")
        .select("*", { count: 'exact', head: true })
        .eq("status", "pending")
        .catch(() => ({ count: 0 }));

    const { count: activeCustomRequestsCount } = await supabase
        .from("custom_requests")
        .select("*", { count: 'exact', head: true })
        .in("status", ["inquiry", "material_confirmation", "production"])
        .catch(() => ({ count: 0 }));

    // Recent activity: fetch 5 most recent custom requests as an example of activity
    const { data: recentRequests } = await supabase
        .from("custom_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

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
                    <span className="text-3xl font-serif">GH₵ 0.00</span>
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
                                        <span className="font-medium">{req.first_name} {req.last_name}</span> submitted a custom request.
                                    </p>
                                    <p className="text-xs text-neutral-500 capitalize">{req.request_type}</p>
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
