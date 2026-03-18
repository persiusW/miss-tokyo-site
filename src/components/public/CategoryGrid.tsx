import Image from "next/image";
import Link from "next/link";
import type { FeaturedCategory } from "@/types/settings";

type CategoryWithCount = FeaturedCategory & { itemCount: number };

interface CategoryGridProps {
  categories: CategoryWithCount[];
}

const PLACEHOLDER_GRADIENTS = [
  "bg-gradient-to-br from-stone-300 to-stone-400",
  "bg-gradient-to-br from-rose-200 to-pink-300",
  "bg-gradient-to-br from-amber-200 to-orange-300",
  "bg-gradient-to-br from-teal-200 to-emerald-300",
  "bg-gradient-to-br from-indigo-200 to-purple-300",
  "bg-gradient-to-br from-neutral-200 to-zinc-300",
];

export function CategoryGrid({ categories }: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <section style={{ backgroundColor: "var(--sand)" }} className="py-16">
      {/* Section header */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-end justify-between mb-8">
        <div>
          <p className="section-eyebrow">BROWSE BY CATEGORY</p>
          <h2 className="section-title">
            Shop the{" "}
            <em>Edit</em>
          </h2>
        </div>
        <Link href="/shop" className="view-all">
          ALL CATEGORIES →
        </Link>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
          {categories.map((fc, index) => {
            const imageUrl = fc.custom_image_url || fc.category?.image_url || null;
            const label = fc.custom_label || fc.category?.name || "Category";
            const count = fc.item_count_override !== null ? fc.item_count_override : fc.itemCount;
            const slug = fc.category?.slug || "";
            const placeholder = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length];

            return (
              <Link
                key={fc.id}
                href={`/shop?category=${slug}`}
                className="relative aspect-[3/4] overflow-hidden group cursor-pointer block"
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={label}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className={`absolute inset-0 ${placeholder}`} />
                )}

                {/* Bottom gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Text */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white text-sm font-medium uppercase tracking-widest leading-tight">
                    {label}
                  </p>
                  <p className="text-white/60 text-xs uppercase tracking-widest mt-1">
                    {count} {count === 1 ? "item" : "items"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
