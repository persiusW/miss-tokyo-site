import Image from "next/image";
import Link from "next/link";

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
        <Link href={`/products/${slug}`} className="group block w-full">
            <div className="relative aspect-[4/5] w-full bg-neutral-50 overflow-hidden mb-4 rounded-none">
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
            </div>
            <div className="flex flex-col items-start text-left relative group/info mt-4">
                <div className="flex w-full items-baseline justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-sm tracking-[0.1em] uppercase text-neutral-900 font-medium mb-1">
                            {name}
                        </h3>
                        {category && (
                            <span className="text-[10px] text-neutral-400 tracking-[0.2em] uppercase block">
                                {category}
                            </span>
                        )}
                    </div>
                    <p className="text-sm tracking-widest text-neutral-500 shrink-0">
                        {price}
                    </p>
                </div>
            </div>
        </Link>
    );
}
