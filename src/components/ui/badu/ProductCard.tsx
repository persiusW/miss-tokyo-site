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
            <div className="relative aspect-[4/5] w-full bg-white overflow-hidden mb-4 rounded-sm">
                <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className={`object-cover object-center transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${hoverImageUrl ? "group-hover:opacity-0" : "group-hover:scale-[1.03]"}`}
                />
                {hoverImageUrl && (
                    <Image
                        src={hoverImageUrl}
                        alt={`${name} alternate view`}
                        fill
                        className="object-cover object-center absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    />
                )}
            </div>
            <div className="flex flex-col items-start text-left relative group/info mt-2">
                <div className="flex w-full items-start justify-between">
                    <div>
                        {category && (
                            <span className="text-[10px] text-neutral-400 tracking-widest uppercase mb-1 block">
                                {category}
                            </span>
                        )}
                        <h3 className="font-serif text-xs md:text-base tracking-wide text-neutral-900 mb-[2px] leading-snug">{name}</h3>
                        <p className="text-[10px] md:text-xs tracking-wider text-neutral-500">{price}</p>
                    </div>
                    {onQuickAdd && (
                        <button
                            onClick={onQuickAdd}
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-neutral-100 hover:bg-black hover:text-white min-h-[36px] px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold"
                            aria-label={`Quick add ${name} to cart`}
                        >
                            Quick Add
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
}
