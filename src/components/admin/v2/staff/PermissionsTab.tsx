"use client";

import { Badge, Card, Icon } from "@/components/admin/ui";
import { ROLE_LABEL, permsFor, type PermCell, type StaffRoleKey } from "./staffCopy";

function Cell({ v }: { v: PermCell }) {
    if (v === "yes") return <span className="stf-cell" role="img" aria-label="Yes"><Icon n="check" style={{ width: 18, height: 18, color: "var(--ok-ink)" }} /></span>;
    if (v === "menu") return <Badge tone="warn" plain>Hidden in menu</Badge>;
    return <span className="muted stf-cell" role="img" aria-label="No">—</span>;
}

const CELL_KEY: Record<StaffRoleKey, "owner" | "admin" | "sales"> = { owner: "owner", admin: "admin", sales_staff: "sales" };

export function PermissionsTab({ viewer }: { viewer: StaffRoleKey }) {
    const { columns, rows } = permsFor(viewer);
    const menuOnly = rows.some(p => columns.some(c => p[CELL_KEY[c]] === "menu"));
    return (
        <Card>
            <div className="tbl-wrap">
                <table className="tbl">
                    <thead><tr><th>Area</th>{columns.map(c => <th key={c} className="r">{ROLE_LABEL[c]}</th>)}</tr></thead>
                    <tbody>
                        {rows.map(p => (
                            <tr key={p.area}>
                                <td>{p.area}</td>
                                {columns.map(c => <td key={c} className="r"><Cell v={p[CELL_KEY[c]]} /></td>)}
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
