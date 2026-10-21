// What happened to a WhatsApp chat and who did it (whatsapp_conversation_events),
// shown as markers in the inbox. Writing one never fails the action it records.
// Server-only (service role).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { EventKind, EventRow } from "./inbox";

// whatsapp_conversation_events is not in the generated types yet.
const db = supabaseAdmin as any;

export async function logConversationEvent(
    conversationId: string, kind: EventKind, by: { reason?: string | null; staffId?: string | null; staffName?: string | null } = {},
): Promise<void> {
    const { error } = await db.from("whatsapp_conversation_events").insert({
        conversation_id: conversationId, kind, reason: by.reason ?? null, staff_id: by.staffId ?? null, staff_name: by.staffName ?? null,
    });
    if (error) console.error("[whatsapp] could not record a chat event", { kind, code: error.code });
}

export async function conversationEvents(conversationId: string): Promise<EventRow[]> {
    const { data, error } = await db.from("whatsapp_conversation_events").select("id, kind, reason, staff_name, created_at")
        .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(200);
    if (error) throw error;
    return (data ?? []) as EventRow[];
}

/** The name staff know a colleague by: full name, else first name, else the part of the email before @. */
export async function staffName(userId: string): Promise<string | null> {
    const { data } = await supabaseAdmin.from("profiles").select("full_name, first_name, email").eq("id", userId).maybeSingle();
    const name = (data?.full_name ?? "").trim() || (data?.first_name ?? "").trim() || (data?.email ?? "").split("@")[0].trim();
    return name ? name.slice(0, 60) : null;
}
