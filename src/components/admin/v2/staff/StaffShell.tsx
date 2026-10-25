"use client";

// Header and route tabs shared by every Staff page, plus the Invite panel.
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Btn, PageHeader, Tabs } from "@/components/admin/ui";
import { InvitePanel } from "./InvitePanel";
import type { StaffRoleKey } from "./staffCopy";
import "./staff.css";

export type StaffTab = "members" | "invites" | "permissions" | "activity";

export function StaffShell({ viewer, tab, people, invites, children }: { viewer: StaffRoleKey; tab: StaffTab; people: number | null; invites: number | null; children: ReactNode }) {
    const router = useRouter();
    const [inviting, setInviting] = useState(false);
    return (
        <>
            <PageHeader title="Staff" sub="Who can sign in to the admin and what each person can do."
                actions={<Btn kind="primary" icon="plus" onClick={() => setInviting(true)}>Invite staff</Btn>} />
            <Tabs label="Staff sections" value={tab} tabs={[
                { v: "members", l: "People", c: people, href: "/staff" },
                { v: "invites", l: "Invites", c: invites, href: "/staff/invites" },
                { v: "permissions", l: "What each role can do", href: "/staff/permissions" },
                { v: "activity", l: "Activity", href: "/staff/activity" },
            ]} />
            {children}
            <InvitePanel open={inviting} viewer={viewer} onClose={() => setInviting(false)}
                onSent={() => { setInviting(false); router.push("/staff/invites"); router.refresh(); }} />
        </>
    );
}
