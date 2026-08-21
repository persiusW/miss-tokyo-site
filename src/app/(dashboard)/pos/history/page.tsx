// src/app/(dashboard)/pos/history/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PosStatus } from '@/types/pos';
import { toast } from '@/lib/toast';
import { buildSearchClause, isMissingColumn, sanitiseTerm } from '@/lib/refSearch';

type SessionRow = {
    id: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    total_amount: number;
    status: PosStatus;
    items: any[];
    notes: string | null;
    expires_at: string | null;
    paid_at: string | null;
    created_at: string;
    paystack_reference: string | null;
    staff_name: string | null;
    order_id: string | null;
};

const STATUS_BADGE: Record<PosStatus, string> = {
    draft:           "ac-badge ac-badge-inactive",
    pending_payment: "ac-badge ac-badge-warn",
    paid:            "ac-badge ac-badge-paid",
    expired:         "ac-badge ac-badge-danger",
    cancelled:       "ac-badge ac-badge-cancelled",
};

type FilterTab = 'all' | PosStatus;

const PAGE_SIZE = 50;

type StaffOption = { id: string; name: string };

/** Local calendar day → the timestamptz bounds that day covers. */
function dayStart(d: string) { return new Date(`${d}T00:00:00`).toISOString(); }
function dayEnd(d: string)   { return new Date(`${d}T23:59:59.999`).toISOString(); }

export default function POSHistoryPage() {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterTab>('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [staffFilter, setStaffFilter] = useState<string>('all');
    const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<SessionRow | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'owner' | 'sales_staff' | null>(null);

    const fetchSessions = useCallback(async (
        userId: string,
        role: string,
        tab: FilterTab,
        pageNum: number,
        staff: string,
        from_: string,
        to_: string,
        term: string,
    ) => {
        setLoading(true);
        const isStaff = role === 'sales_staff';
        const from = (pageNum - 1) * PAGE_SIZE;

        // Filters first: .range() returns a transform builder that has no .eq().
        let filters = supabase
            .from('pos_sessions')
            .select(
                'id, customer_name, customer_email, customer_phone, total_amount, status, items, notes, expires_at, paid_at, created_at, paystack_reference, order_id, created_by',
                { count: 'exact' },
            );

        // The status filter belongs in the query, not in a client-side pass over
        // the page — filtering after the fetch would only ever search the rows
        // this page happened to contain.
        if (tab !== 'all') filters = filters.eq('status', tab);
        // Sales staff only ever see their own sales, so the staff picker is
        // theirs by definition and is not offered to them.
        if (isStaff) filters = filters.eq('created_by', userId);
        else if (staff !== 'all') filters = filters.eq('created_by', staff);
        if (from_) filters = filters.gte('created_at', dayStart(from_));
        if (to_)   filters = filters.lte('created_at', dayEnd(to_));

        // Searches the whole filtered set server-side, not the loaded page.
        // `ref` is the generated 8-char id prefix shown in the Ref column; a
        // deploy can precede its migration, and naming a missing column fails
        // the whole or(), so fall back to searching without it.
        const q = sanitiseTerm(term);
        const textCols = ['customer_name', 'customer_email', 'customer_phone'];
        const run = (includeRef: boolean) => {
            const withSearch = q ? filters.or(buildSearchClause(q, textCols, { includeRef })) : filters;
            return withSearch
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);
        };

        let { data: rows, count, error: fetchError } = await run(true);
        if (q && isMissingColumn(fetchError, 'ref')) {
            console.warn('[POSHistory] `ref` column missing — searching without it. Apply 20260821010000_searchable_display_refs.sql.');
            ({ data: rows, count, error: fetchError } = await run(false));
        }

        if (fetchError) {
            // Asking for a page past the end (rows cancelled or filtered away
            // between renders) — fall back to the first page rather than an error.
            if (fetchError.code === 'PGRST103' && pageNum > 1) {
                setPage(1);
                return;
            }
            toast.error('Failed to load sessions');
            setLoading(false);
            return;
        }
        const sessionList = rows ?? [];
        setTotalCount(count ?? 0);

        const nameMap: Record<string, string> = {};
        const staffIds = [...new Set(sessionList.map((r: any) => r.created_by).filter(Boolean))];
        if (staffIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', staffIds);
            for (const p of (profiles ?? [])) nameMap[p.id] = p.full_name ?? '';
        }

        setSessions(sessionList.map((row: any) => ({
            ...row,
            staff_name: nameMap[row.created_by] ?? null,
            items: Array.isArray(row.items) ? row.items : [],
        })));
        setLoading(false);
    }, []);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }
            const { data: profile, error: profileError } = await supabase
                .from('profiles').select('role').eq('id', user.id).single();
            if (profileError && profileError.code !== 'PGRST116') console.error('[POSHistory] profile fetch error:', profileError);
            const role = (profile?.role as 'admin' | 'owner' | 'sales_staff') ?? 'sales_staff';
            setCurrentUserId(user.id);
            setUserRole(role);

            if (role !== 'sales_staff') {
                const { data: staff } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('role', ['admin', 'owner', 'sales_staff'])
                    .order('full_name');
                setStaffOptions((staff ?? []).map((p: any) => ({
                    id: p.id,
                    name: p.full_name?.trim() || p.email || 'Unnamed',
                })));
            }
        })();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        if (!currentUserId || !userRole) return;
        fetchSessions(currentUserId, userRole, filter, page, staffFilter, dateFrom, dateTo, search);
    }, [currentUserId, userRole, filter, page, staffFilter, dateFrom, dateTo, search, fetchSessions]);

    // Any filter change invalidates the current page number — page 7 of the old
    // result set is meaningless against the new one.
    useEffect(() => { setPage(1); }, [staffFilter, dateFrom, dateTo, search]);

    const refetch = () => {
        if (currentUserId && userRole) fetchSessions(currentUserId, userRole, filter, page, staffFilter, dateFrom, dateTo, search);
    };
    const filtersActive = staffFilter !== 'all' || Boolean(dateFrom) || Boolean(dateTo) || Boolean(search.trim());
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const handleCancel = async (sessionId: string) => {
        if (!confirm('Cancel this POS session?')) return;
        setCancelling(true);
        try {
            const res = await fetch('/api/pos/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            if (!res.ok) throw new Error((await res.json()).error ?? 'Cancel failed');
            toast.success('Session cancelled');
            setSelected(null);
            refetch();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setCancelling(false);
        }
    };

    const tabs: { key: FilterTab; label: string }[] = [
        { key: 'all',             label: 'All' },
        { key: 'draft',           label: 'Draft' },
        { key: 'pending_payment', label: 'Pending' },
        { key: 'paid',            label: 'Paid' },
        { key: 'expired',         label: 'Expired' },
        { key: 'cancelled',       label: 'Cancelled' },
    ];

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <Link href="/pos" className="ac-text-link" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
                        ← Back to POS
                    </Link>
                    <h1 className="ac-page-h1">POS History{userRole === 'sales_staff' ? ' — My Orders' : ''}</h1>
                </div>
            </div>

            <div className="ac-tabs" style={{ marginBottom: 24 }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => { setFilter(t.key); setPage(1); }} className={`ac-tab ${filter === t.key ? 'active' : ''}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Staff + date filters — all applied server-side alongside the tab */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="ac-label" htmlFor="pos-search">Search</label>
                    <input id="pos-search" type="search" className="ac-input" style={{ minWidth: 260 }}
                        placeholder="Ref, name, email or phone…"
                        value={searchInput} onChange={e => setSearchInput(e.target.value)} />
                </div>
                {userRole !== 'sales_staff' && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label className="ac-label" htmlFor="pos-staff-filter">Staff</label>
                        <select id="pos-staff-filter" className="ac-input" style={{ minWidth: 190 }}
                            value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
                            <option value="all">All staff</option>
                            {staffOptions.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="ac-label" htmlFor="pos-date-from">From</label>
                    <input id="pos-date-from" type="date" className="ac-input" style={{ minWidth: 150 }}
                        value={dateFrom} max={dateTo || undefined}
                        onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="ac-label" htmlFor="pos-date-to">To</label>
                    <input id="pos-date-to" type="date" className="ac-input" style={{ minWidth: 150 }}
                        value={dateTo} min={dateFrom || undefined}
                        onChange={e => setDateTo(e.target.value)} />
                </div>
                {filtersActive && (
                    <button type="button" className="ac-btn ac-btn-ghost ac-btn-sm"
                        onClick={() => { setStaffFilter('all'); setDateFrom(''); setDateTo(''); setSearchInput(''); setSearch(''); }}>
                        Clear filters
                    </button>
                )}
            </div>

            <div className="ac-card flush">
                {loading ? (
                    <div className="ac-empty"><p className="ac-empty-title">Loading...</p></div>
                ) : sessions.length === 0 ? (
                    <div className="ac-empty">
                        <p className="ac-empty-title">{filtersActive ? 'No sessions match these filters.' : 'No sessions found.'}</p>
                    </div>
                ) : (
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>Ref</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th className="r">Total</th>
                                    <th>Staff</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Expires / Paid</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(s => (
                                    <tr key={s.id} onClick={() => setSelected(s)} style={{ cursor: "pointer" }}>
                                        <td style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-3)" }}>{s.id.slice(0, 8).toUpperCase()}</td>
                                        <td>
                                            <div style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{s.customer_name}</div>
                                            <div style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{s.customer_email ?? s.customer_phone ?? '—'}</div>
                                        </td>
                                        <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{s.items.length} item{s.items.length !== 1 ? 's' : ''}</td>
                                        <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>GH₵{Number(s.total_amount).toFixed(2)}</td>
                                        <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{s.staff_name ?? '—'}</td>
                                        <td><span className={STATUS_BADGE[s.status]}>{s.status.replace('_', ' ')}</span></td>
                                        <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{new Date(s.created_at).toLocaleDateString("en-GB")}</td>
                                        <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>
                                            {s.status === 'paid' && s.paid_at ? new Date(s.paid_at).toLocaleString() : s.expires_at ? new Date(s.expires_at).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: "1px solid var(--ac-line)" }}>
                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>
                            Page {page} of {totalPages} · {totalCount} session{totalCount !== 1 ? 's' : ''}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="ac-btn ac-btn-ghost ac-btn-sm">
                                <ChevronLeft size={13} /> Prev
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="ac-btn ac-btn-ghost ac-btn-sm">
                                Next <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail slide-over */}
            {selected && (
                <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setSelected(null)} />
                    <div style={{ position: "relative", background: "var(--ac-panel)", width: "100%", maxWidth: 420, height: "100%", overflowY: "auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20, borderLeft: "1px solid var(--ac-line)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 16, fontWeight: 600, color: "var(--ac-ink)" }}>Session Detail</h2>
                            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", fontSize: 22 }}>×</button>
                        </div>

                        <div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 4 }}>Ref</p>
                            <p style={{ fontFamily: "var(--f-mono)", fontSize: 13, color: "var(--ac-ink)" }}>{selected.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 4 }}>Customer</p>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>{selected.customer_name}</p>
                            <p style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{selected.customer_email ?? 'No email on file'}</p>
                            {selected.customer_phone && <p style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{selected.customer_phone}</p>}
                        </div>
                        <div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 8 }}>Items</p>
                            {selected.items.map((i: any, idx: number) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "8px 0", borderBottom: "1px solid var(--ac-line)" }}>
                                    <div>
                                        <p style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{i.name}</p>
                                        {(i.size || i.color) && <p style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>{[i.size, i.color].filter(Boolean).join(' / ')}</p>}
                                    </div>
                                    <span style={{ color: "var(--ac-ink-3)" }}>×{i.quantity}</span>
                                </div>
                            ))}
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, paddingTop: 8, color: "var(--ac-ink)" }}>
                                <span>Total</span>
                                <span>GH₵{Number(selected.total_amount).toFixed(2)}</span>
                            </div>
                        </div>

                        {selected.notes && (
                            <div>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 4 }}>Notes</p>
                                <p style={{ fontSize: 12, color: "var(--ac-ink-2)" }}>{selected.notes}</p>
                            </div>
                        )}

                        {selected.status === 'paid' && selected.order_id && (
                            <Link href={`/sales/orders/${selected.order_id}`} className="ac-text-link" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                View Order
                            </Link>
                        )}

                        {selected.status === 'pending_payment' && selected.paystack_reference && (
                            <div>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 6 }}>Payment Link</p>
                                <p style={{ fontSize: 10, fontFamily: "var(--f-mono)", wordBreak: "break-all", color: "var(--ac-ink-3)" }}>
                                    https://paystack.com/pay/{selected.paystack_reference}
                                </p>
                                <button
                                    onClick={() => navigator.clipboard.writeText(`https://paystack.com/pay/${selected.paystack_reference}`).then(() => toast.success('Copied'))}
                                    className="ac-text-link" style={{ fontSize: 11, marginTop: 6 }}>
                                    Copy Link
                                </button>
                            </div>
                        )}

                        {['draft', 'pending_payment'].includes(selected.status) && (
                            <button onClick={() => handleCancel(selected.id)} disabled={cancelling}
                                style={{ width: "100%", padding: "12px 0", border: "1px solid var(--ac-danger)", background: "transparent", color: "var(--ac-danger)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, cursor: cancelling ? "not-allowed" : "pointer", opacity: cancelling ? 0.5 : 1, borderRadius: "var(--r-sm)" }}>
                                {cancelling ? 'Cancelling...' : 'Cancel Session'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
