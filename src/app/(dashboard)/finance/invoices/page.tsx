"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type LineItem = { description: string; qty: number; unit_price: number; mode: "custom" | "product"; product_id?: string };
type Product = { id: string; name: string; price_ghs: number };

type DocForm = {
    type: "invoice" | "quotation";
    customer_name: string;
    customer_email: string;
    notes: string;
    tax_rate: number;
    line_items: LineItem[];
};

type Document = {
    id: string;
    type: "invoice" | "quotation";
    amount: number;
    status: "pending" | "paid" | "draft" | "cancelled";
    customer_name: string | null;
    customer_email: string | null;
    line_items: LineItem[] | null;
    tax_rate: number | null;
    notes: string | null;
    created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
    paid:      "ac-badge-ok",
    pending:   "ac-badge-warn",
    draft:     "ac-badge-inactive",
    cancelled: "ac-badge-danger",
};

const EMPTY_LINE: LineItem = { description: "", qty: 1, unit_price: 0, mode: "custom" };

export default function InvoicesPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [defaultTaxRate, setDefaultTaxRate] = useState(0);
    const [products, setProducts] = useState<Product[]>([]);
    const [form, setForm] = useState<DocForm>({
        type: "invoice",
        customer_name: "",
        customer_email: "",
        notes: "",
        tax_rate: 0,
        line_items: [{ ...EMPTY_LINE }],
    });

    const fetchDocuments = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("documents")
            .select("*")
            .in("type", ["invoice", "quotation"])
            .order("created_at", { ascending: false });
        if (data) setDocuments(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchDocuments();
        supabase
            .from("business_settings")
            .select("tax_rate")
            .eq("id", "default")
            .single()
            .then(({ data }: { data: any }) => {
                if (data?.tax_rate) {
                    const rate = Number(data.tax_rate);
                    setDefaultTaxRate(rate);
                    setForm(prev => ({ ...prev, tax_rate: rate }));
                }
            });
        supabase
            .from("products")
            .select("id, name, price_ghs")
            .eq("is_active", true)
            .order("name")
            .then(({ data }: { data: any }) => { if (data) setProducts(data as Product[]); });
    }, []);

    const openCreate = () => {
        setForm({
            type: "invoice",
            customer_name: "",
            customer_email: "",
            notes: "",
            tax_rate: defaultTaxRate,
            line_items: [{ ...EMPTY_LINE }],
        });
        setIsCreating(true);
    };

    const subtotal = form.line_items.reduce((s, l) => s + l.qty * l.unit_price, 0);
    const taxAmount = subtotal * (form.tax_rate / 100);
    const total = subtotal + taxAmount;

    const updateLine = (i: number, field: keyof LineItem, value: string | number) => {
        setForm(prev => {
            const lines = [...prev.line_items];
            lines[i] = { ...lines[i], [field]: (field === "description" || field === "mode" || field === "product_id") ? value : Number(value) };
            return { ...prev, line_items: lines };
        });
    };

    const setLineMode = (i: number, mode: "custom" | "product") => {
        setForm(prev => {
            const lines = [...prev.line_items];
            lines[i] = { ...EMPTY_LINE, mode, qty: lines[i].qty };
            return { ...prev, line_items: lines };
        });
    };

    const pickProduct = (i: number, productId: string) => {
        const p = products.find(p => p.id === productId);
        if (!p) return;
        setForm(prev => {
            const lines = [...prev.line_items];
            lines[i] = { ...lines[i], product_id: p.id, description: p.name, unit_price: Number(p.price_ghs) };
            return { ...prev, line_items: lines };
        });
    };

    const addLine = () =>
        setForm(prev => ({ ...prev, line_items: [...prev.line_items, { ...EMPTY_LINE }] }));

    const removeLine = (i: number) =>
        setForm(prev => ({ ...prev, line_items: prev.line_items.filter((_, idx) => idx !== i) }));

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const hasItems = form.line_items.some(l => l.description.trim());
        if (!hasItems) return;
        setSaving(true);
        const { error } = await supabase.from("documents").insert([{
            type: form.type,
            amount: total,
            status: "draft",
            customer_name: form.customer_name || null,
            customer_email: form.customer_email || null,
            line_items: form.line_items,
            tax_rate: form.tax_rate,
            notes: form.notes || null,
        }]);
        if (!error) {
            setIsCreating(false);
            await fetchDocuments();
            toast.success("Document saved.");
        } else {
            toast.error("Failed to save document.");
        }
        setSaving(false);
    };

    const updateStatus = async (id: string, status: string) => {
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: status as Document["status"] } : d));
        await supabase.from("documents").update({ status }).eq("id", id);
    };

    const copyPayLink = (docId: string, docAmount: number) => {
        const link = `${window.location.origin}/checkout/direct?ref=${docId}&amt=${docAmount}`;
        navigator.clipboard.writeText(link);
        toast.info("Pay link copied.");
    };

    const invoices = documents.filter(d => d.type === "invoice");
    const quotations = documents.filter(d => d.type === "quotation");
    const totalPaid = invoices.filter(d => d.status === "paid").reduce((s, d) => s + Number(d.amount), 0);
    const totalPending = invoices.filter(d => d.status === "pending").reduce((s, d) => s + Number(d.amount), 0);

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Invoices</h1>
                    <p className="ac-page-sub">Issue and track invoices and quotations.</p>
                </div>
                <button onClick={isCreating ? () => setIsCreating(false) : openCreate} className="ac-btn ac-btn-primary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {isCreating ? "Cancel" : "New Document"}
                </button>
            </div>

            {/* KPI strip */}
            <div className="ac-kpi-grid" style={{ marginBottom: 24 }}>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Paid Invoices</span>
                    <span className="ac-kpi-value" style={{ color: "var(--ac-accent)" }}>
                        <span className="ac-kpi-ccy">GH₵ </span>{totalPaid.toFixed(2)}
                    </span>
                </div>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Outstanding</span>
                    <span className="ac-kpi-value" style={{ color: "var(--ac-warn)" }}>
                        <span className="ac-kpi-ccy">GH₵ </span>{totalPending.toFixed(2)}
                    </span>
                </div>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Quotations</span>
                    <span className="ac-kpi-value">{quotations.length}</span>
                </div>
            </div>

            {/* Document Builder */}
            {isCreating && (
                <form onSubmit={handleCreate}>
                    <div className="ac-card" style={{ marginBottom: 24 }}>
                        {/* Header */}
                        <div className="ac-card-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span className="ac-card-title">New Document</span>
                            <select value={form.type}
                                onChange={e => setForm(p => ({ ...p, type: e.target.value as "invoice" | "quotation" }))}
                                className="ac-select" style={{ width: "auto", fontSize: 11 }}>
                                <option value="invoice">Invoice</option>
                                <option value="quotation">Quotation</option>
                            </select>
                        </div>

                        {/* Bill To */}
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ac-line)" }}>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-4)", marginBottom: 12 }}>Bill To</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <label className="ac-label">Customer Name</label>
                                    <input type="text" value={form.customer_name}
                                        onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                                        className="ac-input" style={{ marginTop: 4 }}
                                        placeholder="e.g. Kwame Mensah" />
                                </div>
                                <div>
                                    <label className="ac-label">Customer Email</label>
                                    <input type="email" value={form.customer_email}
                                        onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))}
                                        className="ac-input" style={{ marginTop: 4 }}
                                        placeholder="client@email.com" />
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ac-line)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-4)" }}>Line Items</p>
                                <button type="button" onClick={addLine} className="ac-text-link" style={{ fontSize: 11 }}>+ Add Line</button>
                            </div>

                            {/* Column headers */}
                            <div style={{ display: "grid", gridTemplateColumns: "6fr 2fr 3fr 1fr", gap: 12, fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", fontWeight: 600, paddingBottom: 8, borderBottom: "1px solid var(--ac-line)", marginBottom: 8 }}>
                                <div>Description</div>
                                <div style={{ textAlign: "center" }}>Qty</div>
                                <div style={{ textAlign: "right" }}>Unit Price (GHS)</div>
                                <div style={{ textAlign: "right" }}>Total</div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {form.line_items.map((line, i) => (
                                    <div key={i} style={{ display: "grid", gridTemplateColumns: "6fr 2fr 3fr 1fr", gap: 12, alignItems: "start" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                {(["product", "custom"] as const).map(mode => (
                                                    <button key={mode} type="button" onClick={() => setLineMode(i, mode)}
                                                        className={`ac-btn ac-btn-sm ${line.mode === mode ? "ac-btn-primary" : "ac-btn-ghost"}`}
                                                        style={{ fontSize: 9, padding: "2px 8px" }}>
                                                        {mode === "product" ? "Product" : "Custom"}
                                                    </button>
                                                ))}
                                            </div>
                                            {line.mode === "product" ? (
                                                <select value={line.product_id || ""} onChange={e => pickProduct(i, e.target.value)}
                                                    className="ac-select" required>
                                                    <option value="">Select a product…</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} — GH₵ {Number(p.price_ghs).toFixed(2)}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input type="text" value={line.description}
                                                    onChange={e => updateLine(i, "description", e.target.value)}
                                                    className="ac-input" placeholder="Item description" required />
                                            )}
                                        </div>
                                        <div>
                                            <input type="number" min="1" step="1" value={line.qty}
                                                onChange={e => updateLine(i, "qty", e.target.value)}
                                                className="ac-input" style={{ textAlign: "center" }} />
                                        </div>
                                        <div>
                                            <input type="number" min="0" step="0.01" value={line.unit_price}
                                                onChange={e => updateLine(i, "unit_price", e.target.value)}
                                                className="ac-input" style={{ textAlign: "right" }} />
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                                            <span style={{ fontSize: 12, fontFamily: "var(--f-mono)", color: "var(--ac-ink-3)" }}>
                                                {(line.qty * line.unit_price).toFixed(0)}
                                            </span>
                                            {form.line_items.length > 1 && (
                                                <button type="button" onClick={() => removeLine(i)}
                                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", fontSize: 16 }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-danger)")}
                                                    onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                                <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 10 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--ac-ink-3)" }}>
                                        <span>Subtotal</span>
                                        <span style={{ fontFamily: "var(--f-mono)" }}>GH₵ {subtotal.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--ac-ink-3)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span>Tax</span>
                                            <input type="number" min="0" max="100" step="0.1" value={form.tax_rate}
                                                onChange={e => setForm(p => ({ ...p, tax_rate: Number(e.target.value) }))}
                                                className="ac-input" style={{ width: 56, padding: "2px 8px", textAlign: "center", fontSize: 12 }} />
                                            <span style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>%</span>
                                        </div>
                                        <span style={{ fontFamily: "var(--f-mono)" }}>GH₵ {taxAmount.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, borderTop: "1px solid var(--ac-line)", paddingTop: 12, color: "var(--ac-ink)" }}>
                                        <span>Total</span>
                                        <span style={{ fontFamily: "var(--f-mono)" }}>GH₵ {total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes + Submit */}
                        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "end" }}>
                            <div>
                                <label className="ac-label">Notes (Optional)</label>
                                <textarea value={form.notes}
                                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    rows={2} className="ac-textarea" style={{ marginTop: 4 }}
                                    placeholder="Payment terms, bank details, thank-you note..." />
                            </div>
                            <button type="submit" disabled={saving} className="ac-btn ac-btn-primary">
                                {saving ? "Saving..." : `Save ${form.type === "invoice" ? "Invoice" : "Quotation"}`}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Documents Table */}
            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Client</th>
                                <th className="r">Total</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th className="r">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="ac-table-empty">Loading...</td></tr>
                            ) : documents.length === 0 ? (
                                <tr><td colSpan={7} className="ac-table-empty">No documents yet. Click 'New Document' to issue one.</td></tr>
                            ) : documents.map(doc => (
                                <tr key={doc.id}>
                                    <td style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 600 }}>{doc.id.substring(0, 8).toUpperCase()}</td>
                                    <td style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-3)" }}>{doc.type}</td>
                                    <td>
                                        <div style={{ fontWeight: 500, fontSize: 13, color: "var(--ac-ink)" }}>{doc.customer_name || "—"}</div>
                                        {doc.customer_email && <div style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{doc.customer_email}</div>}
                                    </td>
                                    <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>GH₵ {Number(doc.amount).toFixed(2)}</td>
                                    <td>
                                        <select value={doc.status} onChange={e => updateStatus(doc.id, e.target.value)}
                                            className={`ac-badge ${STATUS_BADGE[doc.status] || "ac-badge-inactive"}`}
                                            style={{ cursor: "pointer", border: "none" }}>
                                            {["draft", "pending", "paid", "cancelled"].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{new Date(doc.created_at).toLocaleDateString("en-GB")}</td>
                                    <td className="r">
                                        <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "flex-end" }}>
                                            <Link href={`/finance/invoices/${doc.id}`} className="ac-text-link" style={{ fontSize: 11 }}>View</Link>
                                            <button onClick={() => copyPayLink(doc.id, doc.amount)}
                                                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}
                                                onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-ink)")}
                                                onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                Pay Link
                                            </button>
                                        </div>
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
