"use client";

import { useState } from "react";
import { Badge, Banner, Btn, Card, Empty, ErrorState, Field, Kpi, Money, Panel, Percent, SRow, Seg, Switch, TwoTap, ghs, plural, toast, when } from "@/components/admin/ui";
import { periodLabel } from "@/lib/billing/period";
import { DEFAULT_VISIBILITY, type Visibility } from "@/lib/billing/statement";
import type { RatesData } from "./data";
import { addOtherLine, removeOtherLine, saveRates, saveVisibility, submitStatementsNow } from "./actions";
import { useRun } from "./useRun";

const STATUS: Record<string, [string, "ok" | "warn" | "neutral" | "info" | "danger"]> = {
    frozen: ["Frozen, not sent yet", "info"], submitted: ["Sent to Dashttp", "info"], submit_failed: ["Couldn't send yet", "warn"], paid: ["Paid", "ok"], void: ["Nothing to bill", "neutral"],
};

const VIS: [keyof Visibility, string, string][] = [
    ["ai", "AI assistants", "The AI line."], ["sms", "SMS", "The SMS line."], ["wa_message", "WhatsApp messages", "The WhatsApp messages line."],
    ["wa_template", "WhatsApp templates", "The template line."], ["other", "Other lines", "Lines you add below."],
    ["quantities", "Quantities", "Replies, SMS units and messages next to each line."], ["unit_prices", "Price per unit", "The client's price per unit (markup included), for lines billed per unit."],
];

export function RatesTab({ d }: { d: RatesData }) {
    const { busy, run } = useRun();
    const s = d.settings;
    const str = (n: number | null) => (n == null ? "" : String(n));
    const [f, setF] = useState<Record<string, string>>({
        ai_rate_unit: s.aiRateUnit, ai_rate_ghs: str(s.aiRateGhs), sms_rate_ghs: str(s.smsRateGhs), wa_message_rate_ghs: str(s.waMessageRateGhs),
        wa_template_rate_ghs: str(s.waTemplateRateGhs), markup_pct: String(s.markupPct), usd_to_ghs: String(s.usdToGhs), cutoff_day: String(s.cutoffDay),
    });
    const set = (k: string) => (v: string) => setF(x => ({ ...x, [k]: v }));
    const [vis, setVis] = useState<Visibility>({ ...DEFAULT_VISIBILITY, ...s.ownerVisibility });
    const visDirty = JSON.stringify(vis) !== JSON.stringify({ ...DEFAULT_VISIBILITY, ...s.ownerVisibility });
    const [adding, setAdding] = useState(false);
    const [o, setO] = useState({ description: "", quantity: "1", unit: "item", unitPrice: "", recurring: false });
    const bill = d.bill.ok ? d.bill.data : null;

    return (
        <>
            {bill && <div className="grid-4">
                <Kpi label="This period so far" value={ghs(bill.totalGhs)} ctx={`${bill.label}, what the client pays`} />
                <Kpi label="At this pace" value={ghs(bill.projectedGhs)} ctx="by the cut-off day" />
                <Kpi label="Cost to you" value={ghs(bill.priced.reduce((t, l) => t + (l.priced ? l.baseGhs : 0), 0))} ctx={`before the ${s.markupPct}% markup`} />
                <Kpi label="Monthly cap" value={bill.capGhs ? ghs(bill.capGhs) : "Not set"} ctx={bill.capGhs ? `the owner set it; ${bill.cap === "reached" ? "reached, assistants paused" : bill.cap === "near" ? "over 80% used" : "under 80% used"}` : "the owner sets it in Billing"} />
            </div>}

            <Card title="Prices per unit" action={<Badge plain>Never shown to the client</Badge>}>
                <div className="rows">
                    <SRow label="AI" help={f.ai_rate_unit === "cost" ? "GH₵ billed for each GH₵ the AI model costs (1 = at cost). Model cost comes from each reply, at the dollar rate below." : "GH₵ for each AI reply, whatever it cost."}>
                        <div className="hrow-sm wrap">
                            <Seg label="AI billed by" value={f.ai_rate_unit as "cost" | "reply"} onChange={set("ai_rate_unit")} options={[{ v: "cost", l: "By cost" }, { v: "reply", l: "Per reply" }]} />
                            <Money label="AI price" value={f.ai_rate_ghs} onChange={set("ai_rate_ghs")} placeholder="Not priced" />
                        </div>
                    </SRow>
                    <SRow label="Dollar rate for AI" help="Cedis per US dollar, for turning the model's dollar cost into cedis on the bill. The daily AI limit keeps its own fixed rate."><Money label="Dollar rate" value={f.usd_to_ghs} onChange={set("usd_to_ghs")} /></SRow>
                    <SRow label="SMS (mNotify), per unit" help="One unit is 160 plain characters, or 70 when the message has a symbol like ₵ or an emoji; longer messages use 153 or 67 per unit."><Money label="SMS price" value={f.sms_rate_ghs} onChange={set("sms_rate_ghs")} placeholder="Not priced" /></SRow>
                    <SRow label="WhatsApp message" help="Every message the shop's line sends that isn't a template: assistant replies, staff replies, photos, alerts."><Money label="WhatsApp message price" value={f.wa_message_rate_ghs} onChange={set("wa_message_rate_ghs")} placeholder="Not priced" /></SRow>
                    <SRow label="WhatsApp template" help="Approved templates sent outside the 24-hour window (order updates, handover alerts)."><Money label="WhatsApp template price" value={f.wa_template_rate_ghs} onChange={set("wa_template_rate_ghs")} placeholder="Not priced" /></SRow>
                    <SRow label="Markup" help="One markup on every line. The client sees the marked-up amounts only, never this %."><Percent label="Markup" value={f.markup_pct} onChange={set("markup_pct")} /></SRow>
                    <SRow label="Cut-off day" help={`1 to 28. Each statement runs from the day after the cut-off through the cut-off day (with 28: the 29th to the 28th), Ghana time. Billing began ${s.billingStart}.`}>
                        <input className="input" aria-label="Cut-off day" inputMode="numeric" style={{ width: 90 }} value={f.cutoff_day} onChange={e => set("cutoff_day")(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                    </SRow>
                </div>
                <div className="card-body hrow wrap">
                    <Btn kind="primary" disabled={!!busy} onClick={() => run("rates", () => saveRates(f), "Prices saved. Billing shows them now.")}>{busy === "rates" ? "Saving…" : "Save prices"}</Btn>
                    <span className="sm muted">Email is in the maintenance fee and never billed here. A blank price leaves that line off the bill.</span>
                </div>
            </Card>

            <Card title="This period, line by line" action={bill && <span className="sm muted">{bill.label}</span>}>
                {!bill ? <ErrorState what="this period's use" body="Nothing was changed. Open this tab again in a moment." /> : <>
                    {bill.unpriced.length > 0 && <div className="card-body"><Banner tone="warn" title={`Not priced yet: ${bill.unpriced.join(", ")}`}>They were used this period but stay off the bill until they have a price.</Banner></div>}
                    <div className="tbl-wrap"><table className="tbl">
                        <thead><tr><th>Service</th><th className="r">Used</th><th className="r hide-sm">Cost</th><th className="r hide-sm">Before markup</th><th className="r">Client pays</th></tr></thead>
                        <tbody>{bill.priced.map(l => (
                            <tr key={l.key}>
                                <td>{l.description}{!l.priced && <div className="xs muted">not priced</div>}</td>
                                <td className="r nowrap">{plural(Math.round(l.quantity * 1000) / 1000, l.unit, l.unit === "reply" ? "replies" : undefined)}</td>
                                <td className="r hide-sm nowrap">{l.costGhs == null ? "—" : ghs(l.costGhs)}</td>
                                <td className="r hide-sm nowrap">{l.priced ? ghs(l.baseGhs) : "—"}</td>
                                <td className="r strong nowrap">{l.priced ? ghs(l.amountGhs) : "—"}</td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                    <div className="card-body sm muted">{plural(bill.usage.smsMessages, "SMS")} in {plural(bill.usage.smsUnits, "unit")} · {plural(bill.usage.aiReplies, "AI reply", "AI replies")} · model cost ${bill.usage.aiCostUsd.toFixed(4)}</div>
                </>}
            </Card>

            <Card title="Other lines" action={<Btn sm kind="ghost" icon="plus" onClick={() => setAdding(true)}>Add a line</Btn>}>
                {!d.other.ok ? <ErrorState what="other lines" /> : d.other.data.length === 0
                    ? <Empty icon="tag" title="No other lines" body="Add any other metered service (a domain, extra storage) to this period or to every period." />
                    : <div className="rows">{d.other.data.map(x => (
                        <div className="row" key={x.id}>
                            <div className="row-main"><div className="row-title">{x.description}</div><div className="row-sub">{x.quantity} {x.unit} × {ghs(x.unitPrice)} · {x.recurring ? "every period" : "this period only"}</div></div>
                            <TwoTap sm label="Remove" onConfirm={() => run("rm" + x.id, () => removeOtherLine(x.id), "Line removed.")} disabled={!!busy} />
                        </div>
                    ))}</div>}
            </Card>

            <Card title="What the owner sees on Billing">
                <div className="rows">
                    {VIS.map(([k, l, h]) => <SRow key={k} label={l} help={h}><Switch label={l} checked={vis[k]} onChange={v => setVis(x => ({ ...x, [k]: v }))} /></SRow>)}
                </div>
                <div className="card-body hrow wrap">
                    <Btn kind="primary" disabled={!visDirty || !!busy} onClick={() => run("vis", () => saveVisibility(vis as unknown as Record<string, boolean>), "Saved.")}>{busy === "vis" ? "Saving…" : "Save"}</Btn>
                    <span className="sm muted">A hidden service still counts: its amount shows as “Other services”, so the total always matches. Cost prices and the markup % are never shown.</span>
                </div>
            </Card>

            <Card title="Statements" action={<Btn sm icon="upload" disabled={!!busy} onClick={() => run("submit", () => submitStatementsNow(), r => {
                const x = r.result;
                const parts = [x.frozen.length && `${plural(x.frozen.length, "period")} frozen`, x.submitted.length && `${x.submitted.length} sent to Dashttp`, x.failed.length && `${x.failed.length} couldn't be sent yet`].filter(Boolean);
                toast.success(parts.length ? `${parts.join(", ")}.` : x.notConnected ? "Nothing new to send, and Dashttp isn't connected yet." : "Everything is up to date.");
            })}>{busy === "submit" ? "Working…" : "Submit now"}</Btn>}>
                {d.dashttp !== "live" && <div className="card-body"><Banner tone={d.dashttp === "mock" ? "info" : "warn"} title={d.dashttp === "mock" ? "Dashttp test data" : "Dashttp isn't connected yet"}>{d.dashttp === "mock" ? "Statements go to the in-repo test fixture, not Dashttp." : "Statements are frozen at each cut-off and kept here; they're sent once DASHTTP_API_BASE and DASHTTP_CLIENT_TOKEN are set."}</Banner></div>}
                {!d.statements.ok ? <ErrorState what="statements" /> : d.statements.data.length === 0
                    ? <Empty icon="billing" title="No statements yet" body={`The first is frozen after the cut-off on ${bill ? periodLabel(bill.period).split(" to ")[1] : "the cut-off day"}, then sent to Dashttp. The hourly job does it; Submit now does it straight away.`} />
                    : <div className="tbl-wrap"><table className="tbl">
                        <thead><tr><th>Period</th><th>Status</th><th className="hide-sm">Invoice</th><th className="r">Total</th></tr></thead>
                        <tbody>{d.statements.data.map(st => {
                            const [l, t] = STATUS[st.status] ?? [st.status, "neutral"];
                            return <tr key={st.id}><td className="nowrap">{periodLabel({ start: st.period_start, end: st.period_end })}<div className="xs muted">frozen {when(st.frozen_at)}</div></td><td><Badge tone={t}>{l}</Badge>{st.last_error && <div className="xs muted">last try: {st.last_error === "unavailable" ? "Dashttp didn't answer" : "Dashttp refused it"}</div>}</td><td className="hide-sm">{st.dashttp_invoice_number || "—"}</td><td className="r strong">{ghs(st.total_ghs)}</td></tr>;
                        })}</tbody>
                    </table></div>}
            </Card>

            <Panel open={adding} onClose={() => setAdding(false)} title="Add a line" sub="Billed with the markup, like every other line."
                footer={<><Btn kind="ghost" onClick={() => setAdding(false)}>Cancel</Btn><Btn kind="primary" disabled={!!busy || !bill} onClick={() => bill && run("add", () => addOtherLine({ ...o, periodStart: bill.period.start }), "Line added.").then(r => { if (r) { setAdding(false); setO({ description: "", quantity: "1", unit: "item", unitPrice: "", recurring: false }); } })}>{busy === "add" ? "Adding…" : "Add line"}</Btn></>}>
                <div className="stack">
                    <Field label="What it is" htmlFor="ol-d"><input id="ol-d" className="input" maxLength={120} value={o.description} onChange={e => setO({ ...o, description: e.target.value })} /></Field>
                    <div className="grid-2">
                        <Field label="Quantity" htmlFor="ol-q"><input id="ol-q" className="input" inputMode="decimal" value={o.quantity} onChange={e => setO({ ...o, quantity: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
                        <Field label="Unit" htmlFor="ol-u"><input id="ol-u" className="input" maxLength={30} value={o.unit} onChange={e => setO({ ...o, unit: e.target.value })} /></Field>
                    </div>
                    <Field label="Price per unit" htmlFor="ol-p"><Money id="ol-p" value={o.unitPrice} onChange={v => setO({ ...o, unitPrice: v })} /></Field>
                    <SRow label="Every period" help={o.recurring ? "On every statement from now on." : `This period only (${bill?.label ?? ""}).`}><Switch label="Every period" checked={o.recurring} onChange={v => setO({ ...o, recurring: v })} /></SRow>
                </div>
            </Panel>
        </>
    );
}
