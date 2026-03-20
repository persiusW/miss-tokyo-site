"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
    images: string[];
    name: string;
}

export function ProductImageCarousel({ images, name }: Props) {
    const [current, setCurrent] = useState(0);
    const count = images.length;

    if (count === 0) {
        return (
            <div className="relative aspect-[4/5] w-full bg-neutral-100 flex items-center justify-center">
                <span className="text-xs uppercase tracking-widest text-neutral-400">No Image</span>
            </div>
        );
    }

    const prev = () => setCurrent(p => (p - 1 + count) % count);
    const next = () => setCurrent(p => (p + 1) % count);

    return (
        <div className="flex flex-col gap-3">
            {/* Main image */}
            <div className="relative aspect-[4/5] w-full bg-neutral-100 overflow-hidden group">
                <Image
                    src={images[current]}
                    alt={`${name} — view ${current + 1}`}
                    fill
                    className="object-cover object-center transition-opacity duration-300"
                    priority={current === 0}
                />

                {count > 1 && (
                    <>
                        <button
                            onClick={prev}
                            aria-label="Previous image"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity hover:bg-white"
                        >
                            <ChevronLeft size={16} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={next}
                            aria-label="Next image"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity hover:bg-white"
                        >
                            <ChevronRight size={16} strokeWidth={1.5} />
                        </button>
                    </>
                )}
            </div>

            {/* Thin segmented progress bar */}
            {count > 1 && (
                <div className="flex gap-1" role="tablist" aria-label="Image navigation">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            role="tab"
                            aria-selected={i === current}
                            aria-label={`View image ${i + 1}`}
                            onClick={() => setCurrent(i)}
                            className="flex-1 h-[2px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black"
                            style={{ backgroundColor: i === current ? "#171717" : "#e5e5e5" }}
                        />
                    ))}
                </div>
            )}

            {/* Thumbnail strip for desktop when 4+ images */}
            {count >= 4 && (
                <div className="hidden md:grid grid-cols-4 gap-2 mt-1">
                    {images.slice(0, 4).map((url, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={`relative aspect-square bg-neutral-100 overflow-hidden border transition-colors ${i === current ? "border-black" : "border-transparent hover:border-neutral-300"}`}
                            aria-label={`Go to image ${i + 1}`}
                        >
                            <Image
                                src={url}
                                alt={`${name} thumbnail ${i + 1}`}
                                fill
                                className="object-cover object-center"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
