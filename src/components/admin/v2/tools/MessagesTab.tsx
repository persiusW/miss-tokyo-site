"use client";

import Link from "next/link";
import { Badge, Card, Chip, Empty, ErrorState, Kpi, TwoTap, when } from "@/components/admin/ui";
import type { MessageRow } from "./data";
import { resendSms } from "./actions";
import { useRun } from "./useRun";

const CH: Record<string, string> = { sms: "SMS", email: "Email", whatsapp: "WhatsApp" };
const ev = (e: string | null) => { const t = String(e ?? "").replace(/[_:-]+/g, " ").trim(); return t ? t[0].toUpperCase() + t.slice(1) : "Message"; };

export function MessagesTab({ d, channel, status }: { d: { rows: MessageRow[]; failed7d: Record<string, number> } | null; channel: string; status: string }) {
    const { busy, run } = useRun();
    const href = (c: string, s: string) => `/tools/messages?${new URLSearchParams({ ...(c ? { channel: c } : {}), ...(s ? { status: s } : {}) })}`;
    if (!d) return <Card><ErrorState what="sent messages" /></Card>;
    return (
        <>
            <div className="grid-4">
                {(["sms", "whatsapp", "email"] as const).map(c => <Kpi key={c} label={`${CH[c]} failed`} value={d.failed7d[c] ?? 0} ctx="last 7 days" />)}
                <Kpi label="Shown" value={d.rows.length} ctx="newest first, up to 100" />
            </div>
            <Card>
                <div className="card-body hrow-sm wrap">
                    {[["", "All"], ["sms", "SMS"], ["whatsapp", "WhatsApp"], ["email", "Email"]].map(([c, l]) => <Chip key={c} pressed={channel === c} href={href(c, status)}>{l}</Chip>)}
                    <span className="muted sm" style={{ margin: "0 4px" }}>·</span>
                    {[["", "Any result"], ["failed", "Failed"], ["sent", "Sent"]].map(([s, l]) => <Chip key={s} pressed={status === s} href={href(channel, s)}>{l}</Chip>)}
                </div>
                {d.rows.length === 0 ? <Empty icon="mail" title="Nothing here" body="Messages the shop sends (order emails, SMS, WhatsApp) show here with how they went." />
                    : <div className="tbl-wrap"><table className="tbl">
                        <thead><tr><th>When</th><th>Channel</th><th>Message</th><th className="hide-sm">To</th><th>Result</th><th className="r"><span className="sr">Action</span></th></tr></thead>
                        <tbody>{d.rows.map(r => (
                            <tr key={r.id}>
                                <td className="nowrap">{when(r.created_at)}</td>
                                <td>{CH[r.channel] ?? r.channel}</td>
                                <td>{ev(r.event)}{r.order_id && <> · <Link href={`/orders/${r.order_id}`}>order</Link></>}{r.body && <div className="xs muted">{r.body.slice(0, 90)}{r.body.length > 90 ? "…" : ""}</div>}</td>
                                <td className="hide-sm sm">{r.recipient}</td>
                                <td>{r.status === "sent" ? <Badge tone="ok">Sent</Badge> : <><Badge tone="danger">Failed</Badge>{r.error_code && <div className="xs muted">{r.error_code}</div>}</>}</td>
                                <td className="r">{r.canResend
                                    ? <TwoTap sm kind="ghost" label="Send again" armed="Tap to send" disabled={!!busy} onConfirm={() => run("r" + r.id, () => resendSms(r.id), "Sent again.")} /> : null}</td>
                            </tr>
                        ))}</tbody>
                    </table></div>}
            </Card>
        </>
    );
}
