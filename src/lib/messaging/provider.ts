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

export type TemplateMessage = {
    templateId: number;
    type: "text" | "image" | "video" | "audio" | "document";
    /** Fills {{1}}, {{2}}, ... in order. */
    placeholders?: string[];
    /** Required for media templates. */
    link?: string;
};

export type BalanceResult =
    | { ok: true; balance: number | null; raw: unknown }
    | { ok: false; code: "not_configured" | "rejected" | "network"; detail?: unknown };

export interface MessagingProvider {
    readonly name: string;
    sendText(to: string, text: string, meta?: NotificationMeta): Promise<MessagingResult>;
    sendQuickReply(to: string, message: QuickReply, meta?: NotificationMeta): Promise<MessagingResult>;
    sendList(to: string, message: ListMessage, meta?: NotificationMeta): Promise<MessagingResult>;
    sendTemplate(to: string, message: TemplateMessage, meta?: NotificationMeta): Promise<MessagingResult>;
    /** Stops the provider messaging this contact (a STOP request). */
    optOut(to: string): Promise<MessagingResult>;
    balance(): Promise<BalanceResult>;
}
