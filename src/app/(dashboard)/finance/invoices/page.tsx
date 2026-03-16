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

const STATUS_STYLES: Record<string, string> = {
    paid: "bg-green-50 text-green-700",
    pending: "bg-amber-50 text-amber-700",
    draft: "bg-neutral-100 text-neutral-500",
    cancelled: "bg-red-50 text-red-600",
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
            .then(({ data }) => {
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
            .then(({ data }) => { if (data) setProducts(data as Product[]); });
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
        <div className="space-y-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Invoices</h1>
                    <p className="text-neutral-500">Issue and track invoices and quotations.</p>
                </div>
                <button
                    onClick={isCreating ? () => setIsCreating(false) : openCreate}
                    className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    {isCreating ? "Cancel" : "New Document"}
                </button>
            </header>

            {/* Summary */}
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

            {/* Professional Builder */}
            {isCreating && (
                <form onSubmit={handleCreate} className="bg-white border border-neutral-200">
                    {/* Header row */}
                    <div className="px-8 py-5 border-b border-neutral-100 flex items-center justify-between">
                        <h2 className="text-xs uppercase tracking-widest font-semibold">New Document</h2>
                        <select
                            value={form.type}
                            onChange={e => setForm(p => ({ ...p, type: e.target.value as "invoice" | "quotation" }))}
                            className="text-xs uppercase tracking-widest border border-neutral-200 bg-transparent px-3 py-1.5 outline-none focus:border-black transition-colors appearance-none"
                        >
                            <option value="invoice">Invoice</option>
                            <option value="quotation">Quotation</option>
                        </select>
                    </div>

                    {/* Bill To */}
                    <div className="px-8 py-6 border-b border-neutral-100">
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-4">Bill To</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Customer Name</label>
                                <input
                                    type="text"
                                    value={form.customer_name}
                                    onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                                    placeholder="e.g. Kwame Mensah"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Customer Email</label>
                                <input
                                    type="email"
                                    value={form.customer_email}
                                    onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                                    placeholder="client@email.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="px-8 py-6 border-b border-neutral-100">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Line Items</p>
                            <button
                                type="button" onClick={addLine}
                                className="text-[10px] uppercase tracking-widest text-black border-b border-black hover:text-neutral-600 transition-colors"
                            >
                                + Add Line
                            </button>
                        </div>

                        {/* Column headers */}
                        <div className="grid grid-cols-12 gap-3 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold pb-2 border-b border-neutral-100 mb-3">
                            <div className="col-span-6">Description</div>
                            <div className="col-span-2 text-center">Qty</div>
                            <div className="col-span-3 text-right">Unit Price (GHS)</div>
                            <div className="col-span-1 text-right">Total</div>
                        </div>

                        <div className="space-y-2">
                            {form.line_items.map((line, i) => (
                                <div key={i} className="grid grid-cols-12 gap-3 items-start group">
                                    <div className="col-span-6 space-y-1">
                                        {/* Mode toggle */}
                                        <div className="flex gap-2 mb-1">
                                            <button
                                                type="button"
                                                onClick={() => setLineMode(i, "product")}
                                                className={`text-[9px] uppercase tracking-widest px-2 py-0.5 border transition-colors ${line.mode === "product" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-500 hover:border-black"}`}
                                            >
                                                Product
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLineMode(i, "custom")}
                                                className={`text-[9px] uppercase tracking-widest px-2 py-0.5 border transition-colors ${line.mode === "custom" ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-500 hover:border-black"}`}
                                            >
                                                Custom
                                            </button>
                                        </div>
                                        {line.mode === "product" ? (
                                            <select
                                                value={line.product_id || ""}
                                                onChange={e => pickProduct(i, e.target.value)}
                                                className="w-full border-b border-neutral-200 bg-transparent py-1.5 outline-none focus:border-black transition-colors text-sm appearance-none"
                                                required
                                            >
                                                <option value="">Select a product…</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} — GH₵ {Number(p.price_ghs).toFixed(2)}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={line.description}
                                                onChange={e => updateLine(i, "description", e.target.value)}
                                                className="w-full border-b border-neutral-200 bg-transparent py-1.5 outline-none focus:border-black transition-colors text-sm"
                                                placeholder="Item description"
                                                required
                                            />
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number" min="1" step="1"
                                            value={line.qty}
                                            onChange={e => updateLine(i, "qty", e.target.value)}
                                            className="w-full border-b border-neutral-200 bg-transparent py-1.5 outline-none focus:border-black transition-colors text-sm text-center"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="number" min="0" step="0.01"
                                            value={line.unit_price}
                                            onChange={e => updateLine(i, "unit_price", e.target.value)}
                                            className="w-full border-b border-neutral-200 bg-transparent py-1.5 outline-none focus:border-black transition-colors text-sm text-right"
                                        />
                                    </div>
                                    <div className="col-span-1 text-right flex items-center justify-end gap-1">
                                        <span className="text-xs text-neutral-500">
                                            {(line.qty * line.unit_price).toFixed(0)}
                                        </span>
                                        {form.line_items.length > 1 && (
                                            <button
                                                type="button" onClick={() => removeLine(i)}
                                                className="text-neutral-300 hover:text-red-500 transition-colors text-base leading-none ml-1 opacity-0 group-hover:opacity-100"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="mt-8 flex justify-end">
                            <div className="w-72 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">Subtotal</span>
                                    <span>GH₵ {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-neutral-500">Tax</span>
                                        <input
                                            type="number" min="0" max="100" step="0.1"
                                            value={form.tax_rate}
                                            onChange={e => setForm(p => ({ ...p, tax_rate: Number(e.target.value) }))}
                                            className="w-14 border-b border-neutral-300 bg-transparent py-0.5 outline-none focus:border-black text-sm text-center transition-colors"
                                        />
                                        <span className="text-neutral-400 text-xs">%</span>
                                    </div>
                                    <span>GH₵ {taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-base border-t border-neutral-200 pt-3">
                                    <span>Total</span>
                                    <span>GH₵ {total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes + Submit */}
                    <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-2">Notes (Optional)</label>
                            <textarea
                                value={form.notes}
                                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                rows={2}
                                className="w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black transition-colors resize-none text-sm"
                                placeholder="Payment terms, bank details, thank-you note..."
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit" disabled={saving}
                                className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                            >
                                {saving ? "Saving..." : `Save ${form.type === "invoice" ? "Invoice" : "Quotation"}`}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Documents Table */}
            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">ID</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Type</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Client</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Total</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Date</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-neutral-500 italic font-serif">Loading...</td></tr>
                        ) : documents.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-16 text-center text-neutral-500 italic font-serif">No documents yet. Click &apos;New Document&apos; to issue one.</td></tr>
                        ) : documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs text-neutral-600">{doc.id.substring(0, 8).toUpperCase()}</span>
                                </td>
                                <td className="px-6 py-4 capitalize">{doc.type}</td>
                                <td className="px-6 py-4">
                                    <div className="text-neutral-900 font-medium">{doc.customer_name || "—"}</div>
                                    {doc.customer_email && (
                                        <div className="text-xs text-neutral-400">{doc.customer_email}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right font-medium">GH₵ {Number(doc.amount).toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <select
                                        value={doc.status}
                                        onChange={e => updateStatus(doc.id, e.target.value)}
                                        className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border-0 cursor-pointer outline-none appearance-none ${STATUS_STYLES[doc.status]}`}
                                    >
                                        {["draft", "pending", "paid", "cancelled"].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 text-neutral-500 text-xs">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right flex items-center justify-end gap-4">
                                    <Link
                                        href={`/finance/invoices/${doc.id}`}
                                        className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                                    >
                                        View
                                    </Link>
                                    <button
                                        onClick={() => copyPayLink(doc.id, doc.amount)}
                                        className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                                    >
                                        Pay Link
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
