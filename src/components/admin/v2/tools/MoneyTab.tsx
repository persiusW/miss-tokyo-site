"use client";

import Link from "next/link";
import { Badge, Card, Empty, ErrorState, Kpi, ghs, when } from "@/components/admin/ui";
import type { RefundRow } from "./data";

const ST: Record<string, [string, "ok" | "warn" | "danger" | "neutral" | "info"]> = {
    processed: ["Refunded", "ok"], recorded: ["Recorded", "ok"], pending: ["With Paystack", "info"], failed: ["Failed", "danger"],
};
const METHOD: Record<string, string> = { paystack: "Card or Mobile money", cash: "Cash", gift_card: "Gift card", recorded: "Recorded only" };

export function MoneyTab({ rows }: { rows: RefundRow[] | null }) {
    if (!rows) return <Card><ErrorState what="refunds" /></Card>;
    const failed = rows.filter(r => r.status === "failed");
    const total = rows.filter(r => r.status !== "failed").reduce((t, r) => t + r.amount_ghs, 0);
    return (
        <>
            <div className="grid-4">
                <Kpi label="Refunds" value={rows.length} ctx="the latest 100" />
                <Kpi label="Refunded" value={ghs(total)} ctx="not counting failed ones" />
                <Kpi label="Failed" value={failed.length} ctx={failed.length ? "need a person" : "none"} />
                <Kpi label="Admin payouts" value="Not reduced" ctx="refunds never change the payout ledger" />
            </div>
            <Card title="Refunds">
                {rows.length === 0 ? <Empty icon="refund" title="No refunds yet" body="Refunds made from an order show here, with how they went." />
                    : <div className="tbl-wrap"><table className="tbl">
                        <thead><tr><th>When</th><th>Order</th><th className="hide-sm">How</th><th>Result</th><th className="r">Amount</th></tr></thead>
                        <tbody>{rows.map(r => {
                            const [l, t] = ST[r.status] ?? [r.status, "neutral"];
                            return <tr key={r.id}><td className="nowrap">{when(r.created_at)}</td><td><Link href={`/orders/${r.order_id}`}>{r.order_ref}</Link>{r.reason && <div className="xs muted">{r.reason.slice(0, 80)}</div>}</td><td className="hide-sm">{METHOD[r.method] ?? r.method}</td><td><Badge tone={t}>{l}</Badge>{r.status === "failed" && <div className="xs muted">Paystack couldn't complete it</div>}</td><td className="r strong">{ghs(r.amount_ghs)}</td></tr>;
                        })}</tbody>
                    </table></div>}
            </Card>
        </>
    );
}
