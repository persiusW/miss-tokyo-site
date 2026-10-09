// Answer an open question. The update only matches status 'open', so a double
// submit (or two admins) cannot answer twice. Optionally saves the reply as
// an answer Miss Tokyo AI gives the next person who asks.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { cleanRoles, MAX_ANSWER, MAX_TITLE, UUID_RE } from "@/lib/ai/missTokyoAi/questions";
import { CALM_ERROR, DENIED } from "@/lib/ai/missTokyoAi/apiDenied";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireStaff(["admin"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const { id } = await params;
        if (!UUID_RE.test(id)) return NextResponse.json({ error: "That question wasn't found." }, { status: 404 });
        let body: any;
        try { body = await req.json(); } catch { body = null; }
        const answer = typeof body?.answer === "string" ? body.answer.trim().slice(0, MAX_ANSWER) : "";
        if (!answer) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
        const save = body?.save && typeof body.save === "object" ? body.save : null;
        const title = save && typeof save.title === "string" ? save.title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE) : "";
        if (save && !title) return NextResponse.json({ error: "Give the saved answer a title." }, { status: 400 });

        const now = new Date().toISOString();
        const { data: claimed, error } = await supabaseAdmin
            .from("ai_questions")
            .update({ status: "answered", answer, answered_by: auth.userId, answered_at: now })
            .eq("id", id)
            .eq("status", "open")
            .select("id")
            .maybeSingle();
        if (error) {
            console.error("[api/ai/inbox/answer] update failed", error);
            return NextResponse.json(CALM_ERROR, { status: 500 });
        }
        if (!claimed) return NextResponse.json({ error: "This question was already answered or dismissed." }, { status: 409 });

        let savedId: string | null = null;
        if (save) {
            const { data: saved, error: saveError } = await supabaseAdmin
                .from("ai_saved_answers")
                .insert({ title, body: answer, roles: cleanRoles(save.roles), source_question_id: id, created_by: auth.userId })
                .select("id")
                .single();
            if (saveError || !saved) {
                // The reply itself went out; only the saving failed.
                console.error("[api/ai/inbox/answer] save failed", saveError);
                return NextResponse.json({ ok: true, saved: false, warning: "Your reply was sent, but it couldn't be saved for staff. Add it under Saved answers." });
            }
            savedId = saved.id;
            const { error: linkError } = await supabaseAdmin.from("ai_questions").update({ saved_answer_id: savedId }).eq("id", id);
            if (linkError) console.error("[api/ai/inbox/answer] link failed", linkError);
        }
        return NextResponse.json({ ok: true, saved: !!savedId });
    } catch (e) {
        console.error("[api/ai/inbox/answer]", e);
        return NextResponse.json(CALM_ERROR, { status: 500 });
    }
}
