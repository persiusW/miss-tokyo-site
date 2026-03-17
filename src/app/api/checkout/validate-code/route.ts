import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    try {
        const { code, subtotal } = await req.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({ valid: false, error: "No code provided." }, { status: 400 });
        }

        const normalized = code.trim().toUpperCase();
        const sub = Number(subtotal) || 0;

        // ── Check coupons ──────────────────────────────────────────────────────
        const { data: coupon } = await supabaseAdmin
            .from("coupons")
            .select("id, code, discount_type, value, min_order_amount, max_uses, used_count, is_active")
            .ilike("code", normalized)
            .single();

        if (coupon) {
            if (!coupon.is_active) {
                return NextResponse.json({ valid: false, error: "This code has expired or is inactive." });
            }
            if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
                return NextResponse.json({ valid: false, error: "This code has reached its maximum usage limit." });
            }
            if (coupon.min_order_amount && sub < Number(coupon.min_order_amount)) {
                return NextResponse.json({
                    valid: false,
                    error: `Minimum order of GH₵ ${Number(coupon.min_order_amount).toFixed(2)} required for this code.`,
                });
            }

            let discount_amount = 0;
            let label = "";

            switch (coupon.discount_type) {
                case "percentage":
                    discount_amount = parseFloat(((sub * Number(coupon.value)) / 100).toFixed(2));
                    label = `${Number(coupon.value)}% Off`;
                    break;
                case "fixed":
                    discount_amount = parseFloat(Math.min(Number(coupon.value), sub).toFixed(2));
                    label = `GH₵ ${Number(coupon.value).toFixed(2)} Off`;
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

        // ── Check gift cards ───────────────────────────────────────────────────
        const { data: card } = await supabaseAdmin
            .from("gift_cards")
            .select("id, code, remaining_value, is_active")
            .ilike("code", normalized)
            .single();

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
