import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeDiscountSplit } from "@/lib/discountSplit";

// PERF-15: cache DB lookups per code for 30 s — avoids repeated round-trips
// when a customer types / re-submits the same code during checkout.
// PERF-16: coupon and gift_card queries run in parallel via Promise.all.
const lookupCode = unstable_cache(
    async (normalized: string) => {
        const [{ data: coupon }, { data: card }] = await Promise.all([
            supabaseAdmin
                .from("coupons")
                .select("id, code, discount_type, discount_value, min_order_value, usage_limit, used_count, is_active, expires_at")
                .ilike("code", normalized)
                .maybeSingle(),
            supabaseAdmin
                .from("gift_cards")
                .select("id, code, remaining_value, is_active")
                .ilike("code", normalized)
                .maybeSingle(),
        ]);
        return { coupon, card };
    },
    ["validate-code"],
    { revalidate: 30 }
);

export async function POST(req: Request) {
    try {
        const { code, subtotal, deliveryFee } = await req.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({ valid: false, error: "No code provided." }, { status: 400 });
        }

        const normalized = code.trim().toUpperCase();
        const sub = Number(subtotal) || 0;
        const fee = Number(deliveryFee) || 0;

        const { coupon, card } = await lookupCode(normalized);

        // ── Coupon branch ──────────────────────────────────────────────────────
        if (coupon) {
            if (!coupon.is_active) {
                return NextResponse.json({ valid: false, error: "This code has expired or is inactive." });
            }
            if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
                return NextResponse.json({ valid: false, error: "This code has reached its maximum usage limit." });
            }
            if (coupon.min_order_value && sub < Number(coupon.min_order_value)) {
                return NextResponse.json({
                    valid: false,
                    error: `Minimum order of GH₵ ${Number(coupon.min_order_value).toFixed(2)} required for this code.`,
                });
            }

            const split = computeDiscountSplit({
                discountType: coupon.discount_type,
                value: Number(coupon.discount_value),
                subtotal: sub,
                deliveryFee: fee,
            });
            const label =
                coupon.discount_type === "percentage"    ? `${Number(coupon.discount_value)}% Off`
              : coupon.discount_type === "fixed"         ? `GH\u20b5 ${Number(coupon.discount_value).toFixed(2)} Off`
              : coupon.discount_type === "free_shipping" ? "Free Shipping"
              : coupon.discount_type === "bogo"          ? "Buy One, Get One Free (applied at dispatch)"
              : "Discount Applied";

            return NextResponse.json({
                valid: true,
                type: "coupon",
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_amount: split.amount,
                subtotal_amount: split.subtotalAmount,
                delivery_amount: split.deliveryAmount,
                // The customer can still change region after applying a code, so
                // the page re-splits this against the live delivery fee rather
                // than trusting a figure computed before the address was known.
                raw_value: Number(coupon.discount_value),
                label,
            });
        }

        // ── Gift card branch ───────────────────────────────────────────────────
        if (card) {
            if (!card.is_active || Number(card.remaining_value) <= 0) {
                return NextResponse.json({ valid: false, error: "This gift card has already been used or is inactive." });
            }
            const split = computeDiscountSplit({
                discountType: "gift_card",
                value: Number(card.remaining_value),
                subtotal: sub,
                deliveryFee: fee,
            });
            return NextResponse.json({
                valid: true,
                type: "gift_card",
                code: card.code,
                discount_type: "gift_card",
                discount_amount: split.amount,
                subtotal_amount: split.subtotalAmount,
                delivery_amount: split.deliveryAmount,
                raw_value: Number(card.remaining_value),
                label: `GH₵ ${Number(card.remaining_value).toFixed(2)} Gift Card`,
            });
        }

        return NextResponse.json({ valid: false, error: "Code not found or invalid." });
    } catch (err) {
        console.error("[validate-code]", err);
        return NextResponse.json({ valid: false, error: "Internal error." }, { status: 500 });
    }
}
