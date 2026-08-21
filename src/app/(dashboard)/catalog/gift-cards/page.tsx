"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type GiftCard = {
    id: string;
    code: string;
    initial_value: number;
    remaining_value: number;
    currency: string;
    status: string;
    recipient_email: string | null;
    recipient_name: string | null;
    sender_name: string | null;
    purchased_by_email: string | null;
    message: string | null;
    delivery_mode: string;
    delivery_date: string | null;
    sent_at: string | null;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
};

type Redemption = {
    id: string;
    amount_used: number;
    balance_before: number;
    balance_after: number;
    redeemed_at: string;
    redeemed_by: string | null;
};

type IssueForm = {
    recipient_email: string;
    recipient_name: string;
    sender_name: string;
    message: string;
    initial_value: string;
};

const EMPTY_FORM: IssueForm = {
    recipient_email: "",
    recipient_name: "",
    sender_name: "",
    message: "",
    initial_value: "",
};

const PRESET_VALUES = [50, 100, 200, 300, 500];

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<string, string> = {
    active:          "ac-badge-ok",
    redeemed:        "ac-badge-inactive",
    expired:         "ac-badge-warn",
    cancelled:       "ac-badge-danger",
    pending_payment: "ac-badge-info",
};

const STATUS_LABELS: Record<string, string> = {
    active: "Active", redeemed: "Redeemed", expired: "Expired",
    cancelled: "Cancelled", pending_payment: "Pending",
};

function fmt(n: number) { return `GH₵ ${n.toFixed(2)}`; }

export default function GiftCardsPage() {
    const [cards, setCards] = useState<GiftCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [showIssueModal, setShowIssueModal] = useState(false);
    const [form, setForm] = useState<IssueForm>(EMPTY_FORM);
    const [issuing, setIssuing] = useState(false);

    const [viewCard, setViewCard] = useState<GiftCard | null>(null);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [loadingRedemptions, setLoadingRedemptions] = useState(false);

    const [stats, setStats] = useState({ issued: 0, totalValue: 0, outstanding: 0, redeemedMonth: 0 });

    const fetchCards = useCallback(async () => {
        setLoading(true);
        const from = (page - 1) * PAGE_SIZE;
        // Filters before range(): a transform builder has no .eq()/.or().
        let q = supabase.from("gift_cards").select("*", { count: "exact" });
        if (statusFilter) q = q.eq("status", statusFilter);
        const term = debouncedSearch.trim().replace(/[%,()]/g, "");
        if (term) {
            q = q.or(`code.ilike.%${term}%,recipient_email.ilike.%${term}%,purchased_by_email.ilike.%${term}%`);
        }
        const { data, count, error } = await q
            .order("created_at", { ascending: false })
            .range(from, from + PAGE_SIZE - 1);
        if (error?.code === "PGRST103" && page > 1) { setPage(1); return; }
        if (data) setCards(data);
        setTotalCount(count ?? 0);
        setLoading(false);
    }, [statusFilter, debouncedSearch, page]);

    const fetchStats = useCallback(async () => {
        const { data: all } = await supabase
            .from("gift_cards")
            .select("initial_value, remaining_value, status, created_at") as { data: Pick<GiftCard, "initial_value" | "remaining_value" | "status" | "created_at">[] | null };
        if (!all) return;
        const monthStart = new Date();
        monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        setStats({
            issued: all.filter(c => c.status === "active" || c.status === "redeemed").length,
            totalValue: all.reduce((s, c) => s + Number(c.initial_value), 0),
            outstanding: all.filter(c => c.status === "active").reduce((s, c) => s + Number(c.remaining_value), 0),
            redeemedMonth: all.filter(c => c.status === "redeemed" && new Date(c.created_at) >= monthStart).length,
        });
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); }, [statusFilter, debouncedSearch]);

    useEffect(() => { fetchCards(); }, [fetchCards]);
    useEffect(() => { fetchStats(); }, [fetchStats]);

    const openView = async (card: GiftCard) => {
        setViewCard(card);
        setLoadingRedemptions(true);
        const { data } = await supabase
            .from("gift_card_redemptions")
            .select("*")
            .eq("gift_card_id", card.id)
            .order("redeemed_at", { ascending: false });
        setRedemptions(data ?? []);
        setLoadingRedemptions(false);
    };

    const handleCancel = async (card: GiftCard) => {
        if (!confirm(`Cancel gift card ${card.code}? This cannot be undone.`)) return;
        const { error } = await supabase
            .from("gift_cards")
            .update({ status: "cancelled", is_active: false })
            .eq("id", card.id);
        if (error) { toast.error("Failed to cancel."); return; }
        toast.success("Gift card cancelled.");
        setViewCard(null);
        fetchCards(); fetchStats();
    };

    const handleResend = async (card: GiftCard) => {
        try {
            const res = await fetch("/api/gift-cards/resend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gift_card_id: card.id }),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            toast.success("Gift card email resent.");
        } catch (e: any) {
            toast.error(e.message || "Failed to resend email.");
        }
    };

    const handleIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.recipient_email || !form.initial_value) return;
        setIssuing(true);
        try {
            const res = await fetch("/api/gift-cards/issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, initial_value: Number(form.initial_value) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Issue failed");
            toast.success(`Gift card issued to ${form.recipient_email}.`);
            setForm(EMPTY_FORM);
            setShowIssueModal(false);
            fetchCards(); fetchStats();
        } catch (err: any) {
            toast.error(err.message || "Failed to issue gift card.");
        }
        setIssuing(false);
    };

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Gift Cards</h1>
                    <p className="ac-page-sub">Issue and manage gift cards for customers.</p>
                </div>
                <button onClick={() => setShowIssueModal(true)} className="ac-btn ac-btn-primary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Issue Gift Card
                </button>
            </div>

            {/* KPI strip */}
            <div className="ac-kpi-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: "Total Issued", value: stats.issued, mono: false },
                    { label: "Total Value", value: stats.totalValue, mono: true, prefix: "GH₵" },
                    { label: "Outstanding", value: stats.outstanding, mono: true, prefix: "GH₵" },
                    { label: "Redeemed This Month", value: stats.redeemedMonth, mono: false },
                ].map(({ label, value, mono, prefix }) => (
                    <div key={label} className="ac-kpi">
                        <span className="ac-kpi-label">{label}</span>
                        <span className="ac-kpi-value">
                            {prefix && <span className="ac-kpi-ccy">{prefix} </span>}
                            {mono ? Number(value).toFixed(2) : value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className="ac-card" style={{ marginBottom: 16 }}>
                <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ac-ink-4)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search code, email…"
                            className="ac-input" style={{ paddingLeft: 32 }} />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ac-select" style={{ minWidth: 140 }}>
                        <option value="">All statuses</option>
                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Recipient</th>
                                <th>Sender</th>
                                <th className="r">Amount</th>
                                <th className="r">Balance</th>
                                <th>Status</th>
                                <th>Issued</th>
                                <th style={{ width: 40 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="ac-table-empty">Loading…</td></tr>
                            ) : cards.length === 0 ? (
                                <tr><td colSpan={8} className="ac-table-empty">No gift cards found.</td></tr>
                            ) : cards.map(g => (
                                <tr key={g.id}>
                                    <td style={{ fontFamily: "var(--f-mono)", fontWeight: 600, fontSize: 12, letterSpacing: ".08em" }}>{g.code}</td>
                                    <td>
                                        <div style={{ fontWeight: 500, fontSize: 13, color: "var(--ac-ink)" }}>{g.recipient_name || "—"}</div>
                                        {g.recipient_email && <div style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{g.recipient_email}</div>}
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 13, color: "var(--ac-ink)" }}>{g.sender_name || "—"}</div>
                                        {g.purchased_by_email && <div style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{g.purchased_by_email}</div>}
                                    </td>
                                    <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>{fmt(Number(g.initial_value))}</td>
                                    <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500, color: Number(g.remaining_value) <= 0 ? "var(--ac-ink-4)" : "var(--ac-accent)" }}>
                                        {fmt(Number(g.remaining_value))}
                                    </td>
                                    <td>
                                        <span className={`ac-badge ${STATUS_BADGE[g.status] || "ac-badge-inactive"}`}>
                                            {STATUS_LABELS[g.status] || g.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>
                                        {new Date(g.created_at).toLocaleDateString("en-GB")}
                                    </td>
                                    <td>
                                        <button onClick={() => openView(g)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", display: "flex", alignItems: "center" }}
                                            onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-ink)")}
                                            onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {Math.ceil(totalCount / PAGE_SIZE) > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: "1px solid var(--ac-line)" }}>
                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>
                            Page {page} of {Math.ceil(totalCount / PAGE_SIZE)} · {totalCount} card{totalCount !== 1 ? "s" : ""}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="ac-btn ac-btn-ghost ac-btn-sm">Prev</button>
                            <button type="button" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalCount / PAGE_SIZE) || loading} className="ac-btn ac-btn-ghost ac-btn-sm">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Issue Modal ─────────────────────────────────────────────── */}
            {showIssueModal && (
                <div className="ac-modal">
                    <div className="ac-modal-box" style={{ maxWidth: 520 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, color: "var(--ac-ink)" }}>Issue Gift Card</h2>
                            <button onClick={() => setShowIssueModal(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", fontSize: 22, lineHeight: 1 }}>×</button>
                        </div>
                        <form onSubmit={handleIssue} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label className="ac-label">Amount (GH₵)</label>
                                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                    {PRESET_VALUES.map(v => (
                                        <button key={v} type="button"
                                            onClick={() => setForm(p => ({ ...p, initial_value: String(v) }))}
                                            className={`ac-btn ac-btn-sm ${form.initial_value === String(v) ? "ac-btn-primary" : "ac-btn-ghost"}`}>
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <input required type="number" min="1" step="0.01" value={form.initial_value}
                                    onChange={e => setForm(p => ({ ...p, initial_value: e.target.value }))}
                                    className="ac-input" style={{ marginTop: 8 }}
                                    placeholder="Custom amount" />
                            </div>
                            <div>
                                <label className="ac-label">Recipient Email *</label>
                                <input required type="email" value={form.recipient_email}
                                    onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))}
                                    className="ac-input" style={{ marginTop: 4 }}
                                    placeholder="customer@example.com" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <label className="ac-label">Recipient Name</label>
                                    <input type="text" value={form.recipient_name}
                                        onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
                                        className="ac-input" style={{ marginTop: 4 }}
                                        placeholder="Ama Owusu" />
                                </div>
                                <div>
                                    <label className="ac-label">From (Sender)</label>
                                    <input type="text" value={form.sender_name}
                                        onChange={e => setForm(p => ({ ...p, sender_name: e.target.value }))}
                                        className="ac-input" style={{ marginTop: 4 }}
                                        placeholder="Your name" />
                                </div>
                            </div>
                            <div>
                                <label className="ac-label">Message (Optional)</label>
                                <textarea rows={2} value={form.message}
                                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                                    className="ac-textarea" style={{ marginTop: 4 }}
                                    placeholder="A personal note..." />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8 }}>
                                <button type="button" onClick={() => setShowIssueModal(false)} className="ac-btn ac-btn-ghost">Cancel</button>
                                <button type="submit" disabled={issuing} className="ac-btn ac-btn-primary">
                                    {issuing ? "Issuing..." : "Issue & Send Email"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── View Slide-over ─────────────────────────────────────────── */}
            {viewCard && (
                <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)" }} onClick={() => setViewCard(null)} />
                    <div style={{
                        position: "relative", width: "100%", maxWidth: 400,
                        background: "var(--ac-panel)",
                        borderLeft: "1px solid var(--ac-line)",
                        height: "100%", overflowY: "auto",
                        display: "flex", flexDirection: "column",
                        boxShadow: "-8px 0 40px rgba(0,0,0,.25)",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--ac-line)", position: "sticky", top: 0, background: "var(--ac-panel)", zIndex: 10 }}>
                            <h2 style={{ fontFamily: "var(--f-mono)", fontSize: 13, fontWeight: 700, letterSpacing: ".08em", color: "var(--ac-ink)" }}>{viewCard.code}</h2>
                            <button onClick={() => setViewCard(null)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", fontSize: 20 }}>×</button>
                        </div>

                        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                            {/* Status + actions */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <span className={`ac-badge ${STATUS_BADGE[viewCard.status] || "ac-badge-inactive"}`}>
                                    {STATUS_LABELS[viewCard.status] || viewCard.status}
                                </span>
                                {viewCard.status === "active" && (
                                    <button onClick={() => handleCancel(viewCard)}
                                        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-danger)")}
                                        onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                        Cancel
                                    </button>
                                )}
                                {viewCard.status === "active" && viewCard.delivery_mode === "email" && viewCard.recipient_email && (
                                    <button onClick={() => handleResend(viewCard)}
                                        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-ink)")}
                                        onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                        Resend
                                    </button>
                                )}
                            </div>

                            {/* Details */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {[
                                    { label: "Amount", val: fmt(Number(viewCard.initial_value)) },
                                    { label: "Balance", val: fmt(Number(viewCard.remaining_value)) },
                                    { label: "Recipient", val: viewCard.recipient_name || "—" },
                                    { label: "Recipient Email", val: viewCard.recipient_email || "—" },
                                    { label: "Sender", val: viewCard.sender_name || "—" },
                                    { label: "Sender Email", val: viewCard.purchased_by_email || "—" },
                                    { label: "Delivery", val: viewCard.delivery_mode === "email" ? "Email" : "Self" },
                                    { label: "Sent At", val: viewCard.sent_at ? new Date(viewCard.sent_at).toLocaleString() : "—" },
                                    { label: "Expires", val: viewCard.expires_at ? new Date(viewCard.expires_at).toLocaleDateString("en-GB") : "Never" },
                                    { label: "Issued", val: new Date(viewCard.created_at).toLocaleString() },
                                ].map(({ label, val }) => (
                                    <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--ac-line)", paddingBottom: 10 }}>
                                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>{label}</span>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ac-ink)" }}>{val}</span>
                                    </div>
                                ))}
                                {viewCard.message && (
                                    <div style={{ paddingTop: 4 }}>
                                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 6 }}>Message</p>
                                        <p style={{ fontSize: 13, color: "var(--ac-ink-3)", fontStyle: "italic" }}>"{viewCard.message}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Redemption history */}
                            <div>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-4)", marginBottom: 10 }}>Redemption History</p>
                                {loadingRedemptions ? (
                                    <p style={{ fontSize: 13, color: "var(--ac-ink-4)", fontStyle: "italic" }}>Loading…</p>
                                ) : redemptions.length === 0 ? (
                                    <p style={{ fontSize: 13, color: "var(--ac-ink-4)", fontStyle: "italic" }}>No redemptions yet.</p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {redemptions.map(r => (
                                            <div key={r.id} style={{ background: "var(--ac-panel-2)", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 600, color: "var(--ac-danger)" }}>-{fmt(r.amount_used)}</span>
                                                    <span style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{new Date(r.redeemed_at).toLocaleDateString("en-GB")}</span>
                                                </div>
                                                <div style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>
                                                    {fmt(r.balance_before)} → {fmt(r.balance_after)}
                                                    {r.redeemed_by && <span style={{ marginLeft: 8 }}>by {r.redeemed_by}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
