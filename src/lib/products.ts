import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface ShopProduct {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price_ghs: number;
    compare_at_price_ghs: number | null;
    image_urls: string[] | null;
    is_featured: boolean;
    category_id: string | null;
    category_name: string | null;
    category_slug: string | null;
    available_colors: string[] | null;
    available_sizes: string[] | null;
    color_variants: Array<{ name: string; hex: string; in_stock: boolean }> | null;
    size_variants: Array<{ label: string; in_stock: boolean }> | null;
    bundle_label: string | null;
    badge: string | null;
    is_sale: boolean;
    discount_value: number;
    inventory_count: number;
    category_ids: string[] | null;
    created_at: string;
}

export interface ShopCategory {
    id: string;
    name: string;
    slug: string;
    product_count: number;
    sort_order: number;
}

export interface GetProductsParams {
    category?: string | null;
    sort?: string | null;
    color?: string | null;
    size?: string | null;
    min?: string | null;
    max?: string | null;
    page?: number;
    q?: string | null;
    inStock?: boolean;
    sale?: boolean;
}

const PAGE_SIZE = 24;

export async function getProducts(params: GetProductsParams, role?: string) {
    const { category, sort, color, size, min, max, page = 1, q, sale } = params;

    const isAuthorized = role && ["admin", "owner", "wholesale", "wholesaler"].includes(role.toLowerCase());

    // Phase 4 & 5: Bulletproof Fetcher
    let query = supabaseAdmin
        .from("products")
        .select(
            `id, name, slug, description, price_ghs, compare_at_price_ghs,
             image_urls, is_featured, is_active, category_id, category_type, category_ids,
             available_colors, available_sizes, color_variants, size_variants,
             bundle_label, badge, is_sale, discount_value, inventory_count, created_at`,
            { count: "exact" }
        );

    // Filter by active status (Safe handle for nulls)
    query = query.or("is_active.eq.true,is_active.is.null");

    // B2B Gating: Exclude products in Wholesale Categories for Retail users
    if (!isAuthorized) {
        // Find all wholesale categories
        const { data: wholesaleCats } = await supabaseAdmin
            .from("categories")
            .select("id, name")
            .eq("is_wholesale", true);
        
        const restrictedIds = (wholesaleCats || []).map(c => c.id);
        const restrictedNames = (wholesaleCats || []).map(c => c.name);

        // Action 1: Empty Array Trap Fix + NULL Trap Fix
        // CRITICAL: In PostgreSQL, `NULL NOT IN (...)` and `NOT (NULL @> ARRAY[...])` both
        // return NULL (not TRUE), so rows with NULL columns get excluded by .not() filters.
        // We use .or() to explicitly allow NULL values through — only exclude rows that
        // have a confirmed match to a wholesale category.
        if (restrictedIds.length > 0) {
            // Exclude by Primary Category ID — allow NULL category_id through
            query = query.or(`category_id.is.null,category_id.not.in.(${restrictedIds.join(",")})`);

            // Exclude by Category Array — allow NULL category_ids through
            const formattedIds = restrictedIds.map(id => `"${id}"`).join(",");
            query = query.or(`category_ids.is.null,category_ids.not.ov.{${formattedIds}}`);
        }

        if (restrictedNames.length > 0) {
            // Exclude by Category Name — allow NULL category_type through
            query = query.or(`category_type.is.null,category_type.not.in.(${restrictedNames.join(",")})`);
        }
    }

    // Category Filter (Inclusion)
    if (category) {
        const { data: cat } = await supabaseAdmin
            .from("categories")
            .select("id, name")
            .eq("slug", category)
            .maybeSingle();

        if (cat) {
            query = query.or(`category_id.eq.${cat.id},category_type.ilike."${cat.name}",category_ids.cs.{"${cat.id}"}`);
        } else {
            // Fallback for direct URL slugs that don't match slug exactly
            const fallbackName = category.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            query = query.ilike("category_type", fallbackName);
        }
    }
    
    if (q) query = query.ilike("name", `%${q}%`);
    if (sale) query = query.eq("is_sale", true);
    if (min) query = query.gte("price_ghs", parseFloat(min));
    if (max) query = query.lte("price_ghs", parseFloat(max));
    if (color) query = query.contains("available_colors", [color]);
    if (size) query = query.contains("available_sizes", [size]);

    switch (sort) {
        case "price-asc":  query = query.order("price_ghs",  { ascending: true });  break;
        case "price-desc": query = query.order("price_ghs",  { ascending: false }); break;
        case "name-asc":   query = query.order("name",       { ascending: true });  break;
        default:           query = query.order("created_at", { ascending: false }); break;
    }

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) console.error("[getProducts] Supabase Error:", error);

    const { data: bounds } = await supabaseAdmin
        .from("products")
        .select("price_ghs")
        .eq("is_active", true)
        .order("price_ghs", { ascending: true });

    const prices = (bounds || []).map((p: any) => Number(p.price_ghs)).filter(Boolean);
    const minPrice = prices.length ? Math.floor(prices[0]) : 0;
    const maxPrice = prices.length ? Math.ceil(prices[prices.length - 1]) : 1000;

    const { data: allCats } = await supabaseAdmin
        .from("categories")
        .select("name, slug");
    const catMap = new Map((allCats || []).map((c: any) => [c.name.toLowerCase(), c]));

    const products: ShopProduct[] = (data || []).map((p: any) => {
        const matchedCat = p.category_type ? catMap.get(p.category_type.toLowerCase()) : null;
        return {
            ...p,
            category_name: matchedCat?.name ?? p.category_type ?? null,
            category_slug: matchedCat?.slug ?? null,
        };
    });

    return { products, total: count ?? 0, minPrice, maxPrice };
}

export async function getCategories(role?: string): Promise<ShopCategory[]> {
    const isAuthorized = role && ["admin", "owner", "wholesale", "wholesaler"].includes(role.toLowerCase());
    
    let query = supabaseAdmin
        .from("categories")
        .select("id, name, slug, product_count, sort_order")
    if (!isAuthorized) {
        query = query.or("is_wholesale.eq.false,is_wholesale.is.null");
    }

    query = query.eq("is_active", true);

    const { data } = await query
        .order("sort_order", { ascending: true })
        .order("name",       { ascending: true });
    return (data ?? []) as ShopCategory[];
}

// ─── PDP interfaces ────────────────────────────────────────────────────────

export interface ProductDetail extends ShopProduct {
    category_type: string | null;
    sku: string | null;
    features_list: string[] | null;
    care_instructions: string[] | null;
    rating_average: number;
    review_count: number;
}

export interface ProductReview {
    id: string;
    rating: number;
    comment: string | null;
    author_name: string | null;
    author_initials: string | null;
    avatar_color: string | null;
    location: string | null;
    is_verified: boolean;
    created_at: string;
}

export interface RatingDistribution {
    star: number;
    count: number;
    pct: number;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
    const { data } = await supabaseAdmin
        .from("products")
        .select(`id, name, slug, description, price_ghs, compare_at_price_ghs,
             image_urls, is_featured, category_type, category_ids,
             available_colors, available_sizes, color_variants, size_variants,
             bundle_label, badge, is_sale, discount_value, inventory_count,
             sku, features_list, care_instructions, rating_average, review_count, created_at`)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

    if (!data) return null;

    const { data: allCats } = await supabaseAdmin.from("categories").select("name, slug");
    const catMap = new Map((allCats || []).map((c: any) => [c.name.toLowerCase(), c]));
    const matchedCat = data.category_type ? catMap.get(data.category_type.toLowerCase()) : null;

    return {
        ...data,
        category_id: null,
        is_featured: data.is_featured ?? false,
        is_sale: data.is_sale ?? false,
        discount_value: data.discount_value ?? 0,
        inventory_count: data.inventory_count ?? 0,
        rating_average: Number(data.rating_average ?? 0),
        review_count: Number(data.review_count ?? 0),
        category_name: matchedCat?.name ?? data.category_type ?? null,
        category_slug: matchedCat?.slug ?? null,
    } as ProductDetail;
}

export async function getRelatedProducts(categoryType: string, currentSlug: string): Promise<ShopProduct[]> {
    if (!categoryType) return [];
    const { data } = await supabaseAdmin
        .from("products")
        .select(`id, name, slug, description, price_ghs, compare_at_price_ghs,
             image_urls, is_featured, category_type, category_ids,
             available_colors, available_sizes, color_variants, size_variants,
             bundle_label, badge, is_sale, discount_value, inventory_count, created_at`)
        .eq("is_active", true)
        .ilike("category_type", categoryType)
        .neq("slug", currentSlug)
        .order("created_at", { ascending: false })
        .limit(4);

    return (data || []).map((p: any) => ({
        ...p,
        category_id: null,
        is_featured: p.is_featured ?? false,
        is_sale: p.is_sale ?? false,
        discount_value: p.discount_value ?? 0,
        inventory_count: p.inventory_count ?? 0,
        category_name: p.category_type ?? null,
        category_slug: null,
    }));
}

export async function getProductReviews(productId: string): Promise<{
    reviews: ProductReview[];
    distribution: RatingDistribution[];
}> {
    const { data } = await supabaseAdmin
        .from("product_reviews")
        .select("id, rating, comment, author_name, author_initials, avatar_color, location, is_verified, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

    const all = (data || []) as ProductReview[];
    const total = all.length;
    const distribution: RatingDistribution[] = [5, 4, 3, 2, 1].map(star => {
        const count = all.filter(r => r.rating === star).length;
        return { star, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    });

    return { reviews: all, distribution };
}

/** Derive all unique color names from a product list. */
export function deriveColors(products: ShopProduct[]): string[] {
    const set = new Set<string>();
    products.forEach(p => (p.available_colors ?? []).forEach(c => set.add(c)));
    return Array.from(set).sort();
}

/** Derive all unique size labels from a product list. */
export function deriveSizes(products: ShopProduct[]): string[] {
    const order = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "Free", "6-10"];
    const set = new Set<string>();
    products.forEach(p => (p.available_sizes ?? []).forEach(s => set.add(s)));
    const sorted = Array.from(set);
    sorted.sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
    return sorted;
}
export async function getVideoProducts(): Promise<Array<ShopProduct & { video_url?: string }>> {
    const { data } = await supabaseAdmin
        .from("products")
        .select(`id, name, slug, description, price_ghs, compare_at_price_ghs,
             image_urls, is_featured, category_type, category_ids,
             available_colors, available_sizes, color_variants, size_variants,
             bundle_label, badge, is_sale, discount_value, inventory_count, created_at`)
        .eq("is_active", true);

    if (!data) return [];

    const videoProducts = (data as any[]).map(p => {
        const video = p.image_urls?.find((url: string) => 
            url.toLowerCase().endsWith(".mp4") || url.toLowerCase().endsWith(".mov")
        );
        
        return {
            ...p,
            category_id: null,
            is_featured: p.is_featured ?? false,
            is_sale: p.is_sale ?? false,
            discount_value: p.discount_value ?? 0,
            inventory_count: p.inventory_count ?? 0,
            category_name: p.category_type ?? null,
            category_slug: null,
            video_url: video
        };
    }).filter(p => !!p.video_url);

    return videoProducts;
}
