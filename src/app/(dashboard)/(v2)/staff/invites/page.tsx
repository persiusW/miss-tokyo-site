import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { loadStaffBase } from "@/components/admin/v2/staff/data";
import { StaffShell } from "@/components/admin/v2/staff/StaffShell";
import { InvitesTab } from "@/components/admin/v2/staff/InvitesTab";

export const metadata = { title: "Invites · Staff · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

export default async function StaffInvitesPage() {
    const g = await requireV2Page("staff", "/staff/invites", ["owner", "admin"]);
    if (!g.allowed) return <Denied title="Staff" />;
    const base = await loadStaffBase(g.role);
    return (
        <StaffShell viewer={g.role} tab="invites" people={base.failed ? null : base.members.filter(m => !m.deactivated).length} invites={base.failed ? null : base.invites.length}>
            <InvitesTab invites={base.invites} failed={base.failed} />
        </StaffShell>
    );
}
