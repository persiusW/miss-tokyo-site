"use client";

// Admin v2 Home: what needs the team today, sales so far, the latest orders
// and what the team has done. Every staff role sees the same page. Figures
// come from /api/admin/v2/home (role checked there) and refresh when an order
// changes.
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Banner, BtnLink, Card, Empty, ErrorState, FulBadge, Kpi, PageHeader, RowLink, Seg, SkeletonRows,
    ago, firstName, ghs, ghs0, initials, plural, when,
} from "@/components/admin/ui";
import { useAdminV2 } from "@/components/admin/shell/AdminV2Context";
import { createClient } from "@/lib/supabaseBrowser";
import { PERIODS, kpiCtx, type PeriodKey } from "@/lib/admin/v2/homeText";
import { NEEDS_EMPTY_BODY, needsCount, type NeedRow } from "@/lib/admin/v2/homeNeeds";
import type { LatestOrder, SalesSummary, TeamActivity } from "@/lib/admin/v2/home";
import { PushOptInBanner } from "./PushOptInBanner";
import "./home.css";

type NeedsResp = {
    needs: NeedRow[];
    restored: { count: number; first: { id: string; ref: string } | null };
    latest: LatestOrder[];
    activity: TeamActivity[];
};
type Load<T> = { state: "loading" } | { state: "error" } | { state: "ok"; data: T };

async function getJson<T>(url: string): Promise<T> {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`home ${r.status}`);
    return r.json() as Promise<T>;
}

export function HomePage({ title, sub }: { title: string; sub: string }) {
    const { isFullAccess } = useAdminV2();
    const [period, setPeriod] = useState<PeriodKey>("today");
    const [needs, setNeeds] = useState<Load<NeedsResp>>({ state: "loading" });
    const [sales, setSales] = useState<Load<SalesSummary>>({ state: "loading" });
    const [wallet, setWallet] = useState<{ balance: number } | null>(null);
    const periodRef = useRef(period);
    useEffect(() => { periodRef.current = period; }, [period]);

    // `quiet` keeps what's on screen while refreshing (realtime, the timer).
    const loadNeeds = useCallback(async (quiet = false) => {
        if (!quiet) setNeeds({ state: "loading" });
        try { setNeeds({ state: "ok", data: await getJson<NeedsResp>("/api/admin/v2/home?part=needs") }); }
        catch { if (!quiet) setNeeds({ state: "error" }); }
    }, []);
    const loadSales = useCallback(async (p: PeriodKey, quiet = false) => {
        if (!quiet) setSales({ state: "loading" });
        try {
            const d = await getJson<SalesSummary>(`/api/admin/v2/home?part=sales&period=${p}`);
            if (periodRef.current === p) setSales({ state: "ok", data: d });
        } catch { if (!quiet && periodRef.current === p) setSales({ state: "error" }); }
    }, []);

    useEffect(() => { void loadNeeds(); }, [loadNeeds]);
    useEffect(() => { void loadSales(period); }, [period, loadSales]);
    useEffect(() => {
        getJson<{ low: { balance: number } | null }>("/api/admin/v2/home?part=wallet").then(d => setWallet(d.low)).catch(() => setWallet(null));
    }, []);

    // An order placed, paid, packed or collected anywhere refreshes the counts
    // and the latest orders, a moment later so a burst of updates is one read.
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const soon = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => { void loadNeeds(true); void loadSales(periodRef.current, true); }, 1200);
        };
        let ch: { unsubscribe: () => void } | null = null;
        try {
            ch = createClient().channel("adm2-home-orders")
                .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, soon)
                .subscribe();
        } catch { /* realtime is a nicety; the timer below still refreshes */ }
        const tick = setInterval(() => { if (document.visibilityState === "visible") soon(); }, 120_000);
        return () => { if (timer) clearTimeout(timer); clearInterval(tick); ch?.unsubscribe(); };
    }, [loadNeeds, loadSales]);

    const n = needs.state === "ok" ? needs.data : null;
    const restored = n?.restored;

    return (
        <>
            <PageHeader title={title} sub={sub} actions={<BtnLink kind="primary" icon="till" href="/till">Open the till</BtnLink>} />

            {(wallet || (restored && restored.count > 0)) && (
                <div className="stack-sm">
                    {restored && restored.count > 0 && (
                        <Banner tone="danger"
                            title={restored.count === 1 ? "A paid order had been cancelled" : `${restored.count} paid orders had been cancelled`}
                            action={<BtnLink sm href={restored.count === 1 && restored.first ? `/orders/${restored.first.id}` : "/orders?view=to-pack"}>{restored.count === 1 ? "View order" : "View orders"}</BtnLink>}>
                            Paystack confirmed the payment after the order was cancelled, so the nightly payment check put {restored.count === 1 && restored.first ? `#${restored.first.ref}` : "them"} back in Waiting to pack. Check the items are still in stock before you pack {restored.count === 1 ? "it" : "them"}.
                        </Banner>
                    )}
                    {wallet && (
                        <Banner tone="warn" title="WhatsApp credit is running low"
                            action={isFullAccess ? <BtnLink sm href="/billing">Top up</BtnLink> : undefined}>
                            {ghs(wallet.balance)} left. When it runs out, the assistant stops replying on WhatsApp and order updates stop sending.
                        </Banner>
                    )}
                </div>
            )}
            <PushOptInBanner />

            <Card title="Needs you today" action={n && n.needs.length > 0 ? <span className="muted sm">{needsCount(n.needs)}</span> : undefined}>
                {needs.state === "loading" ? <SkeletonRows n={4} cols={3} />
                    : needs.state === "error" ? <ErrorState what="what needs you today" body="Nothing was changed. Try again in a moment." onRetry={() => void loadNeeds()} />
                    : needs.data.needs.length === 0
                        ? <Empty icon="check" title="You're all caught up" body={NEEDS_EMPTY_BODY} />
                        : (
                            <div className="rows">
                                {needs.data.needs.map(x => (
                                    <div className="row need-row" key={x.key}>
                                        <div className={`kpi-value need-n${x.tone === "warn" ? " warn" : ""}`}>{x.n.toLocaleString("en-GB")}</div>
                                        <div className="row-main">
                                            <div className="row-title">{x.title}</div>
                                            <div className="row-sub">{x.body}</div>
                                        </div>
                                        <BtnLink sm href={x.href}>{x.action}</BtnLink>
                                    </div>
                                ))}
                            </div>
                        )}
            </Card>

            <div className="hrow between wrap">
                <h2 className="card-title" style={{ flex: "none" }}>Sales so far</h2>
                <Seg label="Period" value={period} onChange={setPeriod} options={PERIODS} />
            </div>
            {sales.state === "error"
                ? <Card><ErrorState what="sales" body="Nothing was changed. Try again in a moment." onRetry={() => void loadSales(period)} /></Card>
                : (
                    <div className="grid-4" aria-busy={sales.state === "loading"}>
                        {sales.state === "loading"
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <div className="kpi" key={i} aria-hidden="true">
                                    <div className="skel" style={{ height: 12, width: "40%" }} />
                                    <div className="skel" style={{ height: 34, width: "70%" }} />
                                    <div className="skel" style={{ height: 12, width: "60%" }} />
                                </div>
                            ))
                            : (() => {
                                const { current: c, compare: p, deltas: d } = sales.data;
                                const k = sales.data.period;
                                return (
                                    <>
                                        <Kpi label="Sales" value={ghs0(c.sales)} delta={d.sales} ctx={kpiCtx(k, d.sales, p ? p.sales : null)} />
                                        <Kpi label="Orders" value={c.orders.toLocaleString("en-GB")} delta={d.orders} ctx={kpiCtx(k, d.orders, p ? p.orders : null)} />
                                        <Kpi label="Average order" value={ghs0(c.aov)} delta={d.aov} ctx={kpiCtx(k, d.aov, p ? p.aov : null)} />
                                        <Kpi label="Cash to count at close" value={ghs0(c.cash)} ctx={`from ${plural(c.cash_orders, "till sale")}`} />
                                    </>
                                );
                            })()}
                    </div>
                )}

            <div className="split">
                <Card title="Latest orders" action={<BtnLink kind="ghost" sm href="/orders">All orders</BtnLink>}>
                    {needs.state === "loading" ? <SkeletonRows n={6} cols={3} />
                        : needs.state === "error" ? <ErrorState what="the latest orders" body="Nothing was changed. Try again in a moment." onRetry={() => void loadNeeds()} />
                        : needs.data.latest.length === 0
                            ? <Empty icon="orders" title="No orders yet" body="Orders from the shop, the till, WhatsApp and pay links show up here as they come in." />
                            : (
                                <div className="rows">
                                    {needs.data.latest.map(o => (
                                        <RowLink key={o.id} href={`/orders/${o.id}`}>
                                            <div className="row-main">
                                                <div className="row-title">#{o.ref} · {o.customer}</div>
                                                <div className="row-sub">{when(o.created_at)} · {o.channel} · {plural(o.items, "item")}</div>
                                            </div>
                                            <div className="hide-sm"><FulBadge s={o.ful} pickup={o.pickup} /></div>
                                            <div className="strong nowrap">{ghs(o.total)}</div>
                                        </RowLink>
                                    ))}
                                </div>
                            )}
                </Card>
                <Card title="Team activity">
                    {needs.state === "loading" ? <SkeletonRows n={5} cols={2} />
                        : needs.state === "error" ? <ErrorState what="team activity" body="Nothing was changed. Try again in a moment." onRetry={() => void loadNeeds()} />
                        : needs.data.activity.length === 0
                            ? <Empty icon="staff" title="No team activity yet" body="Packing, till sales and changes to products and settings show up here as the team works." />
                            : (
                                <div className="rows">
                                    {needs.data.activity.map(a => {
                                        const inner = (
                                            <>
                                                <span className="avatar" aria-hidden="true">{initials(a.who)}</span>
                                                <div className="row-main">
                                                    <div className="sm"><span className="strong">{firstName(a.who)}</span> {a.what}</div>
                                                    <div className="xs muted">{ago(a.created_at)}</div>
                                                </div>
                                            </>
                                        );
                                        return a.href
                                            ? <RowLink key={a.id} href={a.href}>{inner}</RowLink>
                                            : <div className="row act-row" key={a.id}>{inner}</div>;
                                    })}
                                </div>
                            )}
                </Card>
            </div>
        </>
    );
}
