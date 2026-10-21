"use client";

// The payment checker: "the customer says they paid but the order says
// unpaid". One order by its receipt number, or every cancelled and unpaid
// order that reached Paystack in the last days. Asking is read-only; putting
// an order right is the order's own Verify, here as "Mark it paid".
import { useState } from "react";
import { Badge, Banner, Btn, Card, ConfirmPanel, Empty, Field, Seg, ghs, plural, toast, when } from "@/components/admin/ui";
import { sweepPayments, type SweepRow } from "./actions";
import { useRun } from "./useRun";

type Verdict = { checked: boolean; message?: string; reference?: string; mismatch?: boolean; alreadyFulfilled?: boolean; order?: { ref: string; payment_status: string; total_amount: number }; paystack?: { status: string; amount: number | null } };

export function PaymentsTab({ unpaid7d }: { unpaid7d: number | null }) {
    const { busy, run } = useRun();
    const [q, setQ] = useState("");
    const [one, setOne] = useState<{ id: string; v: Verdict } | null>(null);
    const [days, setDays] = useState<"3" | "7" | "14" | "30">("7");
    const [sweep, setSweep] = useState<{ checked: number; unresolved: number; paid: SweepRow[]; capped: boolean } | null>(null);
    const [fix, setFix] = useState<{ id: string; ref: string; fulfilled?: boolean } | null>(null);
    const [checking, setChecking] = useState(false);

    const check = async () => {
        setChecking(true); setOne(null);
        try {
            const f = await fetch(`/api/admin/v2/tools/find-order?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
            const j = await f.json().catch(() => null);
            if (!f.ok || !j?.id) { toast.error(j?.error || "No order with that receipt number or Paystack reference."); return; }
            const r = await fetch("/api/admin/orders/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: j.id }) });
            const v = await r.json().catch(() => null);
            if (!r.ok || !v) { toast.error("Paystack didn't answer. Nothing was changed. Try again shortly."); return; }
            setOne({ id: j.id, v });
        } finally { setChecking(false); }
    };
    const apply = async (id: string, fulfilled?: boolean) => {
        const r = await fetch("/api/admin/orders/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: id, apply: true, notify: !fulfilled }) });
        const v = await r.json().catch(() => null);
        if (!r.ok || !v?.applied) { toast.error(v?.message && !/error|exception/i.test(v.message) ? v.message : "That order couldn't be marked paid. Nothing was changed."); return; }
        toast.success("Order marked paid and its stock taken.");
        setSweep(s => s && { ...s, paid: s.paid.filter(p => p.orderId !== id) });
        setOne(null);
    };

    return (
        <>
            <Card title="Check one payment">
                <div className="card-body stack">
                    <div className="tl-inline">
                        <Field label="Receipt number or Paystack reference" htmlFor="pc-q"><input id="pc-q" className="input" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && q.trim()) void check(); }} /></Field>
                        <Btn kind="primary" disabled={checking || !q.trim()} onClick={() => void check()}>{checking ? "Asking Paystack…" : "Check"}</Btn>
                    </div>
                    {one && (one.v.checked === false
                        ? <Banner tone="neutral" title="Nothing to check">{one.v.message}</Banner>
                        : <Banner tone={one.v.mismatch ? "danger" : "ok"} title={one.v.mismatch ? `Paystack says ${one.v.order?.ref} was paid, but the order isn't` : `Order ${one.v.order?.ref}: Paystack says “${one.v.paystack?.status}”, the order says “${one.v.order?.payment_status}”`}
                            action={one.v.mismatch ? <Btn sm kind="danger" onClick={() => setFix({ id: one.id, ref: one.v.order?.ref ?? "", fulfilled: one.v.alreadyFulfilled })}>Mark it paid</Btn> : undefined}>
                            Order total {ghs(one.v.order?.total_amount)} · Paystack charged {ghs(one.v.paystack?.amount)} (the difference is Paystack's fee, paid by the customer).
                        </Banner>)}
                </div>
            </Card>

            <Card title="Find paid orders the shop missed">
                <div className="card-body stack">
                    <p className="sm ink2">Asks Paystack about every cancelled or unpaid order that reached the payment page, and lists the ones Paystack says were paid. {unpaid7d != null ? `${plural(unpaid7d, "order")} in the last 7 days.` : ""} Up to 80 at a time.</p>
                    <div className="hrow wrap">
                        <Seg label="How far back" value={days} onChange={setDays} options={[{ v: "3", l: "3 days" }, { v: "7", l: "7 days" }, { v: "14", l: "14 days" }, { v: "30", l: "30 days" }]} />
                        <Btn disabled={!!busy} onClick={() => run("sweep", () => sweepPayments(Number(days)), r => setSweep(r))}>{busy === "sweep" ? "Asking Paystack…" : "Check them all"}</Btn>
                    </div>
                    {sweep && <>
                        <div className="sm">{plural(sweep.checked, "order")} checked{sweep.capped ? " (the newest 80)" : ""}. {sweep.unresolved > 0 && <span className="tl-warn">{plural(sweep.unresolved, "order")} Paystack didn't answer for: run it again before trusting a clean result.</span>}</div>
                        {sweep.paid.length === 0
                            ? <Empty icon="ok" title={sweep.unresolved ? "None found among the ones Paystack answered" : "Every one of them really is unpaid"} body="Nothing to put right." />
                            : <div className="rows">{sweep.paid.map(p => (
                                <div className="row" key={p.orderId}>
                                    <div className="row-main"><div className="row-title">{p.ref} · {ghs(p.total)}</div><div className="row-sub">Started {when(p.createdAt)} · shop says {p.paymentStatus}, Paystack says paid {ghs(p.charged)}</div></div>
                                    <Badge tone="danger">Paid, not recorded</Badge>
                                    <Btn sm kind="danger" onClick={() => setFix({ id: p.orderId, ref: p.ref })}>Mark it paid</Btn>
                                </div>
                            ))}</div>}
                    </>}
                </div>
            </Card>

            <ConfirmPanel open={!!fix} onClose={() => setFix(null)} title={`Mark ${fix?.ref} paid?`} confirmLabel="Mark it paid"
                consequenceTitle="Paystack confirmed the payment" consequence={`The order becomes paid, its stock is taken${fix?.fulfilled ? "" : " and the customer gets the confirmation"}. It can't cancel or refund anything.`}
                onConfirm={() => { if (fix) void apply(fix.id, fix.fulfilled); setFix(null); }} />
        </>
    );
}
