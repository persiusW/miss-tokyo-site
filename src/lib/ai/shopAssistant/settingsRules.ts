// Pure rules for the shop assistant's settings. No imports, so the unit tests
// and the settings module can both use them.

/** A Ghana number as 233 + 9 digits, from any way it is typed; anything else is null. */
export function normaliseWaNumber(v: unknown): string | null {
    const digits = String(v ?? "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("233")) return digits;
    if (digits.length === 10 && digits.startsWith("0")) return `233${digits.slice(1)}`;
    if (digits.length === 9 && !digits.startsWith("0")) return `233${digits}`;
    return null;
}

const int = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** Keys the AI Settings page may change for the shop assistant. */
export const SHOP_SETTING_VALIDATORS = {
    shop_assistant_enabled: (v: unknown) => typeof v === "boolean",
    shop_assistant_daily_messages_per_visitor: (v: unknown) => int(v, 1, 200),
    shop_assistant_cap_share_pct: (v: unknown) => int(v, 0, 100),
    /** Blank (use the store phone) or already normalised to 233XXXXXXXXX. */
    shop_whatsapp_number: (v: unknown) => v === "" || (typeof v === "string" && /^233\d{9}$/.test(v)),
} as const;
