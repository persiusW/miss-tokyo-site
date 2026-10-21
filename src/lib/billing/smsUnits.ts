// How many SMS units one message costs, the way mNotify (and every SMS
// gateway) counts them: GSM-7 text fits 160 characters in one unit and 153
// per unit once it is split; anything outside GSM-7 (the cedi sign ₵, emoji,
// curly quotes) sends the whole message as UCS-2: 70, then 67 per unit.

// GSM 03.38 basic set. The extension characters below cost two septets each.
const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";
const BASIC = new Set([...GSM_BASIC]);
const EXT = new Set([...GSM_EXT]);

export type SmsEncoding = "gsm7" | "ucs2";

export function smsEncoding(text: string): SmsEncoding {
    for (const ch of text) if (!BASIC.has(ch) && !EXT.has(ch)) return "ucs2";
    return "gsm7";
}

/** Units for one message to one number. An empty body still went out as one unit. */
export function smsUnits(body: string | null | undefined): number {
    const text = String(body ?? "");
    if (smsEncoding(text) === "gsm7") {
        let septets = 0;
        for (const ch of text) septets += EXT.has(ch) ? 2 : 1;
        return septets <= 160 ? 1 : Math.ceil(septets / 153);
    }
    // UCS-2 counts UTF-16 code units: an emoji is two.
    const n = text.length;
    return n <= 70 ? 1 : Math.ceil(n / 67);
}
