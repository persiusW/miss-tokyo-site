import { supabase } from "@/lib/supabase";

export default async function PaymentsPage() {
    const { data: allOrders } = await supabase
        .from("orders")
        .select("id, customer_email, total_amount, paystack_reference, created_at, status, payment_status")
        .order("created_at", { ascending: false });

    const LEGACY_PAID = ["paid", "processing", "fulfilled", "delivered", "packed", "ready_for_pickup", "shipped"];
    const payments = (allOrders || []).filter((p: any) =>
        p.payment_status === "paid" || (!p.payment_status && LEGACY_PAID.includes(p.status ?? ""))
    );

    const total = payments.reduce((sum: number, p: any) => sum + Number(p.total_amount), 0);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const monthlyTotal = (payments || [])
        .filter((p: any) => new Date(p.created_at) >= thisMonth)
        .reduce((sum: number, p: any) => sum + Number(p.total_amount), 0);

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Payments</h1>
                    <p className="ac-page-sub">Confirmed Paystack transactions.</p>
                </div>
            </div>

            <div className="ac-kpi-grid" style={{ marginBottom: 24 }}>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Total Collected</span>
                    <span className="ac-kpi-value"><span className="ac-kpi-ccy">GH₵ </span>{total.toFixed(2)}</span>
                    <span className="ac-kpi-sub">All time</span>
                </div>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">This Month</span>
                    <span className="ac-kpi-value"><span className="ac-kpi-ccy">GH₵ </span>{monthlyTotal.toFixed(2)}</span>
                    <span className="ac-kpi-sub">Current period</span>
                </div>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Transactions</span>
                    <span className="ac-kpi-value">{payments?.length || 0}</span>
                    <span className="ac-kpi-sub">Confirmed payments</span>
                </div>
            </div>

            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>Paystack Ref</th>
                                <th>Customer</th>
                                <th className="r">Amount</th>
                                <th className="r">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!payments || payments.length === 0) ? (
                                <tr><td colSpan={4} className="ac-table-empty">No confirmed payments on record.</td></tr>
                            ) : payments.map((p: any) => (
                                <tr key={p.id}>
                                    <td>
                                        <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, background: "var(--ac-panel-2)", padding: "3px 8px", borderRadius: "var(--r-sm)", color: "var(--ac-ink-3)" }}>
                                            {p.paystack_reference || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        <a href={`mailto:${p.customer_email}`} className="ac-text-link" style={{ fontSize: 13 }}>
                                            {p.customer_email}
                                        </a>
                                    </td>
                                    <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 600, color: "var(--ac-accent)" }}>
                                        GH₵ {Number(p.total_amount).toFixed(2)}
                                    </td>
                                    <td className="r" style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>
                                        {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
