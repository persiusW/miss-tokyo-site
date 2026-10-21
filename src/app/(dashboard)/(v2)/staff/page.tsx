import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { loadStaffBase } from "@/components/admin/v2/staff/data";
import { StaffShell } from "@/components/admin/v2/staff/StaffShell";
import { PeopleTab } from "@/components/admin/v2/staff/PeopleTab";

export const metadata = { title: "Staff · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

export default async function StaffPeoplePage() {
    const g = await requireV2Page("staff", "/staff", ["owner", "admin"]);
    if (!g.allowed) return <Denied title="Staff" />;
    const base = await loadStaffBase();
    return (
        <StaffShell tab="members" people={base.failed ? null : base.members.filter(m => !m.deactivated).length} invites={base.failed ? null : base.invites.length}>
            <PeopleTab members={base.members} failed={base.failed} meId={g.userId} />
        </StaffShell>
    );
}
