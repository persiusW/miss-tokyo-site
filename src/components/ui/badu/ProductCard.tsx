"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";

interface ProductCardProps {
    slug: string;
    name: string;
    price: string;
    imageUrl: string;
    hoverImageUrl?: string;
    category?: string;
    onQuickAdd?: (e: React.MouseEvent) => void;
}

export function ProductCard({ slug, name, price, imageUrl, hoverImageUrl, category, onQuickAdd }: ProductCardProps) {
    return (
        <div className="group block w-full relative">
            <Link href={`/shop/${slug}`} className="block">
                <div className="relative aspect-[4/5] w-full bg-neutral-100 overflow-hidden mb-4 rounded-none">
                    <Image
                        src={imageUrl}
                        alt={name}
                        fill
                        className={`object-cover object-center transition-all duration-1000 ease-[cubic-bezier(0.2,1,0.3,1)] ${hoverImageUrl ? "group-hover:opacity-0" : "group-hover:scale-[1.05]"}`}
                    />
                    {hoverImageUrl && (
                        <Image
                            src={hoverImageUrl}
                            alt={`${name} alternate view`}
                            fill
                            className="object-cover object-center absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:scale-[1.05] transition-all duration-1000 ease-[cubic-bezier(0.2,1,0.3,1)]"
                        />
                    )}

                    {/* Badge */}
                    <div className="absolute top-4 left-4 z-10">
                        <span className="bg-white text-black text-[8px] md:text-[9px] px-3 py-1.5 uppercase font-bold tracking-[0.2em] shadow-sm">
                            New Arrivals
                        </span>
                    </div>

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

            <Link href={`/shop/${slug}`} className="flex flex-col items-start text-left relative group/info mt-4">
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
                    <p className="text-[11px] tracking-widest text-neutral-500 shrink-0 font-medium">
                        {price}
                    </p>
                </div>
            </Link>
        </div>
    );
}
