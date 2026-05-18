import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PrintButton } from "./PrintButton";
import { InvoiceActions } from "./InvoiceActions";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [{ data: doc }, { data: biz }] = await Promise.all([
        supabase.from("documents").select("*").eq("id", id).single(),
        supabase.from("business_settings").select("*").eq("id", "default").single(),
    ]);

    if (!doc) notFound();

    const lineItems: { description: string; qty: number; unit_price: number }[] = doc.line_items || [];
    const subtotal = lineItems.reduce((s, l) => s + l.qty * l.unit_price, 0);
    const taxRate = Number(doc.tax_rate || 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const docNumber = doc.id.substring(0, 8).toUpperCase();
    const issued = new Date(doc.created_at).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
    });

    const statusBadge =
        doc.status === "paid" ? "ac-badge-ok" :
        doc.status === "pending" ? "ac-badge-warn" :
        doc.status === "draft" ? "ac-badge-inactive" :
        "ac-badge-danger";

    return (
        <div>
            {/* Toolbar — hidden on print */}
            <div className="no-print ac-page-head" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ac-ink-3)" }}>
                    <Link href="/finance/invoices" className="ac-text-link">← Invoices</Link>
                    <span>/</span>
                    <span style={{ color: "var(--ac-ink)", fontFamily: "var(--f-mono)", fontWeight: 600 }}>#{docNumber}</span>
                    <span className={`ac-badge ${statusBadge}`} style={{ marginLeft: 8 }}>{doc.status}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <InvoiceActions
                        docId={doc.id}
                        docAmount={total}
                        customerEmail={doc.customer_email ?? null}
                    />
                    <PrintButton />
                </div>
            </div>

            {/* Invoice Document — kept clean for print */}
            <div id="invoice-print" style={{ background: "#fff", border: "1px solid #e5e5e5", padding: "48px", maxWidth: 720, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
                    <div>
                        {biz?.logo_url && (
                            <img src={biz.logo_url} alt={biz.business_name} style={{ height: 48, width: 48, objectFit: "cover", marginBottom: 16 }} />
                        )}
                        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, letterSpacing: ".1em", textTransform: "uppercase", color: "#111" }}>
                            {biz?.business_name || "Miss Tokyo"}
                        </h1>
                        {biz?.address && (
                            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8, whiteSpace: "pre-line" }}>{biz.address}</p>
                        )}
                        {biz?.email && <p style={{ fontSize: 12, color: "#6b7280" }}>{biz.email}</p>}
                        {biz?.contact && <p style={{ fontSize: 12, color: "#6b7280" }}>{biz.contact}</p>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "#9ca3af", marginBottom: 4 }}>{doc.type}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#111" }}>#{docNumber}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>Issued: {issued}</div>
                        <div style={{ marginTop: 12, display: "inline-block", padding: "4px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, borderRadius: 4,
                            background: doc.status === "paid" ? "#f0fdf4" : doc.status === "pending" ? "#fffbeb" : doc.status === "draft" ? "#f5f5f5" : "#fef2f2",
                            color: doc.status === "paid" ? "#15803d" : doc.status === "pending" ? "#d97706" : doc.status === "draft" ? "#6b7280" : "#dc2626",
                        }}>
                            {doc.status}
                        </div>
                    </div>
                </div>

                <hr style={{ borderColor: "#f0f0f0", marginBottom: 32 }} />

                {/* Bill To */}
                {(doc.customer_name || doc.customer_email) && (
                    <div style={{ marginBottom: 32 }}>
                        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "#9ca3af", marginBottom: 10 }}>Bill To</div>
                        {doc.customer_name && <div style={{ fontWeight: 500, color: "#111" }}>{doc.customer_name}</div>}
                        {doc.customer_email && <div style={{ fontSize: 13, color: "#6b7280" }}>{doc.customer_email}</div>}
                    </div>
                )}

                {/* Line Items */}
                <div style={{ marginBottom: 32 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "#9ca3af", fontWeight: 600, paddingBottom: 10 }}>Description</th>
                                <th style={{ textAlign: "center", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "#9ca3af", fontWeight: 600, paddingBottom: 10, width: 64 }}>Qty</th>
                                <th style={{ textAlign: "right", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "#9ca3af", fontWeight: 600, paddingBottom: 10, width: 130 }}>Unit Price</th>
                                <th style={{ textAlign: "right", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "#9ca3af", fontWeight: 600, paddingBottom: 10, width: 130 }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.length > 0 ? (
                                lineItems.map((line, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                                        <td style={{ padding: "12px 0", color: "#374151" }}>{line.description}</td>
                                        <td style={{ padding: "12px 0", textAlign: "center", color: "#6b7280" }}>{line.qty}</td>
                                        <td style={{ padding: "12px 0", textAlign: "right", color: "#6b7280" }}>GH₵ {Number(line.unit_price).toFixed(2)}</td>
                                        <td style={{ padding: "12px 0", textAlign: "right", fontWeight: 500, color: "#111" }}>GH₵ {(line.qty * line.unit_price).toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ padding: "24px 0", textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>No line items</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
                    <div style={{ width: 256, fontSize: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#6b7280" }}>
                            <span>Subtotal</span>
                            <span>GH₵ {subtotal.toFixed(2)}</span>
                        </div>
                        {taxRate > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "#6b7280" }}>
                                <span>Tax ({taxRate}%)</span>
                                <span>GH₵ {taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 15, borderTop: "1px solid #e5e7eb", paddingTop: 12, marginTop: 4, color: "#111" }}>
                            <span>Total</span>
                            <span>GH₵ {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {doc.notes && (
                    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 24, marginBottom: 32 }}>
                        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "#9ca3af", marginBottom: 8 }}>Notes</div>
                        <p style={{ fontSize: 13, color: "#6b7280", whiteSpace: "pre-line" }}>{doc.notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 24, textAlign: "center" }}>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "#9ca3af" }}>
                        Thank you for your business — {biz?.business_name || "Miss Tokyo"}
                    </p>
                </div>
            </div>
        </div>
    );
}
