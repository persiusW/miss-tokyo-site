// Server-only helpers for admin v2 pages.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PREVIEW_COOKIE, effectiveFlags, getStoreV2Flags } from "./flags";
import { areaOn, v2Redirect, type V2Area, type V2Flags } from "./routeMap";

export type StaffRole = "admin" | "owner" | "sales_staff";

/** The switches as the current visitor sees them, and whether that's a device preview. */
export async function v2View(): Promise<{ flags: V2Flags; preview: boolean; shell: boolean }> {
    const store = await getStoreV2Flags();
    const preview = (await cookies()).get(PREVIEW_COOKIE)?.value === "1";
    const flags = effectiveFlags(store, preview);
    return { flags, preview: preview && !store.admin_v2, shell: flags.admin_v2 };
}

/** Is this area's new page the one to show right now? */
export async function v2AreaOn(area: V2Area): Promise<boolean> {
    return areaOn(area, (await v2View()).flags);
}

/**
 * Guard for a new-only page: sends the visitor to the old page while the area
 * is off (proxy.ts usually does this first), and checks the role on the server.
 */
export async function requireV2Page(area: V2Area, path: string, roles: StaffRole[] = ["admin", "owner", "sales_staff"]): Promise<{ userId: string; role: StaffRole; allowed: boolean }> {
    const { flags } = await v2View();
    if (!areaOn(area, flags)) redirect(v2Redirect(path, "", flags) ?? "/overview");
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) redirect(`/admin/login?next=${encodeURIComponent(path)}`);
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role as StaffRole | undefined;
    if (!role || !["admin", "owner", "sales_staff"].includes(role)) redirect("/admin/login?error=unauthorized");
    // A role without access sees the page's "only owners and admins" notice
    // (<Denied />), not a redirect, so they know the page exists and who to ask.
    return { userId: user.id, role, allowed: roles.includes(role) };
}
