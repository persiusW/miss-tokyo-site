// Staff writing to a customer from the inbox, from the shop's own WhatsApp
// line. Inside WhatsApp's 24-hour window it goes straight away; outside it a
// caller that allows it (`late`) has the message wait for the customer's
// reply while a template asks them to reply (pendingNotes.ts). Sent under
// the chat's turn lock so it never lands in the middle of an assistant
// reply. Logged with who sent it. "Reply myself" also gives the chat to the
// team and keeps the assistant quiet in it until it is handed back.
// Server-only (service role).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { logConversationEvent } from "./events";
import { windowOpen } from "./inbox";
import { lateNoteChoice, queueLateNote, type LateNoteKind } from "./pendingNotes";
import { liveQueueDeps } from "./pendingNotesLive";
import { firstNameOf } from "./templates";
import { claimTurnLock, releaseTurnLock } from "./teamWatch";
import { withTurnLock } from "./turnLock";

const db = supabaseAdmin as any;

/** The state reason that keeps the assistant quiet: staff are answering this chat themselves. */
export const STAFF_REPLYING = "staff_replying";
export const STAFF_TEXT_MAX = 1000;

/** waiting: the window was shut, so the message waits for the customer's reply (they were asked to reply when asked is true). */
export type StaffSendResult = { ok: true; waiting?: false } | { ok: true; waiting: true; asked: boolean } | { ok: false; error: string; status: number };

export async function sendAsStaff(a: {
    conversationId: string; text: string; staffId: string; staffName: string | null;
    /** Reply myself: the chat goes to the team and the assistant stays quiet in it. */
    takeOver: boolean;
    /** notification_log event and order, for sends made from somewhere other than the inbox (an order's "Send a note"). */
    event?: string;
    orderId?: string | null;
    /** Outside the window, keep the message for their reply instead of refusing: a follow-up, or a note about an order (its ref). */
    late?: { kind: LateNoteKind; orderRef?: string | null; name?: string | null } | null;
}): Promise<StaffSendResult> {
    const text = a.text.trim();
    if (!text) return { ok: false, error: "Write a message first.", status: 400 };
    if (text.length > STAFF_TEXT_MAX) return { ok: false, error: `Keep it under ${STAFF_TEXT_MAX} characters.`, status: 400 };
    const { data: c, error } = await db.from("whatsapp_conversations")
        .select("id, wa_phone_number, wa_contact_name, last_inbound_at, opted_out_at, state, handed_off_at").eq("id", a.conversationId).maybeSingle();
    if (error) throw error;
    if (!c) return { ok: false, error: "That chat isn't there any more. Please refresh.", status: 404 };
    if (!windowOpen(c.last_inbound_at, Date.now()) && a.late) {
        if (c.opted_out_at) return { ok: false, error: "This customer asked not to get WhatsApp messages.", status: 409 };
        const r = await queueLateNote({
            conversationId: a.conversationId, kind: a.late.kind, body: text, orderId: a.orderId ?? null, staffId: a.staffId, staffName: a.staffName,
            choice: lateNoteChoice(a.late.kind, firstNameOf(a.late.name ?? c.wa_contact_name), a.late.orderRef),
        }, liveQueueDeps(c.wa_phone_number, a.event ?? "whatsapp_staff_reply", a.orderId ?? null));
        return r.ok ? { ok: true, waiting: true, asked: r.asked } : r;
    }
    if (!windowOpen(c.last_inbound_at, Date.now())) {
        return { ok: false, error: "Their last message was over 24 hours ago, so WhatsApp won't deliver a message from here. Reply from your WhatsApp phone instead.", status: 409 };
    }

    return withTurnLock(a.conversationId, async (): Promise<StaffSendResult> => {
        const r = await createChatbotsAfrica().sendText(c.wa_phone_number, text, { event: a.event ?? "whatsapp_staff_reply", orderId: a.orderId ?? null });
        if (!r.ok) return { ok: false, error: "WhatsApp didn't take that message. Please try again.", status: 502 };
        const { error: logErr } = await db.from("message_log").insert({
            conversation_id: a.conversationId, direction: "outbound", content: text, wa_message_id: r.messageId,
            message_type: "text", sent_by_staff: a.staffId, sent_by_name: a.staffName,
        });
        if (logErr) console.error("[whatsapp] staff reply sent but not logged", { code: logErr.code });
        if (a.takeOver) {
            const now = new Date().toISOString();
            const { error: upErr } = await db.from("whatsapp_conversations").update({
                handed_off_at: c.handed_off_at ?? now, dealt_with_at: now, team_alerted_at: now,
                state: { ...(c.state ?? {}), mode: "human", reason: STAFF_REPLYING, since: now },
            }).eq("id", a.conversationId);
            if (upErr) console.error("[whatsapp] staff reply: chat not moved to the team", { code: upErr.code });
            await logConversationEvent(a.conversationId, "staff_replied", { staffId: a.staffId, staffName: a.staffName });
        }
        return { ok: true } as StaffSendResult;
    }, { claim: claimTurnLock, release: releaseTurnLock });
}
