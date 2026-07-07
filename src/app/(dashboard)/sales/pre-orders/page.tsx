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
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Pre-Orders</h1>
                    <p className="ac-page-sub">Orders containing at least one pre-order item. Fulfil regular items via the main Orders page; return here when the pre-order stock arrives.</p>
                </div>
            </div>

            <div className="ac-kpi-grid" style={{ marginBottom: 24 }}>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Total Value</span>
                    <span className="ac-kpi-value"><span className="ac-kpi-ccy">GH₵ </span>{stats.totalValue.toFixed(2)}</span>
                    <span className="ac-kpi-sub">All pre-order orders</span>
                </div>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Awaiting Stock</span>
                    <span className="ac-kpi-value" style={{ color: "var(--ac-warn)" }}>{stats.pendingCount}</span>
                    <span className="ac-kpi-sub">Paid · Pending · Processing</span>
                </div>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Fulfilled</span>
                    <span className="ac-kpi-value" style={{ color: "var(--ac-accent)" }}>{stats.fulfilledCount}</span>
                    <span className="ac-kpi-sub">Shipped · Delivered</span>
                </div>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Cancelled</span>
                    <span className="ac-kpi-value">{stats.cancelledCount}</span>
                    <span className="ac-kpi-sub">Cancelled · Refunded</span>
                </div>
            </div>

            <OrdersClient orders={allOrders} />
        </>
    );
}
