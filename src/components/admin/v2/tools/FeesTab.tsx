"use client";

import { useState } from "react";
import { Badge, Banner, Btn, Card, ErrorState, Percent, SRow, Switch, ghs } from "@/components/admin/ui";
import type { FeesData } from "./data";
import { saveFees } from "./actions";
import { useRun } from "./useRun";

/** Every place a customer is asked for money online, and what each adds. */
const WHERE: [string, string][] = [
    ["Shop checkout", "Adds the fee on the goods after discounts. Delivery isn't charged the fee."],
    ["Ask Miss Tokyo and the WhatsApp assistant", "Their Pay now links go through the same checkout, so the same fee."],
    ["POS pay links", "Adds the fee on the goods after discounts. Cash sales carry no fee."],
    ["Invoice and quote pay links", "Adds the fee on the invoice total."],
];

export function FeesTab({ d }: { d: FeesData | null }) {
    const { busy, run } = useRun();
    const [pct, setPct] = useState(String(d?.fee?.pct ?? ""));
    const [label, setLabel] = useState(d?.fee?.label ?? "");
    const [show, setShow] = useState(d?.fee?.showLine ?? true);
    const [ps, setPs] = useState(String(d?.paystackPct ?? "1.95"));
    if (!d || !d.fee) return <Card><ErrorState what="the fee settings" body="Nothing was changed. Open this tab again in a moment." /></Card>;
    const dirty = pct !== String(d.fee.pct) || label !== d.fee.label || show !== d.fee.showLine || ps !== String(d.paystackPct);
    const ex = Math.round(100 * (Number(pct) || 0)) / 100;

    return (
        <>
            <Card title="Processing fee" action={<Badge plain>Admin only</Badge>}>
                <div className="rows">
                    <SRow label="Processing fee" help={`Added to every online order, pay link and invoice link. On GH₵ 100 of goods the customer is asked for GH₵ ${(100 + ex).toFixed(2)}. 0 turns it off.`}>
                        <Percent label="Processing fee" value={pct} onChange={setPct} />
                    </SRow>
                    <SRow label="What the fee is called" help="Shown at checkout and on the receipt.">
                        <input className="input" aria-label="What the fee is called" maxLength={60} value={label} onChange={e => setLabel(e.target.value)} style={{ width: 220 }} />
                    </SRow>
                    <SRow label="Show the fee as its own line" help="When off, it's added into “Shipping and handling” at checkout instead.">
                        <Switch label="Show the fee as its own line" checked={show} onChange={setShow} />
                    </SRow>
                    <SRow label="Paystack fee" help="Your figure for Paystack's cut, used only for reports: Billing's Paystack fees, the average charge per payment, and orders with no stored fee. It never changes what customers pay.">
                        <Percent label="Paystack fee" value={ps} onChange={setPs} />
                    </SRow>
                </div>
                <div className="card-body hrow wrap">
                    <Btn kind="primary" disabled={!dirty || !!busy} onClick={() => run("fees", () => saveFees({ feePct: pct, label, showLine: show, paystackPct: ps }), "Fees saved. The next order uses them.")}>{busy === "fees" ? "Saving…" : "Save fees"}</Btn>
                    <span className="sm muted">The owner can no longer change these in Settings.</span>
                </div>
            </Card>

            <Card title="Where the fee applies">
                <div className="rows">
                    {WHERE.map(([t, h]) => <SRow key={t} label={t} help={h}><Badge tone="ok">{d.fee!.pct}%</Badge></SRow>)}
                </div>
                <div className="card-body sm muted">All of them read the one saved setting, so the % above is exactly what each adds.</div>
            </Card>

            <Card title="How Paystack's fee is paid today">
                <div className="card-body stack-sm">
                    <p className="sm ink2">Customers pay Paystack's fee on top of the order total: Paystack charges them a little more than the shop asks (order 3512F7BD: asked {ghs(137.5)}, charged {ghs(140.24)}, Paystack {ghs(2.74)}). That is a preference in the Paystack dashboard ("pass fees to customers"); Paystack has no setting for it in its API, so it can only be shown here, not changed.</p>
                    <p className="sm ink2">The admin share is taken on the whole order total, delivery and the fee itself included ({d.shareMode === "pct_of_order_total" ? `${d.sharePct}% of the order total, the current rule` : "under today's Paystack split"}). So the admin receives a little more than the processing fee collected, and the main account covers the difference.</p>
                </div>
            </Card>

            <Card title="Clean-up">
                <div className="rows">
                    <SRow label="Fee name" help={`Was “.2.5%”, a typo shown at checkout and on receipts. Now “${d.fee.label}”.`}><Badge tone="ok">Fixed</Badge></SRow>
                    <SRow label="Old settings row" help={d.staleRow ? `A second store settings row (${d.staleRow.pct}%, “${d.staleRow.label}”) from the old settings page. Nothing reads it any more; it is kept for the record, not deleted.` : "Only one settings row exists."}>
                        <Badge tone="neutral">{d.staleRow ? "Not read" : "None"}</Badge>
                    </SRow>
                </div>
            </Card>

            {Number(pct) > 5 && <Banner tone="warn" title="That's a high processing fee">Check the figure before saving: customers see it added at checkout.</Banner>}
        </>
    );
}
