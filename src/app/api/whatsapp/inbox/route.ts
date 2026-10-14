// WhatsApp inbox: conversations, newest first, with the last message. Order
// staff only (admin, owner, sales staff): chats hold customer numbers.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logCause } from "@/lib/errors/apiError";
import { shapeConversation, type ConversationRow, type MessageRow } from "@/lib/whatsapp/inbox";

export const dynamic = "force-dynamic";

const DENIED = { 401: { error: "Please sign in again." }, 403: { error: "Only order staff can see WhatsApp chats." } };
const FAIL = { error: "We couldn't load WhatsApp chats. Please refresh and try again." };
const db = supabaseAdmin as any;

export async function GET() {
    const auth = await requireStaff(["admin", "owner", "sales_staff"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const { data: convs, error } = await db.from("whatsapp_conversations")
            .select("id, wa_phone_number, wa_contact_name, state, handed_off_at, last_message_at, last_inbound_at, created_at")
            .order("last_message_at", { ascending: false, nullsFirst: false }).limit(100);
        if (error) throw error;
        const ids = ((convs ?? []) as ConversationRow[]).map(c => c.id);
        const last = new Map<string, MessageRow>();
        if (ids.length > 0) {
            // Latest message per chat: newest first, first one seen wins.
            const { data: msgs, error: mErr } = await db.from("message_log")
                .select("id, conversation_id, direction, content, message_type, created_at")
                .in("conversation_id", ids).order("created_at", { ascending: false }).limit(1000);
            if (mErr) throw mErr;
            for (const m of (msgs ?? []) as MessageRow[]) if (!last.has(m.conversation_id)) last.set(m.conversation_id, m);
        }
        const now = Date.now();
        return NextResponse.json({ conversations: ((convs ?? []) as ConversationRow[]).map(c => shapeConversation(c, last.get(c.id) ?? null, now)) });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/inbox" });
        return NextResponse.json(FAIL, { status: 500 });
    }
}
