"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Plus, X } from "lucide-react";

type GiftCard = {
    id: string;
    code: string;
    initial_value: number;
    remaining_value: number;
    recipient_email: string | null;
    recipient_name: string | null;
    sender_name: string | null;
    message: string | null;
    is_active: boolean;
    created_at: string;
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

function genCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    ).join("-");
}

export default function GiftCardsPage() {
    const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [form, setForm] = useState<IssueForm>(EMPTY_FORM);
    const [issuing, setIssuing] = useState(false);

    const fetchCards = async () => {
        setLoading(true);
        const { data } = await supabase.from("gift_cards").select("*").order("created_at", { ascending: false });
        if (data) setGiftCards(data);
        setLoading(false);
    };

    useEffect(() => { fetchCards(); }, []);

    const handleIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.recipient_email || !form.initial_value) return;
        setIssuing(true);

        try {
            const res = await fetch("/api/gift-cards/issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    initial_value: Number(form.initial_value),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Issue failed");

            toast.success(`Gift card issued to ${form.recipient_email}.`);
            setForm(EMPTY_FORM);
            setShowIssueModal(false);
            await fetchCards();
        } catch (err: any) {
            toast.error(err.message || "Failed to issue gift card.");
        }
        setIssuing(false);
    };

    const toggleActive = async (id: string, is_active: boolean) => {
        setGiftCards(prev => prev.map(g => g.id === id ? { ...g, is_active: !is_active } : g));
        await supabase.from("gift_cards").update({ is_active: !is_active }).eq("id", id);
    };

    return (
        <div className="space-y-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Gift Cards</h1>
                    <p className="text-neutral-500">Issue and manage gift cards for customers.</p>
                </div>
                <button
                    onClick={() => setShowIssueModal(true)}
                    className="flex items-center gap-2 bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    <Plus size={13} /> Issue Gift Card
                </button>
            </header>

            {/* Table */}
            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Code</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Recipient</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Initial</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Remaining</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Issued</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-400 italic font-serif">Loading...</td></tr>
                        ) : giftCards.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-16 text-center text-neutral-400 italic font-serif">No gift cards yet.</td></tr>
                        ) : giftCards.map(g => (
                            <tr key={g.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4 font-mono font-semibold text-sm tracking-widest">{g.code}</td>
                                <td className="px-6 py-4">
                                    <div className="text-neutral-800 text-sm">{g.recipient_name || "—"}</div>
                                    {g.recipient_email && (
                                        <div className="text-neutral-400 text-xs">{g.recipient_email}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right font-medium">GH₵ {g.initial_value.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={g.remaining_value <= 0 ? "text-neutral-400" : "text-green-700 font-medium"}>
                                        GH₵ {g.remaining_value.toFixed(2)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-neutral-400 text-xs">
                                    {new Date(g.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleActive(g.id, g.is_active)}
                                        className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${g.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                                        {g.is_active ? "Active" : "Voided"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Issue Modal */}
            {showIssueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white w-full max-w-lg border border-neutral-200 shadow-2xl">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-200">
                            <h2 className="font-serif text-xl tracking-widest uppercase">Issue Gift Card</h2>
                            <button onClick={() => setShowIssueModal(false)} className="text-neutral-400 hover:text-black">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleIssue} className="px-8 py-6 space-y-5">
                            {/* Amount presets */}
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Amount (GH₵)</label>
                                <div className="flex gap-2 mb-3 flex-wrap">
                                    {PRESET_VALUES.map(v => (
                                        <button key={v} type="button"
                                            onClick={() => setForm(p => ({ ...p, initial_value: String(v) }))}
                                            className={`px-4 py-2 text-xs uppercase tracking-widest border transition-colors ${
                                                form.initial_value === String(v)
                                                    ? "bg-black text-white border-black"
                                                    : "border-neutral-200 text-neutral-500 hover:border-black"
                                            }`}>
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <input required type="number" min="1" step="0.01" value={form.initial_value}
                                    onChange={e => setForm(p => ({ ...p, initial_value: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black"
                                    placeholder="Custom amount" />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Recipient Email *</label>
                                <input required type="email" value={form.recipient_email}
                                    onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black"
                                    placeholder="customer@example.com" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Recipient Name</label>
                                    <input type="text" value={form.recipient_name}
                                        onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))}
                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black"
                                        placeholder="Ama Owusu" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">From (Sender)</label>
                                    <input type="text" value={form.sender_name}
                                        onChange={e => setForm(p => ({ ...p, sender_name: e.target.value }))}
                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black"
                                        placeholder="Your name" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Message (Optional)</label>
                                <textarea rows={2} value={form.message}
                                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                                    className="w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black text-sm resize-none"
                                    placeholder="A personal note..." />
                            </div>

                            <div className="flex justify-end gap-4 pt-2">
                                <button type="button" onClick={() => setShowIssueModal(false)}
                                    className="px-6 py-3 text-xs uppercase tracking-widest border border-neutral-200 text-neutral-500 hover:border-black hover:text-black">
                                    Cancel
                                </button>
                                <button type="submit" disabled={issuing}
                                    className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50">
                                    {issuing ? "Issuing..." : "Issue & Send Email"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
