module.exports = [
"[project]/src/lib/email.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Shared email utility using Resend.
 * Import sendEmail() in any API route instead of importing Resend directly.
 */ __turbopack_context__.s([
    "sendEmail",
    ()=>sendEmail
]);
let _resend = null;
function getResend() {
    if (!_resend) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Resend } = __turbopack_context__.r("[project]/node_modules/resend/dist/index.cjs [app-rsc] (ecmascript)");
        _resend = new Resend(process.env.RESEND_API_KEY);
    }
    return _resend;
}
async function sendEmail(payload) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("[email] RESEND_API_KEY not set — email skipped.");
        return {
            ok: false,
            error: "RESEND_API_KEY is not set in environment variables"
        };
    }
    const fromName = process.env.BIZ_NAME || "Miss Tokyo";
    // RESEND_FROM_EMAIL must be a domain verified in your Resend dashboard.
    // Falls back to Resend's shared sender (works without verification, good for dev).
    const fromAddr = process.env.RESEND_FROM_EMAIL || "info@info.misstokyo.shop";
    const from = payload.from ?? `${fromName} <${fromAddr}>`;
    try {
        const resend = getResend();
        const { error } = await resend.emails.send({
            from,
            to: Array.isArray(payload.to) ? payload.to : [
                payload.to
            ],
            subject: payload.subject,
            html: payload.html,
            ...payload.replyTo ? {
                reply_to: payload.replyTo
            } : {}
        });
        if (error) {
            console.error("[email] Resend error:", error);
            // Resend returns an error object — extract readable message
            const msg = error?.message || error?.name || JSON.stringify(error);
            return {
                ok: false,
                error: msg
            };
        }
        return {
            ok: true
        };
    } catch (err) {
        console.error("[email] Unexpected error:", err);
        return {
            ok: false,
            error: err?.message || "Unknown error"
        };
    }
}
}),
];

//# sourceMappingURL=src_lib_email_ts_19b9690c._.js.map