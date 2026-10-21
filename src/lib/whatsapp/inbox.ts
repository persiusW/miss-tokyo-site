// Shaping for the WhatsApp inbox: who is talking to whom, where each chat
// stands (needs a person, dealt with, assistant, notices only), whether
// WhatsApp's 24-hour reply window is open, and a one-line preview. Pure.
import { REPLY_WINDOW_MS } from "./pipeline";

export type InboxMode = "assistant" | "person";
/**
 * needs: with a person and not dealt with (or the customer wrote again after it was);
 * dealt: with a person, staff marked it handled; assistant: the assistant has it;
 * notices: only our order updates, the customer never wrote.
 */
export type Standing = "needs" | "dealt" | "assistant" | "notices";
export const TABS = ["all", "needs", "assistant", "notices", "dealt"] as const;
export type InboxTab = (typeof TABS)[number];

export type ConversationRow = {
    id: string; wa_phone_number: string; wa_contact_name: string | null; state: Record<string, unknown> | null;
    handed_off_at: string | null; last_message_at: string | null; last_inbound_at: string | null; created_at: string;
    dealt_with_at?: string | null;
};
export type MessageRow = {
    id: string; conversation_id: string; direction: "inbound" | "outbound"; content: string | null; message_type: string | null; created_at: string;
    media_url?: string | null;
};

export type InboxConversation = {
    id: string; name: string | null; phone: string; mode: InboxMode; reason: string | null;
    handedOffAt: string | null; lastMessageAt: string | null; windowOpen: boolean;
    preview: { direction: "inbound" | "outbound"; text: string; at: string } | null;
    standing: Standing;
    /** With a person: since when the customer has been waiting for one. */
    waitingSince: string | null;
    /** The customer wrote again after staff marked the chat dealt with. */
    wroteAgain: boolean;
};

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

export function standingOf(c: Pick<ConversationRow, "handed_off_at" | "dealt_with_at" | "last_inbound_at">): Standing {
    if (c.handed_off_at) return wroteAgain(c) || !c.dealt_with_at ? "needs" : "dealt";
    if (!c.last_inbound_at) return "notices";
    return "assistant";
}

export function wroteAgain(c: Pick<ConversationRow, "handed_off_at" | "dealt_with_at" | "last_inbound_at">): boolean {
    return !!c.handed_off_at && !!c.dealt_with_at && ms(c.last_inbound_at) > ms(c.dealt_with_at);
}

export function waitingSince(c: Pick<ConversationRow, "handed_off_at" | "dealt_with_at" | "last_inbound_at">): string | null {
    if (standingOf(c) !== "needs") return null;
    return wroteAgain(c) ? c.last_inbound_at : c.handed_off_at;
}

/** Chats waiting for a person first (longest wait first), then the rest by latest message. */
export function sortInbox<T extends Pick<InboxConversation, "standing" | "waitingSince" | "lastMessageAt">>(list: T[]): T[] {
    const latest = (c: T) => ms(c.lastMessageAt) || 0;
    return [...list].sort((a, b) => {
        const na = a.standing === "needs", nb = b.standing === "needs";
        if (na !== nb) return na ? -1 : 1;
        if (na && nb) return (ms(a.waitingSince) || 0) - (ms(b.waitingSince) || 0);
        return latest(b) - latest(a);
    });
}

export function inTab(c: Pick<InboxConversation, "standing">, tab: InboxTab): boolean {
    return tab === "all" || c.standing === tab;
}

export function tabCounts(list: Pick<InboxConversation, "standing">[]): Record<InboxTab, number> {
    const n: Record<InboxTab, number> = { all: list.length, needs: 0, assistant: 0, notices: 0, dealt: 0 };
    for (const c of list) n[c.standing]++;
    return n;
}

/** "Waiting 5 min", "Waiting 2 h", "Waiting 3 days". */
export function waitingFor(since: string | null, now: number): string | null {
    const t = ms(since);
    if (!Number.isFinite(t)) return null;
    const min = Math.max(0, Math.floor((now - t) / 60_000));
    if (min < 60) return `Waiting ${Math.max(1, min)} min`;
    const h = Math.floor(min / 60);
    return h < 48 ? `Waiting ${h} h` : `Waiting ${Math.floor(h / 24)} days`;
}

// ── What happened in a chat (whatsapp_conversation_events) ─────────────────────

export type EventKind = "handed_off" | "handed_back" | "dealt_with" | "answered_waiting" | "auto_resumed" | "re_alerted";
export type EventRow = { id: string; kind: EventKind; reason: string | null; staff_name: string | null; created_at: string };

/** One line for the marker in the chat. */
export function eventLabel(e: Pick<EventRow, "kind" | "reason" | "staff_name">): string {
    const by = e.staff_name ? ` by ${e.staff_name}` : "";
    switch (e.kind) {
        case "handed_off": return `Handed to a person${e.reason && REASON_LABEL[e.reason] ? ` · ${REASON_LABEL[e.reason]}` : ""}`;
        case "handed_back": return `Handed back to the assistant${by}`;
        case "dealt_with": return `Marked dealt with${by}`;
        case "answered_waiting": return `Assistant asked to reply to waiting messages${by}`;
        case "auto_resumed": return "Back with the assistant after 24 hours";
        case "re_alerted": return "Team alerted again: the customer wrote again";
        default: return "Chat updated";
    }
}

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
        standing: standingOf(c), waitingSince: waitingSince(c), wroteAgain: wroteAgain(c),
    };
}

/** In assistant mode, a message this old with no reply was missed, not still being answered. */
export const MISSED_AFTER_MS = 2 * 60_000;
/** At most this many waiting messages are answered in one turn, the latest. */
export const MAX_WAITING = 6;

/**
 * The customer's messages after our last one, oldest first, while WhatsApp still lets us reply.
 * Staff reply from their own WhatsApp, so a person may have answered these; staff choose.
 */
export function waitingMessages<T extends { direction: "inbound" | "outbound"; at: string }>(messages: T[], now: number): T[] {
    let i = messages.length;
    while (i > 0 && messages[i - 1].direction === "inbound") i--;
    const waiting = messages.slice(i);
    if (waiting.length === 0 || !windowOpen(waiting[waiting.length - 1].at, now)) return [];
    return waiting.slice(-MAX_WAITING);
}

/** Whether staff are offered "reply to the waiting messages": always with a person, else only once they were missed. */
export function canAnswerWaiting(mode: InboxMode, waiting: { at: string }[], now: number): boolean {
    if (waiting.length === 0) return false;
    return mode === "person" || now - Date.parse(waiting[waiting.length - 1].at) >= MISSED_AFTER_MS;
}

// ── Media in the chat ─────────────────────────────────────────────────────────

/** message_log.media_url for a copy in our private bucket; any other value is a public https link. */
export const STORED_MEDIA = "storage:";
/** message_log.media_url for a file the provider couldn't give us (too big, expired). */
export const MISSING_MEDIA = "none:";
export type MediaKind = "photo" | "audio" | "video" | "file";

/** How the inbox shows a message's file, or null for a message without one. */
export function mediaKind(type: string | null): MediaKind | null {
    switch (type) {
        case "image": case "sticker": return "photo";
        case "audio": case "voice": return "audio";
        case "video": return "video";
        case "document": return "file";
        default: return null;
    }
}

/**
 * What the inbox can show for a message's file: "ready" (stored or public), "fetch" (a customer
 * file not copied yet; opening it copies it), "missing", or null for no file. Never the link itself.
 */
export function mediaState(m: Pick<MessageRow, "direction" | "message_type" | "media_url">): "ready" | "fetch" | "missing" | null {
    if (!mediaKind(m.message_type)) return null;
    const url = m.media_url ?? "";
    if (url.startsWith(STORED_MEDIA) || /^https:\/\//i.test(url)) return "ready";
    if (m.direction === "inbound" && (!url || url === `${MISSING_MEDIA}rejected`)) return "fetch";
    return "missing";
}

const EXT: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/amr": "amr",
    "video/mp4": "mp4", "video/3gpp": "3gp", "application/pdf": "pdf",
};

/** Where a customer's file is kept: one folder per chat, named by the WhatsApp message id. */
export function mediaPath(conversationId: string, waMessageId: string, contentType: string | null): string {
    const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
    const ext = EXT[type] ?? "bin";
    return `${conversationId}/${waMessageId.replace(/[^A-Za-z0-9._-]/g, "_")}.${ext}`;
}

/** Back to the assistant: the person is done. Keeps the rest of state. */
export function handBackState(state: Record<string, unknown> | null, now: Date): Record<string, unknown> {
    return { ...(state ?? {}), mode: "assistant", reason: null, since: now.toISOString() };
}
