"use client";

// Orders › Abandoned checkouts (was Customers › Abandoned Carts). Checkouts
// that never became a payment, the value left in them, and how many came
// back after a reminder (BACKEND_GAPS 22). Sending a reminder is for owners
// and admins, as the old page's /api/abandoned/remind allowed.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Btn, Card, Empty, ErrorState, Kpi, Pager, Seg, ghs, ghs0, plural, toast, when } from "@/components/admin/ui";
import { ABANDONED_RANGES, PAGE_SIZE, orderRef, type AbandonedRange } from "@/lib/admin/v2/orders";
import type { AbandonedData } from "@/lib/admin/v2/ordersLoad";
import { sendAbandonedReminder } from "./actions";
import { OrdersHeader } from "./OrdersHeader";
import "./orders.css";

export function AbandonedPage({ role, range, page, data, count }: { role: string; range: AbandonedRange; page: number; data: AbandonedData | null; count: number | null }) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [sending, setSending] = useState<string | null>(null);
    const [sent, setSent] = useState<Record<string, string>>({});
    const full = role === "owner" || role === "admin";
    const ctx = ABANDONED_RANGES.find(r => r.v === range)!.ctx;
    const href = (r: AbandonedRange, p = 1) => `/orders/abandoned${r === "7d" && p === 1 ? "" : `?${new URLSearchParams({ ...(r !== "7d" ? { range: r } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`}`;

    const remind = async (id: string) => {
        setSending(id);
        const r = await sendAbandonedReminder(id);
        setSending(null);
        if (!r.ok) { toast.error(r.error); return; }
        setSent(s => ({ ...s, [id]: new Date().toISOString() }));
        toast.success(`Reminder sent to ${r.to}`);
    };

    const rows = data?.rows ?? [];
    const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

    return (
        <>
            <OrdersHeader tab="abandoned" role={role} abandoned={count} />
            <div className="hrow wrap" style={{ marginBottom: 16 }}>
                <Seg label="Period" value={range} onChange={v => start(() => router.push(href(v), { scroll: false }))} options={ABANDONED_RANGES.map(r => ({ v: r.v, l: r.l }))} />
            </div>
            {data && (
                <div className="grid-3 ord-kpis">
                    <Kpi label="Checkouts not finished" value={data.total.toLocaleString("en-GB")} ctx={ctx} />
                    <Kpi label="Value left in carts" value={ghs0(data.value)} ctx={`across ${plural(data.total, "cart")}`} />
                    <Kpi label="Recovered after a reminder" value={data.reminders.recovered.toLocaleString("en-GB")}
                        ctx={`out of ${plural(data.reminders.sent, "reminder")} sent ${ctx}, paid within 7 days`} />
                </div>
            )}
            <Card title="Abandoned checkouts" action={<span className="help">The shop also emails one reminder on its own, a day after a checkout that never reached payment.</span>}>
                {!data ? (
                    <ErrorState what="abandoned checkouts" onRetry={() => router.refresh()} />
                ) : rows.length === 0 ? (
                    <Empty icon="orders" title="No abandoned checkouts" body="When someone starts checkout and doesn't pay, they'll show here so you can send a reminder." />
                ) : (
                    <div className="tbl-wrap" aria-busy={pending} style={pending ? { opacity: 0.6 } : undefined}>
                        <table className="tbl ord-tbl">
                            <thead><tr><th>Customer</th><th className="hide-sm">Started</th><th className="r">Cart</th><th>Reminder</th><th className="r" aria-label="Action" /></tr></thead>
                            <tbody>
                                {rows.map(a => {
                                    const reminded = sent[a.id] ?? a.reminded_at;
                                    const canEmail = !!a.customer_email && !a.customer_email.toLowerCase().endsWith("@misstokyo.store");
                                    return (
                                        <tr key={a.id}>
                                            <td>
                                                <div className="strong ord-cust">{a.customer_name || "No name"}</div>
                                                <div className="xs muted ord-cust">{a.customer_email || "No email"} · <Link href={`/orders/${a.id}`}>#{orderRef(a)}</Link></div>
                                            </td>
                                            <td className="hide-sm nowrap">{when(a.created_at)}</td>
                                            <td className="r nowrap">{ghs(a.total_amount)}<div className="xs muted">{plural(a.units, "item")}</div></td>
                                            <td>
                                                {a.paid_later ? <Badge tone="ok" plain>Paid later</Badge>
                                                    : reminded ? <Badge plain>Sent {when(reminded)}</Badge>
                                                        : <Badge tone="warn" plain>Not sent</Badge>}
                                            </td>
                                            <td className="r">
                                                {full && canEmail && !a.paid_later && (
                                                    <Btn sm onClick={() => remind(a.id)} disabled={sending === a.id}>{sending === a.id ? "Sending…" : reminded ? "Send again" : "Send reminder"}</Btn>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {data && (
                    <Pager left={`${plural(data.total, "checkout")}${pages > 1 ? ` · page ${page} of ${pages}` : ""}${full ? "" : " · owners and admins can send reminders"}`}
                        prevHref={pages > 1 ? (page > 1 ? href(range, page - 1) : null) : undefined}
                        nextHref={pages > 1 ? (page < pages ? href(range, page + 1) : null) : undefined} />
                )}
            </Card>
        </>
    );
}
