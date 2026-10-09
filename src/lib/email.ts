/**
 * Shared email utility using Resend.
 * Import sendEmail() in any API route instead of importing Resend directly.
 */

import { buildRows, htmlToText, logNotification, type NotificationMeta } from "@/lib/notificationLog";

type EmailPayload = {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;       // optional plain-text part
    from?: string;       // defaults to business name + email from env
    replyTo?: string;
};

let _resend: any = null;
function getResend() {
    if (!_resend) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Resend } = require("resend");
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
}

/**
 * Sends one email, then records it in notification_log. The log write never
 * throws and never changes the result returned here.
 */
export async function sendEmail(payload: EmailPayload, meta?: NotificationMeta): Promise<{ ok: boolean; error?: string; id?: string }> {
    const result = await sendViaResend(payload);
    await logNotification(buildRows({
        channel: "email",
        recipients: (Array.isArray(payload.to) ? payload.to : [payload.to]).filter(Boolean),
        subject: payload.subject,
        body: payload.html ? htmlToText(payload.html) : (payload.text ?? ""),
        providerId: result.id ?? null,
        ok: result.ok,
        error: result.error,
        meta,
    }));
    return result;
}

async function sendViaResend(payload: EmailPayload): Promise<{ ok: boolean; error?: string; id?: string }> {
    if (!process.env.RESEND_API_KEY) {
        console.warn("[email] RESEND_API_KEY not set — email skipped.");
        return { ok: false, error: "RESEND_API_KEY is not set in environment variables" };
    }

    const fromName  = process.env.BIZ_NAME        || "Miss Tokyo";
    // RESEND_FROM_EMAIL must be a domain verified in your Resend dashboard.
    // Falls back to Resend's shared sender (works without verification, good for dev).
    const fromAddr  = process.env.RESEND_FROM_EMAIL || "info@info.misstokyo.shop";
    const from      = payload.from ?? `${fromName} <${fromAddr}>`;

    try {
        const resend = getResend();
        const { data, error } = await resend.emails.send({
            from,
            to: Array.isArray(payload.to) ? payload.to : [payload.to],
            subject: payload.subject,
            html: payload.html,
            ...(payload.text ? { text: payload.text } : {}),
            ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
        });

        if (error) {
            console.error("[email] Resend error:", error);
            // Resend returns an error object — extract readable message
            const msg = (error as any)?.message || (error as any)?.name
                || JSON.stringify(error);
            return { ok: false, error: msg };
        }

        return { ok: true, id: data?.id };
    } catch (err: any) {
        console.error("[email] Unexpected error:", err);
        return { ok: false, error: err?.message || "Unknown error" };
    }
}
