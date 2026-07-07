import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const PRODUCTS_PAGE_SIZE = 50;

const PRODUCT_FIELDS =
    "id, name, slug, sku, category_type, category_ids, price_ghs, inventory_count, track_inventory, track_variant_inventory, is_active, image_urls, preorder_enabled, preorder_estimated_date, product_variants(sku, inventory_count)";

export type ProductsPage = {
    products: any[];
    page: number;
    pageSize: number;
    totalCount: number;
    query: string;
};

/**
 * One page of products, newest first, with an optional search over
 * name / sku / primary category. Search runs server-side via ilike; variant
 * SKU search from the old client filter is not reproduced here.
 */
export async function fetchProductsPage(query: string, page: number): Promise<ProductsPage> {
    const from = (page - 1) * PRODUCTS_PAGE_SIZE;
    const to = from + PRODUCTS_PAGE_SIZE - 1;

    let q = supabaseAdmin
        .from("products")
        .select(PRODUCT_FIELDS, { count: "exact" });

    const term = query.trim().replace(/[%,()]/g, "");
    if (term) {
        q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%,category_type.ilike.%${term}%`);
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
    };
}
