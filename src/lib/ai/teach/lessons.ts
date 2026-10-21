// The lessons staff teach the assistant (assistant_lessons). Retired lessons
// are kept (active = false) so nothing taught is lost. Server-only.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { lessonError, lessonsBlock, MAX_ACTIVE_LESSONS, type Lesson, type LessonKind } from "./lessonRules";

// assistant_lessons is not in the generated types yet.
const db = supabaseAdmin as any;

export type LessonRow = Lesson & {
    active: boolean; imagePath: string | null; sourceMessageId: string | null;
    createdByName: string | null; updatedAt: string;
};

const FIELDS = "id, kind, title, body, active, image_path, source_message_id, created_by_name, created_at, updated_at";
const shape = (r: any): LessonRow => ({
    id: r.id, kind: r.kind, title: r.title, body: r.body, active: r.active, imagePath: r.image_path ?? null,
    sourceMessageId: r.source_message_id ?? null, createdByName: r.created_by_name ?? null, createdAt: r.created_at, updatedAt: r.updated_at,
});

export async function listLessons(opts: { includeRetired?: boolean } = {}): Promise<LessonRow[]> {
    let q = db.from("assistant_lessons").select(FIELDS).order("created_at", { ascending: false }).limit(200);
    if (!opts.includeRetired) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(shape);
}

/** The lessons block for this turn's prompt; null when none or unreadable (the assistant runs without them). */
export async function activeLessonsText(): Promise<string | null> {
    try {
        const { data, error } = await db.from("assistant_lessons").select("kind, title, body")
            .eq("active", true).order("created_at", { ascending: false }).limit(MAX_ACTIVE_LESSONS);
        if (error) throw error;
        return lessonsBlock(data ?? []);
    } catch (e) {
        console.error("[teach] lessons not loaded", { err: String(e) });
        return null;
    }
}

export type SaveResult = { ok: true; lesson: LessonRow } | { ok: false; error: string };

export async function createLesson(a: {
    kind: LessonKind; title: string; body: string; staffId: string; staffName: string | null;
    sourceMessageId?: string | null; imagePath?: string | null;
}): Promise<SaveResult> {
    const err = lessonError(a.title, a.body);
    if (err) return { ok: false, error: err };
    const { count, error: cErr } = await db.from("assistant_lessons").select("id", { count: "exact", head: true }).eq("active", true);
    if (cErr) throw cErr;
    if ((count ?? 0) >= MAX_ACTIVE_LESSONS) return { ok: false, error: `The assistant holds ${MAX_ACTIVE_LESSONS} lessons at a time. Retire one first.` };
    const { data, error } = await db.from("assistant_lessons").insert({
        kind: a.kind, title: a.title.trim(), body: a.body.trim(), created_by: a.staffId, created_by_name: a.staffName,
        source_message_id: a.sourceMessageId ?? null, image_path: a.imagePath ?? null,
    }).select(FIELDS).single();
    if (error) throw error;
    return { ok: true, lesson: shape(data) };
}

export async function updateLesson(id: string, title: string, body: string): Promise<SaveResult> {
    const err = lessonError(title, body);
    if (err) return { ok: false, error: err };
    const { data, error } = await db.from("assistant_lessons")
        .update({ title: title.trim(), body: body.trim(), updated_at: new Date().toISOString() })
        .eq("id", id).eq("active", true).select(FIELDS).maybeSingle();
    if (error) throw error;
    return data ? { ok: true, lesson: shape(data) } : { ok: false, error: "That lesson was retired. Please refresh." };
}

export async function retireLesson(id: string): Promise<boolean> {
    const { data, error } = await db.from("assistant_lessons")
        .update({ active: false, updated_at: new Date().toISOString() }).eq("id", id).eq("active", true).select("id");
    if (error) throw error;
    return (data ?? []).length > 0;
}
