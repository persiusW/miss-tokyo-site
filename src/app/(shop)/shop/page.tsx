import { AnimatedProductGrid } from "@/components/ui/badu/AnimatedProductGrid";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function ShopPage() {
    const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    const productImages = [
        "https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=1000&auto=format&fit=crop"
    ];

    const formattedProducts = (products || []).map((p: any, idx: number) => ({
        slug: p.slug || p.id,
        name: p.name,
        price: `${p.price_ghs} GHS`,
        imageUrl: p.image_urls?.[0] || productImages[idx % productImages.length],
        category: p.category_type || "Collection",
    }));

    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-[1400px] mx-auto min-h-screen">
            <header className="mb-16 md:mb-24 text-center">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">The Collection</h1>
                <p className="text-sm tracking-[0.2em] text-neutral-500 uppercase">Enduring Quality. Quiet Aesthetics.</p>
            </header>

            {formattedProducts.length > 0 ? (
                <AnimatedProductGrid products={formattedProducts} />
            ) : (
                <div className="text-center py-24 text-neutral-400 tracking-widest uppercase text-sm">
                    No items available in the collection at this time.
                </div>
            )}
        </div>
    );
}
