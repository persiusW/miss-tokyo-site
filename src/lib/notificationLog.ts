// Record of every SMS and email the app sends (table notification_log).
//
// Written by sendSMS and sendEmail after the provider call. The writer never
// throws and gives up after LOG_TIMEOUT_MS, so a slow or failing database can
// never change what a send returns or hold a request up for long.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";

/** Optional context a caller can attach to a send. */
export type NotificationMeta = { event?: string; orderId?: string | null };

type Row = {
    channel: "sms" | "email";
    recipient: string;
    recipient_key: string;
    event: string | null;
    subject: string | null;
    body: string | null;
    provider_id: string | null;
    status: "sent" | "failed";
    error_code: string | null;
    order_id: string | null;
};

const LOG_TIMEOUT_MS = 1500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "****1234" — the most of a phone number that may reach the console. */
export function maskPhone(phone: string): string {
    const digits = String(phone ?? "").replace(/\D/g, "");
    return `****${digits.slice(-4)}`;
}

/**
 * Masks every phone-like run in free text (provider responses). Nine or more
 * digits, so dates (8) and amounts are left alone.
 */
export function maskPhonesInText(text: string): string {
    return String(text ?? "").replace(/\+?\d[\d\s-]{7,}\d/g, m =>
        m.replace(/\D/g, "").length >= 9 ? maskPhone(m) : m);
}

/** Last 9 digits, so 024…, +233… and spaced forms of one number match. */
export function smsRecipientKey(phone: string): string {
    const digits = String(phone ?? "").replace(/\D/g, "");
    return digits.length > 9 ? digits.slice(-9) : digits;
}

export function emailRecipientKey(email: string): string {
    return String(email ?? "").trim().toLowerCase();
}

/** Gift-card codes, OTPs, account-setup links and checkout tokens never reach the log. */
function redactForLog(text: string): string {
    return redactText(text);
}

/** Readable text from an email's HTML: no tags, styles or scripts. */
export function htmlToText(html: string): string {
    return String(html ?? "")
        .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/[ \t]+/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .trim();
}

const cap = (s: string | null | undefined, n: number) => (s == null ? null : String(s).slice(0, n));

export function buildRows(args: {
    channel: "sms" | "email";
    recipients: string[];
    subject?: string | null;
    body: string;
    providerId?: string | null;
    ok: boolean;
    error?: string | null;
    meta?: NotificationMeta;
}): Row[] {
    const orderId = args.meta?.orderId && UUID_RE.test(args.meta.orderId) ? args.meta.orderId : null;
    const body = cap(redactForLog(args.body), args.channel === "sms" ? 1000 : 4000);
    return args.recipients.map(recipient => ({
        channel: args.channel,
        recipient: cap(recipient, 320) ?? "",
        recipient_key: args.channel === "sms" ? smsRecipientKey(recipient) : emailRecipientKey(recipient),
        event: cap(args.meta?.event ?? null, 80),
        subject: cap(args.subject ?? null, 300),
        body,
        provider_id: cap(args.providerId ?? null, 120),
        status: args.ok ? "sent" : "failed",
        error_code: args.ok ? null : cap(args.error ?? "unknown", 200),
        order_id: orderId,
    }));
}

/** Never throws; waits at most LOG_TIMEOUT_MS. */
export async function logNotification(rows: Row[]): Promise<void> {
    if (rows.length === 0) return;
    try {
        const write = supabaseAdmin
            .from("notification_log")
            .insert(rows)
            .then(({ error }: { error: { message?: string } | null }) => {
                if (error) console.warn("[notification-log] write failed:", error.message);
            });
        await Promise.race([write, new Promise(resolve => setTimeout(resolve, LOG_TIMEOUT_MS))]);
    } catch (e) {
        console.warn("[notification-log] write failed:", e);
    }
}
