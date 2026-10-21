"use client";

import { Badge, Card, Empty, ErrorState, TwoTap, when } from "@/components/admin/ui";
import type { DeviceRow } from "./data";
import { removeDevice } from "./actions";
import { useRun } from "./useRun";

const ROLE: Record<string, string> = { owner: "Owner", admin: "Admin", sales_staff: "Sales staff" };
const host = (h: string) => (/fcm|googleapis/.test(h) ? "Chrome or Android" : /apple/.test(h) ? "Safari, iPhone or Mac" : /mozilla/.test(h) ? "Firefox" : /windows|wns/.test(h) ? "Edge or Windows" : h);

export function DevicesTab({ rows }: { rows: DeviceRow[] | null }) {
    const { busy, run } = useRun();
    if (!rows) return <Card><ErrorState what="devices" /></Card>;
    return (
        <Card title="Devices that get new-order alerts">
            {rows.length === 0 ? <Empty icon="bell" title="No devices" body="Phones and computers where staff turned on new-order alerts show here." />
                : <div className="rows">{rows.map(r => (
                    <div className="row" key={r.id}>
                        <div className="row-main"><div className="row-title">{r.name}</div><div className="row-sub">{host(r.host)} · added {when(r.created_at)}</div></div>
                        {r.current ? <Badge plain>{ROLE[r.role] ?? r.role}</Badge> : <Badge tone="warn">No longer staff</Badge>}
                        <TwoTap sm label="Remove" onConfirm={() => run(r.id, () => removeDevice(r.id), "Device removed. It gets no more alerts.")} disabled={!!busy} />
                    </div>
                ))}</div>}
            <div className="card-body xs muted">Removing a device stops its alerts. The person can turn them on again from Settings on that device.</div>
        </Card>
    );
}
