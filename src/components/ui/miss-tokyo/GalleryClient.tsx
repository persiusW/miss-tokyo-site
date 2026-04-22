"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, Loader2, Check } from "lucide-react";
import { QuickAddModal } from "@/components/ui/miss-tokyo/QuickAddModal";
import { useCart } from "@/store/useCart";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import type { VideoProduct } from "@/lib/products";
import { getApplicableRule } from "@/lib/autoDiscount";
import type { AutoDiscountRule } from "@/lib/autoDiscount";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GalleryClientProps {
    initialVideos: VideoProduct[];
    initialNextOffset: number;
    initialHasMore: boolean;
}

// ── VideoCard ─────────────────────────────────────────────────────────────────

function VideoCard({
    product,
    index,
    priority,
    onOpenModal,
    onVisible,
    autoDiscountRules,
}: {
    product: VideoProduct;
    index: number;
    priority: boolean;
    onOpenModal: (product: VideoProduct) => void;
    onVisible: (index: number) => void;
    autoDiscountRules: AutoDiscountRule[];
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [addState, setAddState] = useState<"idle" | "loading" | "success">("idle");
    const addItem = useCart(s => s.addItem);

    // Out-of-stock if master inventory is depleted OR all size variants are individually OOS.
    // track_inventory !== false treats null/undefined/true as "tracked" (mirrors ShopPageClient).
    // allSizesOOS catches products using per-variant stock (track_variant_inventory=true) where
    // master inventory_count stays at 9999 but every size_variant has in_stock: false.
    const masterOOS = product.track_inventory !== false && (product.inventory_count ?? 0) <= 0;
    const allSizesOOS = Array.isArray(product.size_variants) &&
        product.size_variants.length > 0 &&
        product.size_variants.every((v: { label: string; in_stock: boolean }) => v.in_stock === false);
    const isOutOfStock = masterOOS || allSizesOOS;

    // Price + ribbon calculations
    const hasSaleFromCompare = !!(product.compare_at_price_ghs && product.compare_at_price_ghs > product.price_ghs);
    const hasSaleFromDiscount = !!(product.is_sale && (product.discount_value ?? 0) > 0);
    const isProductOnSale = hasSaleFromCompare || hasSaleFromDiscount;
    const productSalePrice = hasSaleFromDiscount && !hasSaleFromCompare
        ? product.price_ghs * (1 - (product.discount_value ?? 0) / 100)
        : product.price_ghs;
    const applicableRule = getApplicableRule(product.id, product.category_ids ?? null, autoDiscountRules);
    const adSingle = !isProductOnSale && applicableRule && applicableRule.min_quantity <= 1 ? applicableRule : null;
    const adEffective = adSingle
        ? adSingle.discount_type === "PERCENTAGE"
            ? product.price_ghs * (1 - adSingle.discount_value / 100)
            : Math.max(0, product.price_ghs - adSingle.discount_value)
        : null;
    const displayPrice = isProductOnSale ? productSalePrice : (adEffective ?? product.price_ghs);
    const slashedPrice = hasSaleFromCompare
        ? product.compare_at_price_ghs!
        : hasSaleFromDiscount ? product.price_ghs
        : adEffective != null ? product.price_ghs
        : null;
    const isNew = product.badge === "new" || (Date.now() - new Date(product.created_at).getTime() < 14 * 86400000);
    const ribbonLabel = isProductOnSale ? "Sale" : (applicableRule?.title ?? (isNew ? "New" : null));
    const ribbonBg = (isProductOnSale || applicableRule) ? "#E8485A" : "#141210";

    // Use the shared hook for viewport detection — threshold 0.8 matches the old inline observer
    const [containerRef, isVisible] = useIntersectionObserver<HTMLDivElement>({ threshold: 0.8 });


    // Play/pause based on intersection, notify parent of active index
    useEffect(() => {
        if (isVisible) {
            onVisible(index);
            videoRef.current?.play().catch(() => {});
        } else {
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isVisible, index, onVisible]);

    // Cleanup timer on unmount
    useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

    const handleQuickAdd = () => {
        if (isOutOfStock) return;
        if ((product.available_sizes?.length || 0) > 0 || (product.available_colors?.length || 0) > 0) {
            onOpenModal(product);
            return;
        }

        addItem({
            id: `${product.id}-default`,
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price_ghs,
            size: "One size",
            quantity: 1,
            imageUrl: product.image_urls?.[0] || "",
            inventoryCount: product.inventory_count,
        }, false);

        setAddState("success");
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setAddState("idle"), 2000);
    };

    return (
        // content-visibility:auto lets the browser skip rendering offscreen cards.
        // contain-intrinsic-block-size tells it each card is 100dvh tall so snap
        // scroll positions remain correct even for unpainted items.
        <div
            ref={containerRef}
            className="relative h-full w-full snap-start overflow-hidden bg-neutral-950 flex flex-col lg:flex-row [content-visibility:auto] [contain-intrinsic-block-size:100dvh]"
        >
            {/* Media Column */}
            <div className="relative w-full h-full lg:w-[60%] bg-neutral-900 group">
                {!isLoaded && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm">
                        <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
                    </div>
                )}
                <video
                    ref={videoRef}
                    src={product.video_url}
                    // poster shows the first product image while the video is loading/paused
                    poster={product.image_urls?.[0]}
                    muted
                    loop
                    playsInline
                    // Priority cards preload eagerly; all others wait until they enter
                    // the viewport so mobile devices don't waste bandwidth on off-screen videos
                    preload={priority ? "auto" : "none"}
                    onCanPlayThrough={() => setIsLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-700 ${
                        isLoaded ? "opacity-100" : "opacity-0"
                    }`}
                />

                {/* Mobile Overlay */}
                <div className="lg:hidden absolute bottom-0 left-0 w-full p-6 pb-28 md:pb-12 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white">
                    <div className="flex flex-col gap-2 mb-6 text-left">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase tracking-[0.2em] text-white/60 font-medium">
                                {product.category_name || "New Arrival"}
                            </span>
                            {ribbonLabel && (
                                <span className="text-[8px] font-bold uppercase tracking-[0.12em] px-2 py-0.5"
                                    style={{ background: ribbonBg, color: "#fff", borderRadius: 2 }}>
                                    {ribbonLabel}
                                </span>
                            )}
                        </div>
                        <h2 className="font-serif text-2xl tracking-widest uppercase leading-tight">
                            {product.name}
                        </h2>
                        <div className="flex items-baseline gap-2">
                            {slashedPrice != null && (
                                <span className="text-sm font-light tracking-widest line-through" style={{ color: "#E8485A", opacity: 0.9 }}>
                                    GH₵{slashedPrice.toFixed(2)}
                                </span>
                            )}
                            <p className="text-sm font-light tracking-widest opacity-90">
                                GH₵{displayPrice.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleQuickAdd}
                            disabled={addState !== "idle" || isOutOfStock}
                            className={`flex-1 text-[10px] font-bold uppercase tracking-[0.2em] py-4 rounded-none transition-all duration-300 flex items-center justify-center gap-2 ${
                                addState === "success"
                                    ? "bg-emerald-600 text-white scale-[1.05]"
                                    : isOutOfStock
                                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                        : "bg-white text-black hover:bg-neutral-100 disabled:opacity-80"
                            }`}
                        >
                            {addState === "loading" ? <Loader2 size={14} className="animate-spin" /> : addState === "success" ? <Check size={14} /> : isOutOfStock ? null : <Plus size={14} />}
                            {addState === "loading" ? "Adding..." : addState === "success" ? "Added!" : isOutOfStock ? "OUT OF STOCK" : "Add to Cart"}
                        </button>
                        <Link
                            href={`/products/${product.slug}`}
                            className="w-14 h-14 border border-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white hover:text-black transition-all"
                        >
                            <span className="text-[10px] font-black uppercase tracking-tighter">View</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Desktop Detail Column */}
            <div className="hidden lg:flex w-[40%] h-full bg-white flex-col justify-center p-16 xl:p-24 relative">
                <div className="max-w-md text-left">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-bold">
                            {product.category_name || "MISS TOKYO EXCLUSIVE"}
                        </span>
                        {ribbonLabel && (
                            <span className="text-[8px] font-bold uppercase tracking-[0.12em] px-2 py-0.5"
                                style={{ background: ribbonBg, color: "#fff", borderRadius: 2 }}>
                                {ribbonLabel}
                            </span>
                        )}
                    </div>
                    <h2 className="font-serif text-5xl xl:text-6xl tracking-widest uppercase leading-[1.1] mb-8 text-neutral-900">
                        {product.name}
                    </h2>

                    <div className="h-[1px] w-20 bg-neutral-200 mb-8" />

                    <p className="text-sm text-neutral-500 font-light tracking-widest leading-relaxed mb-10 line-clamp-4">
                        {product.description ||
                            "Indulge in the latest couture-inspired silhouette from Miss Tokyo. A perfect blend of contemporary elegance and timeless craftsmanship."}
                    </p>

                    <div className="flex items-baseline gap-3 mb-12">
                        {slashedPrice != null && (
                            <span className="text-lg font-serif tracking-widest line-through" style={{ color: "#E8485A" }}>
                                GH₵{slashedPrice.toFixed(2)}
                            </span>
                        )}
                        <p className="text-2xl font-serif tracking-widest text-neutral-900">
                            GH₵{displayPrice.toFixed(2)}
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleQuickAdd}
                            disabled={addState !== "idle" || isOutOfStock}
                            className={`w-full text-[11px] font-bold uppercase tracking-[0.3em] py-5 rounded-none transition-all duration-300 flex items-center justify-center gap-3 border shadow-sm ${
                                addState === "success"
                                    ? "bg-emerald-600 text-white border-emerald-600 scale-105"
                                    : isOutOfStock
                                        ? "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed"
                                        : "bg-black text-white border-black hover:bg-neutral-800 disabled:opacity-80"
                            }`}
                        >
                            {addState === "loading" ? <Loader2 size={16} className="animate-spin" /> : addState === "success" ? <Check size={16} /> : isOutOfStock ? null : <Plus size={16} />}
                            {addState === "loading" ? "Syncing..." : addState === "success" ? "Included in Bag" : isOutOfStock ? "OUT OF STOCK" : "Buy this Piece"}
                        </button>

                        <Link
                            href={`/products/${product.slug}`}
                            className="w-full text-[11px] font-bold uppercase tracking-[0.3em] py-5 text-neutral-400 text-center hover:text-black transition-colors"
                        >
                            View Full Product Detail →
                        </Link>
                    </div>
                </div>

                <div className="absolute bottom-12 left-16 xl:left-24 text-[9px] uppercase tracking-[0.2em] text-neutral-300 font-medium whitespace-nowrap overflow-hidden">
                    Scroll to Explore • Snap Mandatory
                </div>
            </div>
        </div>
    );
}

// ── GalleryClient ─────────────────────────────────────────────────────────────

export function GalleryClient({
    initialVideos,
    initialNextOffset,
    initialHasMore,
}: GalleryClientProps) {
    const [videos, setVideos] = useState<VideoProduct[]>(initialVideos);
    const [nextOffset, setNextOffset] = useState(initialNextOffset);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [loadingMore, setLoadingMore] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedProduct, setSelectedProduct] = useState<VideoProduct | null>(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [autoDiscountRules, setAutoDiscountRules] = useState<AutoDiscountRule[]>([]);
    const totalItems = useCart(s => s.totalItems());

    useEffect(() => { setHasMounted(true); }, []);

    useEffect(() => {
        fetch("/api/checkout/auto-discount")
            .then(r => r.ok ? r.json() : { rules: [] })
            .then(data => { if (Array.isArray(data.rules)) setAutoDiscountRules(data.rules); })
            .catch(() => {});
    }, []);

    // Stable callback so VideoCard's useEffect doesn't re-run on every render
    const handleVisible = useCallback((index: number) => {
        setActiveIndex(index);
    }, []);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const res = await fetch(`/api/videos?offset=${nextOffset}`);
            if (!res.ok) throw new Error("Failed to load videos");
            const data: { videos: VideoProduct[]; nextOffset: number; hasMore: boolean } =
                await res.json();
            setVideos(prev => [...prev, ...data.videos]);
            setNextOffset(data.nextOffset);
            setHasMore(data.hasMore);
        } catch {
            // Silent — user can keep scrolling, we'll try again next time
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, nextOffset]);

    // Snap-scroll aware preload: when the user is 2 cards from the end, fetch the
    // next batch so it's ready before they hit the final card.
    useEffect(() => {
        if (!hasMore || loadingMore) return;
        if (activeIndex >= videos.length - 2) {
            loadMore();
        }
    }, [activeIndex, videos.length, hasMore, loadingMore, loadMore]);

    if (videos.length === 0) {
        return (
            <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black p-8 text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-6 font-light">
                    The video archive is currently empty.
                </p>
                <Link
                    href="/shop"
                    className="text-white text-[10px] uppercase tracking-[0.4em] font-bold border-b border-white pb-1 hover:text-white/70 transition-colors"
                >
                    Return to Shop
                </Link>
            </div>
        );
    }

    return (
        <div className="relative bg-black h-[100dvh] overflow-hidden overscroll-none translate-z-0">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full z-30 p-6 flex items-center justify-between pointer-events-none">
                <Link
                    href="/shop"
                    className="text-white p-2 pointer-events-auto bg-black/20 backdrop-blur-lg rounded-full border border-white/10 hover:bg-white hover:text-black transition-all"
                >
                    <ChevronLeft size={20} />
                </Link>

                <div className="flex items-center gap-4 pointer-events-auto">
                    <Link
                        href="/shop"
                        className="text-white bg-black/20 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 hover:bg-white hover:text-black transition-all"
                    >
                        <span className="text-[10px] font-bold tracking-widest uppercase">Cart</span>
                        {hasMounted && (
                            <span
                                className="w-5 h-5 bg-white text-black text-[9px] font-black rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300"
                                key={totalItems}
                            >
                                {totalItems}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            {/* Snapping Container */}
            <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth hide-scrollbar">
                {videos.map((product, index) => (
                    <div key={product.id} className="h-[100dvh] w-full">
                        <VideoCard
                            product={product}
                            index={index}
                            priority={index < 2}
                            onOpenModal={setSelectedProduct}
                            onVisible={handleVisible}
                            autoDiscountRules={autoDiscountRules}
                        />
                    </div>
                ))}

                {/* Loading indicator — visible only while fetching */}
                {loadingMore && (
                    <div className="h-16 w-full snap-start flex items-center justify-center bg-black">
                        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                    </div>
                )}
            </div>

            {/* Quick Add Modal */}
            {selectedProduct && (
                <QuickAddModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    autoDiscountRule={getApplicableRule(selectedProduct.id, selectedProduct.category_ids ?? null, autoDiscountRules)}
                />
            )}
        </div>
    );
}
