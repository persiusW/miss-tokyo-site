"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Plus, X, Search, Eye, Ban, Send } from "lucide-react";

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

const STATUS_BADGE: Record<string, string> = {
    active:          "bg-green-50 text-green-700",
    redeemed:        "bg-neutral-100 text-neutral-500",
    expired:         "bg-amber-50 text-amber-700",
    cancelled:       "bg-rose-50 text-rose-600",
    pending_payment: "bg-blue-50 text-blue-700",
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

    // Modal: issue
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [form, setForm] = useState<IssueForm>(EMPTY_FORM);
    const [issuing, setIssuing] = useState(false);

    // Slide-over: view
    const [viewCard, setViewCard] = useState<GiftCard | null>(null);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [loadingRedemptions, setLoadingRedemptions] = useState(false);

    // Stats
    const [stats, setStats] = useState({ issued: 0, totalValue: 0, outstanding: 0, redeemedMonth: 0 });

    const fetchCards = useCallback(async () => {
        setLoading(true);
        let q = supabase.from("gift_cards").select("*").order("created_at", { ascending: false });
        if (statusFilter) q = q.eq("status", statusFilter);
        if (search) {
            q = q.or(`code.ilike.%${search}%,recipient_email.ilike.%${search}%,purchased_by_email.ilike.%${search}%`);
        }
        const { data } = await q;
        if (data) setCards(data);
        setLoading(false);
    }, [statusFilter, search]);

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
        <div className="space-y-8 max-w-6xl">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-[20px] font-medium text-neutral-900 tracking-tight">Gift Cards</h1>
                    <p className="text-sm text-neutral-500 mt-1">Issue and manage gift cards for customers.</p>
                </div>
                <button
                    onClick={() => setShowIssueModal(true)}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-lg"
                >
                    <Plus size={13} /> Issue Gift Card
                </button>
            </header>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Issued", value: stats.issued },
                    { label: "Total Value", value: `GH₵ ${stats.totalValue.toFixed(2)}` },
                    { label: "Outstanding", value: `GH₵ ${stats.outstanding.toFixed(2)}` },
                    { label: "Redeemed This Month", value: stats.redeemedMonth },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm p-5">
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1">{label}</p>
                        <p className="text-2xl font-light font-serif text-neutral-900">{value}</p>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search code, email…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg outline-none focus:border-black transition-colors"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="text-sm border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-black bg-white"
                >
                    <option value="">All statuses</option>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                            {["Code", "Recipient", "Sender", "Amount", "Balance", "Status", "Issued", ""].map(h => (
                                <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {loading ? (
                            <tr><td colSpan={8} className="px-6 py-12 text-center text-neutral-400 italic font-serif">Loading…</td></tr>
                        ) : cards.length === 0 ? (
                            <tr><td colSpan={8} className="px-6 py-16 text-center text-neutral-400 italic font-serif">No gift cards found.</td></tr>
                        ) : cards.map(g => (
                            <tr key={g.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-5 py-4 font-mono font-semibold text-[12px] tracking-widest">{g.code}</td>
                                <td className="px-5 py-4">
                                    <div className="text-sm">{g.recipient_name || "—"}</div>
                                    {g.recipient_email && <div className="text-[10px] text-neutral-400">{g.recipient_email}</div>}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="text-sm">{g.sender_name || "—"}</div>
                                    {g.purchased_by_email && <div className="text-[10px] text-neutral-400">{g.purchased_by_email}</div>}
                                </td>
                                <td className="px-5 py-4 font-medium">{fmt(Number(g.initial_value))}</td>
                                <td className="px-5 py-4">
                                    <span className={Number(g.remaining_value) <= 0 ? "text-neutral-400" : "text-green-700 font-medium"}>
                                        {fmt(Number(g.remaining_value))}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-md font-semibold ${STATUS_BADGE[g.status] || "bg-neutral-100 text-neutral-500"}`}>
                                        {STATUS_LABELS[g.status] || g.status}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-[11px] text-neutral-500">
                                    {new Date(g.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-4">
                                    <button
                                        onClick={() => openView(g)}
                                        className="text-neutral-400 hover:text-black transition-colors"
                                        title="View"
                                    >
                                        <Eye size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Issue Modal ─────────────────────────────────────────────── */}
            {showIssueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl border border-neutral-200 shadow-2xl">
                        <div className="flex items-center justify-between px-8 py-5 border-b border-neutral-100">
                            <h2 className="font-serif text-lg tracking-widest uppercase">Issue Gift Card</h2>
                            <button onClick={() => setShowIssueModal(false)} className="text-neutral-400 hover:text-black"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleIssue} className="px-8 py-6 space-y-5">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Amount (GH₵)</label>
                                <div className="flex gap-2 mb-3 flex-wrap">
                                    {PRESET_VALUES.map(v => (
                                        <button key={v} type="button"
                                            onClick={() => setForm(p => ({ ...p, initial_value: String(v) }))}
                                            className={`px-4 py-2 text-xs uppercase tracking-widest border transition-colors rounded ${form.initial_value === String(v) ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-500 hover:border-black"}`}>
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <input required type="number" min="1" step="0.01" value={form.initial_value}
                                    onChange={e => setForm(p => ({ ...p, initial_value: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm"
                                    placeholder="Custom amount" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Recipient Email *</label>
                                <input required type="email" value={form.recipient_email}
                                    onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm"
                                    placeholder="customer@example.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Recipient Name</label>
                                    <input type="text" value={form.recipient_name}
                                        onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm"
                                        placeholder="Ama Owusu" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">From (Sender)</label>
                                    <input type="text" value={form.sender_name}
                                        onChange={e => setForm(p => ({ ...p, sender_name: e.target.value }))}
                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm"
                                        placeholder="Your name" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Message (Optional)</label>
                                <textarea rows={2} value={form.message}
                                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                                    className="w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black text-sm resize-none rounded-lg"
                                    placeholder="A personal note..." />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowIssueModal(false)}
                                    className="px-5 py-2.5 text-xs uppercase tracking-widest border border-neutral-200 text-neutral-500 hover:border-black hover:text-black rounded-lg">
                                    Cancel
                                </button>
                                <button type="submit" disabled={issuing}
                                    className="px-8 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 rounded-lg">
                                    {issuing ? "Issuing..." : "Issue & Send Email"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── View Slide-over ─────────────────────────────────────────── */}
            {viewCard && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewCard(null)} />
                    <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-7 py-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
                            <h2 className="font-mono text-sm font-bold tracking-widest">{viewCard.code}</h2>
                            <button onClick={() => setViewCard(null)} className="text-neutral-400 hover:text-black"><X size={18} /></button>
                        </div>

                        <div className="p-7 space-y-6 flex-1">
                            {/* Status + actions */}
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 text-[10px] uppercase tracking-widest rounded-md font-semibold ${STATUS_BADGE[viewCard.status] || "bg-neutral-100"}`}>
                                    {STATUS_LABELS[viewCard.status] || viewCard.status}
                                </span>
                                {viewCard.status === "active" && (
                                    <button
                                        onClick={() => handleCancel(viewCard)}
                                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-rose-600 transition-colors"
                                    >
                                        <Ban size={12} /> Cancel
                                    </button>
                                )}
                                {viewCard.status === "active" && viewCard.delivery_mode === "email" && viewCard.recipient_email && (
                                    <button
                                        onClick={() => handleResend(viewCard)}
                                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                                    >
                                        <Send size={12} /> Resend
                                    </button>
                                )}
                            </div>

                            {/* Details */}
                            <div className="space-y-3 text-sm">
                                {[
                                    { label: "Amount", val: fmt(Number(viewCard.initial_value)) },
                                    { label: "Balance", val: fmt(Number(viewCard.remaining_value)) },
                                    { label: "Recipient", val: viewCard.recipient_name || "—" },
                                    { label: "Recipient Email", val: viewCard.recipient_email || "—" },
                                    { label: "Sender", val: viewCard.sender_name || "—" },
                                    { label: "Sender Email", val: viewCard.purchased_by_email || "—" },
                                    { label: "Delivery", val: viewCard.delivery_mode === "email" ? "Email" : "Self" },
                                    { label: "Sent At", val: viewCard.sent_at ? new Date(viewCard.sent_at).toLocaleString() : "—" },
                                    { label: "Expires", val: viewCard.expires_at ? new Date(viewCard.expires_at).toLocaleDateString() : "Never" },
                                    { label: "Issued", val: new Date(viewCard.created_at).toLocaleString() },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex justify-between border-b border-neutral-50 pb-3">
                                        <span className="text-[10px] uppercase tracking-widest text-neutral-400">{label}</span>
                                        <span className="text-neutral-800 font-medium text-xs">{val}</span>
                                    </div>
                                ))}
                                {viewCard.message && (
                                    <div className="pt-2">
                                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Message</p>
                                        <p className="text-sm text-neutral-600 italic">"{viewCard.message}"</p>
                                    </div>
                                )}
                            </div>

                            {/* Redemption history */}
                            <div>
                                <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-3">Redemption History</p>
                                {loadingRedemptions ? (
                                    <p className="text-sm text-neutral-400 italic">Loading…</p>
                                ) : redemptions.length === 0 ? (
                                    <p className="text-sm text-neutral-400 italic">No redemptions yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {redemptions.map(r => (
                                            <div key={r.id} className="bg-neutral-50 rounded-lg p-3 text-xs">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-semibold text-rose-600">-{fmt(r.amount_used)}</span>
                                                    <span className="text-neutral-400">{new Date(r.redeemed_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="text-neutral-500">
                                                    {fmt(r.balance_before)} → {fmt(r.balance_after)}
                                                    {r.redeemed_by && <span className="ml-2">by {r.redeemed_by}</span>}
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
        </div>
    );
}
