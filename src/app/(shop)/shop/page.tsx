import { Metadata } from "next";
import { Suspense } from "react";
import { getProducts, getCategories, deriveColors, deriveSizes } from "@/lib/products";
import { ShopPageClient } from "@/components/ui/miss-tokyo/ShopPageClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SearchParams {
    category?: string;
    sort?: string;
    color?: string;
    size?: string;
    min?: string;
    max?: string;
    page?: string;
    q?: string;
    sale?: string;
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
    const supabase = await createClient();
    
    // Auth Hardening: Catch stale sessions/403s gracefully to ensure public access
    let user = null;
    let role: string | undefined;
    
    try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (!authError && data?.user) {
            user = data.user;
            // Fetch profile using the authenticated client
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
            role = profile?.role;
        }
    } catch (err) {
        console.warn("[Auth Hardening] Session verification failed, proceeding as public user:", err);
    }
    const isAuthorized = role && ["admin", "owner", "wholesale", "wholesaler"].includes(role.toLowerCase());

    // Part 3: Direct URL Protection (Category)
    if (params.category) {
        const { data: cat } = await supabaseAdmin
            .from("categories")
            .select("is_wholesale")
            .eq("slug", params.category)
            .maybeSingle();
        
        if (cat?.is_wholesale && !isAuthorized) {
            notFound();
        }
    }

    // Phase 3 & 4: Defensive settings fetch with robust fallbacks
    let paginationSetting: "load_more" | "pagination" = "load_more";
    let mobileCols: 1 | 2 = 2;

    try {
        const [paginationRes, mobileColsRes] = await Promise.all([
            supabaseAdmin
                .from("site_settings")
                .select("shop_pagination_type")
                .eq("id", "singleton")
                .maybeSingle(),
            supabaseAdmin
                .from("store_settings")
                .select("shop_mobile_cols")
                .eq("id", "default")
                .maybeSingle(),
        ]);

        if (paginationRes.data?.shop_pagination_type) {
            paginationSetting = paginationRes.data.shop_pagination_type as any;
        }
        if (mobileColsRes.data?.shop_mobile_cols) {
            mobileCols = Number(mobileColsRes.data.shop_mobile_cols) as 1 | 2;
        }
    } catch (err) {
        console.warn("[Defensive Fetch] Settings retrieval failed, using fallbacks:", err);
    }

    const [{ products, total, minPrice, maxPrice }, categories] = await Promise.all([
        getProducts({
            category: params.category,
            sort:     params.sort,
            color:    params.color,
            size:     params.size,
            min:      params.min,
            max:      params.max,
            page:     params.page ? parseInt(params.page) : 1,
            q:        params.q,
            sale:     params.sale === "true",
        }, role),
        getCategories(role),
    ]);

    // Resolve category slug → name once (reused for both filter queries)
    let categoryName: string | null = null;
    let categoryId: string | null = null;
    if (params.category) {
        const { data: cat } = await supabaseAdmin
            .from("categories")
            .select("id, name")
            .eq("slug", params.category)
            .maybeSingle();
        categoryName = cat?.name
            ?? params.category.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        categoryId = cat?.id || null;
    }

    // Faceted filter queries:
    // • allColors = colors available within the current category + size selection
    // • allSizes  = sizes  available within the current category + color selection
    const buildBase = () =>
        supabaseAdmin.from("products").select("available_colors, available_sizes").eq("is_active", true);

    let colorsQ = buildBase();
    let sizesQ  = buildBase();

    if (categoryId && categoryName) {
        const orFilter = `category_type.ilike."${categoryName}",category_id.eq.${categoryId},category_ids.cs.{"${categoryId}"}`;
        colorsQ = colorsQ.or(orFilter) as typeof colorsQ;
        sizesQ  = sizesQ.or(orFilter) as typeof sizesQ;
    } else if (categoryName) {
        colorsQ = colorsQ.ilike("category_type", categoryName) as typeof colorsQ;
        sizesQ  = sizesQ.ilike("category_type",  categoryName) as typeof sizesQ;
    }
    if (params.sale === "true") {
        colorsQ = colorsQ.eq("is_sale", true) as typeof colorsQ;
        sizesQ  = sizesQ.eq("is_sale",  true) as typeof sizesQ;
    }
    // Colors are constrained by the active size filter
    if (params.size)  colorsQ = colorsQ.contains("available_sizes",  [params.size])  as typeof colorsQ;
    // Sizes are constrained by the active color filter
    if (params.color) sizesQ  = sizesQ.contains("available_colors", [params.color]) as typeof sizesQ;

    const [{ data: colorsData }, { data: sizesData }] = await Promise.all([colorsQ, sizesQ]);

    const toFilterRows = (rows: any[] | null) =>
        (rows || []).map((p: any) => ({ ...p, color_variants: null, size_variants: null }));

    const allColors = deriveColors(toFilterRows(colorsData) as any);
    const allSizes  = deriveSizes(toFilterRows(sizesData)  as any);

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
                mobileCols={mobileCols}
            />
        </Suspense>
    );
}
