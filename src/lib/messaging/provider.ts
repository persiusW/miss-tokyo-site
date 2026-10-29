// One interface for sending on WhatsApp, whichever provider carries it. Every
// call answers with the same typed result as the Meta sender in
// @/lib/whatsapp/send, so callers handle one shape. Server-only.
import type { WhatsAppSendResult } from "@/lib/whatsapp/send";
import type { NotificationMeta } from "@/lib/notificationLog";

export type MessagingResult = WhatsAppSendResult;

export type QuickReply = {
    text: string;
    caption?: string;
    /** Button titles. WhatsApp allows at most 3, each up to 20 characters. */
    options: string[];
};

export type ListRow = { id: string; title: string; description?: string };
export type ListMessage = {
    title?: string;
    body: string;
    footer?: string;
    /** The button that opens the list. */
    button: string;
    /** WhatsApp allows at most 10 rows across all sections. */
    sections: { title: string; rows: ListRow[] }[];
};

/**
 * A Chatbots Africa (Meta) template id: its digits as text. Meta's ids run to
 * 17 digits, past what a JS number holds exactly, so it is never a number here.
 */
export type TemplateId = string;
export const isTemplateId = (v: unknown): v is TemplateId => typeof v === "string" && /^[1-9]\d{0,19}$/.test(v);

export type TemplateMessage = {
    templateId: TemplateId;
    type: "text" | "image" | "video" | "audio" | "document";
    /** Fills {{1}}, {{2}}, ... in order. */
    placeholders?: string[];
    /** Required for media templates. */
    link?: string;
};

export type MediaResult =
    | { ok: true; bytes: Uint8Array; contentType: string }
    | { ok: false; code: "not_configured" | "invalid" | "rejected" | "network" };

export type BalanceResult =
    | { ok: true; balance: number | null; raw: unknown }
    | { ok: false; code: "not_configured" | "rejected" | "network"; detail?: unknown };

export interface MessagingProvider {
    readonly name: string;
    sendText(to: string, text: string, meta?: NotificationMeta): Promise<MessagingResult>;
    /** A jpg or png at a public https URL, with an optional caption. */
    sendImage(to: string, imageUrl: string, caption?: string, meta?: NotificationMeta): Promise<MessagingResult>;
    sendQuickReply(to: string, message: QuickReply, meta?: NotificationMeta): Promise<MessagingResult>;
    sendList(to: string, message: ListMessage, meta?: NotificationMeta): Promise<MessagingResult>;
    sendTemplate(to: string, message: TemplateMessage, meta?: NotificationMeta): Promise<MessagingResult>;
    /** A customer's photo or file, by the media id in their message. */
    downloadMedia(mediaId: string): Promise<MediaResult>;
    /** Stops the provider messaging this contact (a STOP request). */
    optOut(to: string): Promise<MessagingResult>;
    balance(): Promise<BalanceResult>;
}
