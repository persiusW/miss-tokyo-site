"use client";

// Admin v2 Analytics: how sales are going against the period before. Range,
// comparison and the open report live in the URL (window.history, so the page
// doesn't reload); figures load from /api/admin/v2/analytics.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    Btn, Card, Empty, ErrorState, Field, Icon, Kpi, LineChart, PageHeader, Seg, Select, SkeletonRows,
    ghs0, plural, toast,
} from "@/components/admin/ui";
import {
    CMPS, PAID_ONLY, RANGES, REPORTS, analyticsRange, bucketLabel, channelName, cmpText, datesText, deltas, fillSeries,
    kpiCtx, overviewCsv, parseQuery, querySearch, returningCtx, returningRate, shopYmd, csvName,
    type AnalyticsQuery, type CmpKey, type RangeKey, type ReportKey,
} from "@/lib/admin/v2/analytics";
import type { Overview } from "@/lib/admin/v2/analyticsLoad";
import { Bars, downloadCsv, getJson } from "./parts";
import { ReportPanel } from "./ReportPanel";
import "./analytics.css";

type Load<T> = { state: "loading" } | { state: "error" } | { state: "ok"; data: T };

function overviewUrl(q: AnalyticsQuery): string {
    const s = querySearch({ ...q, report: null, rider: null, scope: "range" });
    return `/api/admin/v2/analytics?part=overview${s ? "&" + s.slice(1) : ""}`;
}

export function AnalyticsPage() {
    const sp = useSearchParams();
    const q = useMemo(() => parseQuery(new URLSearchParams(sp.toString())), [sp]);
    const [ov, setOv] = useState<Load<Overview>>({ state: "loading" });
    const key = overviewUrl(q);
    const keyRef = useRef(key);
    useEffect(() => { keyRef.current = key; }, [key]);

    /** Changes the URL without a reload; `push` adds a history step (opening a report). */
    const update = useCallback((patch: Partial<AnalyticsQuery>, push = false) => {
        const url = `/analytics${querySearch(q, patch)}`;
        if (push) window.history.pushState(null, "", url);
        else window.history.replaceState(null, "", url);
    }, [q]);

    const load = useCallback(async (url: string) => {
        setOv({ state: "loading" });
        try {
            const data = await getJson<Overview>(url);
            if (keyRef.current === url) setOv({ state: "ok", data });
        } catch {
            if (keyRef.current === url) setOv({ state: "error" });
        }
    }, []);
    useEffect(() => { void load(key); }, [key, load]);

    // The dates as the page shows them, worked out here too so the line under
    // the controls doesn't wait for the figures.
    const range = useMemo(() => analyticsRange(q, new Date()), [q]);
    const dates = datesText(range.from, range.to);

    const setRange = (v: RangeKey) => {
        if (v === "custom") {
            // Start the custom dates from what's on screen now.
            update({ range: v, from: q.from ?? shopYmd(range.from), to: q.to ?? shopYmd(new Date(range.to.getTime() - 1)) });
        } else update({ range: v, from: null, to: null });
    };
    const setDate = (k: "from" | "to", v: string) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
        update({ range: "custom", from: k === "from" ? v : q.from, to: k === "to" ? v : q.to });
    };
    const openReport = (k: ReportKey) => update({ report: k, rider: null, scope: "range" }, true);
    const closeReport = () => update({ report: null, rider: null, scope: "range" });

    const exportOverview = () => {
        if (ov.state !== "ok") return;
        const d = ov.data;
        const from = new Date(d.from), cmpFrom = new Date(d.cmpFrom);
        const labels = Array.from({ length: d.buckets }, (_, i) => bucketLabel({ from, step: d.step }, i));
        const cmpLabels = Array.from({ length: d.buckets }, (_, i) => bucketLabel({ from: cmpFrom, step: d.step }, i));
        downloadCsv(overviewCsv({
            cur: d.cur, prev: d.prev, labels, cmpLabels,
            sales: fillSeries(d.series.cur, d.buckets), orders: fillSeries(d.series.cur, d.buckets, "orders"),
            prevSales: d.series.prev ? fillSeries(d.series.prev, d.buckets) : null,
            prevOrders: d.series.prev ? fillSeries(d.series.prev, d.buckets, "orders") : null,
        }), csvName("analytics-overview", from, new Date(d.to)));
        toast.success("Overview downloaded as CSV");
    };

    return (
        <div className="stack-lg an-page">
            <PageHeader title="Analytics" sub="How sales are going, compared with the period before."
                actions={<Btn kind="primary" icon="download" onClick={exportOverview} disabled={ov.state !== "ok"}>Export CSV</Btn>} />

            <div className="stack-sm">
                <div className="hrow wrap an-controls">
                    <Seg label="Date range" value={q.range} onChange={setRange} options={RANGES} />
                    <Select label="Compare with" value={q.cmp} onChange={(v: CmpKey) => update({ cmp: v })} options={CMPS} className="select an-cmp" />
                </div>
                {q.range === "custom" && (
                    <div className="hrow wrap an-dates">
                        <Field label="From" htmlFor="an-from">
                            <input id="an-from" type="date" className="input" value={q.from ?? ""} max={q.to ?? undefined} onChange={e => setDate("from", e.target.value)} />
                        </Field>
                        <Field label="To" htmlFor="an-to">
                            <input id="an-to" type="date" className="input" value={q.to ?? ""} min={q.from ?? undefined} onChange={e => setDate("to", e.target.value)} />
                        </Field>
                    </div>
                )}
                <p className="help">{dates} · {PAID_ONLY}</p>
            </div>

            {ov.state === "error" ? (
                <Card><ErrorState what="the figures" onRetry={() => void load(key)} /></Card>
            ) : (
                <>
                    <Kpis q={q} ov={ov.state === "ok" ? ov.data : null} />
                    <SalesChart ov={ov.state === "ok" ? ov.data : null} q={q} />
                    <div className="grid-2">
                        <TopProducts ov={ov.state === "ok" ? ov.data : null} onReport={() => openReport("product")} />
                        <Channels ov={ov.state === "ok" ? ov.data : null} onReport={() => openReport("channel")} />
                    </div>
                </>
            )}

            <Card title="Reports">
                <div className="rows">
                    {REPORTS.map(r => (
                        <button type="button" key={r.k} className="row click" onClick={() => openReport(r.k)}>
                            <Icon n="analytics" className="an-row-ico" />
                            <div className="row-main"><div className="row-title">{r.t}</div><div className="row-sub">{r.d}</div></div>
                            <Icon n="chev" className="an-row-chev" />
                        </button>
                    ))}
                </div>
            </Card>

            {q.report && <ReportPanel q={q} onClose={closeReport} update={update} />}
        </div>
    );
}

function Kpis({ q, ov }: { q: AnalyticsQuery; ov: Overview | null }) {
    if (!ov) {
        return (
            <div className="grid-4" aria-busy="true" aria-label="Loading">
                {["Sales", "Orders", "Average order", "Returning customers"].map(l => (
                    <div className="kpi" key={l}><div className="kpi-label">{l}</div><div className="skel an-kpi-skel" /><div className="skel an-kpi-skel-sm" /></div>
                ))}
            </div>
        );
    }
    const d = deltas(ov.cur, ov.prev);
    const rate = returningRate(ov.cur);
    const pts = d.returning;
    return (
        <div className="grid-4">
            <Kpi label="Sales" value={ghs0(ov.cur.sales)} delta={d.sales} ctx={kpiCtx(q, ov.days, d.sales, ov.prev?.sales ?? null)} />
            <Kpi label="Orders" value={ov.cur.orders.toLocaleString("en-GB")} delta={d.orders} ctx={kpiCtx(q, ov.days, d.orders, ov.prev?.orders ?? null)} />
            <Kpi label="Average order" value={ghs0(ov.cur.aov)} delta={d.aov} ctx={kpiCtx(q, ov.days, d.aov, ov.prev?.aov ?? null)} />
            <Kpi label="Returning customers" value={rate == null ? "—" : `${rate}%`}
                ctx={<>
                    {pts != null && <span className={`delta ${pts >= 0 ? "up" : "down"}`} title={`${cmpText(q, ov.days)}, in percentage points`}>{pts >= 0 ? "↑" : "↓"} {Math.abs(pts)} pts</span>}{" "}
                    {returningCtx(ov.cur)}
                </>} />
        </div>
    );
}

function SalesChart({ ov, q }: { ov: Overview | null; q: AnalyticsQuery }) {
    const hourly = ov ? ov.step === 3_600_000 : q.range === "today";
    const title = hourly ? "Sales by hour" : "Sales by day";
    const legend = (
        <div className="hrow-sm sm muted an-legend" aria-hidden={!ov}>
            <span className="hrow-sm"><span className="an-sw-cur" />This period</span>
            {ov?.prev && <span className="hrow-sm"><span className="an-sw-prev" />{q.cmp === "year" ? "Last year" : "Previous"}</span>}
        </div>
    );
    if (!ov) return <Card title={title} action={legend}><SkeletonRows n={4} cols={3} /></Card>;
    const from = new Date(ov.from);
    const cur = fillSeries(ov.series.cur, ov.buckets);
    const prev = ov.series.prev ? fillSeries(ov.series.prev, ov.buckets) : null;
    const labels = cur.map((_, i) => bucketLabel({ from, step: ov.step }, i));
    const any = cur.some(v => v > 0) || (prev ?? []).some(v => v > 0);
    return (
        <Card title={title} action={legend}>
            {any
                ? <div className="card-body an-chart"><LineChart cur={cur} prev={prev} labels={labels} label={title} /></div>
                : <Empty icon="analytics" title="No paid orders in these dates" body="Sales appear here as soon as an order is paid, online or at the POS." />}
        </Card>
    );
}

function TopProducts({ ov, onReport }: { ov: Overview | null; onReport: () => void }) {
    return (
        <Card title="Top products" action={<Btn sm kind="ghost" onClick={onReport}>Full report</Btn>}>
            {!ov ? <SkeletonRows n={5} cols={3} /> : ov.top.length === 0 ? (
                <Empty icon="products" title="Nothing sold in these dates" body="Best sellers appear here once orders are paid." />
            ) : (
                <div className="rows">
                    {ov.top.map((t, i) => (
                        <div className="row" key={t.key}>
                            <span className="muted strong an-rank">{i + 1}</span>
                            <div className="row-main"><div className="row-title">{t.name}</div><div className="row-sub">{plural(Number(t.units), "unit")} sold</div></div>
                            <span className="strong num">{ghs0(t.sales)}</span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

function Channels({ ov, onReport }: { ov: Overview | null; onReport: () => void }) {
    const rows = (ov?.channels ?? []).filter(c => Number(c.orders) > 0);
    return (
        <Card title="Sales by channel" action={<Btn sm kind="ghost" onClick={onReport}>Full report</Btn>}>
            {!ov ? <SkeletonRows n={4} cols={2} /> : rows.length === 0 ? (
                <Empty icon="store" title="No paid orders in these dates" body="Each channel (online shop, POS, pay links, WhatsApp) shows here once it has a paid order." />
            ) : (
                <div className="card-body">
                    <Bars label="Sales by channel" items={rows.map(c => ({
                        key: c.channel, label: channelName(c.channel), value: Number(c.sales),
                        right: <><span className="strong num">{ghs0(c.sales)}</span> <span className="muted">· {plural(Number(c.orders), "order")}</span></>,
                    }))} />
                </div>
            )}
        </Card>
    );
}
