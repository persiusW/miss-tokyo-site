// Whether a discount code can be used right now. Pure.
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
export const COUPON_BLOCK_TEXT: Record<CouponBlock, string> = {
    inactive: "This code has expired or is inactive.",
    not_started: "This code isn't active yet.",
    expired: "This code has expired or is inactive.",
};
