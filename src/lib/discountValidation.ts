// Server-side discount code validation — the single source of truth for what a
// code is worth. /api/checkout/validate-code uses it to preview the discount to
// the client; /api/paystack/initialize uses it to compute the amount actually
// charged. Client-supplied discount amounts must never reach a Paystack charge.

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type ValidatedDiscount = {
    type: "coupon" | "gift_card";
    code: string;
    discount_type: string;
    /** GHS amount to subtract from the order total (already capped at the total). */
    amount: number;
    label: string;
};

/**
 * Validates a discount/gift-card code against the DB and computes its value for
 * an order of `orderAmount` GHS. Returns null when the code is missing, unknown,
 * inactive, over its usage limit, or below its minimum order value.
 */
export async function validateDiscountCode(
    code: string | undefined | null,
    orderAmount: number,
): Promise<ValidatedDiscount | null> {
    if (!code || typeof code !== "string") return null;
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;

    const [{ data: coupon }, { data: card }] = await Promise.all([
        supabaseAdmin
            .from("coupons")
            .select("id, code, discount_type, discount_value, min_order_value, usage_limit, used_count, is_active, expires_at")
            .ilike("code", normalized)
            .maybeSingle(),
        supabaseAdmin
            .from("gift_cards")
            .select("id, code, remaining_value, is_active, status, expires_at")
            .ilike("code", normalized)
            .maybeSingle(),
    ]);

    if (coupon) {
        if (!coupon.is_active) return null;
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return null;
        if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) return null;
        if (coupon.min_order_value && orderAmount < Number(coupon.min_order_value)) return null;

        let amount = 0;
        let label = "Discount Applied";
        switch (coupon.discount_type) {
            case "percentage":
                amount = parseFloat(((orderAmount * Number(coupon.discount_value)) / 100).toFixed(2));
                label = `${Number(coupon.discount_value)}% Off`;
                break;
            case "fixed":
                amount = parseFloat(Math.min(Number(coupon.discount_value), orderAmount).toFixed(2));
                label = `GH₵ ${Number(coupon.discount_value).toFixed(2)} Off`;
                break;
            case "free_shipping":
                label = "Free Shipping";
                break;
            case "bogo":
                label = "Buy One, Get One Free (applied at dispatch)";
                break;
        }

        return { type: "coupon", code: coupon.code, discount_type: coupon.discount_type, amount, label };
    }

    if (card) {
        if (!card.is_active || Number(card.remaining_value) <= 0) return null;
        if (card.expires_at && new Date(card.expires_at) < new Date()) return null;
        const amount = parseFloat(Math.min(Number(card.remaining_value), orderAmount).toFixed(2));
        return {
            type: "gift_card",
            code: card.code,
            discount_type: "gift_card",
            amount,
            label: `GH₵ ${Number(card.remaining_value).toFixed(2)} Gift Card`,
        };
    }

    return null;
}
