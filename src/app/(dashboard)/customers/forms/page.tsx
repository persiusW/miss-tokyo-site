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

const STATUS_BADGE: Record<string, { dot: string; label: string }> = {
    unread:  { dot: "bg-amber-400",  label: "Unread" },
    read:    { dot: "bg-neutral-400", label: "Read" },
    replied: { dot: "bg-green-500",  label: "Replied" },
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

    // Refresh unread count every 60 seconds
    useEffect(() => {
        refreshRef.current = setInterval(fetchUnread, 60_000);
        const onFocus = () => fetchUnread();
        window.addEventListener("focus", onFocus);
        return () => {
            if (refreshRef.current) clearInterval(refreshRef.current);
            window.removeEventListener("focus", onFocus);
        };
    }, [fetchUnread]);

    // Reset page when filters change
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
        <div className="space-y-8">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-1 flex items-center gap-3">
                        Form Submissions
                        {unreadCount > 0 && (
                            <span className="text-sm font-sans font-semibold bg-amber-400 text-white px-2 py-0.5 rounded-full tracking-normal">
                                {unreadCount} unread
                            </span>
                        )}
                    </h1>
                    <p className="text-neutral-500 text-sm">Contact form submissions from the public site.</p>
                </div>
            </header>

            {/* ── Filter bar ── */}
            <div className="flex flex-wrap gap-3 items-center">
                <input
                    type="search"
                    placeholder="Search name or email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black rounded-md w-56"
                />
                <select
                    value={topicFilter}
                    onChange={e => setTopicFilter(e.target.value)}
                    className="border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black rounded-md"
                >
                    {TOPICS.map(t => <option key={t}>{t}</option>)}
                </select>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-black rounded-md"
                >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <span className="text-xs text-neutral-400 ml-auto">{total} result{total !== 1 ? "s" : ""}</span>
            </div>

            {/* ── Table ── */}
            <div className="bg-white border border-neutral-200 overflow-x-auto rounded-md">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            {["Date", "Name", "Email", "Topic", "Order #", "Status", "Actions"].map(h => (
                                <th key={h} className="px-5 py-3.5 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-12 text-center text-neutral-400 italic font-serif">
                                    Loading…
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-12 text-center text-neutral-400 italic font-serif">
                                    No submissions found.
                                </td>
                            </tr>
                        ) : rows.map(row => {
                            const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.read;
                            const isUnread = row.status === "unread";
                            return (
                                <tr key={row.id} className={`hover:bg-neutral-50 transition-colors ${isUnread ? "font-medium" : ""}`}>
                                    <td className="px-5 py-3.5 text-neutral-500 text-xs whitespace-nowrap">
                                        {new Date(row.submitted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={isUnread ? "text-neutral-900" : "text-neutral-700"}>
                                            {[row.first_name, row.last_name].filter(Boolean).join(" ")}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-neutral-600">{row.email}</td>
                                    <td className="px-5 py-3.5 text-neutral-600">{row.topic}</td>
                                    <td className="px-5 py-3.5 text-neutral-500">{row.order_number || "—"}</td>
                                    <td className="px-5 py-3.5">
                                        <span className="flex items-center gap-1.5 text-xs">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dot}`} />
                                            {badge.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => openPanel(row)}
                                                className="text-xs font-medium text-black hover:underline"
                                            >
                                                View
                                            </button>
                                            <a
                                                href={`mailto:${row.email}?subject=Re: your Miss Tokyo enquiry`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-neutral-500 hover:text-black hover:underline"
                                            >
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

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-500">
                        Page {page + 1} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 text-xs border border-neutral-200 rounded-md disabled:opacity-40 hover:border-black transition-colors"
                        >
                            ← Prev
                        </button>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 text-xs border border-neutral-200 rounded-md disabled:opacity-40 hover:border-black transition-colors"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}

            {/* ── Slide-over panel ── */}
            {selected && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/30"
                        onClick={() => setSelected(null)}
                    />
                    <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 shrink-0">
                            <div>
                                <h2 className="font-semibold text-neutral-900">
                                    {[selected.first_name, selected.last_name].filter(Boolean).join(" ")}
                                </h2>
                                <p className="text-xs text-neutral-500 mt-0.5">{selected.email}</p>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                className="p-2 text-neutral-400 hover:text-black transition-colors"
                                aria-label="Close"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        {/* Panel body */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                            {/* Meta */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {[
                                    ["Topic", selected.topic],
                                    ["Status", STATUS_BADGE[selected.status]?.label ?? selected.status],
                                    ["Order #", selected.order_number || "—"],
                                    ["Submitted", new Date(selected.submitted_at).toLocaleString("en-GB", {
                                        day: "2-digit", month: "short", year: "numeric",
                                        hour: "2-digit", minute: "2-digit",
                                    })],
                                    ...(selected.replied_at ? [["Replied", new Date(selected.replied_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" })]] : []),
                                ].map(([label, value]) => (
                                    <div key={label as string}>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">{label}</p>
                                        <p className="text-neutral-800">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Message */}
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Message</p>
                                <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-4 text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
                                    {selected.message}
                                </div>
                            </div>
                        </div>

                        {/* Panel footer */}
                        <div className="shrink-0 px-6 py-4 border-t border-neutral-100 flex items-center gap-3">
                            {selected.status !== "replied" && (
                                <button
                                    onClick={markReplied}
                                    disabled={panelUpdating}
                                    className="flex-1 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-widest rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                >
                                    {panelUpdating ? "Updating…" : "Mark as Replied"}
                                </button>
                            )}
                            <a
                                href={`mailto:${selected.email}?subject=Re: your Miss Tokyo enquiry`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2.5 border border-neutral-200 text-xs font-semibold uppercase tracking-widest rounded-md hover:border-black text-center transition-colors"
                            >
                                Reply via Email
                            </a>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}
