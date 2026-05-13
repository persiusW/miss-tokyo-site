"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/utils/logActivity";

export async function logSignIn(userId: string, userRole: string) {
    if (!["owner", "sales_staff"].includes(userRole)) return;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
        .from("activity_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("action_type", "SIGN_IN")
        .gte("created_at", oneHourAgo)
        .maybeSingle();

    if (recent) return; // already logged within the last hour

    await logActivity({
        userId,
        userRole,
        actionType: "SIGN_IN",
        resource: "session",
        details: { logged_at: new Date().toISOString() },
    });
}
