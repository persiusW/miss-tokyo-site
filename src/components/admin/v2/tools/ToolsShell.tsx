"use client";

// Header and route tabs shared by every Admin Tools page. Admin only: the
// page under it has already checked the role on the server.
import { type ReactNode } from "react";
import { PageHeader, Tabs } from "@/components/admin/ui";
import { TOOLS_TABS, toolsHref, type ToolsTab } from "@/lib/admin/v2/tools";
import "./tools.css";

export function ToolsShell({ tab, sub, actions, children }: { tab: ToolsTab; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
    return (
        <>
            <PageHeader title="Admin tools" sub={sub ?? "Payouts, fees, billing rates and the switches behind the shop. Only the admin sees this page."} actions={actions} />
            <div className="tl-tabs">
                <Tabs label="Admin tools sections" value={tab} tabs={TOOLS_TABS.map(t => ({ v: t.v, l: t.l, href: toolsHref(t.v) }))} />
            </div>
            <div className="stack-lg tl-body">{children}</div>
        </>
    );
}
