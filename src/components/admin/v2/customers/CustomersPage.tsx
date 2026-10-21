"use client";

// Customers list (admin v2). Filters, search, sort and page live in the URL
// and are applied on the server; opening a customer pushes /customers/<email>
// without a reload, and closing goes back to the list the same way.
import { useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Badge, Btn, BulkBar, Card, Chip, Empty, ErrorState, PageHeader, Pager, Search, Select, TwoTap,
    ghs0, initials, plural, toast, when,
} from "@/components/admin/ui";
import { AdminV2Context } from "@/components/admin/shell/AdminV2Context";
import {
    PAGE_SIZE, SEGMENTS, SORTS, SOURCES, SOURCE_LABEL, canDelete, customerHref, displayName, filtersActive, keyFromPath, listSearch, sourceLabel,
    type CustomerRow, type ListQuery, type Segment, type Sort, type Source,
} from "@/lib/admin/v2/customers";
import type { CustomerDetail } from "@/lib/admin/v2/customersLoad";
import { deleteCustomers, exportCustomers } from "./actions";
import { CustomerPanel } from "./CustomerPanel";
import { AddCustomerPanel } from "./AddCustomerPanel";
import { ImportPanel } from "./ImportPanel";
import "./customers.css";

export type ListData = { rows: CustomerRow[]; total: number; counts: Record<Segment, number>; tags: string[] };

function download(csv: string, name: string) {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

export function CustomersPage({ role, meId, query, data, initialKey, initialDetail }: {
    role: "admin" | "owner" | "sales_staff";
    meId: string;
    query: ListQuery;
    data: ListData | null;
    initialKey: string | null;
    initialDetail: CustomerDetail | null | "error";
}) {
    const router = useRouter();
    const pathname = usePathname();
    // Read softly: if the shell and this page ever disagree about the switch
    // for one request, the list still renders (only the nav counts wait).
    const shell = useContext(AdminV2Context);
    const [pending, start] = useTransition();
    const search = listSearch(query, { page: query.page });
    const openKey = keyFromPath(pathname);
    const openedHere = useRef(false);

    const [term, setTerm] = useState(query.q);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);

    const nav = useCallback((patch: Partial<ListQuery>) => {
        start(() => router.push(`/customers${listSearch(query, patch)}`, { scroll: false }));
    }, [query, router]);

    // Search as you type, a moment after the last key.
    useEffect(() => {
        if (term.trim() === query.q.trim()) return;
        const t = setTimeout(() => start(() => router.replace(`/customers${listSearch(query, { q: term })}`, { scroll: false })), 350);
        return () => clearTimeout(t);
    }, [term, query, router]);

    // A new page of rows clears the selection.
    const rowKeys = (data?.rows ?? []).map(r => r.contact_key).join("|");
    useEffect(() => { setSelected(new Set()); }, [rowKeys]);

    const open = (key: string) => {
        openedHere.current = true;
        window.history.pushState(null, "", customerHref(key, search));
    };
    const close = () => {
        if (openedHere.current) {
            openedHere.current = false;
            window.history.back();
        } else {
            window.history.pushState(null, "", `/customers${search}`);
        }
    };

    const refresh = () => { router.refresh(); shell?.refreshCounts(); };

    const rows = data?.rows ?? [];
    const allSel = rows.length > 0 && rows.every(r => selected.has(r.contact_key));
    const toggle = (k: string) => setSelected(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
    const selRows = rows.filter(r => selected.has(r.contact_key));
    const deletable = selRows.filter(canDelete).length;

    const doExport = async (keys?: string[]) => {
        setExporting(true);
        const res = await exportCustomers(search, keys);
        setExporting(false);
        if (!res.ok) { toast.error(res.error); return; }
        const narrowed = keys ? "-selected" : (filtersActive(query) || query.segment !== "all") ? "-filtered" : "";
        download(res.csv, `miss-tokyo-customers${narrowed}-${new Date().toISOString().slice(0, 10)}.csv`);
        toast.success(`Exported ${plural(res.count, "customer")}`);
    };

    const doDelete = async () => {
        const res = await deleteCustomers(selRows.map(r => r.contact_key));
        if (!res.ok) { toast.error(res.error); return; }
        if (res.deleted) toast.success(`${plural(res.deleted, "customer")} deleted`);
        if (res.skipped) toast.error(`${plural(res.skipped, "customer")} kept: only customers the team added who have never ordered can be deleted.`);
        setSelected(new Set());
        refresh();
    };

    const total = data?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const narrowed = filtersActive(query) || query.segment !== "all";
    const clearAll = () => { setTerm(""); nav({ q: "", source: "all", from: "", to: "", tag: "", segment: "all" }); };
    const sourceOpts = useMemo(() => [{ v: "all", l: "Came from: anywhere" }, ...SOURCES.map(s => ({ v: s, l: `Came from: ${SOURCE_LABEL[s]}` }))], []);
    const tagOpts = useMemo(() => [{ v: "", l: "Any tag" }, ...(data?.tags ?? []).map(t => ({ v: t, l: `Tag: ${t}` }))], [data?.tags]);

    return (
        <>
            <PageHeader title="Customers" sub="Everyone who has bought from you, messaged you or signed up, in one list."
                actions={<>
                    <Btn kind="ghost" icon="download" onClick={() => doExport()} disabled={exporting || !data}>{exporting ? "Exporting…" : "Export"}</Btn>
                    <Btn kind="ghost" icon="upload" onClick={() => setImporting(true)}>Import</Btn>
                    <Btn kind="primary" icon="plus" onClick={() => setAdding(true)}>Add customer</Btn>
                </>} />

            <Card>
                <div className="list-tools" style={{ paddingBottom: 0 }}>
                    <div className="chips" role="group" aria-label="Show">
                        {SEGMENTS.map(s => (
                            <Chip key={s.v} pressed={query.segment === s.v} onClick={() => nav({ segment: s.v })} count={data ? data.counts[s.v] : null}>{s.l}</Chip>
                        ))}
                    </div>
                </div>
                <div className="list-tools cust-tools" style={{ paddingBottom: 0 }}>
                    <Search value={term} onChange={setTerm} placeholder="Search by name, email or phone" />
                    <Select label="Sort" value={query.sort} onChange={v => nav({ sort: v as Sort })} options={SORTS.map(s => ({ v: s.v, l: s.l }))} />
                </div>
                <div className="list-tools cust-tools">
                    <Select label="Came from" value={query.source} onChange={v => nav({ source: v as Source | "all" })} options={sourceOpts} />
                    {tagOpts.length > 1 && <Select label="Tag" value={query.tag} onChange={v => nav({ tag: v })} options={tagOpts} />}
                    <label className="cust-date"><span>Added from</span>
                        <input type="date" className="input" value={query.from} max={query.to || undefined} onChange={e => nav({ from: e.target.value })} />
                    </label>
                    <label className="cust-date"><span>to</span>
                        <input type="date" className="input" value={query.to} min={query.from || undefined} onChange={e => nav({ to: e.target.value })} />
                    </label>
                    {filtersActive(query) && <Btn sm kind="ghost" onClick={clearAll}>Clear filters</Btn>}
                </div>

                <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
                    <Btn sm onClick={() => doExport(selRows.map(r => r.contact_key))} disabled={exporting}>Export selected</Btn>
                    {deletable > 0 && <TwoTap sm label={deletable === selected.size ? "Delete" : `Delete ${deletable} of ${selected.size}`} onConfirm={doDelete} />}
                </BulkBar>

                {!data ? (
                    <ErrorState what="customers" onRetry={() => router.refresh()} />
                ) : rows.length === 0 ? (
                    narrowed ? (
                        <Empty icon="search" title="No customers match" body="Search covers name, email and phone number. Filters and chips narrow it further."
                            action={<Btn onClick={clearAll}>Clear filters</Btn>} />
                    ) : (
                        <Empty icon="customers" title="No customers yet" body="People appear here when they order, send the contact form, sign up for an account or the newsletter, or when you add them."
                            action={<Btn kind="primary" onClick={() => setAdding(true)}>Add customer</Btn>} />
                    )
                ) : (
                    <div className="tbl-wrap" aria-busy={pending} style={pending ? { opacity: 0.6 } : undefined}>
                        <table className="tbl cust-tbl">
                            <thead>
                                <tr>
                                    <th className="w-cbx"><span className="cbx-hit"><input type="checkbox" className="cbx" aria-label="Select every customer on this page" checked={allSel}
                                        onChange={() => setSelected(allSel ? new Set() : new Set(rows.map(r => r.contact_key)))} /></span></th>
                                    <th>Customer</th>
                                    <th className="hide-sm">Location</th>
                                    <th className="r">Orders</th>
                                    <th className="r">Spent</th>
                                    <th className="hide-sm">Last order</th>
                                    <th className="hide-sm">Came from</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.contact_key} className="click" aria-selected={selected.has(r.contact_key)} tabIndex={0}
                                        onClick={() => open(r.contact_key)} onKeyDown={e => { if (e.key === "Enter") open(r.contact_key); }}>
                                        <td onClick={e => e.stopPropagation()}>
                                            <span className="cbx-hit"><input type="checkbox" className="cbx" aria-label={`Select ${displayName(r)}`} checked={selected.has(r.contact_key)} onChange={() => toggle(r.contact_key)} /></span>
                                        </td>
                                        <td>
                                            <div className="hrow">
                                                <span className="avatar" aria-hidden="true">{initials(displayName(r))}</span>
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="strong cust-name">{displayName(r)}{r.wholesale && <Badge plain>Wholesale</Badge>}</div>
                                                    <div className="xs muted cust-email">{r.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hide-sm cust-loc">{r.location || <span className="muted">—</span>}</td>
                                        <td className="r">{r.orders}</td>
                                        <td className="r nowrap">{ghs0(r.spent)}</td>
                                        <td className="hide-sm nowrap">{r.last_order_at ? when(r.last_order_at) : <span className="muted">—</span>}</td>
                                        <td className="hide-sm">{sourceLabel(r.came_from)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {data && (
                    <Pager left={`${plural(total, "customer")}${pages > 1 ? ` · page ${query.page} of ${pages}` : ""} · orders and spend count paid orders`}
                        prevHref={pages > 1 ? (query.page > 1 ? `/customers${listSearch(query, { page: query.page - 1 })}` : null) : undefined}
                        nextHref={pages > 1 ? (query.page < pages ? `/customers${listSearch(query, { page: query.page + 1 })}` : null) : undefined} />
                )}
            </Card>

            {openKey && (
                <CustomerPanel key={openKey} contactKey={openKey} role={role} meId={meId} onClose={close} onChanged={refresh}
                    initial={openKey === initialKey ? initialDetail : null} />
            )}
            {adding && <AddCustomerPanel onClose={() => setAdding(false)} onAdded={key => { setAdding(false); open(key); refresh(); }} onOpen={key => { setAdding(false); open(key); }} />}
            {importing && <ImportPanel onClose={() => setImporting(false)} onDone={() => { setImporting(false); refresh(); }} />}
        </>
    );
}
