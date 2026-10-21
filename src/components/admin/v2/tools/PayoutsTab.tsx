"use client";

import { useEffect, useState } from "react";
import { Badge, Banner, Btn, Card, ConfirmPanel, Empty, ErrorState, Field, Kpi, Money, Panel, Percent, RadioCards, Seg, Select, ghs, plural, when } from "@/components/admin/ui";
import { SHARE_MODES, SHARE_MODE_TEXT, shareDue, type ShareMode } from "@/lib/billing/payoutRules";
import { canRetireSplits, cutoverStage, type CutoverCheck, type Stage } from "@/lib/billing/cutover";
import type { Bank, Split } from "@/lib/paystack/api";
import type { LedgerView, PayoutsData } from "./data";
import { adoptSplitSubaccount, checkFirstPayment, checkPayoutAccount, listPayoutBanks, recordManualPayout, savePayoutAccount, savePayoutBearer, saveShareRule, setOldSplitActive, setPayoutSplitLive } from "./actions";
import { useRun } from "./useRun";

const OUTCOME: Record<string, [string, "ok" | "warn" | "neutral" | "info"]> = {
    paid_by_split: ["Paid by split", "ok"], owed: ["Owed", "warn"], no_share: ["No share", "neutral"], manual_payment: ["Paid by hand", "info"],
};
const REASON: Record<string, string> = {
    switch_off: "automatic share off, nothing split", no_account: "no admin payout account stored", small: "payment of GH₵ 5 or less", split_failed: "Paystack refused the split",
};
const STAGE_TEXT: Record<Stage, string> = {
    no_account: "No admin payout account yet", ready: "Paystack split (as before)", awaiting_payment: "Waiting for the first payment",
    check_failed: "First payment didn't match", checked: "First payment matched", retired: "Old split turned off",
};

/** Order 3512F7BD, read from live Paystack on 2026-10-21. */
const EX = { ref: "3512F7BD", goods: 100, delivery: 35, fee: 2.5, total: 137.5, charged: 140.24, paystack: 2.74 };

const p2 = (p: number | null) => (p == null ? "—" : ghs(p / 100));

function CheckResult({ c }: { c: CutoverCheck }) {
    return (
        <div className="stack-sm" style={{ marginTop: 8 }}>
            <Banner tone={c.ok ? "ok" : "danger"} title={c.ok ? "Matched to the pesewa" : "It didn't match"}>
                Payment <span className="tl-mono">{c.reference}</span>, checked {when(c.checkedAt)}. {c.customerPaidFee ? "The customer paid Paystack's fee on top." : "The shop bore Paystack's fee."}
                {!c.ok && " Go back to the Paystack split below while this is looked at."}
            </Banner>
            <div className="tbl-wrap"><table className="tbl">
                <thead><tr><th>Who</th><th className="r">Planned</th><th className="r">Paystack</th></tr></thead>
                <tbody>
                    <tr><td>Admin payout account</td><td className="r">{p2(c.expected.subP)}</td><td className={`r strong ${c.actual.subP === c.expected.subP ? "tl-ok" : "tl-danger"}`}>{p2(c.actual.subP)}</td></tr>
                    <tr><td>Main account</td><td className="r">{p2(c.expected.mainP)}</td><td className={`r strong ${c.actual.mainP === c.expected.mainP ? "tl-ok" : "tl-danger"}`}>{p2(c.actual.mainP)}</td></tr>
                    <tr><td>Paystack</td><td className="r">—</td><td className="r">{p2(c.actual.paystackP)}</td></tr>
                </tbody>
            </table></div>
        </div>
    );
}

const SOURCE: Record<string, string> = { checkout: "Online order", pos: "POS pay link", invoice: "Invoice link", other: "Other" };

function SplitCard({ split, current, onAdopt, adopting }: { split: Split; current: string | null; onAdopt?: (code: string, name: string) => void; adopting?: boolean }) {
    return (
        <div className="stack-sm">
            <div className="hrow between wrap">
                <div>
                    <div className="strong">{split.name || "Unnamed split"}</div>
                    <div className="tl-mono muted">{split.code}</div>
                </div>
                <div className="hrow-sm wrap">
                    <Badge tone={split.active ? "ok" : "neutral"}>{split.active ? "Active" : "Inactive"}</Badge>
                    <Badge plain>{split.type === "percentage" ? "By percentage" : split.type === "flat" ? "Fixed amounts" : split.type || "Split"}</Badge>
                    <Badge plain>{split.bearerType === "subaccount" ? "Paystack fee charged to the subaccount" : split.bearerType === "account" ? "Paystack fee charged to the main account" : `Fee: ${split.bearerType || "—"}`}</Badge>
                </div>
            </div>
            <div className="tl-split">
                {split.shares.map(s => (
                    <div className="tl-share" key={s.subaccountCode || s.businessName}>
                        <div className="tl-pct">{split.type === "flat" ? ghs(s.share / 100) : `${s.share}%`}</div>
                        <div className="strong">{s.businessName || "Subaccount"}</div>
                        <div className="sm muted">{[s.bank, s.account, s.accountName].filter(Boolean).join(" · ")}</div>
                        {s.subaccountCode === current
                            ? <div className="xs tl-ok" style={{ marginTop: 6 }}>Stored as the admin payout account</div>
                            : onAdopt && s.subaccountCode && <Btn sm kind="ghost" disabled={adopting} onClick={() => onAdopt(s.subaccountCode, s.businessName)}>Use as the admin payout account</Btn>}
                    </div>
                ))}
                {split.shares.length === 0 && <p className="sm muted">No subaccounts in this split.</p>}
            </div>
        </div>
    );
}

function AccountPanel({ open, onClose, replacing }: { open: boolean; onClose: () => void; replacing: boolean }) {
    const { busy, run } = useRun();
    const [type, setType] = useState<"mobile_money" | "ghipss">("mobile_money");
    const [banks, setBanks] = useState<{ mobileMoney: Bank[]; banks: Bank[] } | null>(null);
    const [bankErr, setBankErr] = useState(false);
    const [bank, setBank] = useState("");
    const [num, setNum] = useState("");
    const [name, setName] = useState<string | null>(null);
    const [business, setBusiness] = useState("Admin payout account");
    const load = async () => {
        setBankErr(false);
        const r = await listPayoutBanks().catch(() => null);
        if (r && r.ok) setBanks({ mobileMoney: r.mobileMoney, banks: r.banks }); else setBankErr(true);
    };
    useEffect(() => {
        if (!open || banks) return;
        let live = true;
        listPayoutBanks().then(r => { if (!live) return; if (r.ok) setBanks({ mobileMoney: r.mobileMoney, banks: r.banks }); else setBankErr(true); }).catch(() => live && setBankErr(true));
        return () => { live = false; };
    }, [open, banks]);
    const list = (type === "mobile_money" ? banks?.mobileMoney : banks?.banks) ?? [];
    const bankName = list.find(b => b.code === bank)?.name ?? "";
    const reset = () => { setName(null); };
    return (
        <Panel open={open} onClose={onClose} title={replacing ? "Replace the admin payout account" : "Add the admin payout account"}
            sub="Where the admin share is paid. Paystack checks the account before anything is saved."
            footer={<>
                <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
                {name
                    ? <Btn kind="danger-solid" disabled={!!busy} onClick={() => run("save", () => savePayoutAccount({ bankCode: bank, bankName, accountNumber: num, businessName: business }), "Admin payout account saved.").then(r => { if (r) onClose(); })}>{busy === "save" ? "Saving…" : "Save payout account"}</Btn>
                    : <Btn kind="primary" disabled={!!busy || !bank || num.replace(/\D/g, "").length < 6} onClick={() => run("check", () => checkPayoutAccount({ bankCode: bank, accountNumber: num }), r => setName(r.accountName))}>{busy === "check" ? "Checking…" : "Check account"}</Btn>}
            </>}>
            <div className="stack">
                <Field label="Paid to">
                    <Seg label="Paid to" value={type} onChange={v => { setType(v); setBank(""); reset(); }} options={[{ v: "mobile_money", l: "Mobile money" }, { v: "ghipss", l: "Bank account" }]} />
                </Field>
                {bankErr && <Banner tone="warn" title="We couldn't load the networks and banks from Paystack" actionLabel="Try again" onAction={load} />}
                <Field label={type === "mobile_money" ? "Network" : "Bank"} htmlFor="po-bank">
                    <Select id="po-bank" value={bank} onChange={v => { setBank(v); reset(); }} options={[{ v: "", l: banks ? "Choose one" : "Loading…" }, ...list.map(b => ({ v: b.code, l: b.name }))]} />
                </Field>
                <Field label={type === "mobile_money" ? "Mobile money number" : "Account number"} htmlFor="po-num" help="Digits only.">
                    <input id="po-num" className="input" inputMode="numeric" autoComplete="off" value={num} onChange={e => { setNum(e.target.value.replace(/[^\d]/g, "")); reset(); }} />
                </Field>
                <Field label="Name for this payout account" htmlFor="po-biz" help="Shown in Paystack next to the account.">
                    <input id="po-biz" className="input" maxLength={80} value={business} onChange={e => setBusiness(e.target.value)} />
                </Field>
                {name && <Banner tone="ok" title={`Paystack says this account belongs to ${name}`}>If that's right, save it. {replacing ? "The stored payout account is repointed to this one; payments already split keep the old account." : "It becomes the admin payout account."}</Banner>}
            </div>
        </Panel>
    );
}

function LedgerTable({ rows }: { rows: LedgerView[] }) {
    if (!rows.length) return <Empty icon="cash" title="No payments recorded yet" body="Every paid online payment with a processing fee adds a row here: the admin share it earned, what Paystack sent to the admin account, and why not when it didn't." />;
    return (
        <div className="tbl-wrap">
            <table className="tbl">
                <thead><tr><th>When</th><th>Payment</th><th className="r hide-sm">Amount</th><th className="r hide-sm">Fee</th><th className="r">Share</th><th className="r">Sent</th><th>Result</th></tr></thead>
                <tbody>{rows.map(r => {
                    const [l, t] = OUTCOME[r.outcome] ?? [r.outcome, "neutral"];
                    return (
                        <tr key={r.id}>
                            <td className="nowrap">{when(r.paid_at)}</td>
                            <td>{r.kind === "manual" ? (r.note || "Paid by hand") : <>{SOURCE[r.source ?? "other"] ?? "Payment"}{r.order_ref ? ` · ${r.order_ref}` : ""}</>}<div className="xs muted tl-mono">{r.kind === "manual" ? "" : r.reference}</div></td>
                            <td className="r hide-sm nowrap">{r.kind === "manual" ? "—" : ghs(r.amount_ghs)}</td>
                            <td className="r hide-sm nowrap">{r.kind === "manual" ? "—" : ghs(r.fee_ghs)}</td>
                            <td className="r nowrap">{r.kind === "manual" ? "—" : ghs(r.share_due_ghs)}</td>
                            <td className="r nowrap strong">{ghs(r.taken_ghs)}</td>
                            <td><Badge tone={t}>{l}</Badge>{r.skip_reason && <div className="xs muted">{REASON[r.skip_reason] ?? r.skip_reason}</div>}</td>
                        </tr>
                    );
                })}</tbody>
            </table>
        </div>
    );
}

export function PayoutsTab({ d }: { d: PayoutsData }) {
    const { busy, run } = useRun();
    const s = d.settings;
    const [acctOpen, setAcctOpen] = useState(false);
    const [adopt, setAdopt] = useState<{ code: string; name: string } | null>(null);
    const [switching, setSwitching] = useState<boolean | null>(null);
    const [manual, setManual] = useState(false);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [mode, setMode] = useState<ShareMode>(s.shareMode);
    const [pct, setPct] = useState(String(s.sharePct));
    const [min, setMin] = useState(String(s.payoutMinGhs));
    const ruleDirty = mode !== s.shareMode || pct !== String(s.sharePct) || min !== String(s.payoutMinGhs);
    const [waiting, setWaiting] = useState(false);
    const [allSettled, setAllSettled] = useState(false);
    const [splitAsk, setSplitAsk] = useState<{ code: string; name: string; active: boolean } | null>(null);
    const stage = cutoverStage({ live: s.payoutSplitLive, hasAccount: !!s.adminSubaccountCode, cutover: s.cutover, envSplitCode: d.envSplitCode });
    const check = s.cutover.check && (!s.cutover.liveAt || s.cutover.check.checkedAt >= s.cutover.liveAt) ? s.cutover.check : null;
    const retirable = [...(d.envSplit.ok && d.envSplit.data ? [d.envSplit.data] : []), ...(d.otherSplits.ok ? d.otherSplits.data.filter(x => x.active || s.cutover.retired?.[x.code]) : [])];
    const L = d.ledger.ok ? d.ledger.data : null;

    return (
        <>
            <div className="grid-4">
                <Kpi label="Owed to the admin now" value={L ? ghs(Math.max(0, L.totals.owedGhs)) : "—"} ctx={L ? (L.totals.owedGhs > 0 ? "rides on the next payments over GH₵ 5" : "nothing outstanding") : "couldn't read the ledger"} />
                <Kpi label="Sent this month" value={L ? ghs(L.totals.paidMonthGhs) : "—"} ctx="to the admin payout account, by split or by hand" />
                <Kpi label="Sent since recording began" value={L ? ghs(L.totals.takenGhs) : "—"} ctx={L ? plural(L.totals.rows, "ledger row") : "—"} />
                <Kpi label="Payouts run from" value={s.payoutSplitLive ? "The dashboard" : "Paystack split"} ctx={STAGE_TEXT[stage]} />
            </div>

            <Card title="The site's Paystack split today" action={<Badge plain>Read from Paystack</Badge>}>
                <div className="card-body stack">
                    {!d.paystackConnected ? <Banner tone="warn" title="Paystack isn't set up on this server">PAYSTACK_SECRET_KEY is missing, so nothing can be read.</Banner>
                        : !d.envSplitCode ? <Banner tone="info" title="The site doesn't use a split">PAYSTACK_SPLIT_CODE is empty, so online payments go wholly to the main account unless the automatic share is on.</Banner>
                            : !d.envSplit.ok ? <Banner tone="warn" title="We couldn't read the split from Paystack">Paystack didn't answer. Nothing was changed. Open this tab again in a moment.</Banner>
                                : d.envSplit.data && <>
                                    <p className="sm ink2">Every online payment over GH₵ 5 uses this split today (it is set by hand in Paystack and named by the PAYSTACK_SPLIT_CODE setting). It is shown here, never changed here.</p>
                                    <SplitCard split={d.envSplit.data} current={s.adminSubaccountCode} onAdopt={(code, name) => setAdopt({ code, name })} adopting={busy === "adopt"} />
                                </>}
                    {d.otherSplits.ok && d.otherSplits.data.length > 0 && (
                        <div className="stack-sm">
                            <div className="section-t">Other splits in the Paystack account (not used by the site)</div>
                            {d.otherSplits.data.map(sp => <div key={sp.code} className="tl-share"><SplitCard split={sp} current={s.adminSubaccountCode} /></div>)}
                        </div>
                    )}
                </div>
            </Card>

            <div className="grid-2">
                <Card title="Admin payout account" action={<Btn sm kind={s.adminSubaccountCode ? "ghost" : "primary"} icon={s.adminSubaccountCode ? "edit" : "plus"} onClick={() => setAcctOpen(true)}>{s.adminSubaccountCode ? "Replace" : "Add"}</Btn>}>
                    <div className="card-body stack-sm">
                        {s.adminSubaccountCode ? <>
                            <div className="strong">{s.adminSubaccountLabel || "Stored"}</div>
                            <div className="tl-mono muted">{s.adminSubaccountCode}</div>
                            {d.adminAccount.ok && d.adminAccount.data && <div className="sm muted">Paystack: {[d.adminAccount.data.businessName, d.adminAccount.data.bank, d.adminAccount.data.account].filter(Boolean).join(" · ")}{d.adminAccount.data.active ? "" : " · inactive"}</div>}
                            {!d.adminAccount.ok && <div className="sm tl-warn">Paystack didn't answer, so its details aren't shown.</div>}
                            {s.adminSubaccountSetAt && <div className="xs muted">Set {when(s.adminSubaccountSetAt)}</div>}
                        </> : <p className="sm ink2">None stored yet. Add one, or use the subaccount the site's split already pays (above). Only the admin can change it.</p>}
                    </div>
                </Card>
                <Card title="Main payout account">
                    <div className="card-body stack-sm">
                        <p className="sm ink2">Miss Tokyo's own money settles to the bank account set in the shop's Paystack dashboard. It is read-only here: change it in Paystack.</p>
                        {d.balance.ok && d.balance.data.length > 0 && <div><span className="muted sm">Waiting to settle: </span><span className="strong">{d.balance.data.map(b => ghs(b.balanceGhs)).join(" · ")}</span></div>}
                        {d.settlements.ok && d.settlements.main[0] && <div className="sm"><span className="muted">Last settlement: </span>{ghs(d.settlements.main[0].amountGhs)} · {when(d.settlements.main[0].settledAt)}</div>}
                        {!d.settlements.ok && <div className="sm tl-warn">Paystack didn't answer, so settlements aren't shown.</div>}
                    </div>
                </Card>
            </div>

            <Card title="Payouts from the dashboard" action={<Badge tone={stage === "retired" || stage === "checked" ? "ok" : stage === "check_failed" ? "danger" : s.payoutSplitLive ? "info" : "neutral"}>{STAGE_TEXT[stage]}</Badge>}>
                <div className="card-body stack">
                    <p className="sm ink2">The dashboard becomes the one place the admin share is set. Each step asks first, is logged, and can be undone. What customers pay never changes.</p>
                    <ol className="steps-list stack">
                        <li className="tl-step">
                            <div className="grow">
                                <div className="strong">1. Use the dashboard for payouts</div>
                                <div className="sm muted">Checkout, POS pay links and invoice links stop sending the site's Paystack split and send the admin share from the rule below to the admin payout account (subaccount and transaction charge). Payments of GH₵ {s.payoutMinGhs.toFixed(2)} or less carry no split; their share is recorded as owed and rides on a later payment.</div>
                            </div>
                            {s.payoutSplitLive
                                ? <Badge tone="ok">On since {s.cutover.liveAt ? when(s.cutover.liveAt) : "—"}</Badge>
                                : <Btn kind="primary" disabled={!!busy || !s.adminSubaccountCode} onClick={() => setSwitching(true)}>{s.adminSubaccountCode ? "Use the dashboard" : "Add the payout account first"}</Btn>}
                        </li>
                        <li className="tl-step">
                            <div className="grow">
                                <div className="strong">2. Check the first payment</div>
                                <div className="sm muted">After the next real online payment over GH₵ {s.payoutMinGhs.toFixed(2)}, ask Paystack how it actually split it. Green only when the admin and main shares match the plan to the pesewa.</div>
                                {check && <CheckResult c={check} />}
                                {waiting && !check && <div className="sm tl-warn" style={{ marginTop: 6 }}>No payment carrying the dashboard's split has landed since step 1. Try again after the next online order.</div>}
                            </div>
                            <Btn disabled={!!busy || !s.payoutSplitLive} onClick={() => run("check", () => checkFirstPayment(), r => { setWaiting(r.waiting); })}>{busy === "check" ? "Asking Paystack…" : check ? "Check again" : "Check the first payment"}</Btn>
                        </li>
                        <li className="tl-step">
                            <div className="grow">
                                <div className="strong">3. Turn off the old Paystack split</div>
                                <div className="sm muted">Only once step 2 is green. The split group is switched off in Paystack, never deleted, and "Turn back on" undoes it.</div>
                                <div className="stack-sm" style={{ marginTop: 8 }}>
                                    {retirable.map(sp => {
                                        const off = !!s.cutover.retired?.[sp.code] || !sp.active;
                                        return (
                                            <div key={sp.code} className="hrow between wrap tl-share">
                                                <div><div className="strong sm">{sp.name || sp.code}{sp.code === d.envSplitCode ? " (the one the site used)" : " (not used by the site)"}</div><div className="tl-mono muted">{sp.code}</div></div>
                                                {off
                                                    ? <div className="hrow-sm"><Badge>Off</Badge><Btn sm kind="ghost" disabled={!!busy} onClick={() => setSplitAsk({ code: sp.code, name: sp.name, active: true })}>Turn back on</Btn></div>
                                                    : <Btn sm kind="danger" disabled={!!busy || !canRetireSplits(stage)} onClick={() => setSplitAsk({ code: sp.code, name: sp.name, active: false })}>Turn off</Btn>}
                                            </div>
                                        );
                                    })}
                                    {retirable.length === 0 && <div className="sm muted">No split groups to turn off{!d.envSplit.ok || !d.otherSplits.ok ? " (Paystack didn't answer)" : ""}.</div>}
                                </div>
                            </div>
                        </li>
                    </ol>
                    {s.payoutSplitLive && (
                        <Banner tone="neutral" title="Something not right?" action={<Btn sm kind="danger" disabled={!!busy} onClick={() => setSwitching(false)}>Go back to the Paystack split</Btn>}>
                            Payments go back to the site's Paystack split exactly as before{Object.keys(s.cutover.retired ?? {}).length ? ", once the old split is turned back on (step 3)" : ""}. Shares not sent are kept as owed.
                        </Banner>
                    )}
                </div>
            </Card>

            <Card title="Admin share rule">
                <div className="card-body stack">
                    <RadioCards label="How the admin share is worked out" value={mode} onChange={setMode}
                        options={SHARE_MODES.map(m => ({ v: m, title: SHARE_MODE_TEXT[m].title + (m === "pct_of_order_total" ? " (today)" : ""), desc: SHARE_MODE_TEXT[m].desc }))} />
                    <div className="tl-inline">
                        {(mode === "pct_of_order_total" || mode === "custom_pct") && <Field label={mode === "pct_of_order_total" ? "Share of the order total" : "Share of the goods"} htmlFor="po-pct"><Percent id="po-pct" value={pct} onChange={setPct} /></Field>}
                        <Field label="No split on payments of" htmlFor="po-min" help="Or less. Their share stays owed and rides on a later payment."><Money id="po-min" value={min} onChange={setMin} /></Field>
                    </div>
                    <div>
                        <div className="section-t">Worked example: order {EX.ref}</div>
                        <p className="xs muted" style={{ marginBottom: 8 }}>Goods {ghs(EX.goods)} + delivery {ghs(EX.delivery)} + processing fee {ghs(EX.fee)} = {ghs(EX.total)} asked. The customer paid {ghs(EX.charged)}: Paystack's {ghs(EX.paystack)} on top.</p>
                        <div className="tbl-wrap"><table className="tbl">
                            <thead><tr><th>Rule</th><th className="r">Admin gets</th><th className="r">Main account gets</th></tr></thead>
                            <tbody>{SHARE_MODES.map(m => {
                                const a = shareDue({ mode: m, pct: m === mode ? Number(pct) || 0 : m === "pct_of_order_total" ? 2.5 : Number(pct) || 0, paystackPct: s.paystackFeePct }, { totalGhs: EX.total, feeGhs: EX.fee, baseGhs: EX.goods });
                                return <tr key={m} className={m === mode ? "tl-picked" : ""}><td>{SHARE_MODE_TEXT[m].title}{m === mode ? " (picked)" : ""}</td><td className="r strong">{ghs(a)}</td><td className="r">{ghs(Math.round((EX.total - a) * 100) / 100)}</td></tr>;
                            })}</tbody>
                        </table></div>
                    </div>
                    <Field label="Who Paystack books its fee to" help="On the dashboard's split. The main account, as today: customers pay Paystack's fee on top, so the admin's share arrives whole. Whether customers pay the fee is a Paystack account preference; it can't be changed from here.">
                        <Seg label="Who Paystack books its fee to" value={s.payoutBearer} onChange={v => run("bearer", () => savePayoutBearer(v), "Saved.")} options={[{ v: "account", l: "Main account" }, { v: "subaccount", l: "Admin subaccount" }]} />
                    </Field>
                    <div className="tl-note sm">Paystack's own fee is paid by customers on top of the order total today, and the site's split takes 2.5% of the whole order total (delivery and the processing fee included). So the admin receives a little more than the processing fee collected, and the main account covers the difference. The default rule keeps exactly that, so switching to the dashboard changes nothing anyone receives.</div>
                    <div><Btn kind="primary" disabled={!ruleDirty || !!busy} onClick={() => run("rule", () => saveShareRule({ mode, pct, minGhs: min }), "Admin share rule saved.")}>{busy === "rule" ? "Saving…" : "Save the rule"}</Btn></div>
                </div>
            </Card>

            <Card title="Payout ledger" action={<Btn sm kind="ghost" icon="plus" onClick={() => setManual(true)}>Record a payment by hand</Btn>}>
                {!d.ledger.ok ? <ErrorState what="the payout ledger" body="Nothing was changed. Open this tab again in a moment." /> : <LedgerTable rows={L!.rows} />}
            </Card>

            <Card title="Settlements to the admin payout account" action={<Badge plain>Read from Paystack</Badge>}>
                {!d.settlements.ok ? <ErrorState what="settlements" body="Paystack didn't answer. Nothing was changed." />
                    : d.settlements.admin.length === 0 ? <Empty icon="bank" title="No settlements to the admin account in Paystack's latest 50" body="Money the admin subaccount received shows here once Paystack pays it out." />
                        : <div className="tbl-wrap"><table className="tbl">
                            <thead><tr><th>Settled</th><th>Status</th><th className="r">Amount</th><th className="r">Paystack fees</th></tr></thead>
                            <tbody>{d.settlements.admin.slice(0, allSettled ? undefined : 10).map(x => <tr key={x.id}><td>{when(x.settledAt)}</td><td>{x.status}</td><td className="r strong">{ghs(x.amountGhs)}</td><td className="r">{x.feesGhs == null ? "—" : ghs(x.feesGhs)}</td></tr>)}</tbody>
                        </table></div>}
                {d.settlements.ok && d.settlements.admin.length > 10 && <div className="card-body"><Btn sm kind="ghost" onClick={() => setAllSettled(v => !v)}>{allSettled ? "Show fewer" : `Show all ${d.settlements.admin.length}`}</Btn></div>}
            </Card>

            <AccountPanel open={acctOpen} onClose={() => setAcctOpen(false)} replacing={!!s.adminSubaccountCode} />

            <ConfirmPanel open={!!adopt} onClose={() => setAdopt(null)} title="Use this subaccount as the admin payout account?" sub={adopt?.name}
                tone="warn" consequenceTitle="Nothing changes in Paystack" confirmLabel={busy === "adopt" ? "Saving…" : "Use this account"} busy={busy === "adopt"}
                consequence="The subaccount the site's split already pays is stored as the admin payout account. The automatic share, when switched on, pays it directly."
                onConfirm={() => adopt && run("adopt", () => adoptSplitSubaccount(adopt.code), "Admin payout account stored.").then(() => setAdopt(null))} />

            <ConfirmPanel open={switching !== null} onClose={() => setSwitching(null)} title={switching ? "Use the dashboard for payouts?" : "Go back to the Paystack split?"}
                tone={switching ? "danger" : "warn"} confirmLabel={switching ? "Switch on" : "Switch off"} busy={busy === "switch"}
                consequenceTitle={switching ? "From the next payment" : "Back to the site's split"}
                consequence={switching
                    ? "Checkout, POS pay links and invoice links carry a split that sends the admin share straight to the admin payout account, instead of the site's Paystack split. What customers pay doesn't change. If Paystack refuses a split, the payment goes through without it and the share is recorded as owed."
                    : "Payments use the site's Paystack split again. Shares not sent are recorded as owed."}
                onConfirm={() => switching !== null && run("switch", () => setPayoutSplitLive(switching), switching ? "Automatic share on." : "Automatic share off.").then(() => setSwitching(null))} />

            <ConfirmPanel open={!!splitAsk} onClose={() => setSplitAsk(null)} title={splitAsk?.active ? "Turn this split back on?" : "Turn off this Paystack split?"} sub={splitAsk ? `${splitAsk.name || ""} ${splitAsk.code}`.trim() : undefined}
                tone={splitAsk?.active ? "warn" : "danger"} confirmLabel={splitAsk?.active ? "Turn back on" : "Turn off"} busy={busy === "split"}
                consequenceTitle={splitAsk?.active ? "It can be used again" : "Payments stop using it"}
                consequence={splitAsk?.active ? "The split group is active again in Paystack. With the dashboard off, the site sends it again from the next payment." : "The split group is switched off in Paystack (not deleted). The site never sends a split that is off. The dashboard's own split keeps paying the admin."}
                onConfirm={() => splitAsk && run("split", () => setOldSplitActive(splitAsk.code, splitAsk.active), splitAsk.active ? "Split turned back on." : "Split turned off.").then(() => setSplitAsk(null))} />

            <Panel open={manual} onClose={() => setManual(false)} title="Record a payment made by hand" sub="A transfer or cash paid to the admin outside Paystack. It comes off what is owed."
                footer={<><Btn kind="ghost" onClick={() => setManual(false)}>Cancel</Btn><Btn kind="primary" disabled={!!busy} onClick={() => run("manual", () => recordManualPayout({ amount, note }), "Payment recorded.").then(r => { if (r) { setManual(false); setAmount(""); setNote(""); } })}>{busy === "manual" ? "Saving…" : "Record payment"}</Btn></>}>
                <div className="stack">
                    <Field label="Amount paid" htmlFor="mp-amt"><Money id="mp-amt" value={amount} onChange={setAmount} /></Field>
                    <Field label="How it was paid" htmlFor="mp-note" help="For example: MoMo transfer 21 Oct, ref 1234."><input id="mp-note" className="input" maxLength={300} value={note} onChange={e => setNote(e.target.value)} /></Field>
                </div>
            </Panel>
        </>
    );
}
