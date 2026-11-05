"use client";

// The WhatsApp figures over the inbox, for a period held in the URL (?p=, and
// from= and to= for custom) so a link or refresh lands on the same one. Waiting
// on your team is how things stand now, so the period never changes it.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, ErrorState, Field, Kpi, Seg, ghs } from "@/components/admin/ui";
import { datesText, shopYmd } from "@/lib/admin/v2/analytics";
import { DEFAULT_PERIOD, INBOX_PERIODS, parsePeriod, periodPhrase, periodRange, type InboxPeriod } from "@/lib/admin/v2/inboxPeriod";
import type { PeriodStats } from "@/lib/whatsapp/inboxStats";
import { call } from "./api";

const DAY = 86_400_000;

/**
 * Changes the period in the URL without a page load, so the choice shows at
 * once and a second date picked straight after the first isn't lost. Next keeps
 * useSearchParams in step with replaceState.
 */
function setParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) { if (v == null) next.delete(k); else next.set(k, v); }
    window.history.replaceState(null, "", `${window.location.pathname}?${next.toString()}`);
}

export function StatsPanel({ waiting }: { waiting: number }) {
    const params = useSearchParams();
    const p = params.get("p"), a = params.get("from"), b = params.get("to");
    const q = useMemo(() => parsePeriod(p, a, b), [p, a, b]);
    const [state, setState] = useState<{ state: "loading" | "error" } | { state: "ok"; data: PeriodStats }>({ state: "loading" });
    const [tick, setTick] = useState(0);

    const qs = new URLSearchParams({ p: q.period, ...(q.from && q.to ? { from: q.from, to: q.to } : {}) }).toString();
    useEffect(() => {
        let alive = true;
        const run = async (soft: boolean) => {
            if (!soft) setState({ state: "loading" });
            const r = await call<PeriodStats>(`/api/whatsapp/inbox/stats?${qs}`);
            if (!alive) return;
            if (r.ok && r.data) setState({ state: "ok", data: r.data });
            else if (!soft) setState({ state: "error" });
        };
        void run(false);
        const t = setInterval(() => { if (document.visibilityState === "visible") void run(true); }, 60_000);
        return () => { alive = false; clearInterval(t); };
    }, [qs, tick]);

    const now = useMemo(() => new Date(), [q]); // eslint-disable-line react-hooks/exhaustive-deps
    const range = periodRange(q, now);
    const phrase = periodPhrase(q, now);
    const today = shopYmd(now);

    const pick = (v: InboxPeriod) => {
        if (v === "custom") {
            setParams({ p: v, from: q.from ?? shopYmd(range.from ?? new Date(now.getTime() - 29 * DAY)), to: q.to ?? today });
        } else setParams({ p: v === DEFAULT_PERIOD ? null : v, from: null, to: null });
    };
    const setDate = (k: "from" | "to", v: string) => {
        const next = { from: q.from, to: q.to, [k]: v };
        if (parsePeriod("custom", next.from, next.to).period === "custom") setParams({ p: "custom", ...next });
    };

    const d = state.state === "ok" ? state.data : null;
    const shown = (n: number | undefined) => n ?? "…";

    return (
        <div className="stack-sm inbox-stats-panel">
            <div className="inbox-period">
                <Seg label="Period" value={q.period} onChange={pick} options={INBOX_PERIODS} />
            </div>
            {q.period === "custom" && (
                <div className="hrow wrap inbox-dates">
                    <Field label="From" htmlFor="inbox-from">
                        <input id="inbox-from" type="date" className="input" value={q.from ?? ""} max={q.to ?? today} onChange={e => setDate("from", e.target.value)} />
                    </Field>
                    <Field label="To" htmlFor="inbox-to">
                        <input id="inbox-to" type="date" className="input" value={q.to ?? ""} min={q.from ?? undefined} max={today} onChange={e => setDate("to", e.target.value)} />
                    </Field>
                </div>
            )}
            {state.state === "error" ? (
                <Card><ErrorState what="the figures" onRetry={() => setTick(t => t + 1)} /></Card>
            ) : (
                <div className="grid-4 inbox-stats">
                    <Kpi label="Chats" value={shown(d?.chats)} ctx={`Customers who wrote, ${phrase}`} />
                    <Kpi label="Ordered with the assistant" value={shown(d?.assistantOrders)}
                        ctx={d?.assistantOrders ? `${ghs(d.assistantSalesGhs)} paid, ${phrase}` : `Paid orders, ${phrase}`} />
                    <Kpi label="Handed to your team" value={shown(d?.handedOver)} ctx={`Chats, ${phrase}`} />
                    <Kpi label="Waiting on your team" value={waiting} ctx={waiting ? "Needs a person now" : "Nobody is waiting"} />
                </div>
            )}
            {q.period !== "custom" && range.from && <p className="help">{datesText(range.from, range.to)}</p>}
        </div>
    );
}
