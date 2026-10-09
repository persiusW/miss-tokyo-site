// Staff gate for Miss Tokyo AI endpoints. Pass the roles allowed; the role is
// re-read from profiles on every call, never trusted from the client.
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { StaffRole } from "@/lib/ai/missTokyoAi/routes";

export const ALL_STAFF: StaffRole[] = ["admin", "owner", "sales_staff"];

export async function requireStaff(allowed: StaffRole[] = ALL_STAFF): Promise<{ userId: string; role: StaffRole } | { status: 401 | 403 }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: 401 };
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role as StaffRole | undefined;
    if (!role || !allowed.includes(role)) return { status: 403 };
    return { userId: user.id, role };
}
