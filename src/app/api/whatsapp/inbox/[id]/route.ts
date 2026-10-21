// One WhatsApp chat: every message in and out (GET), and handing it back to
// the assistant once a person is done (POST { action: "hand_back" }). With
// answer: true the assistant also replies to the messages that came in with
// no reply from us, after the response. Order staff only.
import { after, NextRequest, NextResponse } from "next/server";
import { getAiSettings } from "@/lib/ai/settings";
import { answerWaitingMessages } from "@/lib/whatsapp/processing";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logCause } from "@/lib/errors/apiError";
import { handBackState, mediaState, shapeConversation, type ConversationRow, type MessageRow } from "@/lib/whatsapp/inbox";
import { mediaEnabled } from "@/lib/whatsapp/media";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DENIED = { 401: { error: "Please sign in again." }, 403: { error: "Only order staff can see WhatsApp chats." } };
const NOT_FOUND = { error: "That chat isn't there any more. Please refresh." };
const FAIL = { error: "We couldn't load this chat. Please refresh and try again." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const db = supabaseAdmin as any;

type Ctx = { params: Promise<{ id: string }> };
const FIELDS = "id, wa_phone_number, wa_contact_name, state, handed_off_at, last_message_at, last_inbound_at, created_at";

export async function GET(_req: NextRequest, { params }: Ctx) {
    const auth = await requireStaff(["admin", "owner", "sales_staff"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json(NOT_FOUND, { status: 404 });
    try {
        const [conv, msgs] = await Promise.all([
            db.from("whatsapp_conversations").select(FIELDS).eq("id", id).maybeSingle(),
            db.from("message_log").select("id, conversation_id, direction, content, message_type, media_url, created_at")
                .eq("conversation_id", id).order("created_at", { ascending: false }).limit(300),
        ]);
        if (conv.error || msgs.error) throw conv.error ?? msgs.error;
        if (!conv.data) return NextResponse.json(NOT_FOUND, { status: 404 });
        const messages = ((msgs.data ?? []) as MessageRow[]).reverse();
        const showMedia = mediaEnabled();
        return NextResponse.json({
            conversation: shapeConversation(conv.data as ConversationRow, messages[messages.length - 1] ?? null, Date.now()),
            messages: messages.map(m => ({ id: m.id, direction: m.direction, text: m.content, type: m.message_type, at: m.created_at, media: showMedia ? mediaState(m) : null })),
        });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/inbox/[id]" });
        return NextResponse.json(FAIL, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: Ctx) {
    const auth = await requireStaff(["admin", "owner", "sales_staff"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json(NOT_FOUND, { status: 404 });
    const body = await req.json().catch(() => null);
    if (body?.action !== "hand_back") return NextResponse.json({ error: "Please refresh and try again." }, { status: 400 });
    try {
        const { data: row, error } = await db.from("whatsapp_conversations").select("state, provider, handed_off_at").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!row) return NextResponse.json(NOT_FOUND, { status: 404 });
        const { error: upError } = await db.from("whatsapp_conversations")
            .update({ handed_off_at: null, assigned_staff_id: null, state: handBackState(row.state, new Date()) }).eq("id", id);
        if (upError) throw upError;
        const answer = body?.answer === true;
        if (answer) {
            const wasWithPerson = !!row.handed_off_at;
            after(async () => {
                try {
                    const r = await answerWaitingMessages(id, row.provider ?? "chatbots_africa", await getAiSettings(), wasWithPerson);
                    if (r !== "answered") console.info("[whatsapp-inbox] nothing answered on hand-back", { result: r });
                } catch (e) {
                    logCause("GEN-00", e, { route: "whatsapp/inbox/[id] answer waiting" });
                }
            });
        }
        return NextResponse.json({ ok: true, answering: answer });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/inbox/[id] POST" });
        return NextResponse.json({ error: "We couldn't hand this chat back. Please try again." }, { status: 500 });
    }
}
