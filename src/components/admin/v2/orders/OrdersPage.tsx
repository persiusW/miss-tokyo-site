"use client";

// Orders list (admin v2). View, search, filters and page live in the URL and
// are applied on the server, 25 a page. Opening an order pushes /orders/<id>
// without a reload, and closing goes back to the list the same way, so a
// direct link to /orders/<id> shows the list with that order's panel open.
import { useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Banner, Btn, BulkBar, Card, Chip, Empty, ErrorState, FulBadge, Kpi, PayBadge, Pager, Search, Select,
    ghs, plural, toast, when,
} from "@/components/admin/ui";
import { AdminV2Context } from "@/components/admin/shell/AdminV2Context";
import {
    CHANNELS, ORDER_VIEWS, PAGE_SIZE, PAY_FILTERS, channelLabel, filtersActive, fulKeyOf, isPickup, orderIdFromPath, orderRef, ordersSearch, payKeyOf,
    type ChannelFilter, type OrderViewKey, type OrdersQuery, type PayFilter,
} from "@/lib/admin/v2/orders";
import type { OrderDetail, OrderListRow } from "@/lib/admin/v2/ordersLoad";
import { bulkFinish, bulkPack, exportOrders, packingSlips, type SlipOrder } from "./actions";
import { OrdersHeader } from "./OrdersHeader";
import { OrderPanel } from "./OrderPanel";
import { ShipPanel } from "./OrderFlows";
import { PackingSlips } from "./PrintSheets";
import "./orders.css";

export type ListData = {
    rows: OrderListRow[]; total: number; counts: Record<OrderViewKey, number>; abandoned: number | null;
    pre: { waiting: number; sent: number; cancelled: number } | null;
};
type Role = "admin" | "owner" | "sales_staff";

function download(csv: string, name: string) {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

/** The customer emails the old list sent after a bulk change, one order at a time. */
async function notify(ids: string[], type: "packed" | "fulfilled"): Promise<number> {
    let failed = 0;
    await Promise.all(ids.map(async orderId => {
        try {
            const res = await fetch("/api/email/fulfillment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, type }) });
            if (!res.ok) failed++;
        } catch { failed++; }
    }));
    return failed;
}

export function OrdersPage({ role, query, data, initialId, initialDetail }: {
    role: Role; query: OrdersQuery; data: ListData | null; initialId: string | null; initialDetail: OrderDetail | null | "error";
}) {
    const router = useRouter();
    const pathname = usePathname();
    const shell = useContext(AdminV2Context);
    const [pending, start] = useTransition();
    const search = ordersSearch(query, { page: query.page });
    const openId = orderIdFromPath(pathname);
    const openedHere = useRef(false);

    const [term, setTerm] = useState(query.q);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [shipFor, setShipFor] = useState<OrderListRow[] | null>(null);
    const [slips, setSlips] = useState<{ orders: SlipOrder[]; business: string } | null>(null);

    const nav = useCallback((patch: Partial<OrdersQuery>) => {
        start(() => router.push(`/orders${ordersSearch(query, patch)}`, { scroll: false }));
    }, [query, router]);

    useEffect(() => {
        if (term.trim() === query.q.trim()) return;
        const t = setTimeout(() => start(() => router.replace(`/orders${ordersSearch(query, { q: term })}`, { scroll: false })), 350);
        return () => clearTimeout(t);
    }, [term, query, router]);

    const rowIds = (data?.rows ?? []).map(r => r.id).join("|");
    useEffect(() => { setSelected(new Set()); }, [rowIds]);

    // Print once the slips are on the page, then clear them.
    useEffect(() => {
        if (!slips) return;
        const t = setTimeout(() => { window.print(); setSlips(null); }, 50);
        return () => clearTimeout(t);
    }, [slips]);

    const open = (id: string) => {
        openedHere.current = true;
        window.history.pushState(null, "", `/orders/${id}${search}`);
    };
    const close = () => {
        if (openedHere.current) {
            openedHere.current = false;
            window.history.back();
        } else {
            window.history.pushState(null, "", `/orders${search}`);
        }
    };
    const refresh = () => { router.refresh(); shell?.refreshCounts(); };

    const rows = data?.rows ?? [];
    const allSel = rows.length > 0 && rows.every(r => selected.has(r.id));
    const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const selRows = rows.filter(r => selected.has(r.id));
    const packedDelivery = selRows.filter(r => fulKeyOf(r) === "packed" && !isPickup(r));
    const packedPickup = selRows.filter(r => fulKeyOf(r) === "packed" && isPickup(r));

    const doBulkPack = async () => {
        setBusy(true);
        const res = await bulkPack(selRows.map(r => r.id));
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        const skip = res.skipped ? `. ${plural(res.skipped, "order")} skipped: not paid, partly packed or already packed.` : "";
        toast.success(`${plural(res.packed.length, "order")} marked as packed${skip}`);
        setSelected(new Set());
        refresh();
        if (res.packed.length) {
            const failed = await notify(res.packed, "packed");
            if (failed) toast.error(`The packed email didn't go to ${plural(failed, "customer")}. (EML-01)`);
        }
    };

    const doBulkFinish = async () => {
        setBusy(true);
        const res = await bulkFinish(selRows.map(r => r.id));
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        const skip = res.skipped ? `. ${plural(res.skipped, "order")} skipped: not paid, or cancelled.` : "";
        toast.success(`${plural(res.done.length, "order")} marked as delivered${skip}`);
        setSelected(new Set());
        refresh();
        if (res.done.length) {
            const failed = await notify(res.done, "fulfilled");
            if (failed) toast.error(`The delivery email didn't go to ${plural(failed, "customer")}. (EML-01)`);
        }
    };

    const doBulkReady = async () => {
        setBusy(true);
        try {
            const res = await fetch("/api/pickup-ready", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds: packedPickup.map(r => r.id) }) });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) { toast.fromResponse(body, { audience: "staff" }); return; }
            toast.success(`${plural(packedPickup.length, "customer")} told their order is ready to collect`);
            setSelected(new Set());
            refresh();
        } catch {
            toast.code("NET-01", { audience: "staff" });
        } finally {
            setBusy(false);
        }
    };

    const doSlips = async (ids: string[]) => {
        setBusy(true);
        const res = await packingSlips(ids);
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        setSlips({ orders: res.orders, business: res.business });
    };

    const doExport = async (ids?: string[]) => {
        setBusy(true);
        const res = await exportOrders(search, ids ?? null);
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        download(res.csv, `miss-tokyo-orders${ids ? "-selected" : filtersActive(query) || query.view !== "all" ? "-filtered" : ""}-${new Date().toISOString().slice(0, 10)}.csv`);
        toast.success(`Exported ${plural(res.count, "order")}`);
    };

    const total = data?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const narrowed = filtersActive(query);
    const viewDef = ORDER_VIEWS.find(v => v.v === query.view)!;
    const clearAll = () => { setTerm(""); nav({ q: "", pay: "all", channel: "all", preorder: false, from: "", to: "" }); };

    return (
        <>
            <OrdersHeader tab="orders" role={role} abandoned={data?.abandoned ?? null}
                actions={<Btn kind="ghost" icon="download" onClick={() => doExport()} disabled={busy || !data}>Export</Btn>} />

            {query.preorder && data?.pre && (
                <>
                    <div className="grid-3 ord-kpis">
                        <Kpi label="Pre-orders waiting for stock" value={data.pre.waiting} ctx="paid or waiting to pack" />
                        <Kpi label="Pre-orders sent" value={data.pre.sent} ctx="out for delivery or delivered" />
                        <Kpi label="Pre-orders cancelled" value={data.pre.cancelled} ctx="cancelled or refunded" />
                    </div>
                    <Banner tone="info" title="Orders with a pre-order item">Send the regular items now from the order, and come back here when the pre-order stock arrives.</Banner>
                    <div style={{ height: 16 }} />
                </>
            )}

            <Card>
                <div className="list-tools" style={{ paddingBottom: 0 }}>
                    <div className="chips" role="group" aria-label="Order views" data-assist="orders.tabs">
                        {ORDER_VIEWS.map(v => (
                            <Chip key={v.v} pressed={query.view === v.v} onClick={() => nav({ view: v.v })} count={data && v.v !== "all" ? data.counts[v.v] : null}>{v.l}</Chip>
                        ))}
                    </div>
                </div>
                <div className="list-tools ord-tools" style={{ paddingBottom: 0 }}>
                    <span style={{ display: "contents" }} data-assist="orders.search">
                        <Search value={term} onChange={setTerm} placeholder="Search by order number, name or phone" />
                    </span>
                    <Select label="Payment method" value={query.pay} onChange={v => nav({ pay: v as PayFilter })} options={PAY_FILTERS.map(p => ({ v: p.v, l: p.l }))} />
                    <Select label="Channel" value={query.channel} onChange={v => nav({ channel: v as ChannelFilter })} options={CHANNELS.map(c => ({ v: c.v, l: c.l }))} />
                    <Chip pressed={query.preorder} onClick={() => nav({ preorder: !query.preorder })}>Pre-orders only</Chip>
                </div>
                <div className="list-tools ord-tools">
                    <label className="ord-date"><span>Placed from</span>
                        <input type="date" className="input" value={query.from} max={query.to || undefined} onChange={e => nav({ from: e.target.value })} />
                    </label>
                    <label className="ord-date"><span>to</span>
                        <input type="date" className="input" value={query.to} min={query.from || undefined} onChange={e => nav({ to: e.target.value })} />
                    </label>
                    {narrowed && <Btn sm kind="ghost" onClick={clearAll}>Clear filters</Btn>}
                </div>

                <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
                    <Btn sm onClick={doBulkPack} disabled={busy} data-assist="orders.bulk-pack">Mark as packed</Btn>
                    {packedDelivery.length > 0 && <Btn sm icon="truck" onClick={() => setShipFor(packedDelivery)} disabled={busy} data-assist="orders.bulk-ship">Assign rider and send ({packedDelivery.length})</Btn>}
                    {packedPickup.length > 0 && <Btn sm icon="store" onClick={doBulkReady} disabled={busy} data-assist="orders.bulk-pickup">Tell customers it&apos;s ready ({packedPickup.length})</Btn>}
                    <Btn sm onClick={doBulkFinish} disabled={busy}>Mark as delivered</Btn>
                    <Btn sm icon="print" onClick={() => doSlips(selRows.map(r => r.id))} disabled={busy}>Print packing slips</Btn>
                    <Btn sm icon="download" onClick={() => doExport(selRows.map(r => r.id))} disabled={busy}>Export</Btn>
                </BulkBar>

                {!data ? (
                    <ErrorState what="orders" onRetry={() => router.refresh()} />
                ) : rows.length === 0 ? (
                    narrowed ? (
                        <Empty icon="search" title="No orders match" body="Try another spelling, or clear the filters to see every order in this view."
                            action={<Btn onClick={clearAll}>Clear filters</Btn>} />
                    ) : (
                        <Empty icon="orders" title={viewDef.empty}
                            body={query.view === "all" ? "Orders from the shop, the POS, WhatsApp and pay links appear here as they come in." : "Orders move here on their own as they're paid, packed and sent. You don't need to do anything."} />
                    )
                ) : (
                    <div className="tbl-wrap" aria-busy={pending} style={pending ? { opacity: 0.6 } : undefined}>
                        <table className="tbl ord-tbl">
                            <thead>
                                <tr>
                                    <th className="w-cbx"><span className="cbx-hit"><input type="checkbox" className="cbx" aria-label="Select every order on this page" checked={allSel}
                                        onChange={() => setSelected(allSel ? new Set() : new Set(rows.map(r => r.id)))} /></span></th>
                                    <th>Order</th>
                                    <th>Customer</th>
                                    <th className="hide-sm">Channel</th>
                                    <th>Payment</th>
                                    <th>Fulfilment</th>
                                    <th className="r">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={r.id} className="click" aria-selected={selected.has(r.id)} tabIndex={0}
                                        onClick={() => open(r.id)} onKeyDown={e => { if (e.key === "Enter") open(r.id); }}>
                                        <td onClick={e => e.stopPropagation()}>
                                            <span className="cbx-hit">
                                                {i === 0
                                                    ? <input type="checkbox" className="cbx" aria-label={`Select order ${orderRef(r)}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} data-assist="orders.row-select" />
                                                    : <input type="checkbox" className="cbx" aria-label={`Select order ${orderRef(r)}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />}
                                            </span>
                                        </td>
                                        <td><div className="strong">#{orderRef(r)}</div><div className="xs muted nowrap">{when(r.created_at)}</div></td>
                                        <td>
                                            <div className="ord-cust">{r.customer_name || r.customer_email || "No name"}</div>
                                            <div className="xs muted">{isPickup(r) ? "Pickup" : "Delivery"}{r.is_mixed_order ? " · Mixed order" : ""}</div>
                                        </td>
                                        <td className="hide-sm">{channelLabel(r.source)}</td>
                                        <td><PayBadge s={payKeyOf(r)} /></td>
                                        <td>
                                            <FulBadge s={fulKeyOf(r)} pickup={isPickup(r)} />
                                            {r.has_preorder && <div className="xs muted ord-sub">Includes pre-order</div>}
                                        </td>
                                        <td className="r strong nowrap">{ghs(r.total_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {data && (
                    <Pager left={`${plural(total, "order")}${pages > 1 ? ` · page ${query.page} of ${pages}` : ""} · newest first`}
                        prevHref={pages > 1 ? (query.page > 1 ? `/orders${ordersSearch(query, { page: query.page - 1 })}` : null) : undefined}
                        nextHref={pages > 1 ? (query.page < pages ? `/orders${ordersSearch(query, { page: query.page + 1 })}` : null) : undefined} />
                )}
            </Card>

            {openId && (
                <OrderPanel key={openId} orderId={openId} role={role} onClose={close} onChanged={refresh}
                    initial={openId === initialId ? initialDetail : null} />
            )}
            {shipFor && (
                <ShipPanel level={1} orders={shipFor.map(r => ({ id: r.id, ref: orderRef(r), name: r.customer_name }))} bulk
                    onClose={() => setShipFor(null)} onDone={() => { setShipFor(null); setSelected(new Set()); refresh(); }} />
            )}
            {slips && <PackingSlips orders={slips.orders} business={slips.business} />}
        </>
    );
}
