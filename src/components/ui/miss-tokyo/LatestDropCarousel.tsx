"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { QuickViewModal } from "@/components/ui/badu/QuickViewModal";

interface DropProduct {
    slug: string;
    name: string;
    price_ghs: number;
    image_urls: string[] | null;
    is_sale: boolean;
    discount_value: number;
}

interface TabConfig {
    key: string;
    label: string;
    mode: "newest" | "sort_order";
    category_name: string;
}

const DEFAULT_TABS: TabConfig[] = [
    { key: "tab-0", label: "New In",      mode: "newest",      category_name: "" },
    { key: "tab-1", label: "Bestsellers", mode: "sort_order",  category_name: "" },
];

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3C/svg%3E";
const PRODUCT_SELECT = "slug, name, price_ghs, image_urls, is_sale, discount_value";

function CardImage({ src, alt }: { src: string; alt: string }) {
    const [imgSrc, setImgSrc] = useState(src || FALLBACK);
    useEffect(() => { setImgSrc(src || FALLBACK); }, [src]);
    return (
        <Image
            src={imgSrc}
            alt={alt}
            fill
            sizes="(max-width: 640px) 85vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover object-top"
            onError={() => setImgSrc(FALLBACK)}
        />
    );
}

export function LatestDropCarousel() {
    const [tabs, setTabs]               = useState<TabConfig[]>(DEFAULT_TABS);
    const [activeTabKey, setActiveTabKey] = useState<string>("tab-0");
    const [products, setProducts]       = useState<DropProduct[]>([]);
    const [loading, setLoading]         = useState(true);
    const [configLoaded, setConfigLoaded] = useState(false);
    const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // ── 1. Load tab configuration from store settings (site_copy) ──────────
    useEffect(() => {
        supabase
            .from("site_copy")
            .select("value")
            .eq("copy_key", "carousel_config")
            .single()
            .then(({ data }) => {
                if (data?.value) {
                    try {
                        const parsed = JSON.parse(data.value);
                        if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
                            const mapped: TabConfig[] = parsed.tabs.map((t: any, i: number) => ({
                                key: `tab-${i}`,
                                label: t.label || `Tab ${i + 1}`,
                                mode: (t.mode === "sort_order" ? "sort_order" : "newest") as "newest" | "sort_order",
                                category_name: t.category_name || "",
                            }));
                            setTabs(mapped);
                            setActiveTabKey(mapped[0].key);
                        }
                    } catch { /* keep defaults */ }
                }
                setConfigLoaded(true);
            });
    }, []);

    // ── 2. Fetch products whenever the active tab changes ──────────────────
    const activeTab = tabs.find(t => t.key === activeTabKey) ?? tabs[0];

    useEffect(() => {
        if (!configLoaded || !activeTab) return;

        let cancelled = false;
        setLoading(true);

        (async () => {
            let query = supabase
                .from("products")
                .select(PRODUCT_SELECT)
                .eq("is_active", true);

            // Category filter — only add if a specific category is configured
            if (activeTab.category_name) {
                query = query.eq("category_type", activeTab.category_name);
            }

            // Sort order
            if (activeTab.mode === "newest") {
                query = query.order("created_at", { ascending: false });
            } else {
                // Admin-curated sort (Bestsellers / sort_order column)
                query = query
                    .order("sort_order", { ascending: true })
                    .order("created_at", { ascending: false });
            }

            const { data } = await query.limit(20);

            if (!cancelled) {
                setProducts(
                    (data || []).map((p: any) => ({
                        slug: p.slug,
                        name: p.name,
                        price_ghs: p.price_ghs,
                        image_urls: p.image_urls || null,
                        is_sale: p.is_sale === true,
                        discount_value: p.discount_value ?? 0,
                    }))
                );
                setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [configLoaded, activeTabKey, activeTab?.mode, activeTab?.category_name]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Arrow scroll ───────────────────────────────────────────────────────
    const scroll = (dir: 1 | -1) => {
        if (!scrollRef.current) return;
        const firstCard = scrollRef.current.querySelector("[data-card]") as HTMLElement | null;
        // gap-6 = 24px
        const cardWidth = firstCard ? firstCard.offsetWidth + 24 : 320;
        scrollRef.current.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
    };

    // ── Skeleton cards ─────────────────────────────────────────────────────
    const SkeletonRow = () => (
        <div className="flex gap-6 overflow-x-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="min-w-[95vw] md:min-w-[calc(38.4%-1rem)] lg:min-w-[calc(23%-1rem)] flex-shrink-0 animate-pulse"
                >
                    <div className="aspect-[3/4] w-full bg-neutral-100" />
                    <div className="mt-4 h-3 bg-neutral-100 w-3/4 rounded" />
                    <div className="mt-2 h-3 bg-neutral-100 w-1/3 rounded" />
                </div>
            ))}
        </div>
    );

    return (
        <section className="w-full bg-white py-24">
            <div className="max-w-[1600px] w-full mx-auto px-4 md:px-8">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl md:text-5xl uppercase tracking-widest text-black mb-2 font-bold">
                            A Moment For New
                        </h2>
                        <p className="text-sm text-gray-500 uppercase tracking-widest">
                            Season defining styles that are as versatile as they are timeless.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-3 shrink-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTabKey(tab.key)}
                                className={`px-6 py-2 text-xs uppercase tracking-widest transition-colors ${
                                    activeTabKey === tab.key
                                        ? "bg-black text-white"
                                        : "bg-transparent text-black border border-black hover:bg-neutral-100"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Carousel ── */}
                <div className="relative">
                    {/* Left arrow */}
                    <button
                        onClick={() => scroll(-1)}
                        aria-label="Scroll left"
                        className="absolute left-0 top-[40%] -translate-y-1/2 -translate-x-5 z-10 w-10 h-10 bg-white border border-neutral-200 flex items-center justify-center shadow-sm hover:bg-black hover:text-white hover:border-black transition-all hidden sm:flex"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {loading ? (
                        <SkeletonRow />
                    ) : products.length === 0 ? (
                        <p className="text-xs uppercase tracking-widest text-neutral-400 py-24 text-center">
                            No products found
                        </p>
                    ) : (
                        <div
                            ref={scrollRef}
                            className="flex overflow-x-auto snap-x snap-mandatory gap-6 hide-scrollbar scroll-smooth"
                        >
                            {products.map((p) => {
                                const isOnSale = p.is_sale && p.discount_value > 0;
                                const salePrice = isOnSale
                                    ? p.price_ghs * (1 - p.discount_value / 100)
                                    : null;

                                return (
                                    <div
                                        key={p.slug}
                                        data-card
                                        className="min-w-[95vw] md:min-w-[calc(38.4%-1rem)] lg:min-w-[calc(23%-1rem)] flex-shrink-0 snap-start group"
                                    >
                                        <Link href={`/products/${p.slug}`} className="block">
                                            {/* Portrait image */}
                                            <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                                                <CardImage
                                                    src={p.image_urls?.[0] || FALLBACK}
                                                    alt={p.name}
                                                />
                                                {/* Quick Add on hover */}
                                                <div className="absolute inset-x-0 bottom-0 px-3 pb-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setQuickViewSlug(p.slug);
                                                        }}
                                                        className="w-full bg-white text-black text-[10px] uppercase tracking-[0.2em] py-3 font-bold hover:bg-black hover:text-white transition-colors border border-white"
                                                    >
                                                        Quick Add
                                                    </button>
                                                </div>
                                            </div>
                                        </Link>

                                        <p className="text-[10px] md:text-xs uppercase tracking-wider text-black mt-4 font-bold line-clamp-2">
                                            {p.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {isOnSale && salePrice !== null ? (
                                                <>
                                                    <span className="text-xs text-red-600 font-semibold">
                                                        GH₵ {salePrice.toFixed(2)}
                                                    </span>
                                                    <span className="text-xs text-gray-400 line-through">
                                                        GH₵ {Number(p.price_ghs).toFixed(2)}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-xs text-black">
                                                    GH₵ {Number(p.price_ghs).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Right arrow */}
                    <button
                        onClick={() => scroll(1)}
                        aria-label="Scroll right"
                        className="absolute right-0 top-[40%] -translate-y-1/2 translate-x-5 z-10 w-10 h-10 bg-white border border-neutral-200 flex items-center justify-center shadow-sm hover:bg-black hover:text-white hover:border-black transition-all hidden sm:flex"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {quickViewSlug && (
                <QuickViewModal slug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />
            )}
        </section>
    );
}
