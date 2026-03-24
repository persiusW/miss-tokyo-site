import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ProductCategoryMap } from "@/lib/autoDiscount";

/**
 * GET /api/checkout/auto-discount?productIds=id1,id2,...
 *
 * Returns:
 *   { rules: AutoDiscountRule[], productCategoryMap: ProductCategoryMap }
 *
 * The client runs evaluateAutoDiscounts() locally so the math is always
 * consistent between the order summary preview and the server-side verification.
 * This endpoint is intentionally lightweight — it only provides data.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const rawIds = searchParams.get("productIds") || "";

    const productIds = rawIds
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

    // Fetch active automatic discount rules.
    // RLS is permissive for active rules (public read), so anon callers can read these.
    const { data: rules, error: rulesError } = await supabaseAdmin
        .from("automatic_discounts")
        .select(
            "id, title, discount_type, discount_value, applies_to, target_category_ids, target_product_ids, min_quantity, quantity_scope, min_order_amount"
        )
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .or("ends_at.is.null,ends_at.gt." + new Date().toISOString());

    if (rulesError) {
        console.error("[auto-discount] rules fetch error:", rulesError);
        return NextResponse.json({ rules: [], productCategoryMap: {} });
    }

    if (!rules || rules.length === 0) {
        // Cache aggressively when no rules exist — most common state
        return NextResponse.json(
            { rules: [], productCategoryMap: {} },
            { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" } }
        );
    }

    // Build productCategoryMap only if we have product IDs and category-scoped rules.
    const productCategoryMap: ProductCategoryMap = {};

    const hasCategoryRules = rules.some(r => r.applies_to === "SPECIFIC_CATEGORIES");
    if (productIds.length > 0 && hasCategoryRules) {
        const { data: products } = await supabaseAdmin
            .from("products")
            .select("id, category_ids")
            .in("id", productIds);

        for (const p of products ?? []) {
            // category_ids may be UUID[] or null depending on schema
            const cats: string[] = Array.isArray(p.category_ids) ? p.category_ids : [];
            productCategoryMap[p.id] = cats;
        }
    }

    // Rules rarely change — short cache is fine; stale-while-revalidate keeps UX instant
    return NextResponse.json(
        { rules: rules ?? [], productCategoryMap },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } }
    );
}
