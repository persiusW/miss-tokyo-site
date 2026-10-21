// What the assistant has been taught (GET), a note added by hand (POST
// { title, body }), and a lesson edited or retired (PATCH { id, title, body }
// or { id, retire: true }). Admin and owner.
import { NextRequest, NextResponse } from "next/server";
import { logCause } from "@/lib/errors/apiError";
import { MAX_ACTIVE_LESSONS } from "@/lib/ai/teach/lessonRules";
import { createLesson, listLessons, retireLesson, updateLesson } from "@/lib/ai/teach/lessons";
import { STORED_MEDIA } from "@/lib/whatsapp/inbox";
import { mediaLink } from "@/lib/whatsapp/media";
import { teacher } from "../guard";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FAIL = { error: "Something happened. Please refresh and try again." };

export async function GET() {
    const who = await teacher();
    if (who instanceof NextResponse) return who;
    try {
        const lessons = await listLessons();
        const withImages = await Promise.all(lessons.map(async l => ({
            ...l, imageUrl: l.imagePath ? await mediaLink(`${STORED_MEDIA}${l.imagePath}`) : null, imagePath: undefined,
        })));
        return NextResponse.json({ lessons: withImages, max: MAX_ACTIVE_LESSONS });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/teach/lessons GET" });
        return NextResponse.json(FAIL, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const who = await teacher();
    if (who instanceof NextResponse) return who;
    const body = await req.json().catch(() => null);
    try {
        const r = await createLesson({ kind: "note", title: String(body?.title ?? ""), body: String(body?.body ?? ""), ...who });
        return r.ok ? NextResponse.json({ lesson: r.lesson }) : NextResponse.json({ error: r.error }, { status: 400 });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/teach/lessons POST" });
        return NextResponse.json(FAIL, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const who = await teacher();
    if (who instanceof NextResponse) return who;
    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "");
    if (!UUID.test(id)) return NextResponse.json({ error: "That lesson isn't there any more. Please refresh." }, { status: 404 });
    try {
        if (body?.retire === true) {
            return (await retireLesson(id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "That lesson was already retired." }, { status: 409 });
        }
        const r = await updateLesson(id, String(body?.title ?? ""), String(body?.body ?? ""));
        return r.ok ? NextResponse.json({ lesson: r.lesson }) : NextResponse.json({ error: r.error }, { status: 400 });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/teach/lessons PATCH" });
        return NextResponse.json(FAIL, { status: 500 });
    }
}
