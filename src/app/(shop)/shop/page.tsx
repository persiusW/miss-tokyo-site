import { Metadata } from "next";
import { Suspense } from "react";
import { getProducts, getCategories, deriveColors, deriveSizes } from "@/lib/products";
import { ShopPageClient } from "@/components/ui/miss-tokyo/ShopPageClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 60;

interface SearchParams {
    category?: string;
    sort?: string;
    color?: string;
    size?: string;
    min?: string;
    max?: string;
    page?: string;
    q?: string;
}

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
    const params = await searchParams;
    const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

    if (params.category) {
        const { data: cat } = await supabaseAdmin
            .from("categories")
            .select("name, product_count")
            .eq("slug", params.category)
            .maybeSingle();
        if (cat) {
            return {
                title: `${cat.name} — Miss Tokyo`,
                description: `Shop ${cat.name} at Miss Tokyo. ${cat.product_count} styles available. New drops weekly.`,
                alternates: { canonical: `${BASE}/shop?category=${params.category}` },
            };
        }
    }

    return {
        title: "Shop — Miss Tokyo",
        description:
            "Browse 240+ styles — dresses, tops, sets, activewear and more. New drops weekly. Free delivery in Accra on orders over GH₵150.",
        alternates: { canonical: `${BASE}/shop` },
    };
}

export default async function ShopPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const params = await searchParams;

    const [{ products, total, minPrice, maxPrice }, categories, paginationSetting] = await Promise.all([
        getProducts({
            category: params.category,
            sort:     params.sort,
            color:    params.color,
            size:     params.size,
            min:      params.min,
            max:      params.max,
            page:     params.page ? parseInt(params.page) : 1,
            q:        params.q,
        }),
        getCategories(),
        supabaseAdmin
            .from("site_settings")
            .select("shop_pagination_type")
            .eq("id", "singleton")
            .maybeSingle()
            .then(({ data }) => (data?.shop_pagination_type as "load_more" | "pagination") || "load_more"),
    ]);

    // Derive all unique colors and sizes across the FULL (unfiltered) active product set
    // to populate sidebar swatches/pills even when a filter is active
    const { data: allProductsForFilters } = await supabaseAdmin
        .from("products")
        .select("available_colors, available_sizes")
        .eq("is_active", true);

    const allForFilters = (allProductsForFilters || []).map((p: any) => ({
        ...p,
        color_variants: null,
        size_variants: null,
    }));

    const allColors = deriveColors(allForFilters as any);
    const allSizes  = deriveSizes(allForFilters as any);

    return (
        <Suspense fallback={null}>
            <ShopPageClient
                initialProducts={products}
                categories={categories}
                allColors={allColors}
                allSizes={allSizes}
                total={total}
                minPrice={minPrice}
                maxPrice={maxPrice}
                paginationType={paginationSetting}
            />
        </Suspense>
    );
}
