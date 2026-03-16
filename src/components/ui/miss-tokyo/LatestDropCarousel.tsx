"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { QuickViewModal } from "@/components/ui/badu/QuickViewModal";

export interface DropProduct {
    slug: string;
    name: string;
    price_ghs: number;
    image_urls: string[] | null;
    is_sale: boolean;
    discount_value: number;
}

export interface CarouselTab {
    key: string;
    label: string;
    products: DropProduct[];
}

interface LatestDropCarouselProps {
    tabs: CarouselTab[];
}

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3C/svg%3E";

function CardImage({ src, alt }: { src: string; alt: string }) {
    const [imgSrc, setImgSrc] = useState(src || FALLBACK);
    return (
        <Image
            src={imgSrc}
            alt={alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover object-center"
            onError={() => setImgSrc(FALLBACK)}
        />
    );
}

export function LatestDropCarousel({ tabs }: LatestDropCarouselProps) {
    const [activeTabKey, setActiveTabKey] = useState(tabs[0]?.key ?? "");
    const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeTab = tabs.find(t => t.key === activeTabKey) ?? tabs[0];
    const products = activeTab?.products ?? [];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        }
    }, [activeTabKey]);

    const scroll = (dir: 1 | -1) => {
        if (!scrollRef.current) return;
        const firstCard = scrollRef.current.querySelector("[data-card]") as HTMLElement | null;
        const cardWidth = firstCard ? firstCard.offsetWidth + 24 : 260;
        scrollRef.current.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
    };

    if (!tabs.length) return null;

    return (
        <section className="w-full bg-white py-16">
            <div className="max-w-screen-xl mx-auto px-6 lg:px-16">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
                    <div>
                        <h2 className="text-[1.6rem] font-bold text-gray-600 leading-tight mb-2">
                            A Moment For New
                        </h2>
                        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                            Season defining styles that are as versatile as they are timeless.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 shrink-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTabKey(tab.key)}
                                className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all rounded-none ${
                                    activeTabKey === tab.key
                                        ? "bg-[#7b1d1d] text-white border border-[#7b1d1d]"
                                        : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Carousel wrapper — extra horizontal padding so arrows don't overlap cards */}
                <div className="relative px-6">
                    {/* Left arrow */}
                    <button
                        onClick={() => scroll(-1)}
                        aria-label="Previous products"
                        className="absolute left-0 top-[42%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow hidden sm:flex"
                    >
                        <ChevronLeft size={15} className="text-gray-500" />
                    </button>

                    {/* Product row */}
                    <div
                        ref={scrollRef}
                        className="flex gap-5 overflow-x-auto hide-scrollbar"
                        style={{ scrollSnapType: "x mandatory" }}
                    >
                        {products.map((p) => {
                            const isOnSale = p.is_sale && p.discount_value > 0;
                            const salePrice = isOnSale ? p.price_ghs * (1 - p.discount_value / 100) : null;

                            return (
                                <div
                                    key={p.slug}
                                    data-card
                                    className="flex-shrink-0 group"
                                    style={{
                                        width: "calc((100% - 4 * 1.25rem) / 5)",
                                        minWidth: "150px",
                                        scrollSnapAlign: "start",
                                    }}
                                >
                                    <Link href={`/products/${p.slug}`} className="block">
                                        {/* Image */}
                                        <div className="relative overflow-hidden bg-neutral-100"
                                            style={{ aspectRatio: "3/4" }}>
                                            <CardImage
                                                src={p.image_urls?.[0] || FALLBACK}
                                                alt={p.name}
                                            />
                                            {/* Quick Add overlay */}
                                            <div className="absolute inset-x-0 bottom-0 px-3 pb-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setQuickViewSlug(p.slug);
                                                    }}
                                                    className="w-full bg-white text-black text-[10px] uppercase tracking-[0.2em] py-3 font-bold hover:bg-black hover:text-white transition-colors rounded-none border border-white"
                                                >
                                                    Quick Add
                                                </button>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Text details */}
                                    <div className="pt-3 pb-1">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-600 font-medium leading-tight mb-2 line-clamp-2">
                                            {p.name}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {isOnSale && salePrice !== null ? (
                                                <>
                                                    <span className="text-[12px] font-semibold text-red-500">
                                                        GH₵ {salePrice.toFixed(2)}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 line-through">
                                                        GH₵ {Number(p.price_ghs).toFixed(2)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        -{p.discount_value}%
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-[12px] text-gray-500">
                                                    GH₵ {Number(p.price_ghs).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right arrow */}
                    <button
                        onClick={() => scroll(1)}
                        aria-label="Next products"
                        className="absolute right-0 top-[42%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow hidden sm:flex"
                    >
                        <ChevronRight size={15} className="text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Quick View Modal */}
            {quickViewSlug && (
                <QuickViewModal slug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />
            )}
        </section>
    );
}
