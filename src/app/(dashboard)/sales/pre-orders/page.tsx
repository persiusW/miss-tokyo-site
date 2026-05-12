import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { OrdersClient } from "../orders/OrdersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchPreOrderStats(orders: any[]) {
    const totalValue = orders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
    const pendingCount = orders.filter(o => ["paid", "pending", "processing", "packed"].includes(o.status)).length;
    const fulfilledCount = orders.filter(o => ["fulfilled", "delivered", "shipped"].includes(o.status)).length;
    const cancelledCount = orders.filter(o => ["cancelled", "failed", "refunded"].includes(o.status)).length;
    return { totalValue, pendingCount, fulfilledCount, cancelledCount };
}

export default async function PreOrdersPage() {
    const { data: orders } = await supabase
        .from("orders")
        .select("id, customer_name, customer_email, customer_phone, total_amount, status, payment_status, paystack_reference, shipping_address, delivery_method, created_at, has_preorder, is_mixed_order, customer_metadata")
        .eq("has_preorder", true)
        .order("created_at", { ascending: false })
        .limit(500);

    const allOrders = orders ?? [];
    const stats = await fetchPreOrderStats(allOrders);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Pre-Orders</h1>
                <p className="text-neutral-500">Orders containing at least one pre-order item. Fulfil regular items via the main Orders page; return here when the pre-order stock arrives.</p>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Total Value</span>
                    <span className="text-3xl font-serif">GH₵ {stats.totalValue.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">
                        ALL PRE-ORDER ORDERS
                    </span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Awaiting Stock</span>
                    <span className="text-3xl font-serif text-amber-600">{stats.pendingCount}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">
                        PAID · PENDING · PROCESSING
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

            <OrdersClient orders={allOrders} />
        </div>
    );
}
