import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { loadStaffBase } from "@/components/admin/v2/staff/data";
import { StaffShell } from "@/components/admin/v2/staff/StaffShell";
import { PermissionsTab } from "@/components/admin/v2/staff/PermissionsTab";

export const metadata = { title: "What each role can do · Staff · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

export default async function StaffPermissionsPage() {
    const g = await requireV2Page("staff", "/staff/permissions", ["owner", "admin"]);
    if (!g.allowed) return <Denied title="Staff" />;
    const base = await loadStaffBase(g.role);
    return (
        <StaffShell viewer={g.role} tab="permissions" people={base.failed ? null : base.members.filter(m => !m.deactivated).length} invites={base.failed ? null : base.invites.length}>
            <PermissionsTab viewer={g.role} />
        </StaffShell>
    );
}
