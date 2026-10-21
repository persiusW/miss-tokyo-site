"use client";

// Billing, as designed, with preview figures (owner decision: static until
// billing is set up). Nothing here reads or writes live data; every control
// either opens its panel or says that nothing was changed.
import { useState } from "react";
import { Badge, Banner, Btn, Card, Modal, PageHeader, Panel, RadioCards, SRow, Switch, ghs, ghs0, toast } from "@/components/admin/ui";
import { BILLING_PREVIEW as B, NOT_CONNECTED } from "./billingPreview";
import "./billing.css";

const notConnected = () => toast.info(NOT_CONNECTED);

export function BillingPage() {
    const [stopping, setStopping] = useState(false);
    const [method, setMethod] = useState(false);
    const [pick, setPick] = useState<string>(B.paymentMethods[0].v);
    const C = B.costs;
    const aiPct = Math.min(100, (C.aiUsed / C.aiAllowance) * 100);

    return (
        <>
            <PageHeader title="Billing" sub="Your Miss Tokyo plan, and what the shop spends on payments, messages and AI."
                actions={<Btn kind="primary" icon="download" onClick={notConnected}>Download receipts</Btn>} />

            <Banner tone="info" title="Billing isn't connected yet">
                These figures are a preview of the design. Your real plan, running costs and receipts will show here once billing is set up.
            </Banner>

            <div className="split">
                <Card>
                    <div className="card-body stack">
                        <div className="hrow between wrap">
                            <div>
                                <div className="kpi-label">Your plan</div>
                                <div className="kpi-value">{B.plan}</div>
                            </div>
                            <Badge tone={B.autoRenew ? "ok" : "warn"}>{B.autoRenew ? "Renews automatically" : `Ends ${B.nextPayment}`}</Badge>
                        </div>
                        <ul className="ink2 bil-includes">{B.includes.map(x => <li key={x}>{x}</li>)}</ul>
                    </div>
                    <div className="rows bil-plan-rows">
                        <SRow label="Next payment" help={`${ghs(B.price)} on ${B.nextPayment}, plus any AI use above the daily limit.`}>
                            <span className="strong">{ghs(B.price)}</span>
                        </SRow>
                        <SRow label="Renew automatically" help={B.autoRenew ? `We charge ${B.method} on ${B.nextPayment}.` : `Your plan ends on ${B.endsOn}. The assistants switch off and the admin stays open.`}>
                            <Switch label="Renew automatically" checked={B.autoRenew} onChange={v => { if (!v) setStopping(true); else notConnected(); }} />
                        </SRow>
                        <SRow label="Payment method" help={B.method}>
                            <Btn sm onClick={() => setMethod(true)}>Change</Btn>
                        </SRow>
                    </div>
                </Card>

                <Card title="This month's running costs">
                    <div className="rows">
                        <SRow label="Paystack fees" help="1.95% of card and Mobile money payments. Taken before money reaches your bank.">
                            <span className="strong">{ghs(C.paystackFees)}</span>
                        </SRow>
                        <SRow label="SMS" help={`${ghs(C.smsSpent)} spent · ${ghs(C.smsCredit)} credit left`}>
                            <Btn sm onClick={notConnected}>Top up</Btn>
                        </SRow>
                        <SRow label="WhatsApp messages" help={<span className="bil-warn">{ghs(C.whatsappCredit)} credit left, about {C.whatsappDaysLeft} days</span>}>
                            <Btn sm onClick={notConnected}>Top up</Btn>
                        </SRow>
                        <SRow label="AI use" help={`${ghs(C.aiUsed)} of the ${ghs0(C.aiAllowance)} included this month`}>
                            <div className="bil-bar" role="img" aria-label={`${Math.round(aiPct)}% of this month's AI allowance used`}>
                                <div className="bar-track"><div className="bar-fill" style={{ width: `${aiPct}%` }} /></div>
                            </div>
                        </SRow>
                    </div>
                </Card>
            </div>

            <Card title="Payment history">
                <div className="tbl-wrap">
                    <table className="tbl">
                        <thead>
                            <tr><th>Date</th><th>What for</th><th className="hide-sm">Receipt number</th><th className="r">Amount</th><th className="r"><span className="sr">Receipt</span></th></tr>
                        </thead>
                        <tbody>
                            {B.history.map(h => (
                                <tr key={h.no}>
                                    <td className="nowrap">{h.date}</td>
                                    <td>{h.desc}<div className="xs muted"><Badge tone="ok">Paid</Badge></div></td>
                                    <td className="hide-sm">{h.no}</td>
                                    <td className="r strong nowrap">{ghs(h.amount)}</td>
                                    <td className="r"><Btn sm kind="ghost" icon="download" aria-label={`Receipt ${h.no}`} onClick={notConnected}>Receipt</Btn></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal open={stopping} onClose={() => setStopping(false)} title="Stop renewing your plan?"
                footer={<>
                    <Btn kind="ghost" onClick={() => setStopping(false)}>Keep renewing</Btn>
                    <Btn kind="danger-solid" onClick={() => { setStopping(false); notConnected(); }}>Stop renewing</Btn>
                </>}>
                <p className="ink2">Your plan ends on {B.endsOnLong}. After that, Miss Tokyo AI and the shop assistant switch off on the website and WhatsApp. The admin, the shop and your orders keep working.</p>
            </Modal>

            <Panel open={method} onClose={() => setMethod(false)} title="Payment method" sub="Used for your plan and any AI use above the limit."
                footer={<>
                    <Btn kind="ghost" onClick={() => setMethod(false)}>Cancel</Btn>
                    <Btn kind="primary" onClick={() => { setMethod(false); notConnected(); }}>Save</Btn>
                </>}>
                <RadioCards label="Payment method" value={pick} onChange={setPick} options={B.paymentMethods.map(m => ({ v: m.v, title: m.title, desc: m.desc }))} />
            </Panel>
        </>
    );
}
