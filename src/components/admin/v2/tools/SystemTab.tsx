"use client";

import { Badge, Card, Empty, ErrorState, when } from "@/components/admin/ui";
import type { SystemData } from "./data";

function cronText(s: string): string {
    if (/^\*\/(\d+) \* \* \* \*$/.test(s)) return `every ${s.match(/^\*\/(\d+)/)![1]} minutes`;
    if (/^\d+ \* \* \* \*$/.test(s)) return `hourly at :${s.split(" ")[0].padStart(2, "0")}`;
    const m = /^(\d+) (\d+) \* \* \*$/.exec(s);
    if (m) return `daily at ${m[2].padStart(2, "0")}:${m[1].padStart(2, "0")} Ghana time`;
    return s;
}

export function SystemTab({ d }: { d: SystemData }) {
    return (
        <>
            <Card title="Errors people saw · last 7 days">
                {!d.errors.ok ? <ErrorState what="the error log" /> : d.errors.data.total === 0
                    ? <Empty icon="ok" title="No errors recorded" body="Error codes staff and customers see show here with the page they were on (when Error log is on in Switches)." />
                    : <div className="tbl-wrap"><table className="tbl">
                        <thead><tr><th>Code</th><th>What it means</th><th className="r">Times</th></tr></thead>
                        <tbody>{d.errors.data.byCode.map(e => <tr key={e.code}><td className="strong">{e.code}</td><td>{e.label}</td><td className="r">{e.count}</td></tr>)}</tbody>
                    </table></div>}
                {d.errors.ok && d.errors.data.recent.length > 0 && <div className="tbl-wrap"><table className="tbl">
                    <thead><tr><th>When</th><th>Code</th><th>Page</th><th>Who</th></tr></thead>
                    <tbody>{d.errors.data.recent.map((e, i) => <tr key={i}><td className="nowrap">{when(e.created_at)}</td><td>{e.code}</td><td className="sm tl-mono">{e.place}</td><td>{e.audience === "staff" ? "Staff" : "Customer"}</td></tr>)}</tbody>
                </table></div>}
            </Card>
            <Card title="Scheduled jobs">
                <div className="tbl-wrap"><table className="tbl">
                    <thead><tr><th>Job</th><th>Runs</th><th>Last run</th></tr></thead>
                    <tbody>{d.crons.map(c => (
                        <tr key={c.path}><td className="tl-mono">{c.path.replace("/api/cron/", "")}</td><td className="sm">{cronText(c.schedule)}</td>
                            <td>{c.lastRun ? <><Badge tone={c.lastRun.ok === false ? "danger" : c.lastRun.ok ? "ok" : "warn"}>{c.lastRun.ok === false ? "Failed" : c.lastRun.ok ? "Finished" : "Running"}</Badge> <span className="sm">{when(c.lastRun.started_at)}</span>{c.lastRun.note && <div className="xs muted">{c.lastRun.note}</div>}</> : <span className="sm muted">Not recorded</span>}</td></tr>
                    ))}</tbody>
                </table></div>
                <div className="card-body xs muted">Only the billing cut-off records its runs so far; the others show in Vercel's logs.</div>
            </Card>
            <Card title="Keys on this server" action={<Badge plain>Names only, never values</Badge>}>
                <div className="card-body tl-env">
                    {d.env.map(e => <div key={e.key} className="hrow between tl-share"><div><div className="tl-mono">{e.key}</div><div className="xs muted">{e.what}</div></div><Badge tone={e.set ? "ok" : "warn"}>{e.set ? "Set" : "Missing"}</Badge></div>)}
                </div>
                <div className="card-body xs muted">Dashttp: {d.dashttp === "live" ? "connected" : d.dashttp === "mock" ? "test fixture (DASHTTP_MOCK)" : "not connected yet"}.</div>
            </Card>
        </>
    );
}
