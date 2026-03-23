"use client";

import Image from "next/image";
import Link from "next/link";

interface EditorialProductCardProps {
    slug: string;
    name: string;
    price: string;
    imageUrl: string;
    onQuickAdd?: (slug: string) => void;
}

export function EditorialProductCard({ slug, name, price, imageUrl, onQuickAdd }: EditorialProductCardProps) {
    return (
        <div className="group w-full">
            <Link href={`/products/${slug}`} className="block">
                <div className="relative aspect-[3/4] w-full overflow-hidden border border-gray-100 rounded-none bg-neutral-50">
                    <Image
                        src={imageUrl}
                        alt={name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />

                    {/* NEW IN badge */}
                    <div className="absolute top-4 left-4 z-10">
                        <span className="bg-white text-black border border-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                            New In
                        </span>
                    </div>
                </div>
            </Link>

            {/* Static info below image */}
            <div className="bg-white pt-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium uppercase tracking-wide text-black truncate flex-1">
                        {name}
                    </h3>
                    <p className="text-sm text-gray-500 shrink-0">{price}</p>
                </div>

                {onQuickAdd && (
                    <button
                        onClick={() => onQuickAdd(slug)}
                        className="w-full mt-4 bg-black text-white py-3 text-xs uppercase tracking-[0.2em] font-bold hover:bg-neutral-800 transition-colors rounded-none"
                    >
                        Add to Cart
                    </button>
                )}
            </div>
        </div>
    );
}
