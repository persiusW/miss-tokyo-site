// Saved answers: admin only. Add, edit, or switch off; nothing is ever deleted.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { cleanRoles, MAX_ANSWER, MAX_TITLE, UUID_RE } from "@/lib/ai/missTokyoAi/questions";
import { CALM_ERROR, DENIED } from "@/lib/ai/missTokyoAi/apiDenied";

const COLS = "id, title, body, roles, active, updated_at";
const cleanTitle = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE) : "");
const cleanBody = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_ANSWER) : "");

export async function GET() {
    const auth = await requireStaff(["admin"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    const { data, error } = await supabaseAdmin.from("ai_saved_answers").select(COLS).order("updated_at", { ascending: false }).limit(200);
    if (error) {
        console.error("[api/ai/saved-answers] read failed", error);
        return NextResponse.json(CALM_ERROR, { status: 500 });
    }
    return NextResponse.json({ saved: data ?? [] });
}

export async function POST(req: NextRequest) {
    const auth = await requireStaff(["admin"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    let body: any;
    try { body = await req.json(); } catch { body = null; }
    const title = cleanTitle(body?.title);
    const text = cleanBody(body?.body);
    if (!title || !text) return NextResponse.json({ error: "A saved answer needs a title and an answer." }, { status: 400 });
    const { data, error } = await supabaseAdmin
        .from("ai_saved_answers")
        .insert({ title, body: text, roles: cleanRoles(body?.roles), created_by: auth.userId })
        .select(COLS)
        .single();
    if (error) {
        console.error("[api/ai/saved-answers] insert failed", error);
        return NextResponse.json(CALM_ERROR, { status: 500 });
    }
    return NextResponse.json({ saved: data });
}

export async function PATCH(req: NextRequest) {
    const auth = await requireStaff(["admin"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    let body: any;
    try { body = await req.json(); } catch { body = null; }
    const id = typeof body?.id === "string" && UUID_RE.test(body.id) ? body.id : null;
    if (!id) return NextResponse.json({ error: "That saved answer wasn't found." }, { status: 404 });

    const patch: Record<string, unknown> = {};
    if ("title" in (body ?? {})) {
        const title = cleanTitle(body.title);
        if (!title) return NextResponse.json({ error: "A saved answer needs a title." }, { status: 400 });
        patch.title = title;
    }
    if ("body" in (body ?? {})) {
        const text = cleanBody(body.body);
        if (!text) return NextResponse.json({ error: "A saved answer can't be empty." }, { status: 400 });
        patch.body = text;
    }
    if ("active" in (body ?? {})) {
        if (typeof body.active !== "boolean") return NextResponse.json({ error: "That value isn't valid." }, { status: 400 });
        patch.active = body.active;
    }
    if ("roles" in (body ?? {})) patch.roles = cleanRoles(body.roles);
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

    const { data, error } = await supabaseAdmin
        .from("ai_saved_answers")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(COLS)
        .maybeSingle();
    if (error) {
        console.error("[api/ai/saved-answers] update failed", error);
        return NextResponse.json(CALM_ERROR, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "That saved answer wasn't found." }, { status: 404 });
    return NextResponse.json({ saved: data });
}
