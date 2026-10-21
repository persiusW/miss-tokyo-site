"use client";

import { Badge, Card, Icon } from "@/components/admin/ui";
import { PERMS, type PermCell } from "./staffCopy";

function Cell({ v }: { v: PermCell }) {
    if (v === "yes") return <span className="stf-cell" role="img" aria-label="Yes"><Icon n="check" style={{ width: 18, height: 18, color: "var(--ok-ink)" }} /></span>;
    if (v === "menu") return <Badge tone="warn" plain>Hidden in menu</Badge>;
    return <span className="muted stf-cell" role="img" aria-label="No">—</span>;
}

export function PermissionsTab() {
    const menuOnly = PERMS.some(p => p.sales === "menu" || p.admin === "menu" || p.owner === "menu");
    return (
        <Card>
            <div className="tbl-wrap">
                <table className="tbl">
                    <thead><tr><th>Area</th><th className="r">Owner</th><th className="r">Admin</th><th className="r">Sales staff</th></tr></thead>
                    <tbody>
                        {PERMS.map(p => (
                            <tr key={p.area}>
                                <td>{p.area}</td>
                                <td className="r"><Cell v={p.owner} /></td>
                                <td className="r"><Cell v={p.admin} /></td>
                                <td className="r"><Cell v={p.sales} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="card-body stack-sm">
                <p className="help">These are checked on the server for every action, not only hidden in the menu.</p>
                {menuOnly && <p className="help">The exception is rows marked “Hidden in menu”: sales staff don’t see those pages in the menu, but the server doesn’t block them yet.</p>}
            </div>
        </Card>
    );
}
