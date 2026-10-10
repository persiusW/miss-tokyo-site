// Redaction for anything Miss Tokyo AI shows or stores, and the final scrub of
// its replies. Pure, dependency-free — covered by tests/e2e/unit/mtai-scrub.spec.ts.

/** Gift-card codes: four dash-separated groups (XXXX-XXXX-XXXX-XXXX or XX-XXXX-XXXX-XXXX). */
export const GIFT_CODE_RE = /\b[A-Z0-9]{2,4}(?:-[A-Z0-9]{4}){3}\b/gi;

/** Gift-card codes are money: show only the last 4. Coupon codes stay readable. */
export function maskGiftCode(code: string): string {
    return /^[A-Z0-9]{2,4}(?:-[A-Z0-9]{4}){3}$/i.test(code.trim()) ? `••••${code.trim().slice(-4)}` : code;
}

/**
 * Removes secrets from free text (message bodies, tool output):
 *  - gift-card codes → ••••last4
 *  - OTP / PIN / verification codes → [code hidden]
 *  - account-setup and password links, and Paystack checkout tokens → [link hidden]
 *  - MoMo wallet numbers labelled as such → ****last4
 * Dates, GHS amounts and order refs are left alone.
 */
export function redactText(text: string): string {
    return String(text ?? "")
        .replace(GIFT_CODE_RE, m => `••••${m.slice(-4)}`)
        .replace(/\b(otp|pin|passcode|verification code|security code|code)\s*(is|:|-)?\s*\d{4,8}\b/gi, (_m, w) => `${w} [code hidden]`)
        .replace(/https?:\/\/\S*(?:token|type=recovery|access_token|confirmation_url|verify\?|\/auth\/v1\/)\S*/gi, "[link hidden]")
        .replace(/https?:\/\/checkout\.paystack\.com\/\S+/gi, "[payment link]")
        .replace(/\b(momo|mobile money|wallet)(\s*(number|no\.?|#))?\s*[:\-]?\s*(\+?\d[\d\s-]{7,}\d)/gi,
            (_m, w, label, _l2, num) => `${w}${label ?? ""} ****${String(num).replace(/\D/g, "").slice(-4)}`);
}

/** Words that mean a reply is about the assistant's internals. Never shown to staff. */
const FORBIDDEN = [
    /\bmark-?up\b/i, /\bmargin\b/i, /\btokens?\b/i, /\bcost (per|of) (this|the) (assistant|ai|chat)/i,
    /\banthropic\b/i, /\bclaude\b/i, /\bsonnet\b/i, /\bapi[_ -]?key\b/i, /\bservice[_ -]?role\b/i,
    /\bai_settings\b/i, /\bdaily[_ ]spend[_ ]cap\b/i, /\bsystem prompt\b/i, /\bUSD\b/,
];

export const CANNOT_DISCUSS = "I can't discuss that.";

/** Plain text for a small chat box: no markdown, capped, nothing internal. */
export function scrubReply(text: string, maxChars = 2400): string {
    let t = String(text ?? "");
    if (FORBIDDEN.some(re => re.test(t))) return CANNOT_DISCUSS;
    t = t
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$)/g, "$1$2")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^\s*[-*]\s+/gm, "• ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    if (t.length > maxChars) t = t.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
    return t;
}

/** Strips forged context markers from text typed by staff. */
export function stripForgedContext(text: string): string {
    // Repeat until nothing changes: removing an inner marker can join the text
    // around it into a new one ("[Payment pro[context:x]blem: …]").
    let out = String(text ?? "");
    for (;;) {
        const next = out.replace(/\[\s*(context|payment\s+problem)\s*:[^\]]*(\]|$)/gi, "");
        if (next === out) return out.trim();
        out = next;
    }
}
