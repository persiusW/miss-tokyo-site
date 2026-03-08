"use client";

import { useState } from "react";
import { AnimatedProductGrid } from "@/components/ui/badu/AnimatedProductGrid";

interface Category {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
}

interface Product {
    slug: string;
    name: string;
    price: string;
    imageUrl: string;
    category: string;
}

interface ShopClientProps {
    products: Product[];
    categories: Category[];
}

export function ShopClient({ products, categories }: ShopClientProps) {
    const [active, setActive] = useState<string | null>(null);

    const filtered = active
        ? products.filter(p => p.category === active)
        : products;

    return (
        <>
            {/* Category filter bar */}
            {categories.length > 0 && (
                <div className="flex items-center gap-3 mb-16 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setActive(null)}
                        className={`flex-shrink-0 px-5 py-2 text-[10px] uppercase tracking-widest font-semibold transition-colors ${
                            active === null
                                ? "bg-black text-white"
                                : "bg-transparent text-neutral-500 hover:text-black border border-neutral-200 hover:border-black"
                        }`}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActive(cat.slug)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-semibold transition-colors ${
                                active === cat.slug
                                    ? "bg-black text-white"
                                    : "bg-transparent text-neutral-500 hover:text-black border border-neutral-200 hover:border-black"
                            }`}
                        >
                            {cat.image_url && (
                                <img
                                    src={cat.image_url}
                                    alt={cat.name}
                                    className="w-4 h-4 object-cover rounded-full"
                                />
                            )}
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Grid */}
            {filtered.length > 0 ? (
                <AnimatedProductGrid products={filtered} />
            ) : (
                <div className="text-center py-24 text-neutral-400 tracking-widest uppercase text-sm">
                    {active
                        ? "No items in this category."
                        : "No items available in the collection at this time."}
                </div>
            )}
        </>
    );
}
