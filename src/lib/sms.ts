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

export async function sendSMS(payload: SmsPayload): Promise<{ ok: boolean; error?: string }> {
    const rawKey = process.env.MNOTIFY_API_KEY;
    if (!rawKey) {
        console.warn("[sms] MNOTIFY_API_KEY not set — SMS skipped.");
        return { ok: false, error: "MNOTIFY_API_KEY is not set in environment variables" };
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
    console.log(`[sms] recipient: ${recipient.join(",")} sender: "${senderId}"`);

    try {
        const res = await fetch(url, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(body),
        });

        const text = await res.text();
        console.log(`[sms] HTTP ${res.status}:`, text.slice(0, 300));

        if (text.trimStart().startsWith("<!")) {
            return { ok: false, error: "mNotify returned HTML — check API key or endpoint" };
        }

        let json: any = {};
        try { json = JSON.parse(text); } catch { /* non-JSON */ }

        if (json?.status === "success" || json?.code === "2000") {
            return { ok: true };
        }

        const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
        console.error("[sms] mNotify error:", msg);
        return { ok: false, error: msg };

    } catch (err: any) {
        console.error("[sms] Unexpected error:", err);
        return { ok: false, error: err?.message || "Unknown error" };
    }
}
