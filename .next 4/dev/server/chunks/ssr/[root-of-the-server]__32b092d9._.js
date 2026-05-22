module.exports = [
"[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/src/app/global-error.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/global-error.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/error.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/error.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/(shop)/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(shop)/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/lib/products.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "VIDEO_BATCH_SIZE",
    ()=>VIDEO_BATCH_SIZE,
    "deriveColors",
    ()=>deriveColors,
    "deriveSizes",
    ()=>deriveSizes,
    "getAllProductSlugs",
    ()=>getAllProductSlugs,
    "getCategories",
    ()=>getCategories,
    "getPopulatedCategoryFilter",
    ()=>getPopulatedCategoryFilter,
    "getProductBySlug",
    ()=>getProductBySlug,
    "getProductReviews",
    ()=>getProductReviews,
    "getProducts",
    ()=>getProducts,
    "getRelatedProducts",
    ()=>getRelatedProducts,
    "getVideoProducts",
    ()=>getVideoProducts
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseAdmin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
;
;
;
const PAGE_SIZE = 24;
// ── Cached categories fetch — reused across getProducts and getProductBySlug ──
const getCachedCategories = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unstable_cache"])(async ()=>{
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data } = await db.from("categories").select("id, name, slug, preorder_enabled, preorder_estimated_weeks");
    return data ?? [];
}, [
    "categories-name-map"
], {
    revalidate: 300
});
const getCachedProducts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unstable_cache"])(async (params, role)=>{
    const { category, sort, color, size, min, max, page = 1, q, sale, inStock } = params;
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const [catResult, minBoundResult, maxBoundResult, allCats] = await Promise.all([
        category ? db.from("categories").select("id, name").eq("slug", category).maybeSingle() : Promise.resolve({
            data: null
        }),
        db.from("products").select("price_ghs").eq("is_active", true).order("price_ghs", {
            ascending: true
        }).limit(1),
        db.from("products").select("price_ghs").eq("is_active", true).order("price_ghs", {
            ascending: false
        }).limit(1),
        getCachedCategories()
    ]);
    const minPrice = catResult !== null && minBoundResult.data?.[0] ? Math.floor(Number(minBoundResult.data[0].price_ghs)) : 0;
    const maxPrice = maxBoundResult.data?.[0] ? Math.ceil(Number(maxBoundResult.data[0].price_ghs)) : 1000;
    const catMap = new Map(allCats.map((c)=>[
            c.name.toLowerCase(),
            c
        ]));
    const preorderCatById = new Map(allCats.filter((c)=>c.preorder_enabled).map((c)=>[
            c.id,
            c
        ]));
    const preorderCatByName = new Map(allCats.filter((c)=>c.preorder_enabled).map((c)=>[
            c.name.toLowerCase(),
            c
        ]));
    let query = db.from("products").select(`id, name, slug, description, price_ghs, compare_at_price_ghs,
                 image_urls, is_featured, is_active, category_id, category_type, category_ids,
                 available_colors, available_sizes, color_variants, size_variants,
                 bundle_label, badge, is_sale, discount_value, inventory_count, track_inventory, track_variant_inventory, preorder_enabled, preorder_estimated_date, sku, created_at`, {
        count: "exact"
    });
    query = query.or("is_active.eq.true,is_active.is.null");
    if (category) {
        const cat = catResult.data;
        if (cat) {
            query = query.or(`category_id.eq.${cat.id},category_type.ilike."${cat.name}",category_ids.cs.{"${cat.id}"}`);
        } else {
            const fallbackName = category.split("-").map((w)=>w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            query = query.ilike("category_type", fallbackName);
        }
    }
    if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    if (sale) query = query.eq("is_sale", true);
    if (inStock) query = query.gt("inventory_count", 0);
    if (min) query = query.gte("price_ghs", parseFloat(min));
    if (max) query = query.lte("price_ghs", parseFloat(max));
    if (color) query = query.contains("available_colors", [
        color
    ]);
    if (size) query = query.contains("available_sizes", [
        size
    ]);
    switch(sort){
        case "price-asc":
            query = query.order("price_ghs", {
                ascending: true
            });
            break;
        case "price-desc":
            query = query.order("price_ghs", {
                ascending: false
            });
            break;
        case "name-asc":
            query = query.order("name", {
                ascending: true
            });
            break;
        default:
            query = query.order("created_at", {
                ascending: false
            });
            break;
    }
    const from = (page - 1) * 24; // Use constant or PAGE_SIZE
    query = query.range(from, from + 24 - 1);
    const { data, count, error } = await query;
    if (error) console.error("[getProducts] Supabase Error:", error);
    const products = (data || []).map((p)=>{
        const matchedCat = p.category_type ? catMap.get(p.category_type.toLowerCase()) : null;
        // Category-level preorder inheritance: if the product hasn't explicitly enabled
        // preorder, check if any of its assigned categories has preorder enabled
        let effectivePreorder = p.preorder_enabled ?? false;
        let effectivePreorderDate = p.preorder_estimated_date ?? null;
        if (!effectivePreorder) {
            const inheritedCat = p.category_ids?.map((id)=>preorderCatById.get(id)).find(Boolean) ?? (p.category_id ? preorderCatById.get(p.category_id) : undefined) ?? (p.category_type ? preorderCatByName.get(p.category_type.toLowerCase()) : undefined);
            if (inheritedCat) {
                effectivePreorder = true;
                if (!effectivePreorderDate && inheritedCat.preorder_estimated_weeks > 0) {
                    effectivePreorderDate = new Date(Date.now() + inheritedCat.preorder_estimated_weeks * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                }
            }
        }
        return {
            ...p,
            category_name: matchedCat?.name ?? p.category_type ?? null,
            category_slug: matchedCat?.slug ?? null,
            track_inventory: p.track_inventory ?? true,
            track_variant_inventory: p.track_variant_inventory ?? false,
            preorder_enabled: effectivePreorder,
            preorder_estimated_date: effectivePreorderDate
        };
    });
    return {
        products,
        total: count ?? 0,
        minPrice,
        maxPrice
    };
}, [
    "products-list"
], {
    revalidate: false,
    tags: [
        "products"
    ]
});
async function getProducts(params, role) {
    return getCachedProducts(params, role);
}
const getCachedCategoriesByRole = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unstable_cache"])(async (isAuthorized)=>{
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    let query = db.from("categories").select("id, name, slug, product_count, sort_order").eq("is_active", true);
    // Hide wholesale-only categories from retail users
    if (!isAuthorized) {
        query = query.or("is_wholesale.eq.false,is_wholesale.is.null");
    }
    const { data, error } = await query.order("sort_order", {
        ascending: true
    }).order("name", {
        ascending: true
    });
    if (error) console.error("[getCategories]", error);
    return data ?? [];
}, [
    "categories-list"
], {
    revalidate: 300
});
async function getCategories(role) {
    const isAuthorized = !!role && [
        "admin",
        "owner",
        "wholesale",
        "wholesaler"
    ].includes(role.toLowerCase());
    return getCachedCategoriesByRole(isAuthorized);
}
// Lightweight cached fetch of category assignments for all active products.
// Used to filter the storefront category list to only those with live products.
const getCachedProductCategoryAssignments = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unstable_cache"])(async ()=>{
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data } = await db.from("products").select("category_id, category_type, category_ids").eq("is_active", true);
    return data ?? [];
}, [
    "product-category-assignments"
], {
    revalidate: 300,
    tags: [
        "products"
    ]
});
async function getPopulatedCategoryFilter(allCategories) {
    const assignments = await getCachedProductCategoryAssignments();
    const activeCatIds = new Set(assignments.flatMap((p)=>p.category_ids ?? (p.category_id ? [
            p.category_id
        ] : [])));
    const activeCatNames = new Set(assignments.map((p)=>(p.category_type ?? "").toLowerCase().trim()).filter(Boolean));
    return allCategories.filter((c)=>activeCatIds.has(c.id) || activeCatNames.has(c.name.toLowerCase().trim()));
}
async function getProductBySlug(slug) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").select(`id, name, slug, description, price_ghs, compare_at_price_ghs,
             image_urls, is_featured, category_type, category_ids,
             available_colors, available_sizes, color_variants, size_variants,
             bundle_label, badge, is_sale, discount_value, inventory_count, track_inventory, track_variant_inventory, preorder_enabled,
             sku, features_list, care_instructions, rating_average, review_count, created_at,
             wholesale_override, wholesale_price_tier_1, wholesale_price_tier_2, wholesale_price_tier_3`).eq("slug", slug).or("is_active.eq.true,is_active.is.null").maybeSingle();
    if (error) {
        // PGRST002: transient PostgREST schema cache reload — retry once.
        if (error.code === "PGRST002") {
            await new Promise((r)=>setTimeout(r, 500));
            return getProductBySlug(slug);
        }
        // Transient gateway error (Supabase/Cloudflare 502/503 during Vercel build or at runtime).
        // The Supabase JS client surfaces these as an error whose message contains raw HTML.
        // Throwing here crashes the SSG build worker for every product; returning null lets the
        // page call notFound() gracefully and ISR will rehydrate on the next request.
        const msg = String(error?.message ?? "");
        if (msg.includes("<!DOCTYPE") || msg.includes("Bad gateway") || msg.includes("502") || msg.includes("503")) {
            console.warn("[getProductBySlug] Transient gateway error for slug:", slug, "— skipping pre-render");
            return null;
        }
        console.error("[getProductBySlug]", error);
        throw error;
    }
    if (!data) return null;
    // PERF-03: use cached categories — avoids a per-PDP round-trip
    const allCats = await getCachedCategories();
    const catMap = new Map(allCats.map((c)=>[
            c.name.toLowerCase(),
            c
        ]));
    const matchedCat = data.category_type ? catMap.get(data.category_type.toLowerCase()) : null;
    return {
        ...data,
        category_id: null,
        is_featured: data.is_featured ?? false,
        is_sale: data.is_sale ?? false,
        discount_value: data.discount_value ?? 0,
        inventory_count: data.inventory_count ?? 0,
        track_inventory: data.track_inventory ?? true,
        track_variant_inventory: data.track_variant_inventory ?? false,
        preorder_enabled: data.preorder_enabled ?? false,
        rating_average: Number(data.rating_average ?? 0),
        review_count: Number(data.review_count ?? 0),
        category_name: matchedCat?.name ?? data.category_type ?? null,
        category_slug: matchedCat?.slug ?? null
    };
}
async function getRelatedProducts(categoryType, currentSlug) {
    if (!categoryType) return [];
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await db.from("products").select(`id, name, slug, description, price_ghs, compare_at_price_ghs,
             image_urls, is_featured, category_type, category_ids,
             available_colors, available_sizes, color_variants, size_variants,
             bundle_label, badge, is_sale, discount_value, inventory_count, track_inventory, track_variant_inventory, created_at`).eq("is_active", true).ilike("category_type", categoryType).neq("slug", currentSlug).order("created_at", {
        ascending: false
    }).limit(4);
    if (error) console.error("[getRelatedProducts]", error);
    return (data || []).map((p)=>({
            ...p,
            category_id: null,
            is_featured: p.is_featured ?? false,
            is_sale: p.is_sale ?? false,
            track_inventory: p.track_inventory ?? true,
            track_variant_inventory: p.track_variant_inventory ?? false,
            discount_value: p.discount_value ?? 0,
            inventory_count: p.inventory_count ?? 0,
            category_name: p.category_type ?? null,
            category_slug: null
        }));
}
async function getProductReviews(productId) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await db.from("product_reviews").select("id, rating, comment, author_name, author_initials, avatar_color, location, is_verified, created_at").eq("product_id", productId).order("created_at", {
        ascending: false
    }).limit(50);
    if (error) console.error("[getProductReviews]", error);
    const all = data || [];
    const total = all.length;
    const distribution = [
        5,
        4,
        3,
        2,
        1
    ].map((star)=>{
        const count = all.filter((r)=>r.rating === star).length;
        return {
            star,
            count,
            pct: total > 0 ? Math.round(count / total * 100) : 0
        };
    });
    return {
        reviews: all,
        distribution
    };
}
function deriveColors(products) {
    const set = new Set();
    products.forEach((p)=>(p.available_colors ?? []).forEach((c)=>set.add(c)));
    return Array.from(set).sort();
}
function deriveSizes(products) {
    const order = [
        "XS",
        "S",
        "M",
        "L",
        "XL",
        "2XL",
        "3XL",
        "Free",
        "6-10"
    ];
    const set = new Set();
    products.forEach((p)=>(p.available_sizes ?? []).forEach((s)=>set.add(s)));
    const sorted = Array.from(set);
    sorted.sort((a, b)=>{
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
    return sorted;
}
const VIDEO_BATCH_SIZE = 20;
async function getAllProductSlugs() {
    try {
        const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").select("slug").or("is_active.eq.true,is_active.is.null").order("created_at", {
            ascending: false
        });
        return (data ?? []).map((p)=>p.slug).filter(Boolean);
    } catch  {
        return [];
    }
}
// Return sizes from available_sizes whose label matches an in_stock size_variant.
// available_sizes entries look like "S — 8" or "Free Size"; size_variant labels are "S" / "Free Size".
// If no size_variants data exists, all sizes are returned unchanged.
function getInStockSizes(sizes, sizeVariants) {
    if (!sizes) return sizes;
    if (!sizeVariants || sizeVariants.length === 0) return sizes;
    const inStock = new Set(sizeVariants.filter((v)=>v.in_stock).map((v)=>v.label));
    if (inStock.size === 0) return [];
    return sizes.filter((s)=>inStock.has(s.split(" — ")[0]));
}
// Same for colors: available_colors are plain names e.g. "Black", color_variant.name matches.
function getInStockColors(colors, colorVariants) {
    if (!colors) return colors;
    if (!colorVariants || colorVariants.length === 0) return colors;
    const inStock = new Set(colorVariants.filter((v)=>v.in_stock).map((v)=>v.name));
    if (inStock.size === 0) return [];
    return colors.filter((c)=>inStock.has(c));
}
async function getVideoProducts(offset = 0) {
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data } = await db.from("products").select(`id, name, slug, description, price_ghs, compare_at_price_ghs,
             image_urls, is_featured, category_type, category_ids,
             available_colors, available_sizes, color_variants, size_variants,
             bundle_label, badge, is_sale, discount_value, inventory_count, track_inventory, track_variant_inventory, created_at`).eq("is_active", true)// Exclude products that track inventory and have none left
    .or("track_inventory.eq.false,inventory_count.gt.0").order("created_at", {
        ascending: false
    }).range(offset, offset + VIDEO_BATCH_SIZE - 1);
    if (!data) return {
        videos: [],
        nextOffset: offset + VIDEO_BATCH_SIZE,
        hasMore: false
    };
    const videos = data.map((p)=>{
        const video_url = p.image_urls?.find((url)=>url.toLowerCase().endsWith(".mp4") || url.toLowerCase().endsWith(".mov"));
        return {
            ...p,
            // Only expose in-stock sizes and colors so the QuickView modal only offers what's available
            available_sizes: getInStockSizes(p.available_sizes, p.size_variants),
            available_colors: getInStockColors(p.available_colors, p.color_variants),
            category_id: null,
            is_featured: p.is_featured ?? false,
            is_sale: p.is_sale ?? false,
            discount_value: p.discount_value ?? 0,
            inventory_count: p.inventory_count ?? 0,
            track_inventory: p.track_inventory ?? true,
            track_variant_inventory: p.track_variant_inventory ?? false,
            category_name: p.category_type ?? null,
            category_slug: null,
            video_url
        };
    }).filter((p)=>!!p.video_url);
    return {
        videos,
        nextOffset: offset + VIDEO_BATCH_SIZE,
        // If the DB returned a full batch, there may be more products to scan
        hasMore: data.length === VIDEO_BATCH_SIZE
    };
}
}),
"[project]/src/components/ui/miss-tokyo/ShopPageClient.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ShopPageClient",
    ()=>ShopPageClient
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ShopPageClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ShopPageClient() from the server but ShopPageClient is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/ui/miss-tokyo/ShopPageClient.tsx <module evaluation>", "ShopPageClient");
}),
"[project]/src/components/ui/miss-tokyo/ShopPageClient.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ShopPageClient",
    ()=>ShopPageClient
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const ShopPageClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ShopPageClient() from the server but ShopPageClient is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/ui/miss-tokyo/ShopPageClient.tsx", "ShopPageClient");
}),
"[project]/src/components/ui/miss-tokyo/ShopPageClient.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ShopPageClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/ShopPageClient.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ShopPageClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/ShopPageClient.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ShopPageClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/app/(shop)/shop/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ShopPage,
    "generateMetadata",
    ()=>generateMetadata,
    "revalidate",
    ()=>revalidate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$products$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/products.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ShopPageClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/ShopPageClient.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseAdmin.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
const getAutoDiscountRules = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unstable_cache"])(async ()=>{
    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("automatic_discounts").select("id, title, discount_type, discount_value, applies_to, target_category_ids, target_product_ids, min_quantity, quantity_scope, min_order_amount").eq("is_active", true);
    return data ?? [];
}, [
    "active-auto-discounts"
], {
    revalidate: 300,
    tags: [
        "auto-discounts"
    ]
});
// Cache admin-controlled settings for 5 minutes — they change rarely and this
// fetch fires on every dynamic /shop render, contributing ~0.5-1s per invocation.
const getShopSettings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unstable_cache"])(async ()=>{
    const [paginationRes, mobileColsRes] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("site_settings").select("shop_pagination_type").eq("id", "singleton").maybeSingle(),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("store_settings").select("shop_mobile_cols").eq("id", "default").maybeSingle()
    ]);
    return {
        paginationSetting: paginationRes.data?.shop_pagination_type ?? "load_more",
        mobileCols: Number(mobileColsRes.data?.shop_mobile_cols) || 2
    };
}, [
    "shop-settings"
], {
    revalidate: 300
});
const revalidate = 60;
async function generateMetadata({ searchParams }) {
    const params = await searchParams;
    const BASE = ("TURBOPACK compile-time value", "http://localhost:3000") || "https://misstokyo.shop";
    if (params.category) {
        const { data: cat } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("categories").select("name, product_count").eq("slug", params.category).maybeSingle();
        if (cat) {
            return {
                title: `${cat.name} — Miss Tokyo`,
                description: `Shop ${cat.name} at Miss Tokyo. ${cat.product_count} styles available. New drops weekly.`,
                alternates: {
                    canonical: `${BASE}/shop?category=${params.category}`
                }
            };
        }
    }
    return {
        title: "Shop — Miss Tokyo",
        description: "Browse 240+ styles — dresses, tops, sets, activewear and more. New drops weekly. Free delivery in Accra on orders over GH₵150.",
        alternates: {
            canonical: `${BASE}/shop`
        }
    };
}
async function ShopPage({ searchParams }) {
    const params = await searchParams;
    // Role is resolved client-side to keep this page ISR-cacheable.
    // Wholesale users see public products on initial load; client-side auth
    // in ShopPageClient can upgrade the view after hydration if needed.
    const role = undefined;
    const [{ paginationSetting, mobileCols }, autoDiscountRules] = await Promise.all([
        getShopSettings().catch(()=>({
                paginationSetting: "load_more",
                mobileCols: 2
            })),
        getAutoDiscountRules().catch(()=>[])
    ]);
    const [{ products, total, minPrice, maxPrice }, allCategories] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$products$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getProducts"])({
            category: params.category,
            sort: params.sort,
            color: params.color,
            size: params.size,
            min: params.min,
            max: params.max,
            page: params.page ? parseInt(params.page) : 1,
            q: params.q,
            sale: params.sale === "true"
        }, role),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$products$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCategories"])(role)
    ]);
    const categories = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$products$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPopulatedCategoryFilter"])(allCategories);
    // Resolve category slug → name once (reused for both filter queries)
    let categoryName = null;
    let categoryId = null;
    if (params.category) {
        const { data: cat } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("categories").select("id, name").eq("slug", params.category).maybeSingle();
        categoryName = cat?.name ?? params.category.split("-").map((w)=>w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        categoryId = cat?.id || null;
    }
    // Faceted filter queries:
    // • allColors = colors available within the current category + size selection
    // • allSizes  = sizes  available within the current category + color selection
    const buildBase = ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").select("available_colors, available_sizes").eq("is_active", true);
    let colorsQ = buildBase();
    let sizesQ = buildBase();
    if (categoryId && categoryName) {
        const orFilter = `category_type.ilike."${categoryName}",category_id.eq.${categoryId},category_ids.cs.{"${categoryId}"}`;
        colorsQ = colorsQ.or(orFilter);
        sizesQ = sizesQ.or(orFilter);
    } else if (categoryName) {
        colorsQ = colorsQ.ilike("category_type", categoryName);
        sizesQ = sizesQ.ilike("category_type", categoryName);
    }
    if (params.sale === "true") {
        colorsQ = colorsQ.eq("is_sale", true);
        sizesQ = sizesQ.eq("is_sale", true);
    }
    // Colors are constrained by the active size filter
    if (params.size) colorsQ = colorsQ.contains("available_sizes", [
        params.size
    ]);
    // Sizes are constrained by the active color filter
    if (params.color) sizesQ = sizesQ.contains("available_colors", [
        params.color
    ]);
    const [{ data: colorsData }, { data: sizesData }] = await Promise.all([
        colorsQ,
        sizesQ
    ]);
    const toFilterRows = (rows)=>(rows || []).map((p)=>({
                ...p,
                color_variants: null,
                size_variants: null
            }));
    const allColors = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$products$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deriveColors"])(toFilterRows(colorsData));
    const allSizes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$products$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deriveSizes"])(toFilterRows(sizesData));
    const skeletonFallback = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6",
        children: Array.from({
            length: 8
        }).map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "h-64 bg-gray-100 animate-pulse rounded-md"
            }, i, false, {
                fileName: "[project]/src/app/(shop)/shop/page.tsx",
                lineNumber: 174,
                columnNumber: 17
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/app/(shop)/shop/page.tsx",
        lineNumber: 172,
        columnNumber: 9
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Suspense"], {
        fallback: skeletonFallback,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$ShopPageClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ShopPageClient"], {
            initialProducts: products,
            categories: categories,
            allColors: allColors,
            allSizes: allSizes,
            total: total,
            minPrice: minPrice,
            maxPrice: maxPrice,
            paginationType: paginationSetting,
            mobileCols: mobileCols,
            autoDiscountRules: autoDiscountRules
        }, void 0, false, {
            fileName: "[project]/src/app/(shop)/shop/page.tsx",
            lineNumber: 181,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/(shop)/shop/page.tsx",
        lineNumber: 180,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(shop)/shop/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(shop)/shop/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__32b092d9._.js.map