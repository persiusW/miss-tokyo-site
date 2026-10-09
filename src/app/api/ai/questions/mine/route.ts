// The asker's answered questions (last 30 days) and how many replies are unread.
// POST { ids } marks those replies read.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { UUID_RE } from "@/lib/ai/missTokyoAi/questions";
import { CALM_ERROR, DENIED } from "@/lib/ai/missTokyoAi/apiDenied";

export async function GET() {
    const auth = await requireStaff();
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const { data, error } = await supabaseAdmin
            .from("ai_questions")
            .select("id, question, answer, answered_at, reply_seen_at")
            .eq("user_id", auth.userId)
            .eq("status", "answered")
            .gte("created_at", since)
            .order("answered_at", { ascending: true })
            .limit(50);
        if (error) {
            console.error("[api/ai/questions/mine] read failed", error);
            return NextResponse.json(CALM_ERROR, { status: 500 });
        }
        const replies = data ?? [];
        return NextResponse.json({ replies, unseen: replies.filter(r => !r.reply_seen_at).length });
    } catch (e) {
        console.error("[api/ai/questions/mine] GET", e);
        return NextResponse.json(CALM_ERROR, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireStaff();
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        let body: any;
        try { body = await req.json(); } catch { body = null; }
        const ids = Array.isArray(body?.ids) ? body.ids.filter((v: unknown) => typeof v === "string" && UUID_RE.test(v)).slice(0, 50) : [];
        if (ids.length === 0) return NextResponse.json({ updated: 0 });
        const { data, error } = await supabaseAdmin
            .from("ai_questions")
            .update({ reply_seen_at: new Date().toISOString() })
            .eq("user_id", auth.userId)
            .in("id", ids)
            .is("reply_seen_at", null)
            .select("id");
        if (error) {
            console.error("[api/ai/questions/mine] mark seen failed", error);
            return NextResponse.json(CALM_ERROR, { status: 500 });
        }
        return NextResponse.json({ updated: data?.length ?? 0 });
    } catch (e) {
        console.error("[api/ai/questions/mine] POST", e);
        return NextResponse.json(CALM_ERROR, { status: 500 });
    }
}
