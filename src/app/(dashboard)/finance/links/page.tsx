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

    useEffect(() => {
        fetchLinks(tab);
    }, [tab]);

    useEffect(() => {
        supabase
            .from("business_settings")
            .select("email")
            .eq("id", "default")
            .single()
            .then(({ data }: { data: any }) => {
                if (data?.email) {
                    setForm(prev => ({ ...prev, email: prev.email || data.email }));
                }
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
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Pay Links</h1>
                <p className="text-neutral-500">Generate direct Paystack checkout URLs for custom amounts.</p>
            </header>

            {/* Generator */}
            <div className="bg-white border border-neutral-200 p-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-6 border-b border-neutral-100 pb-4">Generate New Link</h2>
                <form onSubmit={handleGenerate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Customer Email</label>
                            <input
                                type="email" required
                                value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                placeholder="client@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Amount (GHS)</label>
                            <input
                                type="number" min="1" step="0.01" required
                                value={form.amount}
                                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Description (Optional)</label>
                            <input
                                type="text"
                                value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                placeholder="e.g. Bespoke slide deposit"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <button
                            type="submit" disabled={generating}
                            className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                            {generating ? "Generating..." : "Generate Pay Link"}
                        </button>
                        {generatedUrl && (
                            <div className="flex items-center gap-3 flex-1 bg-neutral-50 border border-neutral-200 px-4 py-3 rounded">
                                <span className="font-mono text-xs text-neutral-600 truncate flex-1">{generatedUrl}</span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(generatedUrl)}
                                    className="text-[10px] uppercase tracking-widest text-black border-b border-black flex-shrink-0"
                                >
                                    Copy
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Tabs + History */}
            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <div className="px-6 py-4 border-b border-neutral-200 flex items-center gap-6">
                    <button
                        onClick={() => setTab("active")}
                        className={`text-xs uppercase tracking-widest font-semibold pb-1 transition-colors ${tab === "active" ? "border-b-2 border-black text-black" : "text-neutral-400 hover:text-black"}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setTab("archived")}
                        className={`text-xs uppercase tracking-widest font-semibold pb-1 transition-colors ${tab === "archived" ? "border-b-2 border-black text-black" : "text-neutral-400 hover:text-black"}`}
                    >
                        Archived
                    </button>
                </div>
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Customer</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Description</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Amount</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Date</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Link</th>
                            {tab === "active" && (
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Action</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={colSpan} className="px-6 py-12 text-center text-neutral-500 italic font-serif">Loading...</td></tr>
                        ) : links.length === 0 ? (
                            <tr>
                                <td colSpan={colSpan} className="px-6 py-16 text-center text-neutral-500 italic font-serif">
                                    {tab === "active" ? "No active pay links." : "No archived pay links."}
                                </td>
                            </tr>
                        ) : links.map((link) => (
                            <tr key={link.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4">
                                    <a href={`mailto:${link.email}`} className="text-neutral-700 hover:underline">{link.email}</a>
                                </td>
                                <td className="px-6 py-4 text-neutral-500 max-w-[200px] truncate">{link.description || "—"}</td>
                                <td className="px-6 py-4 text-right font-medium">GH₵ {Number(link.amount).toFixed(2)}</td>
                                <td className="px-6 py-4 text-neutral-500 text-xs">{new Date(link.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">
                                    {link.paystack_url ? (
                                        <button
                                            onClick={() => copyToClipboard(link.paystack_url!)}
                                            className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                                        >
                                            Copy Link
                                        </button>
                                    ) : (
                                        <span className="text-xs text-neutral-300">Unavailable</span>
                                    )}
                                </td>
                                {tab === "active" && (
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleArchive(link.id)}
                                            disabled={archiving === link.id}
                                            className="text-xs uppercase tracking-widest text-neutral-400 hover:text-black transition-colors disabled:opacity-50"
                                        >
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
    );
}
