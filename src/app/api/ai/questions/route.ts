// Send to admin: owners and sales staff send a question Miss Tokyo AI could
// not answer. Created only when the person taps the button.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { getAiSettings } from "@/lib/ai/settings";
import { startOfTodayUtc } from "@/lib/ai/spend";
import { buildExcerpt, cleanPagePath, cleanQuestion, QUESTIONS_PER_DAY } from "@/lib/ai/missTokyoAi/questions";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";
import { DENIED } from "@/lib/ai/missTokyoAi/apiDenied";

const FAILED = { error: "We couldn't send your question. Please try again." };

export async function POST(req: NextRequest) {
    const auth = await requireStaff(["owner", "sales_staff"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const settings = await getAiSettings();
        if (!settings.mtai.sendToAdmin) {
            return NextResponse.json({ error: "Sending questions to the admin isn't switched on." }, { status: 503 });
        }
        let body: any;
        try { body = await req.json(); } catch { body = null; }
        const question = redactText(cleanQuestion(body?.question));
        if (question.length < 5) return NextResponse.json({ error: "Write the question in a sentence." }, { status: 400 });

        const { count, error: countError } = await supabaseAdmin
            .from("ai_questions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", auth.userId)
            .gte("created_at", startOfTodayUtc());
        if (countError) {
            console.error("[api/ai/questions] count failed", countError);
            return NextResponse.json(FAILED, { status: 500 });
        }
        if ((count ?? 0) >= QUESTIONS_PER_DAY) {
            return NextResponse.json({ error: `You've sent ${QUESTIONS_PER_DAY} questions today. You can send more tomorrow.` }, { status: 429 });
        }

        const { data, error } = await supabaseAdmin
            .from("ai_questions")
            .insert({
                user_id: auth.userId,
                role: auth.role,
                question,
                excerpt: buildExcerpt(body?.transcript),
                page_path: cleanPagePath(body?.page_path),
            })
            .select("id")
            .single();
        if (error || !data) {
            console.error("[api/ai/questions] insert failed", error);
            return NextResponse.json(FAILED, { status: 500 });
        }
        return NextResponse.json({ id: data.id });
    } catch (e) {
        console.error("[api/ai/questions]", e);
        return NextResponse.json(FAILED, { status: 500 });
    }
}
