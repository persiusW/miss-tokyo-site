import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const PRODUCTS_PAGE_SIZE = 50;

const PRODUCT_FIELDS =
    "id, name, slug, sku, category_type, category_ids, price_ghs, inventory_count, track_inventory, track_variant_inventory, is_active, image_urls, preorder_enabled, preorder_estimated_date, product_variants(sku, inventory_count)";

export type ProductStatusFilter = "all" | "active" | "inactive" | "preorder";
export type ProductStockFilter = "all" | "in" | "low" | "out";

export const LOW_STOCK_THRESHOLD = 5;

export type ProductsPage = {
    products: any[];
    page: number;
    pageSize: number;
    totalCount: number;
    query: string;
    status: ProductStatusFilter;
    stock: ProductStockFilter;
};

/**
 * One page of products, newest first. Search and both filters run server-side,
 * so they narrow the whole catalogue rather than the loaded page.
 *
 * Variant SKUs are searched too: a product whose variant carries the SKU is
 * matched by resolving those product ids first, which restores the variant
 * lookup that was lost when this list moved off the old client-side filter.
 */
export async function fetchProductsPage(
    query: string,
    page: number,
    status: ProductStatusFilter = "all",
    stock: ProductStockFilter = "all",
): Promise<ProductsPage> {
    const from = (page - 1) * PRODUCTS_PAGE_SIZE;
    const to = from + PRODUCTS_PAGE_SIZE - 1;

    let q = supabaseAdmin
        .from("products")
        .select(PRODUCT_FIELDS, { count: "exact" });

    const term = query.trim().replace(/[%,()]/g, "");
    if (term) {
        // Variant SKUs live on another table, so collect the parents first.
        const { data: variantHits } = await supabaseAdmin
            .from("product_variants")
            .select("product_id")
            .ilike("sku", `%${term}%`)
            .limit(500);
        const variantProductIds = [...new Set((variantHits ?? []).map((v: any) => v.product_id).filter(Boolean))];

        const clauses = [
            `name.ilike.%${term}%`,
            `sku.ilike.%${term}%`,
            `category_type.ilike.%${term}%`,
        ];
        if (variantProductIds.length > 0) clauses.push(`id.in.(${variantProductIds.join(",")})`);
        q = q.or(clauses.join(","));
    }

    if (status === "active")   q = q.eq("is_active", true);
    if (status === "inactive") q = q.eq("is_active", false);
    if (status === "preorder") q = q.eq("preorder_enabled", true);

    // Stock filters only mean anything for tracked products; an untracked
    // product has no meaningful count and must not be reported as sold out.
    if (stock === "out") {
        q = q.eq("track_inventory", true).lte("inventory_count", 0);
    } else if (stock === "low") {
        q = q.eq("track_inventory", true).gt("inventory_count", 0).lt("inventory_count", LOW_STOCK_THRESHOLD);
    } else if (stock === "in") {
        q = q.or(`track_inventory.eq.false,inventory_count.gte.${LOW_STOCK_THRESHOLD}`);
    }

    const { data, count } = await q
        .order("created_at", { ascending: false })
        .range(from, to);

    return {
        products: data ?? [],
        page,
        pageSize: PRODUCTS_PAGE_SIZE,
        totalCount: count ?? 0,
        query,
        status,
        stock,
    };
}
