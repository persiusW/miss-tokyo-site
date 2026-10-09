// Dismiss an open question without replying. Only open questions can be dismissed.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { UUID_RE } from "@/lib/ai/missTokyoAi/questions";
import { CALM_ERROR, DENIED } from "@/lib/ai/missTokyoAi/apiDenied";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireStaff(["admin"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const { id } = await params;
        if (!UUID_RE.test(id)) return NextResponse.json({ error: "That question wasn't found." }, { status: 404 });
        const { data, error } = await supabaseAdmin
            .from("ai_questions")
            .update({ status: "dismissed", answered_by: auth.userId, answered_at: new Date().toISOString() })
            .eq("id", id)
            .eq("status", "open")
            .select("id")
            .maybeSingle();
        if (error) {
            console.error("[api/ai/inbox/dismiss] update failed", error);
            return NextResponse.json(CALM_ERROR, { status: 500 });
        }
        if (!data) return NextResponse.json({ error: "This question was already answered or dismissed." }, { status: 409 });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("[api/ai/inbox/dismiss]", e);
        return NextResponse.json(CALM_ERROR, { status: 500 });
    }
}
