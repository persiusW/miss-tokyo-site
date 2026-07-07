"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type Submission = {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    topic: string;
    order_number: string | null;
    message: string;
    status: "unread" | "read" | "replied";
    submitted_at: string;
    replied_at: string | null;
};

const TOPICS = ["All", "Order help", "Size & fit", "Returns", "Delivery", "Collaboration", "Other"] as const;
const STATUSES = ["All", "Unread", "Read", "Replied"] as const;
const PAGE_SIZE = 25;

const STATUS_DOT: Record<string, string> = {
    unread:  "var(--ac-warn)",
    read:    "var(--ac-ink-4)",
    replied: "var(--ac-accent)",
};

const STATUS_LABEL: Record<string, string> = {
    unread: "Unread", read: "Read", replied: "Replied",
};

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

export default function FormSubmissionsPage() {
    const [rows, setRows] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);

    const [topicFilter, setTopicFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);

    const [selected, setSelected] = useState<Submission | null>(null);
    const [panelUpdating, setPanelUpdating] = useState(false);

    const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        let q = supabase
            .from("contact_submissions")
            .select("*", { count: "exact" })
            .order("submitted_at", { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (topicFilter !== "All") q = q.eq("topic", topicFilter);
        if (statusFilter !== "All") q = q.eq("status", statusFilter.toLowerCase());
        if (debouncedSearch) {
            q = q.or(
                `first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`
            );
        }

        const { data, count, error } = await q;
        if (error) {
            console.error(error);
            toast.error("Failed to load contact submissions.");
        } else if (data) {
            setRows(data as Submission[]);
            setTotal(count ?? 0);
        }
        setLoading(false);
    }, [page, topicFilter, statusFilter, debouncedSearch]);

    const fetchUnread = useCallback(async () => {
        const { count } = await supabase
            .from("contact_submissions")
            .select("id", { count: "exact", head: true })
            .eq("status", "unread");
        setUnreadCount(count ?? 0);
    }, []);

    useEffect(() => {
        fetchRows();
        fetchUnread();
    }, [fetchRows, fetchUnread]);

    useEffect(() => {
        refreshRef.current = setInterval(fetchUnread, 60_000);
        const onFocus = () => fetchUnread();
        window.addEventListener("focus", onFocus);
        return () => {
            if (refreshRef.current) clearInterval(refreshRef.current);
            window.removeEventListener("focus", onFocus);
        };
    }, [fetchUnread]);

    useEffect(() => { setPage(0); }, [topicFilter, statusFilter, debouncedSearch]);

    const openPanel = async (row: Submission) => {
        setSelected(row);
        if (row.status === "unread") {
            await fetch(`/api/admin/contact-submissions/${row.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "read" }),
            });
            setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: "read" } : r));
            setSelected(prev => prev?.id === row.id ? { ...prev, status: "read" } : prev);
            setUnreadCount(c => Math.max(0, c - 1));
        }
    };

    const markReplied = async () => {
        if (!selected) return;
        setPanelUpdating(true);
        await fetch(`/api/admin/contact-submissions/${selected.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "replied" }),
        });
        const updated: Submission = { ...selected, status: "replied", replied_at: new Date().toISOString() };
        setRows(prev => prev.map(r => r.id === selected.id ? updated : r));
        setSelected(updated);
        setPanelUpdating(false);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        Form Submissions
                        {unreadCount > 0 && (
                            <span className="ac-badge ac-badge-warn">{unreadCount} unread</span>
                        )}
                    </h1>
                    <p className="ac-page-sub">Contact form submissions from the public site.</p>
                </div>
            </div>

            {/* Filter bar */}
            <div className="ac-card" style={{ marginBottom: 16 }}>
                <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <input type="search" placeholder="Search name or email…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="ac-input" style={{ width: 220 }} />
                    <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="ac-select">
                        {TOPICS.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ac-select">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <span style={{ fontSize: 11, color: "var(--ac-ink-4)", marginLeft: "auto" }}>{total} result{total !== 1 ? "s" : ""}</span>
                </div>
            </div>

            {/* Table */}
            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Topic</th>
                                <th>Order #</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="ac-table-empty">Loading…</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={7} className="ac-table-empty">No submissions found.</td></tr>
                            ) : rows.map(row => {
                                const isUnread = row.status === "unread";
                                return (
                                    <tr key={row.id} style={{ fontWeight: isUnread ? 600 : undefined }}>
                                        <td style={{ fontSize: 11, color: "var(--ac-ink-4)", whiteSpace: "nowrap" }}>
                                            {new Date(row.submitted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </td>
                                        <td style={{ color: isUnread ? "var(--ac-ink)" : "var(--ac-ink-2)" }}>
                                            {[row.first_name, row.last_name].filter(Boolean).join(" ")}
                                        </td>
                                        <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{row.email}</td>
                                        <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{row.topic}</td>
                                        <td style={{ fontSize: 12, color: "var(--ac-ink-4)" }}>{row.order_number || "—"}</td>
                                        <td>
                                            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ac-ink-3)" }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_DOT[row.status], flexShrink: 0 }} />
                                                {STATUS_LABEL[row.status] ?? row.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <button onClick={() => openPanel(row)} className="ac-text-link" style={{ fontSize: 12 }}>View</button>
                                                <a href={`mailto:${row.email}?subject=Re: your Miss Tokyo enquiry`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    style={{ fontSize: 12, color: "var(--ac-ink-4)" }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-ink)")}
                                                    onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                    Reply
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                    <p style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>Page {page + 1} of {totalPages}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="ac-btn ac-btn-ghost ac-btn-sm">← Prev</button>
                        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="ac-btn ac-btn-ghost ac-btn-sm">Next →</button>
                    </div>
                </div>
            )}

            {/* Slide-over panel */}
            {selected && (
                <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,.4)" }} onClick={() => setSelected(null)} />
                    <aside style={{
                        position: "fixed", top: 0, right: 0, zIndex: 50,
                        height: "100%", width: "100%", maxWidth: 460,
                        background: "var(--ac-panel)",
                        borderLeft: "1px solid var(--ac-line)",
                        boxShadow: "-8px 0 40px rgba(0,0,0,.25)",
                        display: "flex", flexDirection: "column",
                    }}>
                        {/* Panel header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--ac-line)", flexShrink: 0 }}>
                            <div>
                                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--ac-ink)" }}>
                                    {[selected.first_name, selected.last_name].filter(Boolean).join(" ")}
                                </h2>
                                <p style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2 }}>{selected.email}</p>
                            </div>
                            <button onClick={() => setSelected(null)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", padding: 6 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        {/* Panel body */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                {[
                                    ["Topic", selected.topic],
                                    ["Status", STATUS_LABEL[selected.status] ?? selected.status],
                                    ["Order #", selected.order_number || "—"],
                                    ["Submitted", new Date(selected.submitted_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })],
                                    ...(selected.replied_at ? [["Replied", new Date(selected.replied_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" })]] : []),
                                ].map(([label, value]) => (
                                    <div key={label as string}>
                                        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 4 }}>{label}</p>
                                        <p style={{ fontSize: 13, color: "var(--ac-ink)" }}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 8 }}>Message</p>
                                <div style={{ background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", padding: "14px 16px", fontSize: 13, color: "var(--ac-ink-2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                                    {selected.message}
                                </div>
                            </div>
                        </div>

                        {/* Panel footer */}
                        <div style={{ flexShrink: 0, padding: "14px 20px", borderTop: "1px solid var(--ac-line)", display: "flex", alignItems: "center", gap: 10 }}>
                            {selected.status !== "replied" && (
                                <button onClick={markReplied} disabled={panelUpdating} className="ac-btn ac-btn-primary" style={{ flex: 1 }}>
                                    {panelUpdating ? "Updating…" : "Mark as Replied"}
                                </button>
                            )}
                            <a href={`mailto:${selected.email}?subject=Re: your Miss Tokyo enquiry`}
                                target="_blank" rel="noopener noreferrer"
                                className="ac-btn ac-btn-ghost" style={{ flex: 1, textAlign: "center" }}>
                                Reply via Email
                            </a>
                        </div>
                    </aside>
                </>
            )}
        </>
    );
}
