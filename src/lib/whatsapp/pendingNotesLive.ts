// The live side of waiting staff notes (pendingNotes.ts): the table, the
// provider, and the template that asks the customer to reply. Server-only.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { NOTE_EVENT } from "@/lib/admin/v2/orders";
import { NOTE_TTL_MS, type DeliverDeps, type PendingNote, type QueueDeps } from "./pendingNotes";
import { notifyCustomerOnWhatsApp } from "./templateSendLive";

const db = supabaseAdmin as any;

const toNote = (r: any): PendingNote => ({
    id: r.id, kind: r.kind, body: r.body, orderId: r.order_id ?? null, staffId: r.staff_id ?? null, staffName: r.staff_name ?? null, createdAt: r.created_at,
});

async function waiting(conversationId: string, since: Date): Promise<number> {
    const { count, error } = await db.from("whatsapp_pending_notes").select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId).is("delivered_at", null).gte("created_at", since.toISOString());
    if (error) throw error;
    return count ?? 0;
}

export function liveQueueDeps(phone: string, event: string, orderId: string | null): QueueDeps {
    return {
        waiting,
        insert: async n => {
            const { data, error } = await db.from("whatsapp_pending_notes").insert({
                conversation_id: n.conversationId, kind: n.kind, body: n.body, order_id: n.orderId, staff_id: n.staffId, staff_name: n.staffName,
            }).select("id").single();
            if (error) throw error;
            return data.id as string;
        },
        remove: async id => { await db.from("whatsapp_pending_notes").delete().eq("id", id).is("delivered_at", null); },
        ask: choice => notifyCustomerOnWhatsApp({ phone, freeText: null, templates: [choice] }, { event, orderId }),
    };
}

/** Cheap check before taking the chat's turn lock: most messages have nothing waiting. */
export const hasWaitingNotes = (conversationId: string, now = Date.now()) =>
    waiting(conversationId, new Date(now - NOTE_TTL_MS)).then(n => n > 0);

export function liveDeliverDeps(toTeam: DeliverDeps["toTeam"]): DeliverDeps {
    const sender = createChatbotsAfrica();
    return {
        claim: async (conversationId, since) => {
            const { data, error } = await db.from("whatsapp_pending_notes").update({ delivered_at: new Date().toISOString() })
                .eq("conversation_id", conversationId).is("delivered_at", null).gte("created_at", since.toISOString())
                .select("id, kind, body, order_id, staff_id, staff_name, created_at");
            if (error) throw error;
            return (data ?? []).map(toNote).sort((a: PendingNote, b: PendingNote) => a.createdAt.localeCompare(b.createdAt));
        },
        unclaim: async ids => { await db.from("whatsapp_pending_notes").update({ delivered_at: null }).in("id", ids); },
        send: (phone, n) => sender.sendText(phone, n.body, { event: n.orderId ? NOTE_EVENT : "whatsapp_staff_reply", orderId: n.orderId }),
        log: async (conversationId, n, waMessageId) => {
            const { error } = await db.from("message_log").insert({
                conversation_id: conversationId, direction: "outbound", content: n.body, wa_message_id: waMessageId,
                message_type: "text", sent_by_staff: n.staffId, sent_by_name: n.staffName,
            });
            if (error) throw error;
        },
        toTeam,
    };
}

/** The chat stays with the team, the assistant quiet in it (state reason: staffSend's STAFF_REPLYING). Never throws. */
export async function keepWithTeam(conversationId: string, quietReason: string): Promise<void> {
    try {
        const { data: row, error } = await db.from("whatsapp_conversations").select("state, handed_off_at").eq("id", conversationId).maybeSingle();
        if (error || !row) throw error ?? new Error("conversation not found");
        const now = new Date().toISOString();
        const { error: upErr } = await db.from("whatsapp_conversations")
            .update({ state: { ...(row.state ?? {}), mode: "human", reason: quietReason, since: now }, handed_off_at: row.handed_off_at ?? now, dealt_with_at: null })
            .eq("id", conversationId);
        if (upErr) throw upErr;
    } catch (e) {
        console.error("[whatsapp] waiting note sent; chat not kept with the team", { err: String(e) });
    }
}
