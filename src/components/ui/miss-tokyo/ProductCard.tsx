"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3C/svg%3E";

function isVideoUrl(url: string): boolean {
    const lower = url.toLowerCase().split("?")[0];
    return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov");
}

interface ProductCardProps {
    slug: string;
    name: string;
    price: string;
    imageUrl: string;
    hoverImageUrl?: string;
    category?: string;
    ribbon?: string | null;
    isOnSale?: boolean;
    salePrice?: string | null;
    imageStretch?: boolean;
    onQuickAdd?: (e: React.MouseEvent) => void;
}

export function ProductCard({ slug, name, price, imageUrl, hoverImageUrl, category, ribbon, isOnSale, salePrice, imageStretch = false, onQuickAdd }: ProductCardProps) {
    const [imgSrc, setImgSrc] = useState(imageUrl || FALLBACK);
    const [hoverSrc, setHoverSrc] = useState(hoverImageUrl);

    return (
        <div className="group block w-full relative">
            <Link href={`/products/${slug}`} className="block">
                <div className="relative aspect-[4/5] w-full bg-neutral-100 overflow-hidden mb-4 rounded-none">
                    {isVideoUrl(imgSrc) ? (
                        <video
                            src={imgSrc}
                            preload="metadata"
                            muted
                            playsInline
                            className={`absolute inset-0 w-full h-full ${imageStretch ? "object-fill" : "object-cover object-center"} transition-all duration-1000 ease-[cubic-bezier(0.2,1,0.3,1)] ${hoverSrc ? "group-hover:opacity-0" : "group-hover:scale-[1.05]"}`}
                        />
                    ) : (
                        <Image
                            src={imgSrc}
                            alt={name}
                            fill
                            quality={85}
                            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            onError={() => setImgSrc(FALLBACK)}
                            className={`${imageStretch ? "object-fill" : "object-cover object-center"} transition-all duration-1000 ease-[cubic-bezier(0.2,1,0.3,1)] ${hoverSrc ? "group-hover:opacity-0" : "group-hover:scale-[1.05]"}`}
                        />
                    )}
                    {hoverSrc && !isVideoUrl(hoverSrc) && (
                        <Image
                            src={hoverSrc}
                            alt={`${name} alternate view`}
                            fill
                            quality={85}
                            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                            onError={() => setHoverSrc(undefined)}
                            className={`${imageStretch ? "object-fill" : "object-cover object-center"} absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:scale-[1.05] transition-all duration-1000 ease-[cubic-bezier(0.2,1,0.3,1)]`}
                        />
                    )}

                    {/* Badge */}
                    {(ribbon || isOnSale) && (
                        <div className="absolute top-4 left-4 z-10">
                            <span className={`text-[8px] md:text-[9px] px-3 py-1.5 uppercase font-bold tracking-[0.2em] shadow-sm ${isOnSale ? "bg-black text-white" : "bg-white text-black"}`}>
                                {ribbon || "Sale"}
                            </span>
                        </div>
                    )}

                    {/* Hover overlay button */}
                    {onQuickAdd && (
                        <div className="absolute inset-x-0 bottom-8 flex justify-center items-center z-20 px-6">
                            <button
                                onClick={onQuickAdd}
                                className="w-full bg-white text-black text-[10px] tracking-[0.2em] uppercase py-3.5 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-none border border-neutral-100 shadow-xl translate-y-4 group-hover:translate-y-0 flex items-center justify-center gap-2 font-bold"
                            >
                                <Plus size={14} strokeWidth={2.5} /> Add to Cart
                            </button>
                        </div>
                    )}
                </div>
            </Link>

            <Link href={`/products/${slug}`} className="flex flex-col items-start text-left relative group/info mt-4">
                <div className="flex w-full items-baseline justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-[11px] tracking-[0.2em] uppercase text-neutral-900 font-bold mb-1">
                            {name}
                        </h3>
                        {category && (
                            <span className="text-[9px] text-neutral-400 tracking-[0.2em] uppercase block font-medium">
                                {category}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                        {isOnSale && salePrice ? (
                            <>
                                <p className="text-[11px] tracking-widest text-red-500 font-medium">{salePrice}</p>
                                <p className="text-[9px] tracking-widest text-neutral-400 line-through">{price}</p>
                            </>
                        ) : (
                            <p className="text-[11px] tracking-widest text-neutral-500 font-medium">{price}</p>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    );
}
