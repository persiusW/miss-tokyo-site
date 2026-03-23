"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Product {
    slug: string;
    name: string;
    price_ghs: number;
    image_urls: string[] | null;
    is_sale: boolean;
    discount_value: number;
}

interface NewArrivalsCarouselProps {
    products: Product[];
}

const FALLBACK =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f0ede8'/%3E%3C/svg%3E";
const PER_PAGE = 4;

export function NewArrivalsCarousel({ products }: NewArrivalsCarouselProps) {
    const [pos, setPos] = useState(0);

    const total = products.length;
    const visible = products.slice(pos, pos + PER_PAGE);
    const end = Math.min(pos + PER_PAGE, total);
    const canPrev = pos > 0;
    const canNext = pos + PER_PAGE < total;

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {visible.map((p) => {
                    const isOnSale = p.is_sale && p.discount_value > 0;
                    const salePrice = isOnSale ? p.price_ghs * (1 - p.discount_value / 100) : null;

                    return (
                        <Link key={p.slug} href={`/products/${p.slug}`} className="group block">
                            <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                                <Image
                                    src={p.image_urls?.[0] || FALLBACK}
                                    alt={p.name}
                                    fill
                                    className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                                <span className="absolute top-2.5 left-2.5 bg-black text-white text-[9px] tracking-[0.15em] uppercase px-2 py-1 font-bold leading-none">
                                    NEW
                                </span>
                            </div>
                            <p className="text-xs uppercase tracking-wide font-bold text-black mt-3 line-clamp-1">
                                {p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                {isOnSale && salePrice !== null ? (
                                    <>
                                        <span className="text-xs text-red-600 font-semibold">
                                            GH₵{salePrice.toFixed(2)}
                                        </span>
                                        <span className="text-xs text-neutral-400 line-through">
                                            GH₵{Number(p.price_ghs).toFixed(2)}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-xs text-black">
                                        GH₵{Number(p.price_ghs).toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {total > PER_PAGE && (
                <div className="flex items-center mt-8 gap-4">
                    <button
                        onClick={() => setPos((p) => Math.max(0, p - PER_PAGE))}
                        disabled={!canPrev}
                        aria-label="Previous"
                        className="w-8 h-8 border border-neutral-300 flex items-center justify-center text-base hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 shrink-0"
                    >
                        ‹
                    </button>

                    <div className="flex-1 h-[1px] bg-neutral-200 relative">
                        <div
                            className="absolute inset-y-0 left-0 bg-black transition-all duration-300"
                            style={{ width: `${(end / total) * 100}%` }}
                        />
                    </div>

                    <button
                        onClick={() => setPos((p) => Math.min(total - PER_PAGE, p + PER_PAGE))}
                        disabled={!canNext}
                        aria-label="Next"
                        className="w-8 h-8 border border-neutral-300 flex items-center justify-center text-base hover:border-black hover:bg-black hover:text-white transition-all disabled:opacity-30 shrink-0"
                    >
                        ›
                    </button>

                    <span className="text-[10px] tracking-widest text-neutral-400 uppercase whitespace-nowrap shrink-0">
                        {pos + 1}–{end} of {total}
                    </span>
                </div>
            )}
        </>
    );
}
