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
            <div className="relative aspect-[4/5] w-full bg-white overflow-hidden mb-4">
                <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className="object-contain object-center group-hover:scale-[1.03] transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                />
            </div>
            <div className="flex flex-col items-start text-left">
                {category && (
                    <span className="text-[10px] text-neutral-400 tracking-widest uppercase mb-1">
                        {category}
                    </span>
                )}
                <h3 className="font-serif text-sm md:text-base tracking-wide text-neutral-900 mb-[2px]">{name}</h3>
                <p className="text-xs tracking-wider text-neutral-500">{price}</p>
            </div>
        </Link>
    );
}
