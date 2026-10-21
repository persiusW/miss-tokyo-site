// Customer files from WhatsApp (photos, voice notes, videos, documents), kept
// in a private bucket so staff can review a chat after Meta drops the original
// (~30 days). A file is copied when it arrives, again by the sweep when that
// failed, or when staff open the chat. message_log.media_url then holds
// "storage:<path>"; our own product photos keep their public https link; a
// file the provider refused or that is too big is marked "none:<why>" so the
// sweep stops asking (opening the chat still tries once more).
// Server-only (service role).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { MediaResult } from "@/lib/messaging/provider";
import { mediaKind, mediaPath, MISSING_MEDIA, STORED_MEDIA } from "./inbox";
import type { InboundMessage } from "./pipeline";

const db = supabaseAdmin as any;

export const MEDIA_BUCKET = "whatsapp-media";

/** Kill switch, same name as GlowBook's flag: WHATSAPP_INBOX_MEDIA=off stops copies and shows the text label. On by default. */
export const mediaEnabled = () => (process.env.WHATSAPP_INBOX_MEDIA ?? "").trim().toLowerCase() !== "off";
/** Meta keeps a file about 30 days; past this it is not tried again. */
export const ARCHIVE_WINDOW_MS = 28 * 24 * 3600_000;
/** A signed link lasts long enough to load and open the file, not to share it around. */
const LINK_SECONDS = 15 * 60;

export type Download = (mediaId: string) => Promise<MediaResult>;

/**
 * Copies one customer file into the bucket and points its message_log row at it.
 * Returns the stored value, or null when the file can't be fetched (too big, gone).
 */
export async function archiveInboundMedia(
    conversationId: string, m: Pick<InboundMessage, "messageId" | "mediaId" | "mimeType" | "type">, download: Download,
): Promise<string | null> {
    if (!mediaEnabled() || !m.mediaId || !m.messageId || !mediaKind(m.type)) return null;
    const r = await download(m.mediaId);
    if (!r.ok) {
        // Too big or refused (expired): marked, so the sweep moves on. A network error is retried.
        if (r.code !== "network" && r.code !== "not_configured") await markMissing(conversationId, m.messageId, r.code);
        return null;
    }
    const contentType = r.contentType || m.mimeType || "application/octet-stream";
    const path = mediaPath(conversationId, m.messageId, contentType);
    const { error: upError } = await supabaseAdmin.storage.from(MEDIA_BUCKET)
        .upload(path, r.bytes, { contentType, upsert: true });
    if (upError) throw new Error(`store media: ${upError.message}`);
    const stored = `${STORED_MEDIA}${path}`;
    const { error } = await db.from("message_log").update({ media_url: stored })
        .eq("conversation_id", conversationId).eq("wa_message_id", m.messageId);
    if (error) throw new Error(`link media: ${error.code ?? ""} ${error.message ?? ""}`);
    return stored;
}

async function markMissing(conversationId: string, waMessageId: string, why: string): Promise<void> {
    const { error } = await db.from("message_log").update({ media_url: `${MISSING_MEDIA}${why}` })
        .eq("conversation_id", conversationId).eq("wa_message_id", waMessageId);
    if (error) console.error("[whatsapp-media] could not mark a missing file", { code: error.code });
}

/** The full message (with its media id), from the stored event it came in. */
export async function inboundFor(waMessageId: string): Promise<InboundMessage | null> {
    const { data, error } = await db.from("inbound_events").select("parsed")
        .contains("parsed", { messages: [{ messageId: waMessageId }] }).limit(1);
    if (error) throw error;
    return ((data ?? [])[0]?.parsed?.messages ?? []).find((x: InboundMessage) => x.messageId === waMessageId) ?? null;
}

/** A link the browser can load: the public one as is, a stored copy signed for a few minutes. */
export async function mediaLink(mediaUrl: string): Promise<string | null> {
    if (/^https:\/\//i.test(mediaUrl)) return mediaUrl;
    if (!mediaUrl.startsWith(STORED_MEDIA)) return null;
    const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET)
        .createSignedUrl(mediaUrl.slice(STORED_MEDIA.length), LINK_SECONDS);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
}

/**
 * Sweep: inbound files not copied yet (a failed copy, or from before copies were
 * kept), newest first, while Meta still has them. Returns how many were stored.
 */
export async function archiveMissing(download: Download, opts: { limit: number; now: number }): Promise<number> {
    if (!mediaEnabled()) return 0;
    const since = new Date(opts.now - ARCHIVE_WINDOW_MS).toISOString();
    const { data, error } = await db.from("message_log").select("conversation_id, wa_message_id, message_type")
        .eq("direction", "inbound").is("media_url", null).not("wa_message_id", "is", null)
        .in("message_type", ["image", "sticker", "audio", "voice", "video", "document"])
        .gte("created_at", since).order("created_at", { ascending: false }).limit(opts.limit);
    if (error) throw error;
    let stored = 0;
    for (const row of (data ?? []) as { conversation_id: string; wa_message_id: string }[]) {
        const m = await inboundFor(row.wa_message_id).catch(() => null);
        if (!m) continue;
        if (await archiveInboundMedia(row.conversation_id, m, download).catch(() => null)) stored++;
    }
    return stored;
}
