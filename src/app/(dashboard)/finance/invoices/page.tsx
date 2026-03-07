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

const STATUS_STYLES: Record<string, string> = {
    paid: "bg-green-50 text-green-700",
    pending: "bg-amber-50 text-amber-700",
    draft: "bg-neutral-100 text-neutral-500",
    cancelled: "bg-red-50 text-red-600",
};

export default function InvoicesPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [amount, setAmount] = useState<number | "">("");
    const [docType, setDocType] = useState<"invoice" | "quotation">("invoice");
    const [saving, setSaving] = useState(false);

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

    useEffect(() => { fetchDocuments(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;
        setSaving(true);
        const { error } = await supabase.from("documents").insert([{ type: docType, amount: Number(amount), status: "pending" }]);
        if (!error) {
            setAmount("");
            setIsCreating(false);
            await fetchDocuments();
        } else {
            alert("Failed to create document.");
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
        alert("Pay link copied to clipboard.");
    };

    const invoices = documents.filter(d => d.type === "invoice");
    const quotations = documents.filter(d => d.type === "quotation");
    const totalPaid = invoices.filter(d => d.status === "paid").reduce((s, d) => s + d.amount, 0);
    const totalPending = invoices.filter(d => d.status === "pending").reduce((s, d) => s + d.amount, 0);

    return (
        <div className="space-y-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Invoices</h1>
                    <p className="text-neutral-500">Issue and track invoices and quotations.</p>
                </div>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    {isCreating ? "Cancel" : "New Document"}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Paid Invoices</span>
                    <span className="text-3xl font-serif text-green-700">GH₵ {totalPaid.toFixed(2)}</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Outstanding</span>
                    <span className="text-3xl font-serif text-amber-600">GH₵ {totalPending.toFixed(2)}</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Quotations</span>
                    <span className="text-3xl font-serif">{quotations.length}</span>
                </div>
            </div>

            {isCreating && (
                <div className="bg-white border border-neutral-200 p-8">
                    <h2 className="text-xs uppercase tracking-widest font-semibold mb-6 border-b border-neutral-100 pb-4">Create Document</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Type</label>
                            <select
                                value={docType}
                                onChange={e => setDocType(e.target.value as "invoice" | "quotation")}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors appearance-none"
                            >
                                <option value="invoice">Invoice</option>
                                <option value="quotation">Quotation</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Amount (GHS)</label>
                            <input
                                type="number" min="0" step="0.01" required
                                value={amount}
                                onChange={e => setAmount(Number(e.target.value))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                placeholder="0.00"
                            />
                        </div>
                        <button
                            type="submit" disabled={saving}
                            className="border border-black px-6 py-2 text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                        >
                            {saving ? "Generating..." : "Generate"}
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">ID</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Type</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Amount</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Date</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic font-serif">Loading...</td></tr>
                        ) : documents.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-16 text-center text-neutral-500 italic font-serif">No documents yet. Click 'New Document' to issue one.</td></tr>
                        ) : documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4"><span className="font-mono text-xs text-neutral-600">{doc.id.substring(0, 8).toUpperCase()}</span></td>
                                <td className="px-6 py-4 capitalize">{doc.type}</td>
                                <td className="px-6 py-4 text-right font-medium">GH₵ {doc.amount.toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <select
                                        value={doc.status}
                                        onChange={e => updateStatus(doc.id, e.target.value)}
                                        className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border-0 cursor-pointer outline-none appearance-none ${STATUS_STYLES[doc.status]}`}
                                    >
                                        {["pending", "paid", "draft", "cancelled"].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 text-neutral-500 text-xs">{new Date(doc.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => copyPayLink(doc.id, doc.amount)}
                                        className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                                    >
                                        Copy Pay Link
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
