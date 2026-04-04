/**
 * Shared email utility using Resend.
 * Import sendEmail() in any API route instead of importing Resend directly.
 */

type EmailPayload = {
    to: string | string[];
    subject: string;
    html: string;
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

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
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
        const { error } = await resend.emails.send({
            from,
            to: Array.isArray(payload.to) ? payload.to : [payload.to],
            subject: payload.subject,
            html: payload.html,
            ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
        });

        if (error) {
            console.error("[email] Resend error:", error);
            // Resend returns an error object — extract readable message
            const msg = (error as any)?.message || (error as any)?.name
                || JSON.stringify(error);
            return { ok: false, error: msg };
        }

        return { ok: true };
    } catch (err: any) {
        console.error("[email] Unexpected error:", err);
        return { ok: false, error: err?.message || "Unknown error" };
    }
}
