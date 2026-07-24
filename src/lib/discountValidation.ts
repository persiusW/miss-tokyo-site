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
    /** coupons.id | gift_cards.id — needed to place a hold on it. */
    codeId: string;
};

/**
 * Value left on a gift card after live holds. Falls back to the raw balance if
 * the holds migration has not been applied, so validation never hard-fails.
 */
async function giftCardAvailable(cardId: string, rawBalance: number): Promise<number> {
    const { data, error } = await supabaseAdmin.rpc("fn_available_gift_card_value", { p_card_id: cardId });
    if (error || data === null || data === undefined) return rawBalance;
    return Number(data);
}

/**
 * Uses left on a coupon after live holds. null = unlimited.
 * Falls back to the raw usage_limit arithmetic when the RPC is unavailable.
 */
async function couponUsesAvailable(
    couponId: string,
    usageLimit: number | null,
    usedCount: number | null,
): Promise<number | null> {
    if (usageLimit === null || usageLimit === undefined) return null;
    const { data, error } = await supabaseAdmin.rpc("fn_available_coupon_uses", { p_coupon_id: couponId });
    if (error || data === null || data === undefined) {
        return Math.max(0, Number(usageLimit) - Number(usedCount ?? 0));
    }
    return Number(data);
}

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
        // Uses left after live holds — a basket already holding the last use
        // makes this code unavailable to anyone else
        const usesLeft = await couponUsesAvailable(coupon.id, coupon.usage_limit, coupon.used_count);
        if (usesLeft !== null && usesLeft < 1) return null;
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

        return { type: "coupon", code: coupon.code, discount_type: coupon.discount_type, amount, label, codeId: coupon.id };
    }

    if (card) {
        if (!card.is_active || Number(card.remaining_value) <= 0) return null;
        if (card.expires_at && new Date(card.expires_at) < new Date()) return null;

        // Spend against what is actually free, not the printed balance: another
        // basket may already be holding part or all of this card.
        const spendable = await giftCardAvailable(card.id, Number(card.remaining_value));
        if (spendable <= 0) return null;

        const amount = parseFloat(Math.min(spendable, orderAmount).toFixed(2));
        return {
            type: "gift_card",
            code: card.code,
            discount_type: "gift_card",
            amount,
            label: `GH₵ ${spendable.toFixed(2)} Gift Card`,
            codeId: card.id,
        };
    }

    return null;
}

/**
 * Holds a validated discount against a basket for `ttlMins`, so no other basket
 * can be quoted the same value. Mirrors stock reservation: place it at the same
 * moment stock is reserved, and fail closed if it cannot be held.
 *
 * Returns false when the hold could not be placed (someone else took it between
 * validation and here) — callers should treat that as "code no longer available".
 * Returns true when the holds migration is absent, so behaviour degrades to the
 * previous no-hold semantics rather than blocking checkout.
 */
export async function holdDiscount(
    discount: ValidatedDiscount,
    owner: { orderId?: string | null; posSessionId?: string | null },
    ttlMins: number,
): Promise<boolean> {
    const { error } = await supabaseAdmin.rpc("fn_hold_discount", {
        p_kind: discount.type,
        p_code_id: discount.codeId,
        p_amount: discount.type === "gift_card" ? discount.amount : 0,
        p_order_id: owner.orderId ?? null,
        p_pos_session_id: owner.posSessionId ?? null,
        p_ttl_mins: ttlMins,
    });

    if (!error) return true;

    // Function not deployed yet — don't block the sale
    if (/does not exist|schema cache|not find/i.test(error.message)) {
        console.warn("[discount] fn_hold_discount unavailable; proceeding without a hold");
        return true;
    }

    console.warn("[discount] hold refused:", error.message, { code: discount.code });
    return false;
}

/** Releases a basket's holds once the ledger is written, or on cancellation. */
export async function releaseDiscountHolds(
    owner: { orderId?: string | null; posSessionId?: string | null },
): Promise<void> {
    const { error } = await supabaseAdmin.rpc("fn_release_discount_holds", {
        p_order_id: owner.orderId ?? null,
        p_pos_session_id: owner.posSessionId ?? null,
    });
    if (error && !/does not exist|schema cache|not find/i.test(error.message)) {
        console.error("[discount] release failed:", error.message);
    }
}
