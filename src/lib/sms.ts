/**
 * SMS utility via Mnotify.
 * Docs: https://dashboard.mnotify.com/docs
 * Set MNOTIFY_API_KEY in your .env.local
 */

const MNOTIFY_ENDPOINT = "https://apps.mnotify.net/smsapi";

type SmsPayload = {
    to: string | string[];   // Ghana phone numbers, e.g. "+233200000000" or "0200000000"
    message: string;
    sender?: string;          // Sender ID registered with Mnotify (max 11 chars)
};

function normalizePhone(phone: string): string {
    // Strip + and ensure 10-digit Ghana number
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("233")) return digits;
    if (digits.startsWith("0")) return "233" + digits.slice(1);
    return digits;
}

export async function sendSMS(payload: SmsPayload): Promise<{ ok: boolean; error?: string }> {
    const apiKey = process.env.MNOTIFY_API_KEY;
    if (!apiKey) {
        console.warn("[sms] MNOTIFY_API_KEY not set — SMS skipped.");
        return { ok: false, error: "No API key" };
    }

    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const numbers = recipients.map(normalizePhone).join(",");
    const senderId = payload.sender || process.env.MNOTIFY_SENDER_ID || "MissTokyo";

    const params = new URLSearchParams({
        key:      apiKey,
        to:       numbers,
        msg:      payload.message,
        sender:   senderId,
        schedule_date: "",
        schedule_time: "",
    });

    try {
        const res = await fetch(`${MNOTIFY_ENDPOINT}?${params.toString()}`, {
            method: "GET",
            headers: { "Accept": "application/json" },
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("[sms] Mnotify error:", text);
            return { ok: false, error: text };
        }

        const json = await res.json();
        // Mnotify returns { status: "success", ... } on success
        if (json.status === "success" || json.code === "1000") {
            return { ok: true };
        }

        console.error("[sms] Mnotify response:", json);
        return { ok: false, error: json.message || "Unknown Mnotify error" };
    } catch (err: any) {
        console.error("[sms] Unexpected error:", err);
        return { ok: false, error: err?.message || "Unknown error" };
    }
}
