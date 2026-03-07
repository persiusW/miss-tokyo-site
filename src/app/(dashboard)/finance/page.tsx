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

export default function FinancePage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isCreating, setIsCreating] = useState(false);
    const [amount, setAmount] = useState<number | "">("");
    const [docType, setDocType] = useState<"invoice" | "quotation">("invoice");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        // In a real database, ensure 'documents' table exists
        const { data, error } = await supabase
            .from("documents")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setDocuments(data);
        }
        setLoading(false);
    };

    const handleCreateDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;

        setSaving(true);
        const newDoc = {
            type: docType,
            amount: Number(amount),
            status: "pending"
        };

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
        // Generate a quick faux-paystack checkout url for the demo.
        // Real flow would hit /api/paystack/initialize to get an actual URL.
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://badu.co';
        const fakeLink = `${baseUrl}/checkout/direct?ref=${docId}&amt=${docAmount}`;
        navigator.clipboard.writeText(fakeLink);
        alert("Pay Link copied to clipboard!");
    };

    return (
        <div className="space-y-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Finance</h1>
                    <p className="text-neutral-500">Manage invoices, quotations, and generate direct Pay Links.</p>
                </div>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    {isCreating ? "Cancel" : "New Document"}
                </button>
            </header>

            {isCreating && (
                <div className="bg-white border border-neutral-200 p-8">
                    <h2 className="text-xs uppercase tracking-widest font-semibold mb-6 border-b border-neutral-200 pb-4">Create New Document</h2>
                    <form onSubmit={handleCreateDocument} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div>
                            <label htmlFor="type" className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Document Type</label>
                            <select
                                id="type"
                                value={docType}
                                onChange={(e) => setDocType(e.target.value as "invoice" | "quotation")}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors appearance-none"
                            >
                                <option value="invoice">Invoice</option>
                                <option value="quotation">Quotation</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Amount (GHS)</label>
                            <input
                                type="number"
                                id="amount"
                                min="0"
                                step="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full border border-black px-6 py-2 text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                            >
                                {saving ? "Generating..." : "Generate"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Document ID</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Type</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Amount</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Date</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    Loading financial records...
                                </td>
                            </tr>
                        ) : (!documents || documents.length === 0) ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    No documents found. Click 'New Document' to issue an invoice.
                                </td>
                            </tr>
                        ) : (
                            documents.map((doc) => (
                                <tr key={doc.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs text-neutral-600">{doc.id.substring(0, 8).toUpperCase()}</span>
                                    </td>
                                    <td className="px-6 py-4 capitalize">
                                        {doc.type}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">
                                        GH₵ {doc.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${doc.status === 'paid' ? 'bg-green-50 text-green-700' :
                                                doc.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-neutral-100 text-neutral-600'
                                            }`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-500 text-xs">
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-4">
                                        <button
                                            onClick={() => copyPayLink(doc.id, doc.amount)}
                                            className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                                        >
                                            Copy Pay Link
                                        </button>
                                        <button className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors border-l border-neutral-300 pl-4">
                                            View PDF
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
