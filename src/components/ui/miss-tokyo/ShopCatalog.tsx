import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { ShopClient } from "@/components/ui/miss-tokyo/ShopClient";

interface ShopCatalogProps {
    title?: string;
    subtitle?: string;
    defaultCategorySlug?: string;
    isSaleOnly?: boolean;
    searchQuery?: string;
    defaultSort?: "newest" | string;
}

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E";

export default async function ShopCatalog({ 
    title = "The Collection", 
    subtitle = "Enduring Quality. Quiet Aesthetics.",
    defaultCategorySlug,
    isSaleOnly = false,
    searchQuery,
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

    if (searchQuery) {
        productsQuery = productsQuery.ilike("name", `%${searchQuery}%`);
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
        supabase.from("store_settings").select("shop_grid_cols, shop_product_limit, shop_mobile_cols, shop_show_title, shop_image_stretch").eq("id", "default").single(),
    ]);

    const shopGridCols = ([2, 3, 4, 5].includes(storeSettingsData?.shop_grid_cols)
        ? storeSettingsData!.shop_grid_cols
        : 4) as 2 | 3 | 4 | 5;

    const shopMobileCols = ([1, 2].includes(storeSettingsData?.shop_mobile_cols)
        ? storeSettingsData!.shop_mobile_cols
        : 2) as 1 | 2;

    const shopProductLimit = storeSettingsData?.shop_product_limit || 12;
    const shopShowTitle = storeSettingsData?.shop_show_title ?? true;
    const shopImageStretch = storeSettingsData?.shop_image_stretch ?? false;

    const formattedProducts = (products || []).map((p: any) => {
        const isOnSale = p.is_sale === true;
        const salePrice = isOnSale && p.discount_value > 0
            ? `GH₵ ${(p.price_ghs * (1 - p.discount_value / 100)).toFixed(2)}`
            : null;
        return {
            slug: p.slug || p.id,
            name: p.name,
            priceNum: p.price_ghs,
            price: `GH₵ ${Number(p.price_ghs).toFixed(2)}`,
            imageUrl: p.image_urls?.[0] || FALLBACK_IMAGE,
            hoverImageUrl: p.image_urls?.[1],
            category: p.category_type || "",
            colors: p.available_colors || [],
            sizes: p.available_sizes || [],
            createdAt: p.created_at,
            ribbon: p.ribbon
                || (p.track_inventory && p.stock_quantity === 0 ? "Sold Out" : null)
                || (p.track_inventory && p.stock_quantity > 0 && p.stock_quantity <= 3 ? `Only ${p.stock_quantity} Left` : null),
            isOnSale,
            salePrice,
        };
    });

    return (
        <div className="pt-6 pb-24 px-10 md:px-16 xl:px-20 max-w-[1800px] mx-auto min-h-screen">
            {shopShowTitle && (
                <header className="mb-16 md:mb-24 text-center">
                    <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">{title}</h1>
                    <p className="text-sm tracking-[0.2em] text-neutral-500 uppercase">{subtitle}</p>
                </header>
            )}

            <Suspense fallback={null}>
                <ShopClient
                    products={formattedProducts}
                    categories={(categories || []).map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        slug: c.slug,
                        image_url: c.image_url || null,
                    }))}
                    gridCols={shopGridCols}
                    mobileCols={shopMobileCols}
                    itemsPerPage={shopProductLimit}
                    imageStretch={shopImageStretch}
                    defaultCategory={defaultCategorySlug}
                    defaultSort={defaultSort}
                />
            </Suspense>
        </div>
    );
}
