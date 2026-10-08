// Admin/owner gate for AI management endpoints and pages. Returns the role so
// callers can hold back the admin-only settings (the dev cost markup).
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function requireAiAdmin(): Promise<{ userId: string; role: "admin" | "owner" } | { status: 401 | 403 }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: 401 };
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "owner"].includes(profile.role ?? "")) return { status: 403 };
    return { userId: user.id, role: profile.role as "admin" | "owner" };
}
