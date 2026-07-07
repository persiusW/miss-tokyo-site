import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_BADGE: Record<string, string> = {
    shipped:    "ac-badge ac-badge-shipped",
    fulfilled:  "ac-badge ac-badge-fulfilled",
    delivered:  "ac-badge ac-badge-delivered",
    cancelled:  "ac-badge ac-badge-cancelled",
    processing: "ac-badge ac-badge-processing",
};

export default async function RiderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [riderRes, ordersRes] = await Promise.all([
        supabaseAdmin.from("riders").select("*").eq("id", id).single(),
        supabaseAdmin.from("orders")
            .select("id, customer_name, customer_email, customer_phone, shipping_address, total_amount, status, created_at, delivery_method")
            .eq("assigned_rider_id", id)
            .order("created_at", { ascending: false }),
    ]);

    if (riderRes.error || !riderRes.data) notFound();

    const rider = riderRes.data;
    const orders = ordersRes.data ?? [];

    const delivered    = orders.filter(o => ["fulfilled", "delivered"].includes(o.status)).length;
    const inTransit    = orders.filter(o => o.status === "shipped").length;
    const cancelled    = orders.filter(o => o.status === "cancelled").length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const deliveryRate = orders.length > 0 ? ((delivered / orders.length) * 100).toFixed(0) : "0";

    return (
        <>
            <div className="ac-page-head" style={{ marginBottom: 24 }}>
                <div>
                    <Link href="/sales/riders" className="ac-text-link" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
                        ← All Riders
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {rider.image_url ? (
                            <img src={rider.image_url} alt={rider.full_name} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span style={{ fontSize: 20, fontFamily: "var(--f-display)", color: "var(--ac-ink-3)" }}>{rider.full_name.charAt(0)}</span>
                            </div>
                        )}
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                <h1 className="ac-page-h1" style={{ marginBottom: 0 }}>{rider.full_name}</h1>
                                <span className={`ac-badge ${rider.is_active ? "ac-badge-ok" : "ac-badge-inactive"}`}>
                                    {rider.is_active ? "Active" : "Inactive"}
                                </span>
                            </div>
                            <p className="ac-page-sub" style={{ marginBottom: 0 }}>
                                {rider.phone_number}
                                {rider.bike_reg && (
                                    <span style={{ marginLeft: 12, fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-4)" }}>{rider.bike_reg}</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="ac-kpi-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: "Total Orders",  value: orders.length,        mono: false },
                    { label: "In Transit",    value: inTransit,            mono: false },
                    { label: "Delivered",     value: delivered,            mono: false },
                    { label: "Cancelled",     value: cancelled,            mono: false },
                    { label: "Delivery Rate", value: `${deliveryRate}%`,   mono: false },
                ].map(({ label, value }) => (
                    <div key={label} className="ac-kpi">
                        <span className="ac-kpi-label">{label}</span>
                        <span className="ac-kpi-value">{value}</span>
                    </div>
                ))}
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Revenue Handled</span>
                    <span className="ac-kpi-value"><span className="ac-kpi-ccy">GH₵ </span>{totalRevenue.toFixed(2)}</span>
                </div>
            </div>

            <div className="ac-card flush">
                <div className="ac-card-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="ac-card-title">Assigned Orders</span>
                    <span style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{orders.length} orders</span>
                </div>
                {orders.length === 0 ? (
                    <div className="ac-empty">
                        <p className="ac-empty-title">No orders assigned to this rider yet.</p>
                    </div>
                ) : (
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Customer</th>
                                    <th>Phone</th>
                                    <th>Address</th>
                                    <th className="r">Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th style={{ width: 60 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(o => {
                                    const ref  = o.id.substring(0, 8).toUpperCase();
                                    const addr = (o.shipping_address as any)?.text || (o.shipping_address as any)?.city || "—";
                                    const badgeClass = STATUS_BADGE[o.status] || "ac-badge ac-badge-inactive";
                                    return (
                                        <tr key={o.id}>
                                            <td style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-3)" }}>#{ref}</td>
                                            <td style={{ fontWeight: 500 }}>{o.customer_name || o.customer_email || "—"}</td>
                                            <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{o.customer_phone || "—"}</td>
                                            <td style={{ fontSize: 11, color: "var(--ac-ink-4)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addr}</td>
                                            <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>GH₵ {Number(o.total_amount).toFixed(2)}</td>
                                            <td><span className={badgeClass}>{o.status}</span></td>
                                            <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{new Date(o.created_at).toLocaleDateString("en-GB")}</td>
                                            <td>
                                                <Link href={`/sales/orders/${o.id}`} className="ac-text-link" style={{ fontSize: 11 }}>View →</Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
