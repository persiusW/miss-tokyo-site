// Tell the assistant: staff give it a note for this chat ("she wants the
// green one in L, offer pickup at Osu") and it replies to the customer now,
// following it. The chat is handed back to the assistant first. With remember,
// the note is also condensed into a lasting lesson (only when the model made
// a clean one). Admin and owner, like the rest of teaching.
import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { getAiSettings } from "@/lib/ai/settings";
import { logCause } from "@/lib/errors/apiError";
import { STAFF_NOTE_MAX } from "@/lib/ai/shopAssistant/facts";
import { createLesson } from "@/lib/ai/teach/lessons";
import { distillHint, TeachLimit } from "@/lib/ai/teach/teachModel";
import { logConversationEvent, staffName } from "@/lib/whatsapp/events";
import { teachOn } from "@/lib/whatsapp/flags";
import { handBackState, windowOpen } from "@/lib/whatsapp/inbox";
import { tellAssistant } from "@/lib/whatsapp/processing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const db = supabaseAdmin as any;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
    const auth = await requireStaff(["admin", "owner"]);
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "Please sign in again." : "Only the owner and admins can teach the assistant." }, { status: auth.status });
    if (!teachOn()) return NextResponse.json({ error: "Teaching the assistant is switched off." }, { status: 403 });
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "That chat isn't there any more. Please refresh." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const note = String(body?.text ?? "").trim();
    const remember = body?.remember !== false;
    if (!note) return NextResponse.json({ error: "Write what the assistant should know first." }, { status: 400 });
    if (note.length > STAFF_NOTE_MAX) return NextResponse.json({ error: `Keep it under ${STAFF_NOTE_MAX} characters.` }, { status: 400 });
    try {
        const { data: c, error } = await db.from("whatsapp_conversations")
            .select("id, provider, state, handed_off_at, last_inbound_at").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!c) return NextResponse.json({ error: "That chat isn't there any more. Please refresh." }, { status: 404 });
        if (!windowOpen(c.last_inbound_at, Date.now())) {
            return NextResponse.json({ error: "Their last message was over 24 hours ago, so the assistant can't message them. Reply from your WhatsApp phone instead." }, { status: 409 });
        }
        const by = { staffId: auth.userId, staffName: await staffName(auth.userId).catch(() => null) };
        if (c.handed_off_at) {
            const { error: upErr } = await db.from("whatsapp_conversations")
                .update({ handed_off_at: null, dealt_with_at: null, assigned_staff_id: null, state: handBackState(c.state, new Date()) }).eq("id", id);
            if (upErr) throw upErr;
            await logConversationEvent(id, "handed_back", by);
        }
        await logConversationEvent(id, "told_assistant", by);
        after(async () => {
            const settings = await getAiSettings();
            await Promise.all([
                tellAssistant(id, c.provider ?? "chatbots_africa", note, settings)
                    .then(r => { if (r !== "answered") console.info("[whatsapp-tell] not answered", { result: r }); })
                    .catch(e => logCause("GEN-00", e, { route: "whatsapp/inbox/[id]/tell answer" })),
                remember ? distillHint(auth.userId, note)
                    .then(d => d ? createLesson({ kind: "hint", title: d.title, body: d.body, ...by }) : null)
                    .catch(e => { if (!(e instanceof TeachLimit)) logCause("GEN-00", e, { route: "whatsapp/inbox/[id]/tell remember" }); })
                    : Promise.resolve(),
            ]);
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/inbox/[id]/tell" });
        return NextResponse.json({ error: "We couldn't pass that to the assistant. Please try again." }, { status: 500 });
    }
}
