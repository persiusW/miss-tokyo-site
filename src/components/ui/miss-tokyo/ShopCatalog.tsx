import { supabase } from "@/lib/supabase";
import { ShopClient } from "@/components/ui/badu/ShopClient";

interface ShopCatalogProps {
    title?: string;
    subtitle?: string;
    defaultCategorySlug?: string;
    isSaleOnly?: boolean;
    defaultSort?: "newest" | string;
}

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E";

export default async function ShopCatalog({ 
    title = "The Collection", 
    subtitle = "Enduring Quality. Quiet Aesthetics.",
    defaultCategorySlug,
    isSaleOnly = false,
    defaultSort
}: ShopCatalogProps) {
    
    // Build the products query dynamically
    let productsQuery = supabase.from("products").select("*").eq("is_active", true);

    if (isSaleOnly) {
        productsQuery = productsQuery.eq("is_sale", true);
    }

    if (defaultCategorySlug) {
        productsQuery = productsQuery.eq("category_type", defaultCategorySlug);
    }

    // Apply sorting
    if (defaultSort === "newest") {
        productsQuery = productsQuery.order("created_at", { ascending: false });
    } else {
        productsQuery = productsQuery.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    }

    const [{ data: products }, { data: categories }, { data: storeSettingsData }] = await Promise.all([
        productsQuery,
        supabase.from("categories").select("id, name, slug, image_url").eq("is_active", true).order("name"),
        supabase.from("store_settings").select("shop_grid_cols").eq("id", "default").single(),
    ]);

    const shopGridCols = ([2, 3, 4].includes(storeSettingsData?.shop_grid_cols)
        ? storeSettingsData!.shop_grid_cols
        : 4) as 2 | 3 | 4;

    const formattedProducts = (products || []).map((p) => ({
        slug: p.slug || p.id,
        name: p.name,
        priceNum: p.price_ghs,
        price: `${p.price_ghs} GHS`,
        imageUrl: p.image_urls?.[0] || FALLBACK_IMAGE,
        hoverImageUrl: p.image_urls?.[1],
        category: p.category_type || "",
        colors: p.available_colors || [],
        sizes: p.available_sizes || [],
        createdAt: p.created_at,
    }));

    return (
        <div className="pt-16 pb-24 px-6 md:px-12 max-w-[1400px] mx-auto min-h-screen">
            <header className="mb-16 md:mb-24 text-center">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">{title}</h1>
                <p className="text-sm tracking-[0.2em] text-neutral-500 uppercase">{subtitle}</p>
            </header>

            <ShopClient
                products={formattedProducts}
                categories={(categories || []).map(c => ({
                    id: c.id,
                    name: c.name,
                    slug: c.slug,
                    image_url: c.image_url || null,
                }))}
                gridCols={shopGridCols}
                defaultCategory={defaultCategorySlug}
                defaultSort={defaultSort}
            />
        </div>
    );
}
