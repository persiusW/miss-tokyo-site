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

    let query = supabaseAdmin
        .from("products")
        .select(
            `id, name, slug, description, price_ghs, compare_at_price_ghs,
             image_urls, is_featured, is_active, category_id, category_type, category_ids,
             available_colors, available_sizes, color_variants, size_variants,
             bundle_label, badge, is_sale, discount_value, inventory_count, created_at`,
            { count: "exact" }
        )
        .eq("is_active", true);

    // B2B Gating: If not authorized, exclude products that are EXCLUSIVELY in wholesale categories.
    // We achieve this by requiring at least one retail category OR no category associations at all.
    if (!isAuthorized) {
        const { data: retailCats } = await supabaseAdmin
            .from("categories")
            .select("id, name")
            .eq("is_wholesale", false)
            .eq("is_active", true);
        
        const rIds = (retailCats || []).map(c => c.id);
        const rNames = (retailCats || []).map(c => c.name);

        const retailConditions = [
            "category_id.is.null",
            "category_type.is.null"
        ];

        if (rIds.length > 0) {
            retailConditions.push(`category_id.in.(${rIds.join(",")})`);
            retailConditions.push(`category_ids.overlaps.{${rIds.join(",")}}`);
        }
        if (rNames.length > 0) {
            retailConditions.push(`category_type.in.(${rNames.map(n => `"${n}"`).join(",")})`);
        }

        query = query.or(retailConditions.join(","));
    }

    // Products use category_type (text) or category_ids (uuid array).
    // Resolve the category slug → category name & ID for matching.
    if (category) {
        const { data: cat } = await supabaseAdmin
            .from("categories")
            .select("id, name, is_wholesale")
            .eq("slug", category)
            .maybeSingle();

        if (cat) {
            // Direct URL protection for categories is handled at the page level, 
            // but we ensure the query respects the specific category requested.
            query = query.or(`category_type.ilike."${cat.name}",category_id.eq.${cat.id},category_ids.cs.{"${cat.id}"}`);
        } else {
            const fallbackName = category.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            query = query.ilike("category_type", fallbackName);
        }
    }

    // Filtering by category moved up into the primary query definition to handle complex .or() logic
    
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

    const { data, count } = await query;

    // Fetch overall price bounds (unfiltered, for slider bounds)
    const { data: bounds } = await supabaseAdmin
        .from("products")
        .select("price_ghs")
        .eq("is_active", true)
        .order("price_ghs", { ascending: true });

    const prices = (bounds || []).map((p: any) => Number(p.price_ghs)).filter(Boolean);
    const minPrice = prices.length ? Math.floor(prices[0]) : 0;
    const maxPrice = prices.length ? Math.ceil(prices[prices.length - 1]) : 1000;

    // Enrich with category name/slug from categories table using category_type matching
    // Fetch categories once for mapping
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
        .eq("is_active", true);

    if (!isAuthorized) {
        query = query.eq("is_wholesale", false);
    }

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
/** Fetch products that have video media (mp4/mov) for the Gallery feed. */
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
