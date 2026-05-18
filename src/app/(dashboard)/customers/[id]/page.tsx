import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Order = {
    id: string;
    total_amount: number;
    status: string;
    created_at: string;
    items: any[];
    discount_code: string | null;
    discount_amount: number;
};

type ContactInquiry = {
    id: string;
    message: string;
    created_at: string;
};

type Document = {
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
};

const ORDER_STATUS_BADGE: Record<string, string> = {
    paid:      "ac-badge-paid",
    pending:   "ac-badge-pending",
    cancelled: "ac-badge-cancelled",
    shipped:   "ac-badge-shipped",
    fulfilled: "ac-badge-fulfilled",
    draft:     "ac-badge-inactive",
    sent:      "ac-badge-info",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const email = decodeURIComponent(id);

    if (!email || !email.includes("@")) notFound();

    const [ordersRes, inquiriesRes, documentsRes, profileRes] = await Promise.all([
        supabaseAdmin
            .from("orders")
            .select("id, total_amount, status, created_at, items, discount_code, discount_amount")
            .eq("customer_email", email)
            .order("created_at", { ascending: false }),
        supabaseAdmin
            .from("contact_inquiries")
            .select("id, message, created_at")
            .eq("email", email)
            .order("created_at", { ascending: false }),
        supabaseAdmin
            .from("documents")
            .select("id, type, amount, status, created_at")
            .eq("customer_email", email)
            .order("created_at", { ascending: false }),
        supabaseAdmin
            .from("orders")
            .select("customer_name, customer_phone, shipping_address, customer_metadata")
            .eq("customer_email", email)
            .order("created_at", { ascending: false })
            .limit(1)
            .single(),
    ]);

    const orders: Order[] = ordersRes.data || [];
    const inquiries: ContactInquiry[] = inquiriesRes.data || [];
    const documents: Document[] = documentsRes.data || [];
    const profile = profileRes.data;

    const displayName = profile?.customer_name || null;
    const phone = profile?.customer_phone || null;
    const address = (profile?.shipping_address as any)?.text || null;
    const totalSpend = orders
        .filter(o => o.status === "paid" || o.status === "fulfilled" || o.status === "shipped")
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ac-ink-3)", marginBottom: 8 }}>
                        <Link href="/customers" className="ac-text-link">Contacts</Link>
                        <span>/</span>
                        <span style={{ color: "var(--ac-ink)" }}>{displayName || email.split("@")[0]}</span>
                    </div>
                    <h1 className="ac-page-h1">{displayName || email.split("@")[0]}</h1>
                    <p className="ac-page-sub">{email}</p>
                </div>
                {totalSpend > 0 && (
                    <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 4 }}>Total Spent</p>
                        <p style={{ fontFamily: "var(--f-display)", fontSize: 22, fontWeight: 600, color: "var(--ac-ink)" }}>GH₵ {totalSpend.toFixed(2)}</p>
                    </div>
                )}
            </div>

            {/* Contact Info */}
            <div className="ac-card" style={{ marginBottom: 24 }}>
                <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
                    {[
                        { label: "Email", value: email },
                        { label: "Phone", value: phone },
                        { label: "Last Shipping Address", value: address },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 4 }}>{label}</p>
                            <p style={{ fontSize: 13, color: value ? "var(--ac-ink)" : "var(--ac-ink-4)" }}>{value || "—"}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order History */}
            <section style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)", marginBottom: 12 }}>
                    Order History <span style={{ color: "var(--ac-ink-4)", fontWeight: 400 }}>({orders.length})</span>
                </h2>
                <div className="ac-card flush">
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Items</th>
                                    <th className="r">Total</th>
                                    <th>Status</th>
                                    <th className="r">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr><td colSpan={5} className="ac-table-empty">No orders found.</td></tr>
                                ) : orders.map(order => (
                                    <tr key={order.id}>
                                        <td>
                                            <Link href={`/sales/orders/${order.id}`} className="ac-text-link" style={{ fontFamily: "var(--f-mono)", fontSize: 12 }}>
                                                #{order.id.substring(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                            {Array.isArray(order.items) && order.items.length > 0
                                                ? `${order.items.length} item${order.items.length !== 1 ? "s" : ""}`
                                                : "—"}
                                        </td>
                                        <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>
                                            GH₵ {Number(order.total_amount).toFixed(2)}
                                            {order.discount_code && (
                                                <span style={{ display: "block", fontSize: 10, color: "var(--ac-accent)" }}>-{order.discount_code}</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`ac-badge ${ORDER_STATUS_BADGE[order.status] || "ac-badge-inactive"}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="r" style={{ fontSize: 11, color: "var(--ac-ink-4)", whiteSpace: "nowrap" }}>
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Form Submissions */}
            <section style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)", marginBottom: 12 }}>
                    Form Submissions <span style={{ color: "var(--ac-ink-4)", fontWeight: 400 }}>({inquiries.length})</span>
                </h2>
                <div className="ac-card flush">
                    {inquiries.length === 0 ? (
                        <div className="ac-empty"><p className="ac-empty-title">No form submissions found.</p></div>
                    ) : (
                        <div>
                            {inquiries.map(inq => (
                                <div key={inq.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--ac-line)" }}>
                                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 4 }}>
                                        {new Date(inq.created_at).toLocaleDateString()}
                                    </p>
                                    <p style={{ fontSize: 13, color: "var(--ac-ink-2)", lineHeight: 1.6 }}>{inq.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Invoice History */}
            <section>
                <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)", marginBottom: 12 }}>
                    Invoices <span style={{ color: "var(--ac-ink-4)", fontWeight: 400 }}>({documents.length})</span>
                </h2>
                <div className="ac-card flush">
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Type</th>
                                    <th className="r">Amount</th>
                                    <th>Status</th>
                                    <th className="r">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.length === 0 ? (
                                    <tr><td colSpan={5} className="ac-table-empty">No invoices found.</td></tr>
                                ) : documents.map(doc => (
                                    <tr key={doc.id}>
                                        <td>
                                            <Link href={`/finance/invoices/${doc.id}`} className="ac-text-link" style={{ fontFamily: "var(--f-mono)", fontSize: 12 }}>
                                                #{doc.id.substring(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>{doc.type}</td>
                                        <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>GH₵ {Number(doc.amount).toFixed(2)}</td>
                                        <td>
                                            <span className={`ac-badge ${ORDER_STATUS_BADGE[doc.status] || "ac-badge-inactive"}`}>
                                                {doc.status}
                                            </span>
                                        </td>
                                        <td className="r" style={{ fontSize: 11, color: "var(--ac-ink-4)", whiteSpace: "nowrap" }}>
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </>
    );
}
