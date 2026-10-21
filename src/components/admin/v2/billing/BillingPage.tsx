"use client";

// Billing (owners and admins): the maintenance plan from Dashttp, the
// features bill building up this period, the monthly cap, and Miss Tokyo's
// own Paystack money. Every figure is read live; nothing here is a sample.
import { Fragment, useState } from "react";
import { Badge, Banner, Btn, BtnLink, Card, ConfirmPanel, Empty, ErrorState, Kpi, Money, PageHeader, SRow, ghs, plural, toast, when } from "@/components/admin/ui";
import type { SettlementTx } from "@/lib/paystack/api";
import type { BillingPageData, ClientStatement } from "./data";
import { openManageLink, payInvoice, setMonthlyCap, settlementPayments } from "./actions";
import "./billing.css";

const PLAN_STATUS: Record<string, [string, "ok" | "warn" | "danger" | "neutral"]> = {
    active: ["Renews automatically", "ok"], non_renewing: ["Won't renew", "warn"], attention: ["Needs attention", "danger"], cancelled: ["Cancelled", "neutral"],
};
const ST_STATUS: Record<string, [string, "ok" | "warn" | "neutral" | "info"]> = {
    frozen: ["Closed, invoice on its way", "info"], submit_failed: ["Closed, invoice on its way", "info"], submitted: ["Invoiced", "warn"], paid: ["Paid", "ok"], void: ["Nothing to pay", "neutral"],
};
const qty = (l: { quantity: number; unit: string }) => (l.unit ? plural(Math.round(l.quantity * 100) / 100, l.unit, l.unit === "reply" ? "replies" : undefined) : "");
const day = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "—");

function Lines({ lines }: { lines: { description: string; quantity: number; unit: string; amountGhs: number; unitPriceGhs?: number }[] }) {
    return (
        <div className="rows">
            {lines.map((l, i) => (
                <SRow key={i} label={l.description} help={[qty(l), l.unitPriceGhs != null ? `${ghs(l.unitPriceGhs)} each` : ""].filter(Boolean).join(" · ") || undefined}>
                    <span className="strong nowrap">{ghs(l.amountGhs)}</span>
                </SRow>
            ))}
        </div>
    );
}

function Settlements({ rows, admin }: { rows: { id: string; status: string; amountGhs: number; feesGhs: number | null; settledAt: string | null }[]; admin?: boolean }) {
    const [open, setOpen] = useState<string | null>(null);
    const [tx, setTx] = useState<Record<string, SettlementTx[] | "failed" | undefined>>({});
    const [all, setAll] = useState(false);
    const toggle = async (id: string) => {
        if (open === id) { setOpen(null); return; }
        setOpen(id);
        if (tx[id]) return;
        const r = await settlementPayments(id, !!admin).catch(() => null);
        setTx(t => ({ ...t, [id]: r && r.ok ? r.rows : "failed" }));
    };
    if (!rows.length) return <Empty icon="bank" title="No payouts in Paystack's latest 50" body="When Paystack pays money out to the bank, each payout shows here with the payments in it." />;
    return (
        <div className="rows">
            {rows.slice(0, all ? undefined : 8).map(s => (
                <Fragment key={s.id}>
                    <button type="button" className="row click" onClick={() => void toggle(s.id)} aria-expanded={open === s.id}>
                        <div className="row-main"><div className="row-title">{ghs(s.amountGhs)}</div><div className="row-sub">{when(s.settledAt)} · {s.status}{s.feesGhs != null ? ` · Paystack fees ${ghs(s.feesGhs)}` : ""}</div></div>
                        <span className="sm muted nowrap">{open === s.id ? "Hide payments" : "Payments"}</span>
                    </button>
                    {open === s.id && <div className="card-body bil-tx">
                        {tx[s.id] === undefined ? <p className="sm muted">Loading…</p>
                            : tx[s.id] === "failed" ? <p className="sm bil-warn">Paystack didn't answer. Try again in a moment.</p>
                                : (tx[s.id] as SettlementTx[]).length === 0 ? <p className="sm muted">No payments listed for this payout.</p>
                                    : <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Paid</th><th>Reference</th><th className="r">Amount</th></tr></thead>
                                        <tbody>{(tx[s.id] as SettlementTx[]).map(t => <tr key={t.reference}><td className="nowrap">{when(t.paidAt)}</td><td className="xs bil-mono">{t.reference}</td><td className="r">{ghs(t.amountGhs)}</td></tr>)}</tbody></table></div>}
                    </div>}
                </Fragment>
            ))}
            {rows.length > 8 && <div className="card-body"><Btn sm kind="ghost" onClick={() => setAll(v => !v)}>{all ? "Show fewer" : `Show all ${rows.length}`}</Btn></div>}
        </div>
    );
}

export function BillingPage({ d }: { d: BillingPageData }) {
    const [busy, setBusy] = useState<string | null>(null);
    const [capOpen, setCapOpen] = useState(false);
    const [cap, setCap] = useState("");
    const plan = d.dashttp.billing?.plan ?? null;
    const bill = d.bill.ok ? d.bill.data : null;
    const go = async (key: string, fn: () => Promise<{ ok: true; url: string } | { ok: false; error: string }>) => {
        setBusy(key);
        const r = await fn().catch(() => ({ ok: false as const, error: "Something happened. Please try again." }));
        if (!r.ok) { toast.error(r.error); setBusy(null); return; }
        window.location.assign(r.url);
    };
    const saveCap = async (value: string | null) => {
        setBusy("cap");
        const r = await setMonthlyCap(value).catch(() => ({ ok: false as const, error: "Something happened. Please try again." }));
        setBusy(null);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success(value ? "Monthly cap saved." : "Monthly cap removed.");
        setCapOpen(false);
        window.location.reload();
    };
    const capPct = bill?.capGhs ? Math.min(100, (bill.totalGhs / bill.capGhs) * 100) : 0;
    const openInvoices = d.dashttp.billing?.openInvoices ?? [];
    const ps = d.paystack.summary.ok ? d.paystack.summary.data : null;
    const nothingYet = openInvoices.length === 0 && (!d.statements.ok || d.statements.data.length === 0) && d.dashttp.receipts.length === 0;

    return (
        <>
            <PageHeader title="Billing" sub="Your Miss Tokyo plan, this period's features bill, and the money Paystack pays out to you." />

            {d.paid && <Banner tone={d.paid.state === "paid" ? "ok" : "info"} title={d.paid.state === "paid" ? "Payment received. Thank you." : "Thanks, we're confirming your payment"}>
                {d.paid.state === "paid" ? "Your receipt shows below once Dashttp sends it." : "Paystack sent you back here. The invoice shows as paid as soon as Dashttp confirms it, usually within a minute."}
            </Banner>}
            {d.dashttp.mode === "mock" && <Banner tone="info" title="Test data">Your plan, invoices and receipts below come from the in-repo Dashttp test fixture, not from Dashttp. The features bill and the Paystack figures are real.</Banner>}
            {d.dashttp.mode === "off" && <Banner tone="neutral" title="Your plan isn't connected yet">Your plan, invoices and receipts show here once Dashttp's billing connection is switched on. The features bill and the Paystack figures below are already live.</Banner>}
            {d.dashttp.stale && <Banner tone="warn" title="Dashttp didn't answer just now">Showing your plan as it was {when(d.dashttp.at)}. Nothing was changed.</Banner>}

            <div className="split">
                <div className="stack-lg bil-main">
                    <Card title="This period's features bill" action={bill && <span className="sm muted">{bill.label}</span>}>
                        {!bill ? <ErrorState what="this period's bill" body="Nothing was changed. Open Billing again in a moment." /> : <>
                            <div className="card-body bil-hero">
                                <div>
                                    <div className="kpi-label">So far</div>
                                    <div className="bil-figure" key={bill.totalGhs}>{ghs(bill.totalGhs)}</div>
                                    <div className="sm muted">About {ghs(bill.projectedGhs)} by {day(bill.end)} at this pace</div>
                                </div>
                                {bill.capGhs && <div className="bil-cap">
                                    <div className="sm"><span className="strong">{Math.round(capPct)}%</span> <span className="muted">of your {ghs(bill.capGhs)} cap</span></div>
                                    <div className="bar-track" role="progressbar" aria-label="Share of the monthly cap used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(capPct)}>
                                        <div className={`bar-fill${bill.cap === "reached" ? " over" : bill.cap === "near" ? " near" : ""}`} style={{ width: `${capPct}%` }} />
                                    </div>
                                </div>}
                            </div>
                            {bill.lines.length === 0
                                ? <Empty icon="spark" title="Nothing billed yet this period" body="AI replies, SMS and WhatsApp messages show here as they're used, at your plan's prices." />
                                : <Lines lines={bill.lines} />}
                            <div className="card-body xs muted">Email is part of your plan. This bill closes on {day(bill.end)}; the invoice follows from Dashttp.</div>
                        </>}
                    </Card>

                    <Card title="Invoices and receipts">
                        {openInvoices.length > 0 && <div className="rows">{openInvoices.map(inv => (
                            <SRow key={inv.id} label={`Invoice ${inv.number}`} help={`${inv.periodStart && inv.periodEnd ? `${day(inv.periodStart)} to ${day(inv.periodEnd)}` : "Features"}${inv.dueAt ? ` · due ${day(inv.dueAt)}` : ""}`}>
                                <div className="hrow-sm"><span className="strong nowrap">{ghs(inv.amountGhs)}</span><Btn kind="primary" sm disabled={!!busy} onClick={() => go("pay" + inv.id, () => payInvoice(inv.id))}>{busy === "pay" + inv.id ? "Opening…" : "Pay now"}</Btn></div>
                            </SRow>
                        ))}</div>}
                        {!d.statements.ok ? <ErrorState what="past bills" /> : d.statements.data.length > 0 && <div className="tbl-wrap"><table className="tbl">
                            <thead><tr><th>Period</th><th>Status</th><th className="r">Total</th></tr></thead>
                            <tbody>{d.statements.data.map((s: ClientStatement) => { const [l, t] = ST_STATUS[s.status] ?? [s.status, "neutral"]; return (
                                <tr key={s.id}><td>{s.label}{s.invoiceNumber && <div className="xs muted">Invoice {s.invoiceNumber}</div>}</td><td><Badge tone={t}>{l}</Badge></td><td className="r strong nowrap">{ghs(s.totalGhs)}{s.pdfUrl && <div><a className="xs" href={s.pdfUrl} target="_blank" rel="noopener noreferrer">PDF</a></div>}</td></tr>
                            ); })}</tbody>
                        </table></div>}
                        {d.dashttp.receipts.length > 0 && <div className="tbl-wrap"><table className="tbl">
                            <thead><tr><th>Paid</th><th>What for</th><th className="r">Amount</th></tr></thead>
                            <tbody>{d.dashttp.receipts.map(r => <tr key={r.id}><td className="nowrap">{day(r.paidAt)}</td><td>{r.description}<div className="xs muted">Receipt {r.number}</div></td><td className="r strong nowrap">{ghs(r.amountGhs)}{r.pdfUrl && <div><a className="xs" href={r.pdfUrl} target="_blank" rel="noopener noreferrer">Receipt</a></div>}</td></tr>)}</tbody>
                        </table></div>}
                        {nothingYet && <Empty icon="billing" title="No invoices or receipts yet" body={d.dashttp.mode === "off" ? "They show here once billing is connected." : "Your first features invoice follows the first cut-off."} />}
                    </Card>
                </div>

                <div className="stack-lg">
                    <Card title="Your plan">
                        {!plan ? <div className="card-body"><p className="sm ink2">{d.dashttp.mode === "off" ? "Not connected yet." : "We couldn't load your plan. Nothing was changed."}</p></div> : <>
                            <div className="card-body stack-sm">
                                <div className="kpi-label">{plan.name}</div>
                                <div className="kpi-value">{ghs(plan.amount)}<span className="sm muted"> / {plan.interval === "monthly" ? "month" : plan.interval || "period"}</span></div>
                                <div><Badge tone={(PLAN_STATUS[plan.status] ?? PLAN_STATUS.attention)[1]}>{(PLAN_STATUS[plan.status] ?? PLAN_STATUS.attention)[0]}</Badge></div>
                            </div>
                            <div className="rows">
                                <SRow label="Next payment" help={plan.nextPaymentDate ? day(plan.nextPaymentDate) : "—"} />
                                <SRow label="Paid with" help={plan.paymentMethod?.label || "—"} />
                            </div>
                            <div className="card-body hrow-sm wrap">
                                <Btn sm disabled={!!busy} onClick={() => go("card", openManageLink)}>{busy === "card" ? "Opening…" : "Update card"}</Btn>
                                {plan.autoRenew && <Btn sm kind="ghost" disabled={!!busy} onClick={() => go("renew", openManageLink)}>{busy === "renew" ? "Opening…" : "Turn off auto-renew"}</Btn>}
                            </div>
                            <div className="card-body xs muted bil-tight">Both open Paystack's own secure page for your plan.</div>
                        </>}
                    </Card>

                    <Card title="Monthly cap">
                        <div className="card-body stack-sm">
                            {bill?.capGhs ? <p className="sm"><span className="strong">{ghs(bill.capGhs)}</span> a period. {bill.cap === "reached" ? <span className="bil-warn">Reached: the AI assistants are paused until the next period or a higher cap.</span> : ""}</p>
                                : <p className="sm ink2">No cap set.</p>}
                            {bill && <p className="sm"><span className="muted">We suggest </span><span className="strong">{ghs(bill.proposal.capGhs)}</span><span className="muted">. {bill.proposal.why}</span></p>}
                            <p className="xs muted">At the cap the shop and WhatsApp assistants and Miss Tokyo AI stop answering and hand chats to your team. Order messages to customers (SMS, WhatsApp, email) keep going and keep being billed. Owners and admins get an email at 80% and at the cap.</p>
                            <div className="hrow-sm wrap">
                                {bill && bill.capGhs !== bill.proposal.capGhs && <Btn sm kind="primary" disabled={!!busy} onClick={() => void saveCap(String(bill.proposal.capGhs))}>Use {ghs(bill.proposal.capGhs)}</Btn>}
                                <Btn sm disabled={!!busy} onClick={() => { setCap(bill?.capGhs ? String(bill.capGhs) : ""); setCapOpen(true); }}>{bill?.capGhs ? "Change" : "Set my own"}</Btn>
                                {bill?.capGhs && <Btn sm kind="ghost" disabled={!!busy} onClick={() => void saveCap(null)}>Remove cap</Btn>}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <Card title="Paystack: your online payments" action={<Badge plain>{bill ? bill.label : "This period"}</Badge>}>
                {!ps ? <ErrorState what="this period's payments" body="Nothing was changed. Open Billing again in a moment." /> : <div className="card-body">
                    <div className="grid-4">
                        <Kpi label="Online payments" value={ps.count.toLocaleString("en-GB")} ctx="paid this period" />
                        <Kpi label="Customers paid" value={ghs(ps.chargedGhs)} ctx={`for orders worth ${ghs(ps.ordersGhs)}`} />
                        <Kpi label="Paystack fees" value={ghs(ps.paystackFeesGhs)} ctx={ps.feesPaidByCustomersGhs >= ps.paystackFeesGhs ? "paid by customers on top" : `${ghs(ps.feesPaidByCustomersGhs)} of it paid by customers`} />
                        <Kpi label="Charge per payment" value={ghs(ps.avgChargeGhs)} ctx="Paystack's fee, on average" />
                    </div>
                    {ps.estimatedFees > 0 && <p className="xs muted" style={{ marginTop: 8 }}>{plural(ps.estimatedFees, "payment")} had no fee stored, so theirs is estimated.</p>}
                </div>}
            </Card>

            <Card title="Payouts to your bank" action={<Badge plain>From Paystack</Badge>}>
                {!d.paystack.settlements.ok ? <ErrorState what="payouts" body="Paystack didn't answer. Nothing was changed." /> : <Settlements rows={d.paystack.settlements.main} />}
            </Card>

            {d.admin && <Card title="Admin payout account" action={<Badge plain>Only admins see this</Badge>}>
                <div className="card-body stack">
                    <div className="grid-3">
                        <Kpi label="Owed to the admin" value={d.admin.ledger.ok ? ghs(Math.max(0, d.admin.ledger.data.owedGhs)) : "—"} ctx="from the payout ledger" />
                        <Kpi label="Sent this month" value={d.admin.ledger.ok ? ghs(d.admin.ledger.data.paidMonthGhs) : "—"} ctx="by split or by hand" />
                        <Kpi label="Sent since recording began" value={d.admin.ledger.ok ? ghs(d.admin.ledger.data.takenGhs) : "—"} ctx={d.admin.ledger.ok ? plural(d.admin.ledger.data.rows, "payment") : "—"} />
                    </div>
                    <div><BtnLink sm href="/tools">Open Payouts in Admin tools</BtnLink></div>
                </div>
                {d.admin.settlements === null ? <ErrorState what="the admin account's payouts" /> : <Settlements rows={d.admin.settlements} admin />}
            </Card>}

            <ConfirmPanel open={capOpen} onClose={() => setCapOpen(false)} title="Set a monthly cap" tone="warn" confirmLabel={busy === "cap" ? "Saving…" : "Save cap"} busy={busy === "cap"}
                consequenceTitle="At the cap" consequence="The AI assistants pause until the next period. Order messages to customers keep going."
                onConfirm={() => void saveCap(cap)}>
                <div className="field"><label className="label" htmlFor="cap-amt">Cap a period</label><Money id="cap-amt" value={cap} onChange={setCap} /></div>
                {bill && <p className="sm muted">Suggested: {ghs(bill.proposal.capGhs)}. {bill.proposal.why}</p>}
            </ConfirmPanel>
        </>
    );
}
