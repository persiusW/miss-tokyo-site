import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { loadActivity, loadStaffBase, parseActivityFilters } from "@/components/admin/v2/staff/data";
import { StaffShell } from "@/components/admin/v2/staff/StaffShell";
import { ActivityTab } from "@/components/admin/v2/staff/ActivityTab";

export const metadata = { title: "Activity · Staff · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

export default async function StaffActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const g = await requireV2Page("staff", "/staff/activity", ["owner", "admin"]);
    if (!g.allowed) return <Denied title="Staff" />;
    const filters = parseActivityFilters(await searchParams);
    const [base, log] = await Promise.all([loadStaffBase(g.role), loadActivity(filters, g.role)]);
    return (
        <StaffShell viewer={g.role} tab="activity" people={base.failed ? null : base.members.filter(m => !m.deactivated).length} invites={base.failed ? null : base.invites.length}>
            <ActivityTab items={log.items} hasMore={log.hasMore} failed={log.failed} filters={filters} members={base.members} />
        </StaffShell>
    );
}
