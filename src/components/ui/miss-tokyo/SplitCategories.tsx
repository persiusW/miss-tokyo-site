"use client";

import Image from "next/image";
import Link from "next/link";

interface Category {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
}

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23222'/%3E%3C/svg%3E";

export function SplitCategories({ categories }: { categories: Category[] }) {
    if (!categories || categories.length === 0) return null;

    // Use up to 2 categories for the split layout
    const [left, right] = categories;

    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-2">
            {[left, right].filter(Boolean).map((cat) => (
                <Link
                    key={cat.id}
                    href={`/shop?category=${cat.slug}`}
                    className="relative h-[70vh] w-full group overflow-hidden cursor-pointer block"
                >
                    <Image
                        src={cat.image_url || FALLBACK}
                        alt={cat.name}
                        fill
                        className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    {/* Subtle dark overlay on hover */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors duration-500" />

                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <span className="text-3xl text-white uppercase tracking-widest font-serif drop-shadow-md text-center px-4">
                            {cat.name}
                        </span>
                    </div>
                </Link>
            ))}
        </div>
    );
}
