"use client";

// WhatsApp results and the AI insight cards (failed sends, errors people saw,
// AI use by staff member), rebuilt with the kit from /settings/ai. Same
// endpoints and figures; each card loads on its own so one failure never
// hides the others.
import { useCallback, useEffect, useState } from "react";
import { Card, Chip, Empty, ErrorState, Kpi, Seg, SkeletonRows, ghs, plural, when } from "@/components/admin/ui";
import type { Results } from "@/lib/whatsapp/results";

function useJson<T>(url: string, ok: (j: unknown) => boolean) {
    const [data, setData] = useState<T | null>(null);
    const [failed, setFailed] = useState(false);
    const load = useCallback(() => {
        setFailed(false);
        fetch(url, { cache: "no-store" })
            .then(async r => { const j = await r.json().catch(() => null); if (!r.ok || !ok(j)) throw new Error("bad"); setData(j as T); })
            .catch(() => setFailed(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);
    useEffect(load, [load]);
    return { data, failed, load };
}

export function WhatsAppResults() {
    const { data, failed, load } = useJson<{ week: Results; month: Results; truncated: boolean }>("/api/ai/whatsapp-results", j => !!(j as { week?: unknown })?.week);
    const [p, setP] = useState<"week" | "month">("month");
    const r = data?.[p];
    return (
        <Card title="WhatsApp results" action={<Seg label="Period" value={p} onChange={setP} options={[{ v: "week", l: "7 days" }, { v: "month", l: "30 days" }]} />}>
            {failed && <ErrorState what="WhatsApp results" onRetry={load} body="Nothing was changed. Try again in a moment." />}
            {!failed && !r && <SkeletonRows n={2} cols={4} />}
            {r && <div className="card-body">
                <div className="grid-4 set-tiles">
                    <Kpi label="Chats answered" value={r.chats} ctx={plural(r.replies, "reply", "replies")} />
                    <Kpi label="Orders placed" value={r.orders} ctx={`${r.paid_orders} paid`} />
                    <Kpi label="Paid sales" value={ghs(r.sales_ghs)} ctx={r.conversion_pct === null ? "no chats yet" : `${r.conversion_pct}% of chats paid`} />
                    <Kpi label="Assistant cost" value={ghs(r.ai_cost_ghs)} ctx={p === "week" ? "last 7 days" : "last 30 days"} />
                    <Kpi label="Paid after a reminder" value={r.recovered_orders} ctx={`${ghs(r.recovered_ghs)} · ${plural(r.reminders_sent, "reminder")} sent`} />
                    <Kpi label="Back-in-stock alerts" value={r.restock_alerts_sent} ctx="sent" />
                </div>
                {data?.truncated && <p className="xs muted">Very busy period: some older rows weren&apos;t counted.</p>}
            </div>}
        </Card>
    );
}

type Insights = {
    failed_sends: { total: number; capped?: boolean; by_kind: { channel: string; event: string; count: number }[]; recent: { at: string; channel: string; event: string; to: string; reason: string }[] };
    errors: { enabled: boolean; total: number; capped?: boolean; by_code: { code: string; label: string; count: number }[]; recent: { at: string; code: string; place: string | null; audience: string }[] };
    usage: Record<"week" | "month", { name: string; questions: number; cost_ghs: number; last_used: string }[]> & { capped?: boolean };
};

const channelName = (c: string) => (c === "sms" ? "SMS" : c === "email" ? "Email" : c === "whatsapp" ? "WhatsApp" : c);
const eventName = (e: string) => { const t = String(e ?? "").replace(/[_-]+/g, " ").trim(); return t ? t[0].toUpperCase() + t.slice(1) : "Message"; };

export function AiInsightCards() {
    const { data, failed, load } = useJson<Insights>("/api/ai/insights", j => !!(j as { failed_sends?: unknown })?.failed_sends);
    const [range, setRange] = useState<"week" | "month">("week");
    if (failed) return <Card title="AI insights"><ErrorState what="the insight cards" onRetry={load} body="Nothing was changed. Try again in a moment." /></Card>;
    if (!data) return <Card title="AI insights"><SkeletonRows n={3} cols={4} /></Card>;
    const plus = (c?: boolean) => (c ? "+" : "");
    const usage = data.usage[range];
    return (
        <>
            <Card title="Failed sends · last 7 days">
                {data.failed_sends.total === 0 ? <Empty icon="ok" title="Nothing failed to send" body="Emails, SMS and WhatsApp messages that don't go out in the last 7 days appear here, with the reason." />
                    : <>
                        <div className="card-body hrow-sm wrap">
                            {data.failed_sends.by_kind.map(k => <Chip key={`${k.channel}|${k.event}`}>{channelName(k.channel)} · {eventName(k.event)} · {k.count}{plus(data.failed_sends.capped)}</Chip>)}
                        </div>
                        {data.failed_sends.recent.length > 0 && <div className="tbl-wrap"><table className="tbl">
                            <thead><tr><th>When</th><th>Channel</th><th>Message</th><th>To</th><th>Why</th></tr></thead>
                            <tbody>{data.failed_sends.recent.map((s, i) => (
                                <tr key={i}><td>{when(s.at)}</td><td>{channelName(s.channel)}</td><td>{eventName(s.event)}</td><td className="sm">{s.to}</td><td className="sm">{s.reason}</td></tr>
                            ))}</tbody>
                        </table></div>}
                    </>}
            </Card>
            <Card title="Errors people saw · last 7 days">
                {data.errors.total === 0
                    ? <Empty icon="ok" title={data.errors.enabled ? "No errors in the last 7 days" : "Not recording"}
                        body={data.errors.enabled ? "Error codes staff and customers see appear here, with the page they were on." : "Turn on Error log in Miss Tokyo AI extras above to start."} />
                    : <>
                        {!data.errors.enabled && <p className="card-body sm muted">Recording is off. Showing what was recorded before.</p>}
                        <div className="tbl-wrap"><table className="tbl">
                            <thead><tr><th>Code</th><th>What it means</th><th style={{ textAlign: "right" }}>Times</th></tr></thead>
                            <tbody>{data.errors.by_code.map(e => <tr key={e.code}><td className="strong">{e.code}</td><td>{e.label}</td><td style={{ textAlign: "right" }}>{e.count}{plus(data.errors.capped)}</td></tr>)}</tbody>
                        </table></div>
                        {data.errors.recent.length > 0 && <div className="tbl-wrap"><table className="tbl">
                            <thead><tr><th>When</th><th>Code</th><th>Page</th><th>Who</th></tr></thead>
                            <tbody>{data.errors.recent.map((e, i) => <tr key={i}><td>{when(e.at)}</td><td>{e.code}</td><td className="sm">{e.place ?? "—"}</td><td>{e.audience === "staff" ? "Staff" : "Customer"}</td></tr>)}</tbody>
                        </table></div>}
                    </>}
            </Card>
            <Card title="AI use by staff member" action={<Seg label="Period" value={range} onChange={setRange} options={[{ v: "week", l: "7 days" }, { v: "month", l: "30 days" }]} />}>
                {usage.length === 0 ? <Empty icon="spark" title="No staff questions in this period" body="Questions staff ask Miss Tokyo AI appear here by person, with what they cost." />
                    : <div className="tbl-wrap"><table className="tbl">
                        <thead><tr><th>Name</th><th>Questions</th><th>Cost</th><th>Last used</th></tr></thead>
                        <tbody>{usage.map((u, i) => <tr key={i}><td>{u.name}</td><td>{u.questions}{plus(data.usage.capped)}</td><td>{ghs(u.cost_ghs)}</td><td>{u.last_used ? when(u.last_used) : "—"}</td></tr>)}</tbody>
                    </table></div>}
            </Card>
        </>
    );
}
