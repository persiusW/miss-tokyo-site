import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
        const { code, subtotal } = await req.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({ valid: false, error: "No code provided." }, { status: 400 });
        }

        const normalized = code.trim().toUpperCase();
        const sub = Number(subtotal) || 0;

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

            let discount_amount = 0;
            let label = "";

            switch (coupon.discount_type) {
                case "percentage":
                    discount_amount = parseFloat(((sub * Number(coupon.discount_value)) / 100).toFixed(2));
                    label = `${Number(coupon.discount_value)}% Off`;
                    break;
                case "fixed":
                    discount_amount = parseFloat(Math.min(Number(coupon.discount_value), sub).toFixed(2));
                    label = `GH₵ ${Number(coupon.discount_value).toFixed(2)} Off`;
                    break;
                case "free_shipping":
                    discount_amount = 0;
                    label = "Free Shipping";
                    break;
                case "bogo":
                    discount_amount = 0;
                    label = "Buy One, Get One Free (applied at dispatch)";
                    break;
                default:
                    discount_amount = 0;
                    label = "Discount Applied";
            }

            return NextResponse.json({
                valid: true,
                type: "coupon",
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_amount,
                label,
            });
        }

        // ── Gift card branch ───────────────────────────────────────────────────
        if (card) {
            if (!card.is_active || Number(card.remaining_value) <= 0) {
                return NextResponse.json({ valid: false, error: "This gift card has already been used or is inactive." });
            }
            const discount_amount = parseFloat(Math.min(Number(card.remaining_value), sub).toFixed(2));
            return NextResponse.json({
                valid: true,
                type: "gift_card",
                code: card.code,
                discount_type: "gift_card",
                discount_amount,
                label: `GH₵ ${Number(card.remaining_value).toFixed(2)} Gift Card`,
            });
        }

        return NextResponse.json({ valid: false, error: "Code not found or invalid." });
    } catch (err) {
        console.error("[validate-code]", err);
        return NextResponse.json({ valid: false, error: "Internal error." }, { status: 500 });
    }
}
