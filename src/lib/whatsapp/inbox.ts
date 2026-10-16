// Shaping for the WhatsApp inbox: who is talking to whom, whether WhatsApp's
// 24-hour reply window is open, and a one-line preview. Pure.
import { REPLY_WINDOW_MS } from "./pipeline";

export type InboxMode = "assistant" | "person";

export type ConversationRow = {
    id: string; wa_phone_number: string; wa_contact_name: string | null; state: Record<string, unknown> | null;
    handed_off_at: string | null; last_message_at: string | null; last_inbound_at: string | null; created_at: string;
};
export type MessageRow = { id: string; conversation_id: string; direction: "inbound" | "outbound"; content: string | null; message_type: string | null; created_at: string };

export type InboxConversation = {
    id: string; name: string | null; phone: string; mode: InboxMode; reason: string | null;
    handedOffAt: string | null; lastMessageAt: string | null; windowOpen: boolean;
    preview: { direction: "inbound" | "outbound"; text: string; at: string } | null;
};

const REASON_LABEL: Record<string, string> = {
    customer_asked: "Asked for a person",
    unsupported_message: "Sent a photo, voice note or file",
    awaiting_assistant: "Waiting for a person",
    processing_failed: "Message could not be handled",
    daily_limit: "Reached today's chat limit",
    assistant_failed: "Assistant had a problem",
    return_request: "Return or exchange",
};

export function previewText(m: Pick<MessageRow, "content" | "message_type">): string {
    const t = m.content?.trim().replace(/\s+/g, " ");
    return t ? (t.length > 90 ? `${t.slice(0, 89)}…` : t) : `[${m.message_type ?? "message"}]`;
}

export function windowOpen(lastInboundAt: string | null, now: number): boolean {
    const t = lastInboundAt ? Date.parse(lastInboundAt) : NaN;
    return Number.isFinite(t) && now - t < REPLY_WINDOW_MS;
}

export function shapeConversation(c: ConversationRow, last: MessageRow | null, now: number): InboxConversation {
    const reason = typeof c.state?.reason === "string" ? c.state.reason : null;
    return {
        id: c.id, name: c.wa_contact_name, phone: c.wa_phone_number,
        mode: c.handed_off_at ? "person" : "assistant",
        reason: c.handed_off_at && reason ? REASON_LABEL[reason] ?? null : null,
        handedOffAt: c.handed_off_at, lastMessageAt: c.last_message_at,
        windowOpen: windowOpen(c.last_inbound_at, now),
        preview: last ? { direction: last.direction, text: previewText(last), at: last.created_at } : null,
    };
}

/** Back to the assistant: the person is done. Keeps the rest of state. */
export function handBackState(state: Record<string, unknown> | null, now: Date): Record<string, unknown> {
    return { ...(state ?? {}), mode: "assistant", reason: null, since: now.toISOString() };
}
