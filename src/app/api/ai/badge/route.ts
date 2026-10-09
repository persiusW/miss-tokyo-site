// The topbar bell: open questions for the admin, unread replies for everyone
// else. Off (count 0, enabled false) until mtai_bell_enabled is on.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { getAiSettings } from "@/lib/ai/settings";
import { DENIED } from "@/lib/ai/missTokyoAi/apiDenied";

export async function GET() {
    const auth = await requireStaff();
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const settings = await getAiSettings();
        if (!settings.mtai.bell) return NextResponse.json({ enabled: false, count: 0, kind: null });
        const query = auth.role === "admin"
            ? supabaseAdmin.from("ai_questions").select("id", { count: "exact", head: true }).eq("status", "open")
            : supabaseAdmin.from("ai_questions").select("id", { count: "exact", head: true })
                .eq("user_id", auth.userId).eq("status", "answered").is("reply_seen_at", null);
        const { count, error } = await query;
        if (error) {
            console.error("[api/ai/badge] count failed", error);
            return NextResponse.json({ enabled: true, count: 0, kind: null });
        }
        return NextResponse.json({ enabled: true, count: count ?? 0, kind: auth.role === "admin" ? "inbox" : "replies" });
    } catch (e) {
        console.error("[api/ai/badge]", e);
        return NextResponse.json({ enabled: false, count: 0, kind: null });
    }
}
