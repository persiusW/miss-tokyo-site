// Chatbots Africa callback body → ParsedInbound. Verified against real
// deliveries (2026-10-14): Meta's Cloud API webhook as JSON, nothing at the top
// level but `object` and `entry` (the PHP sample's chatbot_id, sender_number
// etc. are not sent), no signature header. Pure: no database, no network.
//
// Every entry, change, message and status is read, never only [0]. Names and
// text are customer input: cleaned and capped here, and never given to the
// model as instructions. A body that is not JSON throws (the pipeline retries,
// then gives up visibly); anything else odd is noted, never thrown.
import { toDestination } from "@/lib/messaging/chatbotsAfrica";
import type { InboundMessage, InboundStatus, ParsedInbound } from "../pipeline";

export const MAX_NAME = 60;
export const MAX_TEXT = 4096;
const MEDIA_TYPES = new Set(["image", "audio", "video", "document", "sticker"]);
/** An option title is at most 24 characters; anything longer is not one of ours. */
const TAP_TITLE_MAX = 100;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const capChars = (s: string, n: number) => Array.from(s).slice(0, n).join("");

/** Provider ids (wamid, user id, media id): a safe charset and length, or nothing. */
export function cleanId(v: unknown): string | null {
    const s = typeof v === "number" ? String(v) : str(v);
    return s && /^[A-Za-z0-9._:=+/-]{1,200}$/.test(s) ? s : null;
}

/** A display name: one line, no control or formatting characters (bidi overrides, zero-width), capped. Emoji stay. */
export function cleanName(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const s = v.normalize("NFKC").replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim();
    return s ? capChars(s, MAX_NAME) : null;
}

/** Message text: control and formatting characters stripped (newlines and tabs kept), capped. */
export function cleanText(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const s = v.normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/(?![\n\t])\p{Cc}/gu, "").trim();
    return s ? capChars(s, MAX_TEXT) : null;
}

/** WhatsApp sends epoch seconds as a string. Milliseconds are accepted; anything else is unknown. */
export function epochToIso(v: unknown): string | null {
    const s = typeof v === "number" ? String(Math.trunc(v)) : str(v);
    if (!s || !/^\d+$/.test(s)) return null;
    const ms = s.length <= 11 ? Number(s) * 1000 : s.length === 13 ? Number(s) : NaN;
    return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
}

/** A reply button or list row the customer tapped: interactive.button_reply / list_reply = { id, title }. */
export function tapOf(interactive: Obj): { id: string | null; title: string } | null {
    const reply = [interactive.button_reply, interactive.list_reply].find(isObj);
    const title = reply ? cleanName(reply.title) : null;
    return reply && title ? { id: cleanId(reply.id), title: capChars(title, TAP_TITLE_MAX) } : null;
}

export function parseChatbotsAfrica(rawBody: string): ParsedInbound {
    let body: unknown;
    try { body = JSON.parse(rawBody); } catch { throw new Error("body is not JSON"); }
    if (!isObj(body)) throw new Error("body is not a JSON object");

    const out: Required<ParsedInbound> = { externalId: null, messages: [], statuses: [], phoneNumberIds: [], notes: [] };
    if (body.object !== "whatsapp_business_account") {
        out.notes.push(`ignored: object is ${capChars(String(body.object ?? "missing"), 40)}`);
        return out;
    }

    for (const entry of arr(body.entry)) {
        if (!isObj(entry)) continue;
        const changes = arr(entry.changes);
        if (changes.length === 0) out.notes.push("entry without changes");
        for (const change of changes) {
            if (!isObj(change)) continue;
            if (change.field !== "messages") { out.notes.push(`ignored field ${capChars(String(change.field ?? "missing"), 40)}`); continue; }
            const value = isObj(change.value) ? change.value : {};
            const pid = cleanId(isObj(value.metadata) ? value.metadata.phone_number_id : null);
            if (pid && !out.phoneNumberIds.includes(pid)) out.phoneNumberIds.push(pid);

            // Names and user ids by wa_id, never contacts[0] for every message.
            const byWaId = new Map<string, { name: string | null; userId: string | null }>();
            const contacts = arr(value.contacts).filter(isObj);
            const contactInfo = (c: Obj) => ({ name: cleanName(isObj(c.profile) ? c.profile.name : null), userId: cleanId(c.user_id) });
            for (const c of contacts) {
                const waId = toDestination(str(c.wa_id) ?? "");
                if (waId) byWaId.set(waId, contactInfo(c));
            }

            for (const m of arr(value.messages)) {
                if (!isObj(m)) continue;
                const type = str(m.type) ?? "unknown";
                const from = toDestination(str(m.from) ?? "") ?? "";
                // A hidden number (no `from`) with a single contact: that contact is the sender.
                const contact = from ? byWaId.get(from) : contacts.length === 1 ? contactInfo(contacts[0]) : undefined;
                const payload = isObj(m[type]) ? (m[type] as Obj) : {};
                const msg: InboundMessage = {
                    messageId: cleanId(m.id),
                    from,
                    name: contact?.name ?? null,
                    type,
                    text: type === "text" ? cleanText(isObj(m.text) ? m.text.body : null) : cleanText(payload.caption),
                    fromUserId: cleanId(m.from_user_id) ?? contact?.userId ?? null,
                    at: epochToIso(m.timestamp),
                    mediaId: MEDIA_TYPES.has(type) ? cleanId(payload.id) : null,
                    mimeType: MEDIA_TYPES.has(type) ? capChars(str(payload.mime_type) ?? "", 100) || null : null,
                    replyTo: cleanId(isObj(m.context) ? m.context.id : null),
                    tap: type === "interactive" ? tapOf(payload) : null,
                };
                out.messages.push(msg);
            }

            for (const s of arr(value.statuses)) {
                if (!isObj(s)) continue;
                const st: InboundStatus = {
                    messageId: cleanId(s.id),
                    status: capChars(str(s.status) ?? "unknown", 20),
                    at: epochToIso(s.timestamp),
                    recipient: toDestination(str(s.recipient_id) ?? ""),
                };
                out.statuses.push(st);
            }
        }
    }

    // A replay of the same delivery carries the same first id; receipts key on id + status.
    const first = out.messages.find(m => m.messageId)?.messageId;
    const firstStatus = out.statuses.find(s => s.messageId);
    out.externalId = first ?? (firstStatus ? `${firstStatus.messageId}:${firstStatus.status}` : null);
    return out;
}
