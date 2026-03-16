import { supabase } from "@/lib/supabase";
import { EditorialProductCard } from "@/components/ui/miss-tokyo/EditorialProductCard";

export const revalidate = 60;

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E";

export default async function NewArrivalsPage() {
    const { data: storeSettingsData } = await supabase
        .from("store_settings")
        .select("shop_grid_cols, shop_product_limit")
        .eq("id", "default")
        .single();

    const gridCols = ([2, 3, 4, 5].includes(storeSettingsData?.shop_grid_cols)
        ? storeSettingsData!.shop_grid_cols
        : 3) as 2 | 3 | 4 | 5;

    const productLimit = storeSettingsData?.shop_product_limit || 12;

    const { data: products } = await supabase
        .from("products")
        .select("id, slug, name, price_ghs, image_urls, is_sale, discount_value")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(productLimit);

    const GRID_COLS_MAP: Record<2 | 3 | 4 | 5, string> = {
        2: "md:grid-cols-2",
        3: "md:grid-cols-2 lg:grid-cols-3",
        4: "md:grid-cols-2 lg:grid-cols-4",
        5: "md:grid-cols-3 lg:grid-cols-5",
    };

    const formattedProducts = (products || []).map((p) => {
        const isOnSale = p.is_sale === true;
        const displayPrice = isOnSale && p.discount_value > 0
            ? `GH₵ ${(p.price_ghs * (1 - p.discount_value / 100)).toFixed(2)}`
            : `GH₵ ${Number(p.price_ghs).toFixed(2)}`;
        return {
            slug: p.slug || p.id,
            name: p.name,
            price: displayPrice,
            imageUrl: p.image_urls?.[0] || FALLBACK_IMAGE,
        };
    });

    return (
        <div className="min-h-screen bg-white">
            <header className="py-16 text-center border-b border-gray-100">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-4 text-black">
                    New Arrivals
                </h1>
                <p className="text-sm tracking-[0.2em] text-neutral-500 uppercase">
                    The Latest From Our Archive.
                </p>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-12">
                {formattedProducts.length > 0 ? (
                    <div className={`grid grid-cols-1 ${GRID_COLS_MAP[gridCols]} gap-8`}>
                        {formattedProducts.map((product) => (
                            <EditorialProductCard
                                key={product.slug}
                                slug={product.slug}
                                name={product.name}
                                price={product.price}
                                imageUrl={product.imageUrl}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-24 text-neutral-400 uppercase tracking-widest text-xs">
                        No new arrivals yet.
                    </p>
                )}
            </main>
        </div>
    );
}
