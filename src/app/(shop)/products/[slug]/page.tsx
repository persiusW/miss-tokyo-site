import { notFound } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getProductBySlug, getRelatedProducts, getProductReviews, getAllProductSlugs } from "@/lib/products";

// PERF-23: deduplicate — generateMetadata and ProductPage both call this;
// React cache() deduplicates within one render cycle so only one DB query fires.
const getProductBySlugCached = cache(getProductBySlug);
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { ProductGallery } from "@/components/ui/miss-tokyo/ProductGallery";
import { ProductOptions } from "@/components/ui/miss-tokyo/ProductOptions";
import { ProductAccordions } from "@/components/ui/miss-tokyo/ProductAccordions";
import { ReviewsSection } from "@/components/ui/miss-tokyo/ReviewsSection";

// ── ISR-SAFE caches ────────────────────────────────────────────────────────────
// These use supabaseAdmin (no cookies) and change rarely.
// Caching here means one DB query per 5 minutes across ALL PDP renders,
// instead of one query per request.
const getPdpSettings = unstable_cache(
    async () => {
        const [settingsRes, tiersRes] = await Promise.all([
            supabaseAdmin
                .from("site_settings")
                .select("pdp_show_trust_strip, pdp_show_reviews, pdp_show_product_details, pdp_show_care_instructions, pdp_show_delivery_returns")
                .eq("id", "singleton")
                .maybeSingle(),
            supabaseAdmin
                .from("site_copy")
                .select("value")
                .eq("copy_key", "wholesale_tiers")
                .maybeSingle(),
        ]);
        let wholesaleTiersData = null;
        try {
            wholesaleTiersData = tiersRes.data?.value ? JSON.parse(tiersRes.data.value) : null;
        } catch { /* use defaults */ }
        return { pdpSettings: settingsRes.data || {}, wholesaleTiersData };
    },
    ["pdp-settings"],
    { revalidate: 300 }
);

export const revalidate = 60;

// Pre-build every published product page at deploy time.
// ISR (revalidate = 60) handles background refresh; this ensures zero cold-start
// DB queries for any product URL under load.
export async function generateStaticParams() {
    const slugs = await getAllProductSlugs();
    return slugs.map(slug => ({ slug }));
}

const COLOR_HEX: Record<string, string> = {
    Black: "#141210", White: "#FAFAFA", Red: "#E8485A", Pink: "#F5A7B3",
    Blue: "#3B82F6", Navy: "#1E3A5F", Green: "#10B981", Turquoise: "#14B8A6",
    Purple: "#8B5CF6", Yellow: "#FBBF24", Orange: "#F97316", Beige: "#E8D5C4",
    Brown: "#8B5E3C", Grey: "#9CA3AF", Maroon: "#7F1D1D", Gold: "#C9A96E",
};

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";
    const product = await getProductBySlugCached(slug);
    if (!product) return { title: "Product — Miss Tokyo" };
    return {
        title: `${product.name} — Miss Tokyo`,
        description: (product.description ?? `Shop ${product.name} at Miss Tokyo.`).slice(0, 150),
        openGraph: {
            images: product.image_urls?.[0] ? [{ url: product.image_urls[0] }] : [],
        },
        alternates: { canonical: `${BASE}/products/${slug}` },
    };
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const product = await getProductBySlugCached(slug);
    if (!product) notFound();

    // ── Wholesale-only gate ───────────────────────────────────────────────────
    // Step 1: check product categories with supabaseAdmin — no cookies(), ISR safe.
    const productCatIds = product.category_ids ? [...product.category_ids] : [];
    if (product.category_id) productCatIds.push(product.category_id);

    let isWholesaleOnly = false;

    if (productCatIds.length > 0 || product.category_type) {
        const orConditions = [];
        if (productCatIds.length > 0) orConditions.push(`id.in.(${productCatIds.join(",")})`);
        if (product.category_type) orConditions.push(`name.ilike."${product.category_type}"`);

        const { data: activeProductCats } = await supabaseAdmin
            .from("categories")
            .select("is_wholesale")
            .or(orConditions.join(","));

        isWholesaleOnly = (activeProductCats || []).length > 0 &&
                          (activeProductCats || []).every(c => c.is_wholesale === true);
    }

    // Step 2: only read cookies if this product actually requires auth gating.
    // For retail products (the vast majority) we skip createClient() entirely,
    // which preserves the ISR static cache and prevents DB hammering under load.
    if (isWholesaleOnly) {
        const supabase = await createClient();
        let authUser = null;
        try {
            const { data } = await supabase.auth.getUser();
            authUser = data?.user || null;
        } catch (err) {
            console.warn("[PDP] Wholesale gate auth check failed:", err);
        }
        let isAuthorized = false;
        if (authUser) {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.id).maybeSingle();
            const role = profile?.role;
            isAuthorized = !!(role && ["admin", "owner", "wholesale", "wholesaler"].includes(role.toLowerCase()));
        }
        if (!isAuthorized) notFound();
    }

    // Settings are globally cached — no per-request DB query
    const { pdpSettings, wholesaleTiersData } = await getPdpSettings().catch(() => ({
        pdpSettings: {} as any,
        wholesaleTiersData: null,
    }));

    const [related, { reviews, distribution }, variantRes, variantMetaRes] = await Promise.all([
        getRelatedProducts(product.category_type ?? "", slug),
        getProductReviews(product.id),
        supabaseAdmin
            .from("product_variants")
            .select("size, color, stitching, inventory_count")
            .eq("product_id", product.id),
        supabaseAdmin
            .from("products")
            .select("track_variant_inventory")
            .eq("id", product.id)
            .maybeSingle(),
    ]);

    const productVariants = variantRes.data ?? [];
    const trackVariantInventory = (variantMetaRes.data as any)?.track_variant_inventory ?? false;

    const baseTiers = wholesaleTiersData || {
        tier1_min: 3, tier1_max: 5, tier1_discount: 10,
        tier2_min: 6, tier2_max: 10, tier2_discount: 15,
        tier3_min: 11, tier3_max: 999, tier3_discount: 20
    };

    // Resolve wholesale tier prices server-side so the client component receives
    // the data it needs. supabaseAdmin — no cookies, ISR safe.
    // ProductOptions decides whether to display this based on the user's role
    // fetched client-side from /api/me.
    let categoryTierPrices: { tier1_price?: number | null; tier2_price?: number | null; tier3_price?: number | null } = {};
    if (!product.wholesale_override) {
        try {
            const catConditions = [];
            if (product.category_ids?.length) catConditions.push(`id.in.(${product.category_ids.join(",")})`);
            if (product.category_type) catConditions.push(`name.ilike."${product.category_type}"`);
            if (catConditions.length) {
                const { data: catPrices } = await supabaseAdmin
                    .from("categories")
                    .select("wholesale_tier_1_price, wholesale_tier_2_price, wholesale_tier_3_price, is_wholesale")
                    .or(catConditions.join(","))
                    .eq("is_wholesale", true)
                    .limit(1)
                    .maybeSingle();
                if (catPrices) {
                    categoryTierPrices = {
                        tier1_price: catPrices.wholesale_tier_1_price ?? null,
                        tier2_price: catPrices.wholesale_tier_2_price ?? null,
                        tier3_price: catPrices.wholesale_tier_3_price ?? null,
                    };
                }
            }
        } catch { /* fall back to percentage discounts */ }
    }

    const wholesaleTiers = {
        ...baseTiers,
        // Product-specific override prices take precedence over category prices
        ...(product.wholesale_override
            ? {
                tier1_price: product.wholesale_price_tier_1 ?? null,
                tier2_price: product.wholesale_price_tier_2 ?? null,
                tier3_price: product.wholesale_price_tier_3 ?? null,
            }
            : categoryTierPrices),
    };

    const showTrustStrip = (pdpSettings as any)?.pdp_show_trust_strip ?? true;
    const showReviews = (pdpSettings as any)?.pdp_show_reviews ?? true;
    const showProductDetails = (pdpSettings as any)?.pdp_show_product_details ?? true;
    const showCare = (pdpSettings as any)?.pdp_show_care_instructions ?? true;
    const showDelivery = (pdpSettings as any)?.pdp_show_delivery_returns ?? true;

    const isSale = product.is_sale && (product.discount_value ?? 0) > 0;
    const ageMs = Date.now() - new Date(product.created_at).getTime();
    const isNew = ageMs < 14 * 24 * 60 * 60 * 1000;
    const badgeLabel = product.badge || (isSale ? null : isNew ? "New" : null);

    const ratingAvg = Number(product.rating_average ?? 0);
    const reviewCount = Number(product.review_count ?? 0);

    const effectivePrice = isSale && (product.discount_value ?? 0) > 0
        ? product.price_ghs * (1 - (product.discount_value ?? 0) / 100)
        : product.price_ghs;

    // Title: last word in italic gold
    const words = product.name.split(" ");
    const nameHead = words.slice(0, -1).join(" ");
    const nameLast = words[words.length - 1];

    // JSON-LD Product schema
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        image: product.image_urls?.[0] ?? "",
        description: product.description ?? "",
        sku: product.sku ?? product.id,
        offers: {
            "@type": "Offer",
            price: effectivePrice.toFixed(2),
            priceCurrency: "GHS",
            availability: (product.inventory_count ?? 0) > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
        },
        ...(reviewCount > 0 && {
            aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: ratingAvg.toFixed(1),
                reviewCount,
            },
        }),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div style={{ background: "var(--sand, #F7F2EC)", minHeight: "100vh" }}>

                {/* Breadcrumb */}
                <div style={{ maxWidth: 1440, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted, #7A7167)", letterSpacing: "0.04em", flexWrap: "wrap" }}>
                    <Link href="/" style={{ color: "var(--muted, #7A7167)" }}>Home</Link>
                    <span style={{ opacity: 0.4, fontSize: 10 }}>›</span>
                    <Link href="/shop" style={{ color: "var(--muted, #7A7167)" }}>Shop</Link>
                    {product.category_name && (
                        <>
                            <span style={{ opacity: 0.4, fontSize: 10 }}>›</span>
                            <Link
                                href={`/shop?category=${product.category_slug || product.category_type}`}
                                style={{ color: "var(--muted, #7A7167)" }}
                            >
                                {product.category_name}
                            </Link>
                        </>
                    )}
                    <span style={{ opacity: 0.4, fontSize: 10 }}>›</span>
                    <span style={{ color: "var(--ink, #141210)" }}>{product.name}</span>
                </div>

                {/* Product layout */}
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
                    {/* Gallery column */}
                    <div className="w-full">
                        <ProductGallery
                            images={product.image_urls ?? []}
                            name={product.name}
                            badge={badgeLabel}
                            isSale={isSale}
                        />
                    </div>

                    {/* Info panel - STICKY on desktop */}
                    <div className="md:sticky md:top-24 h-fit">
                        {/* Meta top: category + SKU */}
                        <div className="flex items-center justify-between mb-[10px]">
                            {product.category_name && (
                                <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-[#7A7167]">
                                    {product.category_name}
                                </span>
                            )}
                            {product.sku && (
                                <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-[#7A7167]">
                                    SKU: #{product.sku}
                                </span>
                            )}
                        </div>

                        {/* Title with italic last word */}
                        <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "clamp(32px, 3.5vw, 48px)", fontWeight: 300, lineHeight: 1.05, marginBottom: 16 }}>
                            {nameHead && `${nameHead} `}
                            <em style={{ fontStyle: "italic", color: "var(--gold, #C9A96E)" }}>{nameLast}</em>
                        </h1>

                        {/* Interactive options (colour, size, qty, CTA, wishlist, trust) */}
                        <ProductOptions
                            productId={product.id}
                            name={product.name}
                            slug={product.slug}
                            price={product.price_ghs}
                            compareAtPrice={product.compare_at_price_ghs}
                            bundleLabel={product.bundle_label}
                            colorVariants={product.color_variants as any}
                            sizeVariants={product.size_variants as any}
                            availableColors={product.available_colors}
                            availableSizes={product.available_sizes}
                            inventoryCount={product.inventory_count ?? 0}
                            ratingAverage={ratingAvg}
                            reviewCount={reviewCount}
                            imageUrl={product.image_urls?.[0] ?? ""}
                            isSale={isSale}
                            discountValue={product.discount_value ?? 0}
                            showTrustStrip={showTrustStrip}
                            isWholesaler={false}
                            wholesaleTiers={wholesaleTiers}
                            trackVariantInventory={trackVariantInventory}
                            productVariants={productVariants}
                        />

                        {/* Accordions */}
                        <ProductAccordions
                            description={product.description}
                            featuresList={product.features_list}
                            careInstructions={product.care_instructions}
                            sku={product.sku}
                            showProductDetails={showProductDetails}
                            showCare={showCare}
                            showDelivery={showDelivery}
                        />
                    </div>
                </div>

                {/* You May Also Like */}
                {related.length > 0 && (
                    <section style={{ background: "#fff", borderTop: "1px solid rgba(20,18,16,0.1)", padding: "64px 0" }}>
                        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
                            <div className="flex justify-between items-end mb-6 md:mb-10 lg:mb-12">
                                <div>
                                    <div className="text-[10px] md:text-xs font-medium tracking-[0.2em] uppercase text-[var(--muted,#7A7167)] mb-2 md:mb-3">
                                        Complete your look
                                    </div>
                                    <h2 className="font-display text-[clamp(28px,3vw,40px)] font-light leading-none text-[#141210]">
                                        You May Also <em className="italic text-[var(--gold,#C9A96E)]">Like</em>
                                    </h2>
                                </div>
                                <Link 
                                    href="/shop" 
                                    className="text-xs md:text-sm font-semibold uppercase tracking-widest text-[#141210] underline underline-offset-4 whitespace-nowrap mb-1 md:mb-2 hover:text-[#7A7167] transition-colors"
                                >
                                    View All
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                {related.slice(0, 4).map(p => {
                                    const pSale = p.is_sale && (p.discount_value ?? 0) > 0;
                                    const displayPrice = pSale ? p.price_ghs * (1 - (p.discount_value ?? 0) / 100) : p.price_ghs;
                                    const origPrice = pSale ? p.price_ghs : null;
                                    const pAge = Date.now() - new Date(p.created_at).getTime();
                                    const pBadge = p.badge || (pSale ? "Sale" : (pAge < 14 * 24 * 60 * 60 * 1000 ? "New" : null));
                                    
                                    return (
                                        <Link key={p.slug} href={`/products/${p.slug}`} className="group block no-underline text-inherit outline-none">
                                            {/* Image Container */}
                                            <div className="relative w-full aspect-[3/4] rounded md:rounded-sm overflow-hidden bg-[var(--blush,#E8D5C4)] mb-3">
                                                {p.image_urls?.[0] && (
                                                    <Image
                                                        src={p.image_urls[0]}
                                                        alt={p.name}
                                                        fill
                                                        sizes="(max-width: 768px) 50vw, 25vw"
                                                        loading="lazy"
                                                        unoptimized={true}
                                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                )}
                                                {pBadge && (
                                                    <span 
                                                        className="absolute top-2.5 left-2.5 text-[9px] md:text-[10px] font-medium tracking-widest uppercase px-2 py-1 rounded-[2px] text-white shadow-sm z-10"
                                                        style={{ background: pSale ? "var(--accent, #E8485A)" : "var(--ink, #141210)" }}
                                                    >
                                                        {pBadge}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Details */}
                                            <div className="flex flex-col">
                                                <div className="text-[10px] md:text-[11px] tracking-[0.1em] uppercase text-[var(--muted,#7A7167)] mb-[2px] md:mb-1 truncate">
                                                    {p.category_name}
                                                </div>
                                                <div className="text-sm md:text-[15px] font-normal text-[#141210] mb-1 leading-snug truncate">
                                                    {p.name}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {origPrice && (
                                                        <span className="text-xs md:text-sm text-[var(--muted,#7A7167)] line-through font-normal">
                                                            GH₵{origPrice.toFixed(2)}
                                                        </span>
                                                    )}
                                                    <span className={`text-sm md:text-[15px] font-medium ${pSale ? "text-[var(--accent,#E8485A)]" : "text-[#141210]"}`}>
                                                        GH₵{displayPrice.toFixed(2)}
                                                    </span>
                                                </div>
                                                
                                                {/* Colors */}
                                                {(p.available_colors ?? []).length > 0 && (
                                                    <div className="flex gap-1.5 mt-2 md:mt-2.5">
                                                        {(p.available_colors ?? []).slice(0, 5).map((c, ci) => (
                                                            <div 
                                                                key={ci} 
                                                                className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full border border-black/15 shadow-sm"
                                                                style={{ background: COLOR_HEX[c] || "#E8D5C4" }} 
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* Reviews */}
                {showReviews && (
                    <ReviewsSection
                        reviews={reviews}
                        distribution={distribution}
                        reviewCount={reviewCount}
                        ratingAverage={ratingAvg}
                    />
                )}

            </div>
        </>
    );
}
