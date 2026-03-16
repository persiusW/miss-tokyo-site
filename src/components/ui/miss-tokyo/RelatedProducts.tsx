import Image from "next/image";
import Link from "next/link";

interface RelatedProduct {
    slug: string;
    name: string;
    price_ghs: number;
    image_urls: string[] | null;
    is_sale?: boolean;
    discount_value?: number;
}

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E";

export function RelatedProducts({ products }: { products: RelatedProduct[] }) {
    if (!products || products.length === 0) return null;

    return (
        <section className="border-t border-neutral-100 pt-16 mt-16">
            <h2 className="text-sm font-serif uppercase tracking-[0.3em] text-black mb-8">
                You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {products.map((p) => {
                    const isOnSale = p.is_sale && (p.discount_value ?? 0) > 0;
                    const displayPrice = isOnSale
                        ? `GH₵ ${(p.price_ghs * (1 - (p.discount_value ?? 0) / 100)).toFixed(2)}`
                        : `GH₵ ${Number(p.price_ghs).toFixed(2)}`;

                    return (
                        <Link key={p.slug} href={`/products/${p.slug}`} className="group block">
                            <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 mb-3">
                                <Image
                                    src={p.image_urls?.[0] || FALLBACK}
                                    alt={p.name}
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                />
                                {p.image_urls?.[1] && (
                                    <Image
                                        src={p.image_urls[1]}
                                        alt={`${p.name} alternate`}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                        className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    />
                                )}
                            </div>
                            <p className="text-[11px] uppercase tracking-wide text-black font-medium truncate">{p.name}</p>
                            <p className={`text-[11px] mt-1 ${isOnSale ? "text-red-500" : "text-neutral-400"}`}>{displayPrice}</p>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
