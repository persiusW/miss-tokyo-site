"use client";

// Read-only cards under Settings › Assistants, kept in full from /settings/ai:
// WhatsApp health, WhatsApp results, shop chats, AI insights and the last 20
// AI turns, plus today's and this month's AI use next to the daily limit.
import { Fragment, useCallback, useEffect, useState } from "react";
import { Badge, Btn, Card, Empty, ErrorState, Kpi, SkeletonRows, ghs, plural, when } from "@/components/admin/ui";
import { AiInsightCards, WhatsAppResults } from "./InsightCards";
import type { Health, InboundCounts } from "@/lib/whatsapp/health";
import type { AiActivity } from "./load";

/** The AI use row: today against the daily limit, and this month (gap 19). */
export function AiUse({ ai, isAdmin }: { ai: AiActivity | null; isAdmin: boolean }) {
    if (!ai) return <span className="sm muted">Open this section again to see AI use.</span>;
    const pct = ai.todayGhs === null ? null : ai.capGhs > 0 ? Math.min(100, (ai.todayGhs / ai.capGhs) * 100) : 100;
    return (
        <div className="grid-2" style={{ width: "100%" }}>
            <div className="stack-sm">
                <div className="sm muted">Today</div>
                {ai.todayGhs === null
                    ? <div className="sm">We couldn&apos;t read today&apos;s spend.</div>
                    : <>
                        <div><span className="strong">{ghs(ai.todayGhs)}</span> <span className="muted sm">of {ghs(ai.capGhs)} daily limit</span></div>
                        <div className="bar-track" role="progressbar" aria-label="Share of today's AI limit used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct ?? 0)}>
                            <div className={`bar-fill${(pct ?? 0) >= 100 ? " over" : (pct ?? 0) >= 80 ? " near" : ""}`} style={{ width: `${pct}%` }} />
                        </div>
                    </>}
            </div>
            <div className="stack-sm">
                <div className="sm muted">{ai.month?.label ?? "This month"}</div>
                {ai.month
                    ? <>
                        <div><span className="strong">{ghs(ai.month.ghs)}</span> <span className="muted sm">over {plural(ai.month.turns, "AI reply", "AI replies")}</span></div>
                        {isAdmin && ai.month.withMarkupGhs !== null && <div className="xs muted">{ghs(ai.month.withMarkupGhs)} with the cost markup. Only admins see this.</div>}
                    </>
                    : <div className="sm">We couldn&apos;t read this month&apos;s use.</div>}
            </div>
        </div>
    );
}

type HealthData = InboundCounts & { health: Health; wallet?: { state: "ok" | "not_configured" | "rejected" | "network"; balance: number | null } };
const WALLET: Record<string, string> = { not_configured: "Not set up", rejected: "Key not accepted", network: "Couldn't check" };

function since(iso: string | null): string {
    if (!iso) return "Never";
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const h = Math.round(mins / 60);
    return h < 48 ? `${h} h ago` : when(iso);
}

export function WhatsAppHealth() {
    const [d, setD] = useState<HealthData | null>(null);
    const [failed, setFailed] = useState(false);
    const load = useCallback(() => {
        fetch("/api/ai/whatsapp-health", { cache: "no-store" })
            .then(r => (r.ok ? r.json() : Promise.reject()))
            .then(x => { setD(x); setFailed(false); })
            .catch(() => setFailed(true));
    }, []);
    useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);
    const tone = d?.health.level === "problem" ? "danger" : d?.health.level === "warning" ? "warn" : "ok";
    return (
        <Card title="WhatsApp messages" action={d && <Badge tone={tone}>{d.health.level === "ok" ? "Working" : d.health.level === "warning" ? "Check" : "Problem"}</Badge>}>
            {failed && !d && <ErrorState what="WhatsApp health" onRetry={load} body="Nothing was changed. Try again in a moment." />}
            {!failed && !d && <SkeletonRows n={2} cols={4} />}
            {d && <div className="card-body stack">
                <div>
                    <div className={d.health.level === "ok" ? "" : "strong"}>{d.health.summary}</div>
                    {d.health.notes.map(n => <div key={n} className="sm muted">{n}</div>)}
                </div>
                <div className="grid-4 set-tiles">
                    <Kpi label="Last message received" value={since(d.lastReceivedAt)} ctx="from any customer" />
                    <Kpi label="Waiting" value={d.waiting} ctx={d.oldestWaitingAt ? `oldest ${since(d.oldestWaitingAt)}` : "none waiting"} />
                    <Kpi label="Being retried" value={d.retrying} ctx="after a failed try" />
                    <Kpi label="Given up" value={d.gaveUp7d} ctx="in the last 7 days" />
                </div>
                <div className="sm"><span className="muted">Chatbots Africa wallet: </span>
                    {!d.wallet ? "…" : d.wallet.state === "ok" ? (d.wallet.balance === null ? "Connected" : ghs(d.wallet.balance)) : WALLET[d.wallet.state]}
                </div>
            </div>}
        </Card>
    );
}

type Usage = { chats: number; messages: number; cost_ghs: number; orders: number; paid_orders: number };
type ChatRow = { id: string; first_question: string; turns: number; order_refs: string[]; last_message_at: string };

function ShopChats() {
    const [d, setD] = useState<{ usage: { today: Usage; week: Usage }; chats: ChatRow[]; truncated: boolean } | null>(null);
    const [failed, setFailed] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const [lines, setLines] = useState<{ who: "customer" | "assistant"; text: string }[] | null>(null);
    const load = useCallback(() => {
        setFailed(false);
        fetch("/api/ai/shop-chats", { cache: "no-store" }).then(r => (r.ok ? r.json() : Promise.reject())).then(setD).catch(() => setFailed(true));
    }, []);
    useEffect(load, [load]);
    const open = async (id: string) => {
        if (openId === id) { setOpenId(null); return; }
        setOpenId(id); setLines(null);
        const res = await fetch(`/api/ai/shop-chats/${id}`, { cache: "no-store" }).catch(() => null);
        const j = res && res.ok ? await res.json().catch(() => null) : null;
        setLines(Array.isArray(j?.lines) ? j.lines : []);
    };
    return (
        <Card title="Ask Miss Tokyo on the shop">
            {failed && <ErrorState what="shop chats" onRetry={load} body="Nothing was changed. Try again in a moment." />}
            {!failed && !d && <SkeletonRows n={3} cols={4} />}
            {d && <>
                <div className="card-body">
                    <div className="grid-4 set-tiles">
                        <Kpi label="Chats today" value={d.usage.today.chats} ctx={`${plural(d.usage.today.messages, "message")} · ${ghs(d.usage.today.cost_ghs)}`} />
                        <Kpi label="Chats this week" value={d.usage.week.chats} ctx={`${plural(d.usage.week.messages, "message")} · ${ghs(d.usage.week.cost_ghs)}`} />
                        <Kpi label="Orders from chat" value={d.usage.week.orders} ctx={`${d.usage.week.paid_orders} paid, last 7 days`} />
                    </div>
                    {d.truncated && <p className="xs muted">Counts include the first 20,000 rows only.</p>}
                </div>
                {d.chats.length === 0
                    ? <Empty icon="chat" title="No shop chats yet" body="Chats customers start with Ask Miss Tokyo on the shop appear here, newest first." />
                    : <div className="rows">
                        {d.chats.map(c => (
                            <Fragment key={c.id}>
                                <div className="row">
                                    <div className="row-main">
                                        <div className="row-title">{c.first_question || "No question"}</div>
                                        <div className="row-sub">{when(c.last_message_at)} · {plural(c.turns, "message")}{c.order_refs.length ? ` · ${c.order_refs.join(", ")}` : ""}</div>
                                    </div>
                                    <Btn sm kind="ghost" onClick={() => void open(c.id)} aria-expanded={openId === c.id}>{openId === c.id ? "Close" : "Read"}</Btn>
                                </div>
                                {openId === c.id && <div className="set-chat">
                                    {lines === null ? <SkeletonRows n={2} cols={2} /> : lines.length === 0 ? <p className="sm muted">No messages.</p> : lines.map((l, i) => (
                                        <p key={i} className={`sm${l.who === "customer" ? "" : " muted"}`}><span className="strong">{l.who === "customer" ? "Customer" : "Ask Miss Tokyo"}:</span> {l.text}</p>
                                    ))}
                                </div>}
                            </Fragment>
                        ))}
                    </div>}
            </>}
        </Card>
    );
}

export function RecentTurns({ ai }: { ai: AiActivity | null }) {
    const rows = ai?.recent ?? [];
    return (
        <Card title="Last 20 AI replies">
            {!ai ? <ErrorState what="recent AI replies" body="Open this section again to load them." />
                : rows.length === 0 ? <Empty icon="spark" title="No AI use yet" body="Each reply an assistant gives appears here with what it cost." />
                    : <div className="tbl-wrap"><table className="tbl">
                        <thead><tr><th>When</th><th>Where</th><th>Model</th><th>Tokens in / out</th><th style={{ textAlign: "right" }}>Cost</th></tr></thead>
                        <tbody>{rows.map((t, i) => (
                            <tr key={i}>
                                <td>{when(t.created_at)}</td>
                                <td>{({ dashboard: "Staff", whatsapp: "WhatsApp", web: "Shop" } as Record<string, string>)[t.channel] ?? t.channel}</td>
                                <td className="sm muted">{t.model ?? "—"}</td>
                                <td className="sm">{(t.input_tokens ?? 0).toLocaleString("en-GB")} / {(t.output_tokens ?? 0).toLocaleString("en-GB")}</td>
                                <td style={{ textAlign: "right" }}>{ghs(t.cost_ghs)}</td>
                            </tr>
                        ))}</tbody>
                    </table></div>}
        </Card>
    );
}

export function AssistantCards({ ai }: { ai: AiActivity | null }) {
    return (
        <div className="stack">
            <WhatsAppHealth />
            <WhatsAppResults />
            <ShopChats />
            <AiInsightCards />
            <RecentTurns ai={ai} />
        </div>
    );
}
