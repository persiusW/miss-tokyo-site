"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { X } from "lucide-react";

type Source = "order" | "custom_request" | "newsletter" | "manual";

type Contact = {
    id: string;
    name: string;
    email: string;
    phone: string;
    source: Source;
    created_at: string;
    is_manual: boolean;
};

const SOURCE_LABELS: Record<Source, string> = {
    order: "Order",
    custom_request: "Custom Request",
    newsletter: "Newsletter",
    manual: "Manual",
};

const SOURCE_STYLES: Record<Source, string> = {
    order: "bg-green-50 text-green-700",
    custom_request: "bg-amber-50 text-amber-700",
    newsletter: "bg-blue-50 text-blue-700",
    manual: "bg-neutral-100 text-neutral-600",
};

function downloadCSV(rows: Contact[], filename: string) {
    const headers = ["Name", "Email", "Phone", "Primary Source", "Added On"];
    const data = rows.map(c => [
        c.name || "",
        c.email,
        c.phone || "",
        SOURCE_LABELS[c.source] || c.source,
        new Date(c.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...data]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function CustomersPage() {
    const router = useRouter();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ name: "", email: "", phone: "" });
    const [addStatus, setAddStatus] = useState<"idle" | "saving" | "error">("idle");
    const [deleting, setDeleting] = useState(false);

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, customReqsRes, newslettersRes, manualRes] = await Promise.all([
                supabase.from("orders").select("id, customer_email, customer_name, customer_phone, created_at"),
                supabase.from("custom_requests").select("id, customer_email, customer_name, created_at"),
                supabase.from("newsletter_subs").select("id, email, created_at"),
                supabase.from("contacts").select("*"),
            ]);

            const aggregated: Contact[] = [];

            (ordersRes.data || []).forEach((o: any) => {
                aggregated.push({
                    id: `order-${o.id}`,
                    name: o.customer_name || "",
                    email: o.customer_email || "",
                    phone: o.customer_phone || "",
                    source: "order",
                    created_at: o.created_at,
                    is_manual: false,
                });
            });

            (customReqsRes.data || []).forEach((c: any) => {
                aggregated.push({
                    id: `req-${c.id}`,
                    name: c.customer_name || "",
                    email: c.customer_email || "",
                    phone: "",
                    source: "custom_request",
                    created_at: c.created_at,
                    is_manual: false,
                });
            });

            (newslettersRes.data || []).forEach((n: any) => {
                aggregated.push({
                    id: `nl-${n.id}`,
                    name: "",
                    email: n.email || "",
                    phone: "",
                    source: "newsletter",
                    created_at: n.created_at,
                    is_manual: false,
                });
            });

            (manualRes.data || []).forEach((m: any) => {
                aggregated.push({
                    id: m.id,
                    name: m.name || "",
                    email: m.email || "",
                    phone: m.phone || "",
                    source: "manual",
                    created_at: m.created_at,
                    is_manual: true,
                });
            });

            // Sort newest first, then dedupe by email keeping richest record (prefer one with name/phone)
            aggregated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            const emailMap = new Map<string, Contact>();
            for (const c of aggregated) {
                const existing = emailMap.get(c.email);
                if (!existing) {
                    emailMap.set(c.email, c);
                } else {
                    // Merge richer fields onto the first-seen record
                    if (!existing.name && c.name) existing.name = c.name;
                    if (!existing.phone && c.phone) existing.phone = c.phone;
                }
            }

            setContacts(Array.from(emailMap.values()));
            setSelected(new Set());
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to load customers data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchContacts(); }, [fetchContacts]);

    // --- Selection helpers ---
    const allIds = contacts.map(c => c.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
    const someSelected = selected.size > 0;

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(allIds));
        }
    };

    const toggleOne = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // --- Add Contact ---
    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddStatus("saving");
        const { error } = await supabase.from("contacts").insert([{
            name: addForm.name.trim(),
            email: addForm.email.trim(),
            phone: addForm.phone.trim() || null,
            source: "manual",
        }]);
        if (error) {
            setAddStatus("error");
        } else {
            setAddStatus("idle");
            setAddForm({ name: "", email: "", phone: "" });
            setShowAddModal(false);
            toast.success("Contact added.");
            fetchContacts();
        }
    };

    // --- Export Selected ---
    const handleExportSelected = () => {
        const rows = contacts.filter(c => selected.has(c.id));
        downloadCSV(rows, `miss-tokyo-contacts-selected-${new Date().toISOString().slice(0, 10)}.csv`);
    };

    // --- Delete Selected (manual only) ---
    const handleDeleteSelected = async () => {
        const manualIds = contacts
            .filter(c => selected.has(c.id) && c.is_manual)
            .map(c => c.id);

        const skipped = selected.size - manualIds.length;
        setDeleting(true);

        if (manualIds.length > 0) {
            await supabase.from("contacts").delete().in("id", manualIds);
        }

        setDeleting(false);

        if (skipped > 0) {
            toast.error(`${skipped} aggregated record(s) skipped — only manual contacts can be deleted.`);
        }
        if (manualIds.length > 0) {
            toast.success(`${manualIds.length} contact(s) deleted.`);
        }

        fetchContacts();
    };

    const selectedContacts = contacts.filter(c => selected.has(c.id));

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Contacts</h1>
                    <p className="text-neutral-500 text-sm">Unified clientele across orders, requests, and subscriptions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => downloadCSV(contacts, `miss-tokyo-contacts-${new Date().toISOString().slice(0, 10)}.csv`)}
                        className="border border-neutral-300 text-neutral-700 px-5 py-2.5 text-xs uppercase tracking-widest hover:border-black hover:text-black transition-colors"
                    >
                        Export All
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-black text-white px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                    >
                        + Add Contact
                    </button>
                </div>
            </header>

            {/* Bulk Action Bar */}
            {someSelected && (
                <div className="flex items-center gap-4 bg-neutral-900 text-white px-6 py-3">
                    <span className="text-xs tracking-widest uppercase text-neutral-300">
                        {selected.size} selected
                    </span>
                    <div className="flex-1" />
                    <button
                        onClick={handleExportSelected}
                        className="text-xs uppercase tracking-widest text-white hover:text-neutral-300 transition-colors px-4 py-1.5 border border-neutral-600 hover:border-neutral-400"
                    >
                        Export Selected
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={deleting}
                        className="text-xs uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors px-4 py-1.5 border border-red-800 hover:border-red-600 disabled:opacity-50"
                    >
                        {deleting ? "Deleting..." : "Delete Selected"}
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-4 py-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    className="w-4 h-4 accent-black cursor-pointer"
                                    aria-label="Select all"
                                />
                            </th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Name</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Email</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Phone</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Primary Source</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Added On</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    Aggregating clientele data...
                                </td>
                            </tr>
                        ) : contacts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    No contacts found.
                                </td>
                            </tr>
                        ) : contacts.map((contact) => (
                            <tr
                                key={contact.id}
                                onClick={() => router.push(`/customers/${encodeURIComponent(contact.email)}`)}
                                className={`cursor-pointer hover:bg-neutral-50 transition-colors ${selected.has(contact.id) ? "bg-neutral-50" : ""}`}
                            >
                                <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selected.has(contact.id)}
                                        onChange={() => toggleOne(contact.id)}
                                        className="w-4 h-4 accent-black cursor-pointer"
                                        aria-label={`Select ${contact.name || contact.email}`}
                                    />
                                </td>
                                <td className="px-4 py-4 font-medium text-neutral-900 whitespace-nowrap">
                                    {contact.name || <span className="text-neutral-400 font-normal italic">—</span>}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-neutral-600">
                                    {contact.email}
                                </td>
                                <td className="px-4 py-4 text-neutral-500 whitespace-nowrap">
                                    {contact.phone || <span className="text-neutral-300">—</span>}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${SOURCE_STYLES[contact.source]}`}>
                                        {SOURCE_LABELS[contact.source]}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-neutral-400 text-xs text-right whitespace-nowrap">
                                    {new Date(contact.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Contact Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setShowAddModal(false)}
                    />
                    <div className="relative bg-white w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-100">
                            <h2 className="font-serif text-xl tracking-widest uppercase">Add Contact</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex items-center justify-center w-8 h-8 text-neutral-400 hover:text-black transition-colors"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddContact} className="px-8 py-8 space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={addForm.name}
                                    onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black transition-colors"
                                    placeholder="Abena Mensah"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={addForm.email}
                                    onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black transition-colors"
                                    placeholder="abena@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Phone (Optional)</label>
                                <input
                                    type="tel"
                                    value={addForm.phone}
                                    onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black transition-colors"
                                    placeholder="+233 ..."
                                />
                            </div>
                            {addStatus === "error" && (
                                <p className="text-xs text-red-600 tracking-wide">Failed to save. Try again.</p>
                            )}
                            <button
                                type="submit"
                                disabled={addStatus === "saving"}
                                className="w-full py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                            >
                                {addStatus === "saving" ? "Saving..." : "Save Contact"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
