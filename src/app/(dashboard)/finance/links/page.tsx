"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type PayLink = {
    id: string;
    email: string;
    amount: number;
    description: string | null;
    paystack_url: string | null;
    paystack_reference: string | null;
    status: string;
    created_at: string;
};

type Tab = "active" | "archived";

export default function PayLinksPage() {
    const [links, setLinks] = useState<PayLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("active");
    const [generating, setGenerating] = useState(false);
    const [form, setForm] = useState({ email: "", amount: "", description: "" });
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [archiving, setArchiving] = useState<string | null>(null);

    const fetchLinks = async (currentTab: Tab) => {
        setLoading(true);
        const { data } = await supabase
            .from("pay_links")
            .select("*")
            .eq("status", currentTab === "active" ? "active" : "archived")
            .order("created_at", { ascending: false });
        if (data) setLinks(data);
        setLoading(false);
    };

    useEffect(() => { fetchLinks(tab); }, [tab]);

    useEffect(() => {
        supabase
            .from("business_settings")
            .select("email")
            .eq("id", "default")
            .single()
            .then(({ data }: { data: any }) => {
                if (data?.email) setForm(prev => ({ ...prev, email: prev.email || data.email }));
            });
    }, []);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.amount) return;
        setGenerating(true);
        setGeneratedUrl(null);

        try {
            const res = await fetch("/api/paystack/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: form.email, amount: Number(form.amount) }),
            });
            const data = await res.json();

            if (data.authorizationUrl) {
                setGeneratedUrl(data.authorizationUrl);
                await supabase.from("pay_links").insert([{
                    email: form.email,
                    amount: Number(form.amount),
                    description: form.description || null,
                    paystack_url: data.authorizationUrl,
                    paystack_reference: data.reference || null,
                    status: "active",
                }]);
                if (tab === "active") fetchLinks("active");
                toast.success("Pay link generated.");
            } else {
                toast.error("Failed to generate pay link. Check Paystack configuration.");
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.info("Link copied to clipboard.");
    };

    const handleArchive = async (id: string) => {
        setArchiving(id);
        const { error } = await supabase
            .from("pay_links")
            .update({ status: "archived" })
            .eq("id", id);
        if (error) {
            toast.error("Failed to archive link.");
        } else {
            toast.success("Link archived.");
            fetchLinks(tab);
        }
        setArchiving(null);
    };

    const colSpan = tab === "active" ? 6 : 5;

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Pay Links</h1>
                    <p className="ac-page-sub">Generate direct Paystack checkout URLs for custom amounts.</p>
                </div>
            </div>

            {/* Generator */}
            <div className="ac-card" style={{ marginBottom: 24 }}>
                <div className="ac-card-head"><span className="ac-card-title">Generate New Link</span></div>
                <form onSubmit={handleGenerate} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                        <div>
                            <label className="ac-label">Customer Email</label>
                            <input type="email" required value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                className="ac-input" style={{ marginTop: 4 }}
                                placeholder="client@email.com" />
                        </div>
                        <div>
                            <label className="ac-label">Amount (GHS)</label>
                            <input type="number" min="1" step="0.01" required value={form.amount}
                                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                                className="ac-input" style={{ marginTop: 4 }}
                                placeholder="0.00" />
                        </div>
                        <div>
                            <label className="ac-label">Description (Optional)</label>
                            <input type="text" value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                className="ac-input" style={{ marginTop: 4 }}
                                placeholder="e.g. Bespoke slide deposit" />
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        <button type="submit" disabled={generating} className="ac-btn ac-btn-primary">
                            {generating ? "Generating..." : "Generate Pay Link"}
                        </button>
                        {generatedUrl && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", padding: "8px 14px" }}>
                                <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ac-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{generatedUrl}</span>
                                <button type="button" onClick={() => copyToClipboard(generatedUrl)} className="ac-text-link" style={{ flexShrink: 0, fontSize: 11 }}>
                                    Copy
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Tabs + History */}
            <div className="ac-card flush">
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--ac-line)", display: "flex", gap: 20 }}>
                    <button onClick={() => setTab("active")}
                        className={`ac-tab ${tab === "active" ? "active" : ""}`}>
                        Active
                    </button>
                    <button onClick={() => setTab("archived")}
                        className={`ac-tab ${tab === "archived" ? "active" : ""}`}>
                        Archived
                    </button>
                </div>
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Description</th>
                                <th className="r">Amount</th>
                                <th>Date</th>
                                <th className="r">Link</th>
                                {tab === "active" && <th className="r">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={colSpan} className="ac-table-empty">Loading...</td></tr>
                            ) : links.length === 0 ? (
                                <tr><td colSpan={colSpan} className="ac-table-empty">
                                    {tab === "active" ? "No active pay links." : "No archived pay links."}
                                </td></tr>
                            ) : links.map(link => (
                                <tr key={link.id}>
                                    <td>
                                        <a href={`mailto:${link.email}`} className="ac-text-link" style={{ fontSize: 13 }}>{link.email}</a>
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--ac-ink-3)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {link.description || "—"}
                                    </td>
                                    <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>GH₵ {Number(link.amount).toFixed(2)}</td>
                                    <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{new Date(link.created_at).toLocaleDateString("en-GB")}</td>
                                    <td className="r">
                                        {link.paystack_url ? (
                                            <button onClick={() => copyToClipboard(link.paystack_url!)}
                                                className="ac-text-link" style={{ fontSize: 11 }}>
                                                Copy Link
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>Unavailable</span>
                                        )}
                                    </td>
                                    {tab === "active" && (
                                        <td className="r">
                                            <button onClick={() => handleArchive(link.id)} disabled={archiving === link.id}
                                                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}
                                                onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-ink)")}
                                                onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                {archiving === link.id ? "..." : "Archive"}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
