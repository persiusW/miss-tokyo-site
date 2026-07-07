"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
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

function downloadCSV(rows: Contact[], filename: string) {
    const headers = ["Name", "Email", "Phone", "Primary Source", "Added On"];
    const data = rows.map(c => [
        c.name || "",
        c.email,
        c.phone || "",
        SOURCE_LABELS[c.source] || c.source,
        new Date(c.created_at).toLocaleDateString("en-GB"),
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

    const SOURCE_CLASS: Record<Source, string> = {
        order:          "ac-badge-ok",
        custom_request: "ac-badge-warn",
        newsletter:     "ac-badge-info",
        manual:         "ac-badge-inactive",
    };

    return (
        <>
            {/* Page heading */}
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Customers</h1>
                    <p className="ac-page-sub">
                        Unified clientele across orders, requests &amp; subscriptions.
                        {!loading && <span style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>{contacts.length.toLocaleString()} contacts</span>}
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button className="ac-btn ac-btn-ghost" type="button"
                        onClick={() => downloadCSV(contacts, `miss-tokyo-contacts-${new Date().toISOString().slice(0, 10)}.csv`)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 4v12"/><path d="m6 10 6 6 6-6"/><path d="M4 20h16"/></svg>
                        Export All
                    </button>
                    <button className="ac-btn ac-btn-primary" type="button" onClick={() => setShowAddModal(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add Contact
                    </button>
                </div>
            </div>

            {/* Table card */}
            <div className="ac-card flush">
                {/* Bulk bar */}
                {someSelected && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--ac-line)", background: "var(--ac-panel-2)" }}>
                        <span className="ac-bulk-label">{selected.size} selected</span>
                        <div style={{ flex: 1 }} />
                        <button className="ac-btn ac-btn-ghost ac-btn-sm" onClick={handleExportSelected} type="button">Export Selected</button>
                        <button className="ac-btn ac-btn-sm" onClick={handleDeleteSelected} disabled={deleting} type="button"
                            style={{ background: "color-mix(in oklab, var(--ac-danger) 12%, transparent)", color: "var(--ac-danger)", borderColor: "color-mix(in oklab, var(--ac-danger) 25%, transparent)" }}>
                            {deleting ? "Deleting…" : "Delete Selected"}
                        </button>
                    </div>
                )}

                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>
                                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="ac-checkbox" />
                                </th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Source</th>
                                <th className="r">Added</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="ac-table-empty">Aggregating clientele data…</td></tr>
                            ) : contacts.length === 0 ? (
                                <tr><td colSpan={6} className="ac-table-empty">No contacts found.</td></tr>
                            ) : contacts.map((contact) => (
                                <tr
                                    key={contact.id}
                                    onClick={() => router.push(`/customers/${encodeURIComponent(contact.email)}`)}
                                    className={selected.has(contact.id) ? "selected" : ""}
                                >
                                    <td onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={selected.has(contact.id)} onChange={() => toggleOne(contact.id)} className="ac-checkbox" />
                                    </td>
                                    <td style={{ color: "var(--ac-ink)", fontWeight: 500, whiteSpace: "nowrap" }}>
                                        {contact.name || <em style={{ color: "var(--ac-ink-4)", fontWeight: 400 }}>—</em>}
                                    </td>
                                    <td style={{ color: "var(--ac-ink-2)", whiteSpace: "nowrap" }}>{contact.email}</td>
                                    <td style={{ color: "var(--ac-ink-3)", whiteSpace: "nowrap", fontFamily: "var(--f-mono)", fontSize: 12 }}>
                                        {contact.phone || <span style={{ color: "var(--ac-ink-4)" }}>—</span>}
                                    </td>
                                    <td>
                                        <span className={`ac-badge ${SOURCE_CLASS[contact.source]}`}>
                                            {SOURCE_LABELS[contact.source]}
                                        </span>
                                    </td>
                                    <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-4)", whiteSpace: "nowrap" }}>
                                        {new Date(contact.created_at).toLocaleDateString("en-GB")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Contact Modal */}
            {showAddModal && (
                <div className="ac-modal-scrim" onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
                    <div className="ac-modal">
                        <div className="ac-modal-head">
                            <div className="ac-modal-title">Add Contact</div>
                            <button className="ac-modal-close" onClick={() => setShowAddModal(false)} type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddContact}>
                            <div className="ac-modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <label className="ac-label">Full Name</label>
                                    <input type="text" required value={addForm.name}
                                        onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                                        className="ac-input" placeholder="Abena Mensah" />
                                </div>
                                <div>
                                    <label className="ac-label">Email Address</label>
                                    <input type="email" required value={addForm.email}
                                        onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                                        className="ac-input" placeholder="abena@example.com" />
                                </div>
                                <div>
                                    <label className="ac-label">Phone (Optional)</label>
                                    <input type="tel" value={addForm.phone}
                                        onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                                        className="ac-input" placeholder="+233 …" />
                                </div>
                                {addStatus === "error" && (
                                    <p style={{ fontSize: 12, color: "var(--ac-danger)" }}>Failed to save. Try again.</p>
                                )}
                            </div>
                            <div className="ac-modal-foot">
                                <button className="ac-btn ac-btn-ghost" type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button className="ac-btn ac-btn-primary" type="submit" disabled={addStatus === "saving"}>
                                    {addStatus === "saving" ? "Saving…" : "Save Contact"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
