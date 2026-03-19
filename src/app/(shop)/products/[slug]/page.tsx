import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getProductBySlug, getRelatedProducts, getProductReviews } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ProductGallery } from "@/components/ui/miss-tokyo/ProductGallery";
import { ProductOptions } from "@/components/ui/miss-tokyo/ProductOptions";
import { ProductAccordions } from "@/components/ui/miss-tokyo/ProductAccordions";
import { ReviewsSection } from "@/components/ui/miss-tokyo/ReviewsSection";

export const revalidate = 60;

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
    const product = await getProductBySlug(slug);
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
    const product = await getProductBySlug(slug);
    if (!product) notFound();

    const [related, { reviews, distribution }, pdpSettings] = await Promise.all([
        getRelatedProducts(product.category_type ?? "", slug),
        getProductReviews(product.id),
        supabaseAdmin
            .from("site_settings")
            .select("pdp_show_trust_strip, pdp_show_reviews, pdp_show_product_details, pdp_show_care_instructions, pdp_show_delivery_returns")
            .eq("id", "singleton")
            .single()
            .then(({ data }) => data ?? {}),
    ]);

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
                <div
                    className="pdp-layout"
                    style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px 80px", display: "grid", gridTemplateColumns: "1fr 480px", gap: 48, alignItems: "start" }}
                >
                    {/* Gallery */}
                    <ProductGallery
                        images={product.image_urls ?? []}
                        name={product.name}
                        badge={badgeLabel}
                        isSale={isSale}
                    />

                    {/* Info panel */}
                    <div style={{ paddingTop: 4 }}>
                        {/* Meta top: category + SKU */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            {product.category_name && (
                                <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted, #7A7167)" }}>
                                    {product.category_name}
                                </span>
                            )}
                            {product.sku && (
                                <span style={{ fontSize: 10, color: "var(--muted, #7A7167)", letterSpacing: "0.08em" }}>
                                    SKU {product.sku}
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
                        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
                            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40, gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted, #7A7167)", marginBottom: 10 }}>
                                        Complete your look
                                    </div>
                                    <h2 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 300, lineHeight: 1 }}>
                                        You May Also <em style={{ fontStyle: "italic", color: "var(--gold, #C9A96E)" }}>Like</em>
                                    </h2>
                                </div>
                                <Link href="/shop" style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink, #141210)", borderBottom: "1px solid var(--ink, #141210)", paddingBottom: 2, whiteSpace: "nowrap", textDecoration: "none" }}>
                                    View All
                                </Link>
                            </div>

                            <div className="pdp-related-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "20px 16px" }}>
                                {related.map(p => {
                                    const pSale = p.is_sale && (p.discount_value ?? 0) > 0;
                                    const displayPrice = pSale ? p.price_ghs * (1 - (p.discount_value ?? 0) / 100) : p.price_ghs;
                                    const origPrice = pSale ? p.price_ghs : null;
                                    const pAge = Date.now() - new Date(p.created_at).getTime();
                                    const pBadge = p.badge || (pSale ? "Sale" : (pAge < 14 * 24 * 60 * 60 * 1000 ? "New" : null));
                                    return (
                                        <Link key={p.slug} href={`/products/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                                            <div style={{ position: "relative", aspectRatio: "3/4", borderRadius: 4, overflow: "hidden", background: "var(--blush, #E8D5C4)", marginBottom: 11 }}>
                                                {p.image_urls?.[0] && (
                                                    <Image
                                                        src={p.image_urls[0]}
                                                        alt={p.name}
                                                        fill
                                                        sizes="(max-width: 768px) 50vw, 25vw"
                                                        loading="lazy"
                                                        style={{ objectFit: "cover" }}
                                                    />
                                                )}
                                                {pBadge && (
                                                    <span style={{ position: "absolute", top: 10, left: 10, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 2, background: pSale ? "var(--accent, #E8485A)" : "var(--ink, #141210)", color: "#fff" }}>
                                                        {pBadge}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted, #7A7167)", marginBottom: 3 }}>
                                                {p.category_name}
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 400, color: "var(--ink, #141210)", marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                                                {origPrice && (
                                                    <span style={{ fontSize: 12, color: "var(--muted, #7A7167)", textDecoration: "line-through", fontWeight: 400 }}>
                                                        GH₵{origPrice.toFixed(2)}
                                                    </span>
                                                )}
                                                <span style={{ color: pSale ? "var(--accent, #E8485A)" : "var(--ink, #141210)" }}>
                                                    GH₵{displayPrice.toFixed(2)}
                                                </span>
                                            </div>
                                            {(p.available_colors ?? []).length > 0 && (
                                                <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                                                    {(p.available_colors ?? []).slice(0, 5).map((c, ci) => (
                                                        <div key={ci} style={{ width: 11, height: 11, borderRadius: "50%", background: COLOR_HEX[c] || "#E8D5C4", border: "1px solid rgba(20,18,16,0.15)" }} />
                                                    ))}
                                                </div>
                                            )}
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
