import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
    slug: string;
    name: string;
    price: string;
    imageUrl: string;
    category?: string;
}

export function ProductCard({ slug, name, price, imageUrl, category }: ProductCardProps) {
    return (
        <Link href={`/products/${slug}`} className="group block w-full">
            <div className="relative aspect-[4/5] w-full bg-creme overflow-hidden mb-6">
                <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
            </div>
            <div className="flex flex-col items-center text-center">
                {category && (
                    <span className="text-xs text-neutral-400 tracking-widest uppercase mb-2">
                        {category}
                    </span>
                )}
                <h3 className="font-serif text-lg tracking-wide mb-1">{name}</h3>
                <p className="text-sm text-neutral-500">{price}</p>
            </div>
        </Link>
    );
}
