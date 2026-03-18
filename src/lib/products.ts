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
}

const PAGE_SIZE = 24;

export async function getProducts(params: GetProductsParams) {
    const { category, sort, color, size, min, max, page = 1, q } = params;

    // Products use category_type (text) not category_id FK.
    // Resolve the category slug → category name for matching against category_type.
    let categoryName: string | null = null;
    if (category) {
        const { data: cat } = await supabaseAdmin
            .from("categories")
            .select("name")
            .eq("slug", category)
            .maybeSingle();
        // If no DB match, convert slug to title-case as fallback (e.g. "new-arrivals" → "New Arrivals")
        categoryName = cat?.name ?? category.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }

    let query = supabaseAdmin
        .from("products")
        .select(
            `id, name, slug, description, price_ghs, compare_at_price_ghs,
             image_urls, is_featured, is_active, category_id, category_type,
             available_colors, available_sizes, color_variants, size_variants,
             bundle_label, badge, is_sale, discount_value, inventory_count, created_at`,
            { count: "exact" }
        )
        .eq("is_active", true);

    // Filter by category_type (case-insensitive exact match against category name)
    if (categoryName) {
        query = query.ilike("category_type", categoryName);
    }

    if (q) query = query.ilike("name", `%${q}%`);
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

export async function getCategories(): Promise<ShopCategory[]> {
    const { data } = await supabaseAdmin
        .from("categories")
        .select("id, name, slug, product_count, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name",       { ascending: true });
    return (data ?? []) as ShopCategory[];
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
