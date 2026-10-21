"use client";

// Till › Today's sales (sales staff: My sales today, their own only; the server
// enforces it). Everything the old POS History had: status filter, search,
// staff and date filters, 50 a page, a sale's detail, its pay link, its order
// and Cancel sale (two taps, through the same /api/pos/cancel).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Badge, Banner, Btn, BtnLink, Card, Chip, Empty, ErrorState, Field, Kpi, Pager, Panel, Search, Select, TwoTap,
    ghs, ghs0, plural, toast, when,
} from "@/components/admin/ui";
import { readJson } from "@/lib/http/readJson";
import { zoneLabel } from "@/lib/delivery";
import {
    SALES_PAGE_SIZE, SALES_WHEN, SALE_STATUSES, canCancel, paidByLabel, saleStatusLabel, salesHref, type SalesQuery, type SalesWhen, type SaleStatus,
} from "@/lib/admin/v2/till";
import type { SaleRow, SalesData, TodayKpis } from "@/lib/admin/v2/tillLoad";
import { useReceipt } from "./useReceipt";
import "../orders/orders.css";
import "./till.css";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" });
const payUrl = (id: string) => `${SITE || (typeof window !== "undefined" ? window.location.origin : "")}/pay/${id}`;

function minutesLeft(iso: string | null, now: number): number | null {
    if (!iso) return null;
    return Math.max(0, Math.round((Date.parse(iso) - now) / 60_000));
}

export function TodaySales({ role, query, kpis, data }: { role: string; query: SalesQuery; kpis: TodayKpis | null; data: SalesData | null }) {
    const router = useRouter();
    const own = role === "sales_staff";
    const [search, setSearch] = useState(query.q);
    const [open, setOpen] = useState<SaleRow | null>(null);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
    useEffect(() => { setSearch(query.q); }, [query.q]);
    useEffect(() => {
        if (search === query.q) return;
        const t = setTimeout(() => router.replace(salesHref(query, { q: search }), { scroll: false }), 350);
        return () => clearTimeout(t);
    }, [search, query, router]);
    const go = (patch: Partial<SalesQuery>) => router.replace(salesHref(query, patch), { scroll: false });

    const filtered = query.status !== "all" || query.when !== "today" || !!query.staff || !!query.q;
    const pages = data ? Math.max(1, Math.ceil(data.total / SALES_PAGE_SIZE)) : 1;
    const nextIn = kpis?.nextExpiry ? minutesLeft(kpis.nextExpiry, now) : null;

    return (
        <div className="stack">
            {kpis ? (
                <div className="grid-3">
                    <Kpi label="Cash to count at close" value={ghs0(kpis.cash)}
                        ctx={kpis.cashSales ? `from ${plural(kpis.cashSales, "cash sale")} today${own ? " that you took" : ""}` : "No cash sales yet today"} />
                    <Kpi label="Till sales today" value={ghs0(kpis.tillSales)}
                        ctx={`${plural(kpis.tillCount, "sale")} paid${kpis.waiting ? `, ${kpis.waiting} still waiting` : ""}`} />
                    <Kpi label="Pay links waiting" value={String(kpis.waiting)}
                        ctx={kpis.waiting ? `the next hold ends in ${plural(nextIn ?? 0, "minute")}` : "Nothing waiting for payment"} />
                </div>
            ) : (
                <Card><ErrorState what="today's figures" onRetry={() => router.refresh()} /></Card>
            )}

            <Card>
                <div className="card-body stack" style={{ paddingBottom: "var(--s3)" }}>
                    {own && <p className="help">You&apos;re seeing your own sales. Owners and admins see everyone&apos;s.</p>}
                    <div className="hrow wrap till-tools">
                        <Search value={search} onChange={setSearch} placeholder="Search by sale ref, name, email or phone" />
                        <Select label="When" value={query.when} onChange={v => go({ when: v as SalesWhen })} options={SALES_WHEN.map(w => ({ v: w.v, l: w.l }))} />
                        {!own && data && (
                            <Select label="Sold by" value={query.staff || "all"} onChange={v => go({ staff: v === "all" ? "" : v })}
                                options={[{ v: "all", l: "Everyone" }, ...data.staff.map(s => ({ v: s.id, l: s.name }))]} />
                        )}
                    </div>
                    {query.when === "dates" && (
                        <div className="hrow wrap till-tools">
                            <label className="ord-date">From <input type="date" className="input" value={query.from} max={query.to || undefined} onChange={e => go({ from: e.target.value })} /></label>
                            <label className="ord-date">To <input type="date" className="input" value={query.to} min={query.from || undefined} onChange={e => go({ to: e.target.value })} /></label>
                        </div>
                    )}
                    <div className="chips" role="group" aria-label="Sale status">
                        {SALE_STATUSES.map(s => <Chip key={s.v} pressed={query.status === s.v} onClick={() => go({ status: s.v as SaleStatus })}>{s.l}</Chip>)}
                    </div>
                </div>
                {!data ? (
                    <ErrorState what="the sales" onRetry={() => router.refresh()} />
                ) : data.rows.length === 0 ? (
                    <Empty icon="till" title={filtered ? "No sales match" : "No till sales yet today"}
                        body={filtered ? "Try another date or status, or clear the filters." : "Each sale from New sale shows here as it's made: paid, waiting for payment, expired or cancelled."}
                        action={filtered ? <BtnLink href="/till/today">Clear filters</BtnLink> : <BtnLink kind="primary" href="/till">New sale</BtnLink>} />
                ) : (
                    <>
                        <div className="tbl-wrap">
                            <table className="tbl till-tbl">
                                <thead><tr>
                                    <th>Time</th><th className="hide-sm">Ref</th>{!own && <th className="hide-sm">Sold by</th>}<th>Customer</th>
                                    <th className="hide-sm">Items</th><th>Paid by</th><th>Status</th><th className="r">Total</th>
                                </tr></thead>
                                <tbody>
                                    {data.rows.map(r => {
                                        const st = saleStatusLabel(r, now);
                                        const units = r.items.reduce((s, i) => s + i.quantity, 0);
                                        return (
                                            <tr key={r.id} className="click" tabIndex={0} onClick={() => setOpen(r)}
                                                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(r); } }}>
                                                <td>{query.when === "today" ? time(r.created_at) : when(r.created_at)}</td>
                                                <td className="hide-sm">{r.ref}</td>
                                                {!own && <td className="hide-sm">{r.staff_name ?? "—"}</td>}
                                                <td className="till-cust"><div className="strong">{r.customer_name || "—"}</div><div className="help">{r.customer_phone ?? r.customer_email ?? ""}</div></td>
                                                <td className="hide-sm">{plural(units, "item")}</td>
                                                <td>{paidByLabel(r, r.order_payment_method)}</td>
                                                <td><Badge tone={st.tone}>{st.label}</Badge></td>
                                                <td className="r strong">{ghs(r.total_amount)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pager left={`Page ${query.page} of ${pages} · ${plural(data.total, "sale")}`}
                            prevHref={query.page > 1 ? salesHref(query, { page: query.page - 1 }) : null}
                            nextHref={query.page < pages ? salesHref(query, { page: query.page + 1 }) : null} />
                    </>
                )}
            </Card>

            {open && <SalePanel row={open} own={own} now={now} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); router.refresh(); }} />}
        </div>
    );
}

function SalePanel({ row, own, now, onClose, onChanged }: { row: SaleRow; own: boolean; now: number; onClose: () => void; onChanged: () => void }) {
    const [busy, setBusy] = useState(false);
    const receipt = useReceipt();
    const st = saleStatusLabel(row, now);
    const goods = row.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const left = row.status === "pending_payment" ? minutesLeft(row.expires_at, now) : null;
    // send-link records goods − code + delivery + the processing fee; what's left over is the fee.
    const fee = row.status === "draft" ? 0 : Math.round((row.total_amount - (goods - row.discount_amount + row.delivery_fee)) * 100) / 100;

    const cancel = async () => {
        setBusy(true);
        try {
            const res = await fetch("/api/pos/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: row.id }) });
            const { data } = await readJson<{ ok?: boolean; error?: string }>(res);
            if (!res.ok || !data?.ok) { toast.fromResponse(data, { audience: "staff", fallback: "POS-03" }); return; }
            toast.success(`Sale ${row.ref} cancelled. The items are back on sale.`);
            onChanged();
        } catch {
            toast.error("The till couldn't reach the server. Please try again.");
        } finally {
            setBusy(false);
        }
    };
    const copy = async () => {
        try { await navigator.clipboard.writeText(payUrl(row.id)); toast.success("Pay link copied"); }
        catch { toast.error("Couldn't copy here. Select the link and copy it."); }
    };

    return (
        <Panel open onClose={onClose} title={`Sale ${row.ref}`} label={`Sale ${row.ref}`}
            head={<div className="hrow-sm wrap" style={{ marginBottom: 6 }}><Badge tone={st.tone}>{st.label}</Badge>{paidByLabel(row, row.order_payment_method) !== "—" && <Badge>{paidByLabel(row, row.order_payment_method)}</Badge>}</div>}
            sub={`${row.customer_name || "—"} · ${when(row.created_at)}${!own && row.staff_name ? ` · sold by ${row.staff_name}` : ""}`}
            footerLeft={canCancel(row.status) ? (
                <span className="till-assist" data-assist="poshistory.cancel">
                    <TwoTap label={busy ? "Cancelling…" : "Cancel sale"} armed="Tap again to cancel the sale" onConfirm={() => void cancel()} disabled={busy} />
                </span>
            ) : undefined}
            footer={<>
                {row.status === "pending_payment" && <Btn icon="copy" onClick={() => void copy()}>Copy pay link</Btn>}
                {row.order_id && <Btn icon="print" onClick={() => void receipt.print(row.order_id)} disabled={receipt.busy}>{receipt.busy ? "Getting the receipt…" : "Print receipt"}</Btn>}
                {row.order_id && <BtnLink href={`/orders/${row.order_id}`}>Open order</BtnLink>}
                <Btn kind="ghost" onClick={onClose}>Close</Btn>
            </>}>
            <div className="stack">
                {row.status === "pending_payment" && (left && left > 0
                    ? <Banner tone="info" title="Waiting for payment">The items are held for {plural(left, "more minute")} (until {time(row.expires_at!)}). Cancel the sale to put them back on sale now.</Banner>
                    : <Banner tone="neutral" title="The hold has ended">The link has expired and the items are no longer held for it. Cancel it to close it now.</Banner>)}
                {row.status === "draft" && <Banner tone="neutral" title="Not sent">This sale was started but no link went out and no cash was taken. Nothing is held. Cancel it to tidy the list.</Banner>}
                {canCancel(row.status) && <p className="help">A paid sale can&apos;t be cancelled here: cancel or refund its order instead.</p>}
                <Card inset>
                    <div className="rows">
                        {row.items.map((i, k) => {
                            const v = [i.size, i.color, i.brand].filter(Boolean).join(" / ");
                            return (
                                <div className="row" key={k}>
                                    <div className="row-main"><div className="row-title">{i.name}</div><div className="row-sub">{v ? `${v} · ` : ""}{i.quantity} × {ghs(i.price)}</div></div>
                                    <div className="strong">{ghs(i.price * i.quantity)}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="card-body" style={{ borderTop: "1px solid var(--line)" }}>
                        <dl className="dl">
                            <dt>Items</dt><dd>{ghs(goods)}</dd>
                            {row.discount_code && <><dt>Code · {row.discount_code}</dt><dd>{row.discount_amount > 0 ? `−${ghs(row.discount_amount)}` : "—"}</dd></>}
                            {row.delivery_fee > 0 && <><dt>Delivery · {zoneLabel(row.delivery_zone)}</dt><dd>{ghs(row.delivery_fee)}</dd></>}
                            {fee > 0.004 && <><dt>Processing fee</dt><dd>{ghs(fee)}</dd></>}
                            <dt className="strong" style={{ color: "var(--ink)" }}>Total</dt><dd className="strong">{ghs(row.total_amount)}</dd>
                        </dl>
                        {row.status === "draft" && <p className="help" style={{ marginTop: 8 }}>Prices are confirmed when a link is sent or cash is taken.</p>}
                    </div>
                </Card>
                <Field label="Customer">
                    <div className="ord-contact">
                        <span className="strong">{row.customer_name || "—"}</span>
                        <span>{row.customer_email ?? "No email on file"}</span>
                        {row.customer_phone && <span>{row.customer_phone}</span>}
                    </div>
                </Field>
                <Field label="How they get it">
                    <div className="ord-contact">
                        {row.delivery_method === "delivery"
                            ? <><span>Delivery{row.delivery_zone ? ` · ${zoneLabel(row.delivery_zone)}` : ""}</span>{row.customer_address && <span>{row.customer_address}</span>}{(row.customer_region || row.customer_country) && <span>{[row.customer_region, row.customer_country].filter(Boolean).join(", ")}</span>}</>
                            : <span>Taking it now (pickup)</span>}
                    </div>
                </Field>
                {row.notes && <Field label="Staff notes"><p>{row.notes}</p></Field>}
                {row.status === "paid" && row.paid_at && <p className="help">Paid {when(row.paid_at)}.</p>}
            </div>
            {receipt.node}
        </Panel>
    );
}
