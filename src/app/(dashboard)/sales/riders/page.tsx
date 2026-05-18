import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RidersReportPage() {
    const [ridersRes, ordersRes] = await Promise.all([
        supabaseAdmin.from("riders").select("id, full_name, phone_number, bike_reg, image_url, is_active").order("full_name"),
        supabaseAdmin.from("orders").select("id, assigned_rider_id, status, total_amount, created_at").not("assigned_rider_id", "is", null),
    ]);

    const riders = ridersRes.data ?? [];
    const orders = ordersRes.data ?? [];

    type RiderRow = {
        id: string;
        full_name: string;
        phone_number: string;
        bike_reg: string | null;
        image_url: string | null;
        is_active: boolean;
        totalOrders: number;
        delivered: number;
        inTransit: number;
        totalRevenue: number;
        lastDate: string | null;
    };

    const rows: RiderRow[] = riders.map(r => {
        const rOrders = orders.filter(o => o.assigned_rider_id === r.id);
        const delivered = rOrders.filter(o => ["fulfilled", "delivered"].includes(o.status)).length;
        const inTransit = rOrders.filter(o => o.status === "shipped").length;
        const totalRevenue = rOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
        const dates = rOrders.map(o => o.created_at).sort().reverse();
        return { ...r, totalOrders: rOrders.length, delivered, inTransit, totalRevenue, lastDate: dates[0] ?? null };
    });

    const totalDispatched = orders.length;
    const totalDelivered = orders.filter(o => ["fulfilled", "delivered"].includes(o.status)).length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Rider Reports</h1>
                    <p className="ac-page-sub">Delivery performance across all assigned riders.</p>
                </div>
            </div>

            <div className="ac-kpi-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: "Active Riders",    value: riders.filter(r => r.is_active).length, mono: false },
                    { label: "Total Dispatched", value: totalDispatched, mono: false },
                    { label: "Total Delivered",  value: totalDelivered, mono: false },
                    { label: "Revenue Handled",  value: totalRevenue, mono: true },
                ].map(({ label, value, mono }) => (
                    <div key={label} className="ac-kpi">
                        <span className="ac-kpi-label">{label}</span>
                        <span className="ac-kpi-value">
                            {mono && <span className="ac-kpi-ccy">GH₵ </span>}
                            {mono ? Number(value).toFixed(2) : value}
                        </span>
                    </div>
                ))}
            </div>

            <div className="ac-card flush">
                <div className="ac-card-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="ac-card-title">All Riders</span>
                    <span style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{rows.length} riders</span>
                </div>
                {rows.length === 0 ? (
                    <div className="ac-empty">
                        <p className="ac-empty-title">No riders found.</p>
                        <p style={{ fontSize: 12, color: "var(--ac-ink-4)", marginTop: 4 }}>Add riders in Settings to track dispatch performance.</p>
                    </div>
                ) : (
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>Rider</th>
                                    <th>Phone</th>
                                    <th>Bike Reg</th>
                                    <th className="r">Total</th>
                                    <th className="r">In Transit</th>
                                    <th className="r">Delivered</th>
                                    <th className="r">Revenue</th>
                                    <th>Status</th>
                                    <th>Last Active</th>
                                    <th style={{ width: 60 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                {r.image_url ? (
                                                    <img src={r.image_url} alt={r.full_name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                                ) : (
                                                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--ac-panel-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--ac-line)" }}>
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ac-ink-3)" }}>{r.full_name.charAt(0)}</span>
                                                    </div>
                                                )}
                                                <span style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{r.full_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{r.phone_number}</td>
                                        <td style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-3)" }}>{r.bike_reg || "—"}</td>
                                        <td className="r" style={{ fontWeight: 600 }}>{r.totalOrders}</td>
                                        <td className="r" style={{ color: r.inTransit > 0 ? "var(--ac-accent)" : "var(--ac-ink-4)" }}>{r.inTransit}</td>
                                        <td className="r" style={{ color: r.delivered > 0 ? "var(--ac-accent)" : "var(--ac-ink-4)" }}>{r.delivered}</td>
                                        <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>
                                            {r.totalRevenue > 0 ? `GH₵ ${r.totalRevenue.toFixed(2)}` : "—"}
                                        </td>
                                        <td>
                                            <span className={`ac-badge ${r.is_active ? "ac-badge-ok" : "ac-badge-inactive"}`}>
                                                {r.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>
                                            {r.lastDate ? new Date(r.lastDate).toLocaleDateString("en-GB") : "—"}
                                        </td>
                                        <td>
                                            <Link href={`/sales/riders/${r.id}`} className="ac-text-link" style={{ fontSize: 11 }}>View →</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
