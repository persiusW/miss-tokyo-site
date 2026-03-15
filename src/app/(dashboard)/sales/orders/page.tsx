import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { fetchOrderStats } from "@/lib/utils/metrics";
import { OrdersTable } from "./OrdersTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;


export default async function OrdersPage() {
    const [{ data: orders }, stats] = await Promise.all([
        supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false }),
        fetchOrderStats(),
    ]);

    if (!orders) {
        console.error("[OrdersPage] Failed to load orders from Supabase");
    }

    const allOrders = orders ?? [];

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Orders</h1>
                <p className="text-neutral-500">All customer orders and their fulfilment status.</p>
            </header>

            {/* Summary Cards — sourced from metrics.ts (matches Overview & Analytics) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Total Revenue</span>
                    <span className="text-3xl font-serif">GH₵ {stats.totalRevenue.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">
                        PAID · PROCESSING · FULFILLED
                    </span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Unfulfilled</span>
                    <span className="text-3xl font-serif text-amber-600">
                        {stats.pendingCount + stats.processingCount}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">
                        {stats.pendingCount} PENDING · {stats.processingCount} PROCESSING
                    </span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Fulfilled</span>
                    <span className="text-3xl font-serif text-green-700">{stats.fulfilledCount}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">SHIPPED · DELIVERED</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Cancelled</span>
                    <span className="text-3xl font-serif text-neutral-500">{stats.cancelledCount}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">
                        CANCELLED · REFUNDED
                    </span>
                </div>
            </div>

            <OrdersTable orders={allOrders} />
        </div>
    );
}
