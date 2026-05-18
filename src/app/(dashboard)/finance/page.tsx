"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Document = {
    id: string;
    type: "invoice" | "quotation";
    amount: number;
    status: "pending" | "paid" | "draft" | "cancelled";
    customer_id?: string;
    created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
    paid:      "ac-badge-ok",
    pending:   "ac-badge-warn",
    draft:     "ac-badge-inactive",
    cancelled: "ac-badge-danger",
};

export default function FinancePage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [amount, setAmount] = useState<number | "">("");
    const [docType, setDocType] = useState<"invoice" | "quotation">("invoice");
    const [saving, setSaving] = useState(false);

    const fetchDocuments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("documents")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) setDocuments(data);
        setLoading(false);
    };

    useEffect(() => { fetchDocuments(); }, []);

    const handleCreateDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;

        setSaving(true);
        const newDoc = { type: docType, amount: Number(amount), status: "pending" };
        const { error } = await supabase.from("documents").insert([newDoc]);

        if (error) {
            console.error(error);
            alert("Failed to create document.");
        } else {
            setAmount("");
            setIsCreating(false);
            fetchDocuments();
        }
        setSaving(false);
    };

    const copyPayLink = (docId: string, docAmount: number) => {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://misstokyo.shop";
        const fakeLink = `${baseUrl}/checkout/direct?ref=${docId}&amt=${docAmount}`;
        navigator.clipboard.writeText(fakeLink);
        alert("Pay Link copied to clipboard!");
    };

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Finance</h1>
                    <p className="ac-page-sub">Manage invoices, quotations, and generate direct Pay Links.</p>
                </div>
                <button onClick={() => setIsCreating(!isCreating)} className="ac-btn ac-btn-primary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {isCreating ? "Cancel" : "New Document"}
                </button>
            </div>

            {isCreating && (
                <div className="ac-card" style={{ marginBottom: 24 }}>
                    <div className="ac-card-head"><span className="ac-card-title">Create New Document</span></div>
                    <form onSubmit={handleCreateDocument} style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end" }}>
                        <div>
                            <label htmlFor="type" className="ac-label">Document Type</label>
                            <select id="type" value={docType}
                                onChange={e => setDocType(e.target.value as "invoice" | "quotation")}
                                className="ac-select" style={{ marginTop: 4 }}>
                                <option value="invoice">Invoice</option>
                                <option value="quotation">Quotation</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="amount" className="ac-label">Amount (GHS)</label>
                            <input type="number" id="amount" min="0" step="0.01" required
                                value={amount}
                                onChange={e => setAmount(Number(e.target.value))}
                                className="ac-input" style={{ marginTop: 4 }}
                                placeholder="0.00" />
                        </div>
                        <button type="submit" disabled={saving} className="ac-btn ac-btn-primary">
                            {saving ? "Generating..." : "Generate"}
                        </button>
                    </form>
                </div>
            )}

            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>Document ID</th>
                                <th>Type</th>
                                <th className="r">Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th className="r">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="ac-table-empty">Loading financial records...</td></tr>
                            ) : (!documents || documents.length === 0) ? (
                                <tr><td colSpan={6} className="ac-table-empty">No documents found. Click 'New Document' to issue an invoice.</td></tr>
                            ) : documents.map(doc => (
                                <tr key={doc.id}>
                                    <td style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 600 }}>{doc.id.substring(0, 8).toUpperCase()}</td>
                                    <td style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-3)" }}>{doc.type}</td>
                                    <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>GH₵ {doc.amount.toFixed(2)}</td>
                                    <td>
                                        <span className={`ac-badge ${STATUS_BADGE[doc.status] || "ac-badge-inactive"}`}>{doc.status}</span>
                                    </td>
                                    <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{new Date(doc.created_at).toLocaleDateString()}</td>
                                    <td className="r">
                                        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "flex-end" }}>
                                            <button onClick={() => copyPayLink(doc.id, doc.amount)}
                                                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}
                                                onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-ink)")}
                                                onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                Copy Pay Link
                                            </button>
                                            <button style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}
                                                onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-ink)")}
                                                onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                View PDF
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
