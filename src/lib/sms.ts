/**
 * SMS utility via mNotify API v2 (api.mnotify.com).
 * Set MNOTIFY_API_KEY and MNOTIFY_SENDER_ID in your .env.local
 *
 * mNotify Quick SMS:
 *   POST https://api.mnotify.com/api/sms/quick?key={API_KEY}
 *   Content-Type: application/json
 *   Body: { recipient, sender, message, is_schedule, schedule_date }
 *
 * Success response: { status: "success", code: "2000", message: "...", summary: { ... } }
 */

import { buildRows, logNotification, maskPhone, maskPhonesInText, type NotificationMeta } from "@/lib/notificationLog";

const MNOTIFY_ENDPOINT = "https://api.mnotify.com/api/sms/quick";

type SmsPayload = {
    to: string | string[];
    message: string;
    sender?: string;
};

/** Replace template variables like {order_id}, {customer_name}, etc. */
export function injectSmsVars(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
        (str, [key, val]) => str.replaceAll(`{${key}}`, val),
        template,
    );
}

function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "").trim();
    if (digits.startsWith("233")) return "0" + digits.slice(3);  // mNotify prefers local format
    if (digits.startsWith("0"))   return digits;
    return digits;
}

function stripQuotes(val: string): string {
    return val.trim().replace(/^["']|["']$/g, "");
}

type SmsAttempt = { result: { ok: boolean; error?: string }; providerId: string | null };

/**
 * Sends one SMS, then records it in notification_log. The log write never
 * throws and never changes the result returned here.
 */
export async function sendSMS(payload: SmsPayload, meta?: NotificationMeta): Promise<{ ok: boolean; error?: string }> {
    const { result, providerId } = await sendViaMnotify(payload);
    const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to]).filter(Boolean);
    await logNotification(buildRows({
        channel: "sms",
        recipients,
        body: payload.message,
        providerId,
        ok: result.ok,
        error: result.error,
        meta,
    }));
    return result;
}

async function sendViaMnotify(payload: SmsPayload): Promise<SmsAttempt> {
    const rawKey = process.env.MNOTIFY_API_KEY;
    if (!rawKey) {
        console.warn("[sms] MNOTIFY_API_KEY not set — SMS skipped.");
        return { result: { ok: false, error: "MNOTIFY_API_KEY is not set in environment variables" }, providerId: null };
    }
    const apiKey   = stripQuotes(rawKey);
    const rawId    = payload.sender || process.env.MNOTIFY_SENDER_ID || "MISSTOKYO";
    const senderId = stripQuotes(rawId);

    const recipient = (Array.isArray(payload.to) ? payload.to : [payload.to])
        .map(normalizePhone);

    const url = `${MNOTIFY_ENDPOINT}?key=${apiKey}`;
    const body = {
        recipient,
        sender:        senderId,
        message:       payload.message,
        is_schedule:   false,
        schedule_date: "",
    };

    console.log(`[sms] POST ${MNOTIFY_ENDPOINT}?key=***`);
    console.log(`[sms] recipient: ${recipient.map(maskPhone).join(",")} sender: "${senderId}"`);

    try {
        const res = await fetch(url, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(body),
        });

        const text = await res.text();
        console.log(`[sms] HTTP ${res.status}:`, maskPhonesInText(text.slice(0, 300)));

        if (text.trimStart().startsWith("<!")) {
            return { result: { ok: false, error: "mNotify returned HTML — check API key or endpoint" }, providerId: null };
        }

        let json: any = {};
        try { json = JSON.parse(text); } catch { /* non-JSON */ }

        const providerId = json?.summary?._id ?? json?.summary?.id ?? null;
        if (json?.status === "success" || json?.code === "2000") {
            return { result: { ok: true }, providerId };
        }

        const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
        console.error("[sms] mNotify error:", maskPhonesInText(String(msg)));
        return { result: { ok: false, error: msg }, providerId };

    } catch (err: any) {
        console.error("[sms] Unexpected error:", err);
        return { result: { ok: false, error: err?.message || "Unknown error" }, providerId: null };
    }
}

/**
 * sendSMS reports a provider rejection (bad number, no credit, bad key) by
 * resolving with { ok: false } and only throws on a network fault. Callers that
 * rely on try/catch or Promise.allSettled therefore treat undelivered texts as
 * delivered unless they inspect the return value.
 *
 * These two wrappers make the common patterns behave the way they read.
 */
export class SmsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SmsError";
    }
}

/** Throws SmsError when the provider did not accept the message. */
export async function sendSMSOrThrow(payload: SmsPayload, meta?: NotificationMeta): Promise<void> {
    const result = await sendSMS(payload, meta);
    if (!result.ok) throw new SmsError(result.error || "SMS was not delivered");
}

/**
 * Sends and logs a provider rejection against `context`. Returns whether the
 * message was accepted, for callers that surface a count.
 */
export async function sendSMSLogged(context: string, payload: SmsPayload, meta?: NotificationMeta): Promise<boolean> {
    // The context doubles as the notification_log event unless one is given.
    const result = await sendSMS(payload, { ...meta, event: meta?.event ?? context });
    if (!result.ok) console.error(`[sms:${context}] not delivered:`, result.error);
    return result.ok;
}
