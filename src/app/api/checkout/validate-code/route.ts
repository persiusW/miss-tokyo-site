import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeDiscountSplit } from "@/lib/discountSplit";
import {
    computeCouponSplit, couponCategoryId, couponLabel, isItemCoupon, itemCouponShortfall, itemCouponShortfallText,
    productCategoryIds, type CodeLine,
} from "@/lib/couponValue";
import { COUPON_BLOCK_TEXT, couponTimingBlock } from "@/lib/couponRules";
import { buyerKeys, couponUsedByCustomer } from "@/lib/discountValidation";

// PERF-15: cache DB lookups per code for 30 s — avoids repeated round-trips
// when a customer types / re-submits the same code during checkout.
// PERF-16: coupon and gift_card queries run in parallel via Promise.all.
const lookupCode = unstable_cache(
    async (normalized: string) => {
        const [{ data: coupon }, { data: card }] = await Promise.all([
            supabaseAdmin
                .from("coupons")
                .select("id, code, discount_type, discount_value, min_order_value, usage_limit, used_count, is_active, starts_at, expires_at, single_use_per_customer, category_id, target_category_id, buy_quantity, get_quantity")
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The basket lines the page sent, cut down to what pricing needs. Preview only:
 * the charge path re-prices every line from the database.
 */
function cleanLines(raw: unknown): Omit<CodeLine, "categoryIds">[] {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 200).flatMap((l: any) => {
        const productId = typeof l?.productId === "string" && UUID.test(l.productId) ? l.productId : null;
        const unitPrice = Number(l?.unitPrice);
        const quantity = Number(l?.quantity);
        if (!productId || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) return [];
        return [{ productId, unitPrice, quantity, covered: l?.covered === true }];
    });
}

/** products.category_ids for the basket's products, the membership the charge path uses. */
async function lineCategories(ids: string[]): Promise<Record<string, string[]>> {
    if (ids.length === 0) return {};
    const { data } = await supabaseAdmin.from("products").select("id, category_ids").in("id", ids);
    const found = new Map((data ?? []).map((p: any) => [p.id as string, productCategoryIds(p)]));
    // Every id gets an entry, so the page knows it has asked about each line
    return Object.fromEntries(ids.map(id => [id, found.get(id) ?? []]));
}

export async function POST(req: Request) {
    try {
        // email and phone are optional: when the page knows who is buying, a
        // one-use-per-customer code is checked now rather than only at payment.
        // items is optional too; a code that prices by item needs it.
        const { code, subtotal, deliveryFee, email, phone, items } = await req.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({ valid: false, error: "No code provided." }, { status: 400 });
        }

        const normalized = code.trim().toUpperCase();
        const sub = Number(subtotal) || 0;
        const fee = Number(deliveryFee) || 0;

        const { coupon, card } = await lookupCode(normalized);

        // ── Coupon branch ──────────────────────────────────────────────────────
        if (coupon) {
            // Switched off, not started yet or ended: the same rule as the charge path
            const block = couponTimingBlock(coupon);
            if (block) {
                return NextResponse.json({ valid: false, error: COUPON_BLOCK_TEXT[block] });
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
            // Per customer, so never cached with the code itself
            if (coupon.single_use_per_customer
                && await couponUsedByCustomer(coupon.code, buyerKeys({ email: typeof email === "string" ? email : null, phone: typeof phone === "string" ? phone : null }))) {
                return NextResponse.json({ valid: false, error: COUPON_BLOCK_TEXT.used_by_customer });
            }

            // A code that prices by item (category, sale price, buy X get Y)
            // needs the basket's lines and their categories; every other code
            // is split against the subtotal exactly as before.
            const itemCode = isItemCoupon(coupon);
            const sent = itemCode ? cleanLines(items) : [];
            const categories = itemCode ? await lineCategories([...new Set(sent.map(l => l.productId))]) : {};
            const lines: CodeLine[] = sent.map(l => ({ ...l, categoryIds: categories[l.productId] ?? [] }));
            const catId = couponCategoryId(coupon);
            const catName = catId
                ? (await supabaseAdmin.from("categories").select("name").eq("id", catId).maybeSingle()).data?.name ?? null
                : null;

            const split = computeCouponSplit({ terms: coupon, subtotal: sub, deliveryFee: fee, lines });
            if (itemCode && split.amount <= 0) {
                const short = itemCouponShortfall(coupon, lines) ?? { reason: "no_items" as const };
                return NextResponse.json({ valid: false, error: itemCouponShortfallText(short, coupon, catName) });
            }
            const label = couponLabel(coupon, catName);

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
                // What the page needs to re-price an item code on every render
                // with the same function: the code's terms and each line's categories.
                ...(itemCode ? {
                    terms: {
                        discount_type: coupon.discount_type,
                        discount_value: Number(coupon.discount_value),
                        category_id: catId,
                        buy_quantity: coupon.buy_quantity ?? null,
                        get_quantity: coupon.get_quantity ?? null,
                    },
                    line_categories: categories,
                } : {}),
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
