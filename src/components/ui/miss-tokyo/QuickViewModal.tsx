"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ProductCheckoutForm } from "./ProductCheckoutForm";
import Image from "next/image";

function isVideoUrl(url: string): boolean {
    const lower = url.toLowerCase().split("?")[0];
    return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov");
}

/** Minimum product fields the modal needs to render. */
export interface QuickViewProduct {
    id: string;
    name: string;
    slug: string;
    price_ghs: number;
    compare_at_price_ghs?: number | null;
    is_sale?: boolean;
    discount_value?: number | null;
    image_urls: string[] | null;
    available_colors: string[] | null;
    available_stitching?: string[] | null;
    available_sizes: string[] | null;
    inventory_count?: number;
    track_inventory?: boolean;
    track_variant_inventory?: boolean;
}

interface QuickViewModalProps {
    /**
     * Full product object — preferred path.
     * When supplied the modal renders immediately with no DB round-trip (PERF-11).
     */
    product?: QuickViewProduct | null;
    /**
     * Legacy: slug-only callers that don't have the product object in scope.
     * Triggers a DB fetch on every open. Provide `product` instead when possible.
     */
    slug?: string;
    onClose: () => void;
    openDrawerOnAdd?: boolean;
}

export function QuickViewModal({
    product: productProp,
    slug,
    onClose,
    openDrawerOnAdd = true,
}: QuickViewModalProps) {
    const [fetched, setFetched] = useState<QuickViewProduct | null>(null);
    const [loading, setLoading] = useState(!productProp);

    // Only fetch when no product object was supplied (legacy slug path)
    useEffect(() => {
        if (productProp) return;
        if (!slug) return;
        setLoading(true);
        supabase
            .from("products")
            .select("id, name, slug, price_ghs, compare_at_price_ghs, is_sale, discount_value, image_urls, available_colors, available_stitching, available_sizes, inventory_count, track_inventory, track_variant_inventory")
            .eq("slug", slug)
            .single()
            .then(({ data }: { data: any }) => {
                setFetched(data);
                setLoading(false);
            });
    }, [productProp, slug]);

    const product = productProp ?? fetched;

    if (!slug && !productProp) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-neutral-100 rounded-full transition-colors text-black"
                >
                    <span className="sr-only">Close</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {loading || !product ? (
                    <div className="w-full flex items-center justify-center p-24">
                        <p className="text-xs uppercase tracking-widest text-neutral-400">Loading...</p>
                    </div>
                ) : (
                    <>
                        {/* Image side */}
                        <div className="w-full md:w-1/2 relative bg-neutral-50 h-64 md:h-auto">
                            {product.image_urls?.[0] ? (
                                isVideoUrl(product.image_urls[0]) ? (
                                    <video
                                        src={product.image_urls[0]}
                                        poster={product.image_urls.find(u => !isVideoUrl(u))}
                                        preload="metadata"
                                        muted
                                        playsInline
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                ) : (
                                    <Image
                                        src={product.image_urls[0]}
                                        alt={product.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        className="object-cover"
                                    />
                                )
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs uppercase tracking-widest">
                                    No image
                                </div>
                            )}
                        </div>

                        {/* Details side */}
                        <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
                            {(() => {
                                const hasSaleFromCompare = !!(product.compare_at_price_ghs && product.compare_at_price_ghs > product.price_ghs);
                                const hasSaleFromDiscount = !!(product.is_sale && (product.discount_value ?? 0) > 0);
                                const effectivePrice = hasSaleFromDiscount && !hasSaleFromCompare
                                    ? product.price_ghs * (1 - (product.discount_value ?? 0) / 100)
                                    : product.price_ghs;
                                const originalPrice = hasSaleFromCompare ? product.compare_at_price_ghs! : hasSaleFromDiscount ? product.price_ghs : null;
                                return (
                                    <>
                                        <h2 className="font-serif text-3xl tracking-widest uppercase mb-2">{product.name}</h2>
                                        <div className="flex items-center gap-3 mb-8">
                                            {originalPrice && (
                                                <span className="text-sm tracking-wider line-through text-neutral-400">
                                                    GH₵{originalPrice.toFixed(2)}
                                                </span>
                                            )}
                                            <span className="text-sm tracking-wider text-neutral-500">
                                                GH₵{effectivePrice.toFixed(2)}
                                            </span>
                                        </div>
                                        <ProductCheckoutForm
                                            productId={product.id}
                                            productName={product.name}
                                            productSlug={product.slug}
                                            productImageUrl={product.image_urls?.[0] || ""}
                                            priceNum={effectivePrice}
                                            price={`GH₵${effectivePrice.toFixed(2)}`}
                                            colors={product.available_colors || ["Noir", "Cognac", "Sand"]}
                                            // stitching={product.available_stitching || ["Tonal", "Contrast White"]}
                                            availableSizes={product.available_sizes || null}
                                            inventoryCount={product.inventory_count ?? 0}
                                            trackInventory={product.track_inventory ?? true}
                                            trackVariantInventory={product.track_variant_inventory ?? false}
                                            onAddedToCart={onClose}
                                            openDrawerOnAdd={openDrawerOnAdd}
                                        />
                                    </>
                                );
                            })()}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
