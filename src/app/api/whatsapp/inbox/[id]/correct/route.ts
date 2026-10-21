// Correct one of the assistant's replies. step "draft": staff say what it
// should have said and why; the model condenses that into one lasting lesson
// (nothing is saved yet; staff can edit it). step "save": the lesson is saved,
// and with sendNow the right answer also goes to the customer from the shop's
// line (the chat stays as it is). Only the assistant's own replies can be
// corrected: not staff messages, order updates or photos. Admin and owner.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logCause } from "@/lib/errors/apiError";
import { BODY_MAX, TITLE_MAX } from "@/lib/ai/teach/lessonRules";
import { createLesson } from "@/lib/ai/teach/lessons";
import { distillCorrection, TeachLimit } from "@/lib/ai/teach/teachModel";
import { staffName } from "@/lib/whatsapp/events";
import { teachOn } from "@/lib/whatsapp/flags";
import { windowOpen } from "@/lib/whatsapp/inbox";
import { sendAsStaff } from "@/lib/whatsapp/staffSend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const db = supabaseAdmin as any;
type Ctx = { params: Promise<{ id: string }> };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** The reply being corrected and the customer message just before it; null when it isn't the assistant's own. */
async function loadReply(conversationId: string, messageId: string) {
    const { data: m, error } = await db.from("message_log").select("id, direction, content, message_type, sent_by_staff, created_at")
        .eq("id", messageId).eq("conversation_id", conversationId).maybeSingle();
    if (error) throw error;
    if (!m || m.direction !== "outbound" || m.sent_by_staff || !["text", "interactive"].includes(m.message_type ?? "text") || !m.content?.trim()) return null;
    const { data: before, error: bErr } = await db.from("message_log").select("content").eq("conversation_id", conversationId)
        .eq("direction", "inbound").lt("created_at", m.created_at).order("created_at", { ascending: false }).limit(1);
    if (bErr) throw bErr;
    return { said: String(m.content), customerWrote: (before ?? [])[0]?.content ?? null };
}

export async function POST(req: NextRequest, { params }: Ctx) {
    const auth = await requireStaff(["admin", "owner"]);
    if ("status" in auth) return fail(auth.status === 401 ? "Please sign in again." : "Only the owner and admins can teach the assistant.", auth.status);
    if (!teachOn()) return fail("Teaching the assistant is switched off.", 403);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const messageId = String(body?.messageId ?? "");
    if (!UUID.test(id) || !UUID.test(messageId)) return fail("That message isn't there any more. Please refresh.", 404);
    try {
        const reply = await loadReply(id, messageId);
        if (!reply) return fail("Only the assistant's own replies can be corrected.", 400);
        const rightAnswer = String(body?.rightAnswer ?? "").trim().slice(0, 600);
        const who = { staffId: auth.userId, staffName: await staffName(auth.userId).catch(() => null) };

        if (body?.step === "draft") {
            if (!rightAnswer) return fail("Say what it should have said.", 400);
            const why = String(body?.why ?? "").trim().slice(0, 400);
            const drafted = await distillCorrection(auth.userId, { customerWrote: reply.customerWrote, assistantSaid: reply.said, rightAnswer, why })
                .catch(e => { if (e instanceof TeachLimit) throw e; logCause("GEN-00", e, { route: "whatsapp/inbox/[id]/correct draft" }); return null; });
            // Without a clean draft, staff start from their own words.
            const draft = drafted ?? {
                title: (reply.customerWrote?.replace(/\s+/g, " ").trim() || "What to say").slice(0, TITLE_MAX),
                body: (why || rightAnswer).slice(0, BODY_MAX),
            };
            const { data: c } = await db.from("whatsapp_conversations").select("last_inbound_at").eq("id", id).maybeSingle();
            return NextResponse.json({ draft, drafted: !!drafted, canSend: windowOpen(c?.last_inbound_at ?? null, Date.now()) });
        }

        if (body?.step === "save") {
            const saved = await createLesson({
                kind: "correction", title: String(body?.title ?? ""), body: String(body?.body ?? ""), sourceMessageId: messageId, ...who,
            });
            if (!saved.ok) return fail(saved.error, 400);
            let sent: boolean | null = null;
            if (body?.sendNow === true && rightAnswer) {
                const r = await sendAsStaff({ conversationId: id, text: rightAnswer, ...who, takeOver: false });
                sent = r.ok;
            }
            return NextResponse.json({ ok: true, lesson: saved.lesson, sent });
        }
        return fail("Please refresh and try again.", 400);
    } catch (e) {
        if (e instanceof TeachLimit) return fail(e.calm, 429);
        logCause("GEN-00", e, { route: "whatsapp/inbox/[id]/correct" });
        return fail("We couldn't save that correction. Please try again.", 500);
    }
}
