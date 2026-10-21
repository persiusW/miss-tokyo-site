// Whether a discount code can be used right now, and by whom. Pure.
//
// Shared by the checkout preview (/api/checkout/validate-code) and the charge
// path (lib/discountValidation), so the two never disagree about a code being
// switched off, not started yet or ended. The preview used to skip the expiry
// date, so an ended code showed its discount and then quietly fell off at
// payment.
//
// This decides only IF a code applies. What a code is worth is
// computeDiscountSplit (lib/discountSplit), unchanged.

export type CouponTiming = {
    is_active: boolean | null;
    /** Null: from when the code was created. */
    starts_at?: string | null;
    expires_at?: string | null;
};

export type CouponBlock = "inactive" | "not_started" | "expired";

/** Why a code can't be used at `now`, or null when its switch and dates allow it. */
export function couponTimingBlock(c: CouponTiming, now: Date = new Date()): CouponBlock | null {
    if (!c.is_active) return "inactive";
    if (c.starts_at && new Date(c.starts_at).getTime() > now.getTime()) return "not_started";
    if (c.expires_at && new Date(c.expires_at).getTime() < now.getTime()) return "expired";
    return null;
}

/** Customer-facing words for each block. Calm and specific. */
export const COUPON_BLOCK_TEXT: Record<CouponBlock | "used_by_customer", string> = {
    inactive: "This code has expired or is inactive.",
    not_started: "This code isn't active yet.",
    expired: "This code has expired or is inactive.",
    used_by_customer: "You've already used this code. It can be used once per customer.",
};

// The stand-in address createCheckoutOrder gives a customer with no email
// ({phone}@misstokyo.store, PLACEHOLDER_EMAIL_DOMAIN there). Repeated here so
// this module stays free of server imports; a unit test keeps the two equal.
export const STAND_IN_EMAIL_DOMAIN = "misstokyo.store";

export type CustomerKeys = { email: string | null; phoneTail: string | null };

/**
 * How "one use per customer" recognises someone: their email, lower-cased, and
 * the last 9 digits of their phone (024…, +233 24… and 23324… are one person).
 * The shop's own mailbox and the stand-in addresses are dropped: every walk-in
 * without an email shares them, so they would block strangers from each other.
 */
export function customerKeys(
    who: { email?: string | null; phone?: string | null } | null | undefined,
    storeEmails: readonly string[] = [],
): CustomerKeys {
    const raw = String(who?.email ?? "").trim().toLowerCase();
    const stand = raw.endsWith(`@${STAND_IN_EMAIL_DOMAIN}`) || storeEmails.some(s => s.trim().toLowerCase() === raw);
    const email = raw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) && !stand ? raw : null;
    const digits = String(who?.phone ?? "").replace(/\D/g, "");
    const phoneTail = digits.length >= 9 ? digits.slice(-9) : null;
    return { email, phoneTail };
}

export const hasCustomerKeys = (k: CustomerKeys) => !!(k.email || k.phoneTail);
