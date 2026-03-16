"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

const STORAGE_KEY = "mt_recently_viewed";
const MAX_STORED = 8;
const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E";

interface RVProduct {
    slug: string;
    name: string;
    price_ghs: number;
    image_urls: string[] | null;
}

export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
    const [products, setProducts] = useState<RVProduct[]>([]);

    useEffect(() => {
        // Persist current product
        const stored: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const updated = [currentSlug, ...stored.filter(s => s !== currentSlug)].slice(0, MAX_STORED);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Fetch display data for the others
        const others = updated.filter(s => s !== currentSlug).slice(0, 4);
        if (others.length === 0) return;

        supabase
            .from("products")
            .select("slug, name, price_ghs, image_urls")
            .in("slug", others)
            .eq("is_active", true)
            .then(({ data }) => {
                if (!data || data.length === 0) return;
                // Preserve recently-viewed order
                const sorted = others
                    .map(s => data.find((p: RVProduct) => p.slug === s))
                    .filter((p): p is RVProduct => Boolean(p));
                setProducts(sorted);
            });
    }, [currentSlug]);

    if (products.length === 0) return null;

    return (
        <section className="border-t border-neutral-100 pt-16 mt-16">
            <h2 className="text-sm font-serif uppercase tracking-[0.3em] text-black mb-8">
                Recently Viewed
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {products.map((p) => (
                    <Link key={p.slug} href={`/products/${p.slug}`} className="group block">
                        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 mb-3">
                            <Image
                                src={p.image_urls?.[0] || FALLBACK}
                                alt={p.name}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            />
                        </div>
                        <p className="text-[11px] uppercase tracking-wide text-black font-medium truncate">{p.name}</p>
                        <p className="text-[11px] text-neutral-400 mt-1">GH₵ {Number(p.price_ghs).toFixed(2)}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
