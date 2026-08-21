"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const PAGE_SIZE = 50;

// PostgREST caps a single response; walk the view in chunks for a full export.
const EXPORT_CHUNK = 1000;

// PostgREST's or() takes a comma-separated list, so these characters would be
// read as syntax rather than as text to match.
function sanitiseSearch(raw: string): string {
    return raw.trim().replace(/[%,()]/g, "");
}

/** Search across the WHOLE directory, not the loaded page. */
function applySearch<T>(query: T, search: string): T {
    const q = sanitiseSearch(search);
    if (!q) return query;
    return (query as any).or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
}

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
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [sourceFilter, setSourceFilter] = useState<"all" | Source>("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const fetchContacts = useCallback(async (
        pageNum: number,
        term: string,
        source: "all" | Source,
        from_: string,
        to_: string,
    ) => {
        setLoading(true);
        const from = (pageNum - 1) * PAGE_SIZE;
        try {
            // contact_directory unions orders / custom_requests / newsletter_subs
            // / contacts and dedupes by email in Postgres, so one page is one
            // query. The browser used to download all four tables in full.
            // Search filters the whole view server-side, so a match on page 9
            // is found from page 1 — it is not a filter over the loaded rows.
            let query = supabase
                .from("contact_directory")
                .select("id, name, email, phone, source, created_at, is_manual", { count: "exact" });
            query = applySearch(query, term);
            if (source !== "all") query = query.eq("source", source);
            if (from_) query = query.gte("created_at", new Date(`${from_}T00:00:00`).toISOString());
            if (to_)   query = query.lte("created_at", new Date(`${to_}T23:59:59.999`).toISOString());

            const { data, count, error } = await query
                .order("created_at", { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (error) {
                // Page past the end — rows deleted since the count was taken.
                if (error.code === "PGRST103" && pageNum > 1) {
                    setPage(1);
                    return;
                }
                throw error;
            }

            setContacts((data ?? []) as Contact[]);
            setTotalCount(count ?? 0);
            setSelected(new Set());
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to load customers data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContacts(page, search, sourceFilter, dateFrom, dateTo);
    }, [fetchContacts, page, search, sourceFilter, dateFrom, dateTo]);

    // A new search or filter invalidates the page the old result set produced.
    useEffect(() => { setPage(1); }, [search, sourceFilter, dateFrom, dateTo]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const filtersActive = Boolean(search.trim()) || sourceFilter !== "all" || Boolean(dateFrom) || Boolean(dateTo);

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
            fetchContacts(page, search, sourceFilter, dateFrom, dateTo);
        }
    };

    // --- Export All (walks the whole directory, not just this page) ---
    const handleExportAll = async () => {
        setExporting(true);
        try {
            const all: Contact[] = [];
            for (let offset = 0; ; offset += EXPORT_CHUNK) {
                let q = supabase
                    .from("contact_directory")
                    .select("id, name, email, phone, source, created_at, is_manual");
                q = applySearch(q, search);
                if (sourceFilter !== "all") q = q.eq("source", sourceFilter);
                if (dateFrom) q = q.gte("created_at", new Date(`${dateFrom}T00:00:00`).toISOString());
                if (dateTo)   q = q.lte("created_at", new Date(`${dateTo}T23:59:59.999`).toISOString());
                const { data, error } = await q
                    .order("created_at", { ascending: false })
                    .range(offset, offset + EXPORT_CHUNK - 1);
                if (error) throw error;
                const batch = (data ?? []) as Contact[];
                all.push(...batch);
                if (batch.length < EXPORT_CHUNK) break;
            }
            const narrowed = Boolean(search.trim()) || sourceFilter !== "all" || Boolean(dateFrom) || Boolean(dateTo);
            const suffix = narrowed ? "-filtered" : "";
            downloadCSV(all, `miss-tokyo-contacts${suffix}-${new Date().toISOString().slice(0, 10)}.csv`);
            toast.success(`Exported ${all.length.toLocaleString()} contact${all.length !== 1 ? "s" : ""}.`);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Export failed.");
        } finally {
            setExporting(false);
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

        fetchContacts(page, search, sourceFilter, dateFrom, dateTo);
    };

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
                        {!loading && <span style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>{totalCount.toLocaleString()} contact{totalCount !== 1 ? "s" : ""}</span>}
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button className="ac-btn ac-btn-ghost" type="button"
                        onClick={handleExportAll} disabled={exporting}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 4v12"/><path d="m6 10 6 6 6-6"/><path d="M4 20h16"/></svg>
                        {exporting ? "Exporting…" : (filtersActive ? "Export Matches" : "Export All")}
                    </button>
                    <button className="ac-btn ac-btn-primary" type="button" onClick={() => setShowAddModal(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add Contact
                    </button>
                </div>
            </div>

            {/* Search + filters — every one queries the whole directory, never the page */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="ac-label" htmlFor="contact-search">Search</label>
                    <input
                        id="contact-search"
                        type="search"
                        className="ac-input"
                        style={{ minWidth: 280 }}
                        placeholder="Search name, email or phone…"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="ac-label" htmlFor="contact-source">Source</label>
                    <select id="contact-source" className="ac-input" style={{ minWidth: 170 }}
                        value={sourceFilter} onChange={e => setSourceFilter(e.target.value as "all" | Source)}>
                        <option value="all">All sources</option>
                        <option value="order">Order</option>
                        <option value="custom_request">Custom Request</option>
                        <option value="newsletter">Newsletter</option>
                        <option value="manual">Manual</option>
                    </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="ac-label" htmlFor="contact-from">Added from</label>
                    <input id="contact-from" type="date" className="ac-input" style={{ minWidth: 150 }}
                        value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="ac-label" htmlFor="contact-to">Added to</label>
                    <input id="contact-to" type="date" className="ac-input" style={{ minWidth: 150 }}
                        value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} />
                </div>
                {filtersActive && (
                    <button type="button" className="ac-btn ac-btn-ghost ac-btn-sm"
                        onClick={() => { setSearchInput(""); setSearch(""); setSourceFilter("all"); setDateFrom(""); setDateTo(""); }}>
                        Clear filters
                    </button>
                )}
                {filtersActive && !loading && (
                    <span style={{ fontSize: 11, color: "var(--ac-ink-3)", paddingBottom: 9 }}>
                        {totalCount.toLocaleString()} match{totalCount !== 1 ? "es" : ""} across all contacts
                    </span>
                )}
            </div>

            {/* Table card */}
            <div className="ac-card flush">
                {/* Bulk bar */}
                {someSelected && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--ac-line)", background: "var(--ac-panel-2)" }}>
                        <span className="ac-bulk-label">{selected.size} selected on this page</span>
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
                                <tr><td colSpan={6} className="ac-table-empty">
                                    {filtersActive ? "No contacts match these filters." : "No contacts found."}
                                </td></tr>
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
                {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: "1px solid var(--ac-line)" }}>
                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>
                            Page {page} of {totalPages} · {totalCount.toLocaleString()} contact{totalCount !== 1 ? "s" : ""}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="ac-btn ac-btn-ghost ac-btn-sm" type="button">
                                <ChevronLeft size={13} /> Prev
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="ac-btn ac-btn-ghost ac-btn-sm" type="button">
                                Next <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
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
