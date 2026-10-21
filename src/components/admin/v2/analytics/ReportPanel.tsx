"use client";

// One report in a wide panel, with its table and Export CSV. Payments and
// Riders can also show all time (their old pages did); a rider or a discount
// opens a second panel with the orders behind it.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
    Banner, Btn, Empty, ErrorState, Kpi, Panel, Seg, SkeletonRows, Thumb,
    ghs, ghs0, initials, plural, toast,
} from "@/components/admin/ui";
import {
    REPORTS, allTimeRange, analyticsRange, cashTable, channelTable, csvName, customerFigures, datesText, dayTable,
    discountOrderLines, discountOrdersTable, discountTable, hourTable, paymentListTable, paymentMethodTable, productTable,
    querySearch, regionTable, reportSlug, riderOrdersTable, riderTable, sectionsCsv, tableCsv, topCustomerTable, variantTable,
    weekdayTable, writeoffTable, ALL_TIME_REPORTS, WEEKDAYS,
    type AnalyticsQuery, type ReportKey, type Scope, type Table,
} from "@/lib/admin/v2/analytics";
import { customerHref } from "@/lib/admin/v2/customers";
import { Bars, PageButtons, ReportTable, dateCell, downloadCsv, getJson } from "./parts";

type Data = Record<string, unknown>;
type Load = { state: "loading" } | { state: "error" } | { state: "ok"; data: Data };
type Rec = Record<string, unknown>;
const rows = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const s = (v: unknown) => (typeof v === "string" ? v : "");
const pageOf = (v: unknown) => (v && typeof v === "object" ? (v as { rows: Rec[]; total: number; page: number; size: number }) : null);

function reportUrl(q: AnalyticsQuery, extra: Record<string, string | number> = {}): string {
    const base = querySearch(q).slice(1);
    const more = Object.entries(extra).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
    return `/api/admin/v2/analytics?part=report${base ? "&" + base : ""}${more ? "&" + more : ""}`;
}

function useReport(url: string) {
    const [load, setLoad] = useState<Load>({ state: "loading" });
    const cur = useRef(url);
    const run = useCallback(async () => {
        cur.current = url;
        setLoad({ state: "loading" });
        try {
            const data = await getJson<Data>(url);
            if (cur.current === url) setLoad({ state: "ok", data });
        } catch {
            if (cur.current === url) setLoad({ state: "error" });
        }
    }, [url]);
    useEffect(() => { void run(); }, [run]);
    return { load, retry: run };
}

export function ReportPanel({ q, onClose, update }: { q: AnalyticsQuery; onClose: () => void; update: (p: Partial<AnalyticsQuery>, push?: boolean) => void }) {
    const key = q.report as ReportKey;
    const def = REPORTS.find(r => r.k === key)!;
    const [page, setPage] = useState(1);
    const [busy, setBusy] = useState(false);
    useEffect(() => { setPage(1); }, [key, q.scope, q.range, q.from, q.to]);
    const { load, retry } = useReport(reportUrl({ ...q, rider: null }, key === "payments" ? { page } : {}));
    const [discount, setDiscount] = useState<{ key: string; label: string } | null>(null);

    const now = new Date();
    const r = q.scope === "all" ? allTimeRange(now) : analyticsRange(q, now);
    const when = q.scope === "all" ? "All time" : datesText(r.from, r.to);
    const fileName = q.scope === "all" ? `${reportSlug(key)}_all-time.csv` : csvName(reportSlug(key), r.from, r.to);

    const exportCsv = async () => {
        if (load.state !== "ok") return;
        setBusy(true);
        try {
            const csv = await buildCsv(key, q, load.data);
            if (csv == null) { toast.info("Nothing to export for these dates"); return; }
            downloadCsv(csv, fileName);
            toast.success(`${def.t} downloaded as CSV`);
        } catch {
            toast.code("GEN-00", { audience: "staff" });
        } finally {
            setBusy(false);
        }
    };

    const scopeSeg = ALL_TIME_REPORTS.includes(key) ? (
        <Seg<Scope> label="Which dates" value={q.scope} onChange={v => update({ scope: v, rider: null })}
            options={[{ v: "range", l: "These dates" }, { v: "all", l: "All time" }]} />
    ) : null;

    return (
        <>
            <Panel open wide onClose={onClose} title={def.t} sub={`${when} · ${def.d}`}
                footer={<><Btn kind="ghost" onClick={onClose}>Close</Btn><Btn kind="primary" icon="download" onClick={exportCsv} disabled={load.state !== "ok" || busy}>{busy ? "Preparing…" : "Export CSV"}</Btn></>}>
                <div className="stack">
                    {scopeSeg}
                    {load.state === "loading" && <SkeletonRows n={6} cols={4} />}
                    {load.state === "error" && <ErrorState what="this report" onRetry={() => void retry()} />}
                    {load.state === "ok" && (
                        <Body k={key} data={load.data} q={q} page={page} setPage={setPage}
                            openRider={id => update({ rider: id }, true)}
                            openDiscount={(k, label) => setDiscount({ key: k, label })} />
                    )}
                </div>
            </Panel>
            {key === "riders" && q.rider && load.state === "ok" && (
                <RiderPanel q={q} rider={rows(load.data.rows).find(x => x.id === q.rider) ?? null} when={when} onClose={() => update({ rider: null })} />
            )}
            {key === "discounts" && discount && (
                <DiscountPanel q={q} d={discount} when={when} onClose={() => setDiscount(null)} />
            )}
        </>
    );
}

/** The CSV for a report: what the panel shows, or every row where the panel pages. */
async function buildCsv(key: ReportKey, q: AnalyticsQuery, d: Data): Promise<string | null> {
    const t = (tb: Table) => (tb.rows.length ? tableCsv(tb) : null);
    switch (key) {
        case "product": return t(productTable(d.rows));
        case "variant": return t(variantTable(d.rows));
        case "channel": return t(channelTable(d.rows));
        case "cash": return t(cashTable(d.rows));
        case "writeoffs": return t(writeoffTable(d.rows));
        case "regions": return t(regionTable((d as Rec).rows));
        case "riders": return t(riderTable(d.rows));
        case "discounts": {
            const all = await getJson<Data>(reportUrl(q, { all: 1 }));
            return t(discountOrdersTable(discountOrderLines(all.orders)));
        }
        case "payments": {
            const all = await getJson<Data>(reportUrl(q, { all: 1 }));
            const list = pageOf(all.list);
            if (!list?.rows.length) return null;
            return sectionsCsv([
                { title: "By method", table: paymentMethodTable(all.rows) },
                { title: "Every payment", table: paymentListTable(list.rows) },
            ]);
        }
        case "customers": {
            const top = topCustomerTable(d.top);
            if (!top.rows.length && !rows(d.new_by_day).length) return null;
            const f = customerFigures(d);
            return sectionsCsv([
                { title: "Summary", table: { cols: [{ h: "Figure", kind: "text" }, { h: "Value", kind: "text" }], rows: [
                    ["Unique customers", String(f.unique)], ["Repeat buyers", String(f.repeat)],
                    ["Repeat rate (%)", f.repeatRate == null ? null : String(f.repeatRate)],
                    ["Average spend per customer (GH₵)", f.avgPerCustomer == null ? null : f.avgPerCustomer.toFixed(2)],
                    ["New customers", String(n(d.new_total))], ["Newsletter sign-ups", String(n(d.newsletter))],
                    ["Bespoke inquiries", String(n(d.inquiries))], ["Paid orders with no email", String(n(d.no_email_orders))],
                ] } },
                { title: "Top customers", table: top },
                { title: "New customers by day", table: { cols: [{ h: "Day", kind: "date" }, { h: "New customers", kind: "int" }], rows: rows(d.new_by_day).map(x => [s(x.d), n(x.n)]) } },
            ]);
        }
        case "timing": {
            const days = dayTable(d.days);
            if (!days.rows.length) return null;
            return sectionsCsv([
                { title: "By day", table: days },
                { title: "By hour (shop time)", table: hourTable(d.hours) },
                { title: "By day of the week", table: weekdayTable(d.weekdays) },
            ]);
        }
    }
}

function Body({ k, data, q, page, setPage, openRider, openDiscount }: {
    k: ReportKey; data: Data; q: AnalyticsQuery; page: number; setPage: (p: number) => void;
    openRider: (id: string) => void; openDiscount: (key: string, label: string) => void;
}) {
    const empty = (title: string, body: string, icon: Parameters<typeof Empty>[0]["icon"] = "analytics") => <div className="card inset"><Empty icon={icon} title={title} body={body} /></div>;
    const noSales = () => empty("No paid orders in these dates", "Pick a longer range, or check back once orders are paid.");

    switch (k) {
        case "product": {
            const t = productTable(data.rows);
            return t.rows.length ? <ReportTable t={t} label="Sales by product" /> : noSales();
        }
        case "variant": {
            const t = variantTable(data.rows);
            return t.rows.length ? <>
                <p className="help">Size and colour as they were on the order. Sales share out each order&apos;s total, after discounts and with delivery, across its items by price.</p>
                <ReportTable t={t} label="Sales by size and colour" />
            </> : noSales();
        }
        case "channel": {
            const t = channelTable(data.rows);
            return t.rows.length ? <>
                <p className="help">Pay links are payment links sent from the till. &quot;Orders placed, any status&quot; counts every checkout started in these dates, paid or not, as the old report did.</p>
                <ReportTable t={t} label="Sales by channel" />
            </> : noSales();
        }
        case "discounts": {
            const t = discountTable(data.rows);
            const src = rows(data.rows);
            return t.rows.length ? <>
                <p className="help">Tap a discount to see its orders. An order with a code and an automatic discount is counted under each.</p>
                <ReportTable t={t} label="Discounts" onRow={i => openDiscount(s(src[i].key), s(src[i].label))}
                    rowLabel={i => `Orders with ${s(src[i].label)}`} />
            </> : empty("No discounts used in these dates", "Codes and automatic discounts appear here once a paid order uses one.", "discounts");
        }
        case "payments": return <Payments data={data} page={page} setPage={setPage} scope={q.scope} />;
        case "riders": return <Riders data={data} openRider={openRider} />;
        case "cash": {
            const t = cashTable(data.rows);
            return t.rows.length ? <>
                <p className="help">Cash is every paid order taken in cash: what should be in the drawer at close. Till sales counts every paid sale made at the till, however it was paid.</p>
                <ReportTable t={t} label="Cash taken at the till" />
            </> : empty("No till sales in these dates", "Each day the till takes a sale shows here, with the cash to count at close.", "cash");
        }
        case "writeoffs": {
            const t = writeoffTable(data.rows);
            const hasWriteOff = rows(data.rows).some(x => x.reason === "write_off");
            return <>
                {!hasWriteOff && (
                    <Banner tone="info" title="Stock changes don't record a reason yet">
                        This lists every time stock was taken off by hand, which can be damage, loss or a count that was corrected. Once adjusting stock asks for a reason, items written off as damaged or lost show here on their own line.
                    </Banner>
                )}
                {t.rows.length ? <ReportTable t={t} label="Stock written off" /> : empty("No stock taken off in these dates", "Items appear here when someone lowers stock by hand or writes items off.", "box")}
            </>;
        }
        case "customers": return <Customers data={data} />;
        case "timing": return <Timing data={data} />;
        case "regions": {
            const t = regionTable(data.rows);
            const unknown = n(data.unknown);
            return <>
                {unknown > 0 && <p className="help">{plural(unknown, "paid order")} had no region or city (most till sales), so {unknown === 1 ? "it isn't" : "they aren't"} counted here.</p>}
                {t.rows.length ? <>
                    <Bars label="Paid orders per region" items={t.rows.slice(0, 8).map(r => ({ key: String(r[0]), label: String(r[0]), value: n(r[1]), right: <><span className="strong num">{plural(n(r[1]), "order")}</span> <span className="muted">· {ghs0(n(r[2]))}</span></> }))} />
                    <ReportTable t={t} label="Where orders go" />
                </> : empty("No delivery regions in these dates", "Regions come from the delivery address at checkout.", "truck")}
            </>;
        }
    }
}

function Payments({ data, page, setPage, scope }: { data: Data; page: number; setPage: (p: number) => void; scope: Scope }) {
    const methods = paymentMethodTable(data.rows);
    const list = pageOf(data.list);
    const month = (data.month ?? null) as { sales?: number; orders?: number } | null;
    const received = n(methods.foot?.[2]);
    const count = n(methods.foot?.[1]);
    const giftUsed = n(data.gift_used), giftOrders = n(data.gift_orders);
    const t = paymentListTable(list?.rows ?? []);
    const src = list?.rows ?? [];
    return <>
        <div className="grid-3 an-kpis">
            <Kpi label="Received" value={ghs0(received)} ctx={scope === "all" ? "all time, paid orders" : "in these dates"} />
            <Kpi label="Payments" value={count.toLocaleString("en-GB")} ctx="confirmed paid orders" />
            <Kpi label="This month" value={ghs0(month?.sales ?? 0)} ctx={`${plural(n(month?.orders), "payment")} so far this month`} />
        </div>
        <Banner tone="neutral" title="Card and Mobile money are counted together">
            Paystack doesn&apos;t tell the shop which one a customer used, so both are under Paystack.{giftOrders > 0 ? ` Gift cards also paid ${ghs(giftUsed)} on ${plural(giftOrders, "order")}; that isn't added again above.` : ""}
        </Banner>
        {methods.rows.length ? <ReportTable t={methods} label="Payments by method" /> : null}
        <h3 className="section-t">Every payment</h3>
        {src.length ? <>
            <ReportTable t={t} label="Every payment" cell={(i, j) => {
                const x = src[i];
                if (j === 0) return <Link href={`/orders/${s(x.id)}`} className="an-link">#{String(t.rows[i][0])}</Link>;
                if (j === 3 && s(x.customer_email)) return <a href={`mailto:${s(x.customer_email)}`} className="an-link">{s(x.customer_email)}</a>;
                return undefined;
            }} />
            <PageButtons page={page} size={list!.size} total={list!.total} onPage={setPage} noun={["payment", "payments"]} />
        </> : <div className="card inset"><Empty icon="cash" title="No payments in these dates" body="Each paid order shows here with its Paystack reference." /></div>}
    </>;
}

function Riders({ data, openRider }: { data: Data; openRider: (id: string) => void }) {
    const src = rows(data.rows);
    if (!src.length) {
        return <div className="card inset"><Empty icon="truck" title="No riders yet" body="Add riders in Settings › Shipping and delivery › Manage riders. Their deliveries show here once orders are sent out with them." /></div>;
    }
    const t = riderTable(src);
    return <>
        <div className="grid-4 an-kpis">
            <Kpi label="Active riders" value={src.filter(x => x.active === true).length} ctx={`of ${plural(src.length, "rider")}`} />
            <Kpi label="Sent out" value={n(t.foot?.[3]).toLocaleString("en-GB")} ctx="orders given to a rider" />
            <Kpi label="Delivered" value={n(t.foot?.[5]).toLocaleString("en-GB")} ctx={`${n(t.foot?.[4])} still on the way`} />
            <Kpi label="Order value" value={ghs0(n(t.foot?.[7]))} ctx="every order given to a rider" />
        </div>
        <p className="help">Tap a rider to see their orders. Orders are counted by the date they were placed. How long each delivery took isn&apos;t recorded, so it isn&apos;t shown.</p>
        <ReportTable t={t} label="Riders" onRow={i => openRider(s(src[i].id))} rowLabel={i => `Orders for ${s(src[i].name)}`}
            cell={(i, j) => j === 0 ? <span className="hrow-sm"><Thumb src={s(src[i].image_url) || null} label={initials(s(src[i].name))} />{s(src[i].name)}</span> : undefined} />
    </>;
}

function Customers({ data }: { data: Data }) {
    const f = customerFigures(data);
    const top = topCustomerTable(data.top);
    const src = rows(data.top);
    const noEmail = n(data.no_email_orders);
    const newDays = rows(data.new_by_day);
    return <>
        <div className="grid-4 an-kpis">
            <Kpi label="Unique customers" value={f.unique.toLocaleString("en-GB")} ctx="with a paid order in these dates" />
            <Kpi label="Repeat buyers" value={f.repeat.toLocaleString("en-GB")} ctx="more than one paid order here" />
            <Kpi label="Repeat rate" value={f.repeatRate == null ? "—" : `${f.repeatRate}%`} ctx="of unique customers" />
            <Kpi label="Average spend" value={f.avgPerCustomer == null ? "—" : ghs0(f.avgPerCustomer)} ctx="per customer" />
        </div>
        <div className="grid-3 an-kpis">
            <Kpi label="New customers" value={n(data.new_total).toLocaleString("en-GB")} ctx="first paid order ever" />
            <Kpi label="Newsletter sign-ups" value={n(data.newsletter).toLocaleString("en-GB")} ctx="in these dates" />
            <Kpi label="Bespoke inquiries" value={n(data.inquiries).toLocaleString("en-GB")} ctx="custom requests sent" />
        </div>
        {noEmail > 0 && <p className="help">{plural(noEmail, "paid order")} had no email (till walk-ins), so {noEmail === 1 ? "it isn't" : "they aren't"} counted as customers.</p>}
        <h3 className="section-t">New customers by day</h3>
        {newDays.length
            ? <Bars label="New customers by day" items={newDays.map(x => ({ key: s(x.d), label: dateCell(s(x.d)), value: n(x.n), right: <span className="strong num">{n(x.n)}</span> }))} />
            : <p className="help">No one placed their first paid order in these dates.</p>}
        <h3 className="section-t">Top customers by spend</h3>
        {top.rows.length
            ? <ReportTable t={top} label="Top customers" cell={(i, j) => j === 1
                ? <Link className="an-link" href={customerHref(s(src[i].email))}>{s(src[i].email)}</Link> : undefined} />
            : <div className="card inset"><Empty icon="customers" title="No customers with an email in these dates" body="Customers appear here once they pay for an order with their email." /></div>}
    </>;
}

function Timing({ data }: { data: Data }) {
    const days = dayTable(data.days);
    const hours = hourTable(data.hours);
    const wds = weekdayTable(data.weekdays);
    if (!days.rows.length) return <div className="card inset"><Empty icon="clock" title="No orders in these dates" body="Pick a longer range to see when people buy." /></div>;
    return <>
        <p className="help">Paid orders, in shop time. &quot;Orders placed&quot; on each day also counts checkouts that weren&apos;t paid, as the old orders chart did.</p>
        <h3 className="section-t">Orders by day</h3>
        <ReportTable t={days} label="Orders by day" />
        <div className="grid-2">
            <div className="stack-sm">
                <h3 className="section-t">By hour</h3>
                <Bars label="Paid orders by hour" items={hours.rows.filter(r => n(r[1]) > 0).map(r => ({ key: String(r[0]), label: String(r[0]), value: n(r[1]), right: <span className="strong num">{plural(n(r[1]), "order")}</span> }))} />
            </div>
            <div className="stack-sm">
                <h3 className="section-t">By day of the week</h3>
                <Bars label="Paid orders by day of the week" items={wds.rows.map((r, i) => ({ key: WEEKDAYS[i], label: String(r[0]), value: n(r[1]), right: <span className="strong num">{plural(n(r[1]), "order")}</span> }))} />
            </div>
        </div>
    </>;
}

function RiderPanel({ q, rider, when, onClose }: { q: AnalyticsQuery; rider: Rec | null; when: string; onClose: () => void }) {
    const [page, setPage] = useState(1);
    const { load, retry } = useReport(reportUrl(q, { page }));
    const [busy, setBusy] = useState(false);
    const name = rider ? s(rider.name) : "Rider";
    const list = load.state === "ok" ? pageOf(load.data.orders) : null;
    const total = n(rider?.total), delivered = n(rider?.delivered);
    const exportCsv = async () => {
        setBusy(true);
        try {
            const all = await getJson<Data>(reportUrl(q, { all: 1 }));
            const t = riderOrdersTable(pageOf(all.orders)?.rows ?? []);
            if (!t.rows.length) { toast.info("Nothing to export for these dates"); return; }
            downloadCsv(tableCsv(t), `rider-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}_${q.scope === "all" ? "all-time" : "orders"}.csv`);
            toast.success(`${name}'s orders downloaded as CSV`);
        } catch {
            toast.code("GEN-00", { audience: "staff" });
        } finally { setBusy(false); }
    };
    const head: ReactNode = rider ? <div className="hrow-sm an-rider-head"><Thumb src={s(rider.image_url) || null} label={initials(name)} lg /><span className={`badge ${rider.active ? "b-ok" : "b-neutral"}`}>{rider.active ? "Active" : "Inactive"}</span></div> : null;
    return (
        <Panel open wide level={2} onClose={onClose} title={name} head={head}
            sub={rider ? [s(rider.phone), s(rider.bike_reg), when].filter(Boolean).join(" · ") : when}
            footer={<><Btn kind="ghost" onClick={onClose}>Back to riders</Btn><Btn kind="primary" icon="download" onClick={exportCsv} disabled={busy || !list?.total}>{busy ? "Preparing…" : "Export CSV"}</Btn></>}>
            <div className="stack">
                {!rider ? (
                    <div className="card inset"><Empty icon="truck" title="This rider isn't on the list" body="They may have been removed in Settings. Their past orders still show on each order." /></div>
                ) : <>
                    <div className="grid-3 an-kpis">
                        <Kpi label="Orders" value={total} ctx={`${n(rider.in_transit)} on the way`} />
                        <Kpi label="Delivered" value={delivered} ctx={`${n(rider.cancelled)} cancelled`} />
                        <Kpi label="Delivery rate" value={total > 0 ? `${Math.round((delivered / total) * 100)}%` : "—"} ctx={`order value ${ghs0(n(rider.value))}`} />
                    </div>
                    <h3 className="section-t">Orders</h3>
                    {load.state === "loading" && <SkeletonRows n={5} cols={4} />}
                    {load.state === "error" && <ErrorState what="this rider's orders" onRetry={() => void retry()} />}
                    {load.state === "ok" && list && (list.rows.length ? <>
                        <ReportTable t={riderOrdersTable(list.rows)} label={`${name}'s orders`} cell={(i, j) => j === 0
                            ? <Link className="an-link" href={`/orders/${s(list.rows[i].id)}`}>#{riderOrdersTable([list.rows[i]]).rows[0][0]}</Link> : undefined} />
                        <PageButtons page={page} size={list.size} total={list.total} onPage={setPage} noun={["order", "orders"]} />
                    </> : <div className="card inset"><Empty icon="truck" title="No orders for this rider in these dates" body="Pick All time to see every order they took." /></div>)}
                </>}
            </div>
        </Panel>
    );
}

function DiscountPanel({ q, d, when, onClose }: { q: AnalyticsQuery; d: { key: string; label: string }; when: string; onClose: () => void }) {
    const { load, retry } = useReport(reportUrl(q, { discount: d.key }));
    const type = d.key.startsWith("auto:") ? "auto" : "code";
    const lines = load.state === "ok" ? rows(load.data.rows).map((x): Rec => ({ ...x, label: d.label, type })) : [];
    const t = discountOrdersTable(lines);
    const exportCsv = () => {
        if (!t.rows.length) return;
        downloadCsv(tableCsv(t), `discount-${d.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`);
        toast.success(`${d.label} orders downloaded as CSV`);
    };
    return (
        <Panel open wide level={2} onClose={onClose} title={d.label} sub={`${when} · ${type === "auto" ? "Automatic discount" : "Discount code"}`}
            footer={<><Btn kind="ghost" onClick={onClose}>Back to discounts</Btn><Btn kind="primary" icon="download" onClick={exportCsv} disabled={!t.rows.length}>Export CSV</Btn></>}>
            {load.state === "loading" && <SkeletonRows n={5} cols={4} />}
            {load.state === "error" && <ErrorState what="these orders" onRetry={() => void retry()} />}
            {load.state === "ok" && (t.rows.length
                ? <ReportTable t={t} label={`Orders with ${d.label}`} cell={(i, j) => j === 2
                    ? <Link className="an-link" href={`/orders/${s(lines[i].id)}`}>#{String(t.rows[i][2])}</Link> : undefined} />
                : <div className="card inset"><Empty icon="discounts" title="No paid orders used this" body="Orders appear here once a paid order uses this discount in these dates." /></div>)}
        </Panel>
    );
}
