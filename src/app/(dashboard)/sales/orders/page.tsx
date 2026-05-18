import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { fetchOrderStats } from "@/lib/utils/metrics";
import { OrdersClient } from "./OrdersClient";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdersPage() {
    const [{ data: orders }, stats] = await Promise.all([
        supabase
            .from("orders")
            .select("id, customer_name, customer_email, customer_phone, total_amount, status, payment_status, paystack_reference, shipping_address, delivery_method, created_at, has_preorder, is_mixed_order, customer_metadata")
            .or("has_preorder.eq.false,is_mixed_order.eq.true")
            .order("created_at", { ascending: false })
            .limit(500),
        fetchOrderStats(),
    ]);

    if (!orders) console.error("[OrdersPage] Failed to load orders from Supabase");

    const kpis = [
        {
            label: "Total Revenue",
            prefix: "GH₵",
            value: stats.totalRevenue.toFixed(2),
            sub: "Paid · Processing · Fulfilled",
        },
        {
            label: "Unfulfilled",
            value: String(stats.pendingCount + stats.processingCount),
            sub: `${stats.pendingCount} Pending · ${stats.processingCount} Processing`,
            color: "var(--ac-warn)",
        },
        {
            label: "Fulfilled",
            value: String(stats.fulfilledCount),
            sub: "Shipped · Delivered",
            color: "var(--ac-accent)",
        },
        {
            label: "Cancelled",
            value: String(stats.cancelledCount),
            sub: "Cancelled · Refunded",
        },
    ];

    return (
        <>
            {/* Page heading */}
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Orders</h1>
                    <p className="ac-page-sub">All customer orders and their fulfilment status.</p>
                </div>
            </div>

            {/* KPI strip */}
            <div className="ac-kpi-grid">
                {kpis.map(({ label, prefix, value, sub, color }) => (
                    <div key={label} className="ac-kpi">
                        <div className="ac-kpi-label">{label}</div>
                        <div className="ac-kpi-value" style={color ? { color } : {}}>
                            {prefix && <span className="ac-kpi-ccy">{prefix}</span>}
                            {value}
                        </div>
                        <div className="ac-kpi-sub">{sub}</div>
                    </div>
                ))}
            </div>

            <OrdersClient orders={orders ?? []} />
        </>
    );
}
