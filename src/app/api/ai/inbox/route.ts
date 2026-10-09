// The Miss Tokyo AI inbox. Admin only: open questions with their chat excerpt,
// the most recent handled ones, and the saved answers.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { CALM_ERROR, DENIED } from "@/lib/ai/missTokyoAi/apiDenied";

const QUESTION_COLS = "id, user_id, role, question, excerpt, page_path, status, answer, answered_at, saved_answer_id, created_at";

export async function GET() {
    const auth = await requireStaff(["admin"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const [open, handled, saved] = await Promise.all([
            supabaseAdmin.from("ai_questions").select(QUESTION_COLS).eq("status", "open").order("created_at", { ascending: true }).limit(100),
            supabaseAdmin.from("ai_questions").select(QUESTION_COLS).neq("status", "open").order("created_at", { ascending: false }).limit(20),
            supabaseAdmin.from("ai_saved_answers").select("id, title, body, roles, active, updated_at").order("updated_at", { ascending: false }).limit(200),
        ]);
        if (open.error || handled.error || saved.error) {
            console.error("[api/ai/inbox] read failed", open.error ?? handled.error ?? saved.error);
            return NextResponse.json(CALM_ERROR, { status: 500 });
        }
        const askerIds = [...new Set([...(open.data ?? []), ...(handled.data ?? [])].map(q => q.user_id))];
        const { data: people } = askerIds.length
            ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", askerIds)
            : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
        const nameOf = new Map((people ?? []).map(p => [p.id, (p.full_name ?? "").trim() || (p.email ?? "").split("@")[0] || "A team member"]));
        const withName = (q: any) => {
            const { user_id, ...rest } = q;
            return { ...rest, asker: nameOf.get(user_id) ?? "A team member" };
        };
        return NextResponse.json({
            open: (open.data ?? []).map(withName),
            handled: (handled.data ?? []).map(withName),
            saved: saved.data ?? [],
        });
    } catch (e) {
        console.error("[api/ai/inbox]", e);
        return NextResponse.json(CALM_ERROR, { status: 500 });
    }
}
