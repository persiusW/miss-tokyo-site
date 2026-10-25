// Server-side reads for the Staff pages. Service-role client on purpose: the
// RLS lockdown leaves server pages on the anon client silently empty.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ACTIVITY_PAGE, STAFF_ROLES, actionFilter, canManageRole, describeActivity, isStaffRole, type ActivityRow, type StaffRoleKey } from "./staffCopy";

export type StaffMember = {
    id: string;
    name: string;
    email: string;
    role: StaffRoleKey;
    deactivated: boolean;
    deactivatedAt: string | null;
    /** Latest SIGN_IN log, else the auth account's last sign-in. */
    lastActive: string | null;
    joined: string | null;
};

export type StaffInvite = { id: string; name: string; email: string; role: string; phone: string | null; sent: string | null; expiresAt: string | null };

export type StaffBase = { members: StaffMember[]; invites: StaffInvite[]; failed: boolean };

const ORDER: Record<StaffRoleKey, number> = { owner: 0, admin: 1, sales_staff: 2 };

/** Everyone on staff and every pending invite this viewer may see: admins only to admins. */
export async function loadStaffBase(viewer: StaffRoleKey): Promise<StaffBase> {
    const [people, invites] = await Promise.all([
        supabaseAdmin
            .from("profiles")
            .select("id, email, full_name, role, created_at, staff_deactivated_at, staff_deactivated_role")
            .or(`role.in.(${STAFF_ROLES.join(",")}),staff_deactivated_at.not.is.null`)
            .limit(500),
        supabaseAdmin
            .from("team_invitations")
            .select("id, full_name, email, role, phone, created_at, expires_at")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(200),
    ]);
    if (people.error || invites.error) {
        console.error("[staff] load failed:", people.error?.message ?? invites.error?.message);
        return { members: [], invites: [], failed: true };
    }

    const rows = (people.data ?? []).map(p => {
        const deactivated = !!p.staff_deactivated_at && !isStaffRole(p.role);
        const role = (deactivated ? p.staff_deactivated_role : p.role) as StaffRoleKey;
        return { p, deactivated, role: isStaffRole(role) ? role : "sales_staff" as StaffRoleKey };
    }).filter(r => canManageRole(viewer, r.role) && canManageRole(viewer, r.p.staff_deactivated_role));

    // Last active: each person's newest SIGN_IN row (one indexed read each; the
    // staff list is small), falling back to the auth account's last sign-in,
    // because the layout doesn't log admins' sign-ins.
    const last = await Promise.all(rows.map(async ({ p }) => {
        const [{ data: log }, auth] = await Promise.all([
            supabaseAdmin.from("activity_logs").select("created_at").eq("user_id", p.id).eq("action_type", "SIGN_IN")
                .order("created_at", { ascending: false }).limit(1).maybeSingle(),
            supabaseAdmin.auth.admin.getUserById(p.id).catch(() => null),
        ]);
        const a = log?.created_at ?? null;
        const b = auth?.data?.user?.last_sign_in_at ?? null;
        if (!a) return b;
        if (!b) return a;
        return new Date(a) > new Date(b) ? a : b;
    }));

    const members: StaffMember[] = rows.map(({ p, deactivated, role }, i) => ({
        id: p.id,
        name: p.full_name || p.email,
        email: p.email,
        role,
        deactivated,
        deactivatedAt: p.staff_deactivated_at ?? null,
        lastActive: last[i],
        joined: p.created_at ?? null,
    })).sort((a, b) => Number(a.deactivated) - Number(b.deactivated) || ORDER[a.role] - ORDER[b.role] || a.name.localeCompare(b.name));

    return {
        members,
        invites: (invites.data ?? []).filter(x => canManageRole(viewer, x.role)).map(x => ({ id: x.id, name: x.full_name, email: x.email, role: x.role, phone: x.phone, sent: x.created_at, expiresAt: x.expires_at })),
        failed: false,
    };
}

export type ActivityFilters = { who: string; action: string; date: string; page: number };

export type ActivityItem = { id: string; who: string; whoId: string | null; role: string; sentence: string; area: string; at: string; details: Record<string, unknown> | null };

export function parseActivityFilters(sp: Record<string, string | string[] | undefined>): ActivityFilters {
    const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(one("date")) ? one("date") : "";
    const who = /^[0-9a-f-]{36}$/i.test(one("who")) ? one("who") : "";
    const action = actionFilter(one("action")) ? one("action") : "";
    const page = Math.max(1, Math.min(500, parseInt(one("page") || "1", 10) || 1));
    return { who, action, date, page };
}

/** One page of the activity log, newest first, filtered on the server. */
export async function loadActivity(f: ActivityFilters): Promise<{ items: ActivityItem[]; hasMore: boolean; failed: boolean }> {
    const from = (f.page - 1) * ACTIVITY_PAGE;
    // One extra row says whether there's a next page without counting the table.
    let q = supabaseAdmin
        .from("activity_logs")
        .select("id, user_id, user_role, action_type, resource, resource_id, details, created_at")
        .order("created_at", { ascending: false })
        .range(from, from + ACTIVITY_PAGE);
    if (f.who) q = q.eq("user_id", f.who);
    const af = actionFilter(f.action);
    if (af) {
        q = af.action.length === 1 ? q.eq("action_type", af.action[0]) : q.in("action_type", af.action);
        if (af.resource) q = af.resource.length === 1 ? q.eq("resource", af.resource[0]) : q.in("resource", af.resource);
    }
    if (f.date) q = q.gte("created_at", `${f.date}T00:00:00.000Z`).lte("created_at", `${f.date}T23:59:59.999Z`);

    const { data, error } = await q;
    if (error) {
        console.error("[staff] activity load failed:", error.message);
        return { items: [], hasMore: false, failed: true };
    }
    const rows = (data ?? []) as ActivityRow[];
    const hasMore = rows.length > ACTIVITY_PAGE;
    const page = rows.slice(0, ACTIVITY_PAGE);

    // Names for everyone on this page, including people since removed.
    const ids = [...new Set(page.flatMap(r => [r.user_id, r.resource_id]).filter((x): x is string => !!x && /^[0-9a-f-]{36}$/i.test(x)))];
    const names: Record<string, string> = {};
    if (ids.length) {
        const { data: ps } = await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids);
        for (const p of ps ?? []) names[p.id] = p.full_name || p.email;
    }

    return {
        items: page.map(r => {
            const t = describeActivity(r, names);
            return { id: r.id, who: (r.user_id && names[r.user_id]) || "Someone no longer on staff", whoId: r.user_id, role: r.user_role, sentence: t.sentence, area: t.area, at: r.created_at, details: r.details };
        }),
        hasMore,
        failed: false,
    };
}
