"use client";

import Image from "next/image";
import Link from "next/link";

interface CarouselProduct {
    slug: string;
    name: string;
    price: string;
    imageUrl: string;
}

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E";

export function NewArrivalsCarousel({ products }: { products: CarouselProduct[] }) {
    if (!products || products.length === 0) return null;

    return (
        <section className="w-full max-w-[100vw] py-24 bg-white overflow-hidden">
            <h2 className="text-center text-2xl font-serif uppercase tracking-widest mb-12 text-black">
                The Latest Drop
            </h2>

            <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 px-4 md:px-12 hide-scrollbar pb-4">
                {products.map((product) => (
                    <Link
                        key={product.slug}
                        href={`/products/${product.slug}`}
                        className="min-w-[85vw] md:min-w-[400px] snap-center flex-shrink-0 group block"
                    >
                        <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                            <Image
                                src={product.imageUrl || FALLBACK}
                                alt={product.name}
                                fill
                                sizes="(max-width: 768px) 85vw, 400px"
                                className="object-cover w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                            />
                        </div>
                        <div className="mt-6 text-center px-2">
                            <p className="text-sm uppercase tracking-wide text-black font-medium truncate">
                                {product.name}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">{product.price}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
