import { Hero } from "@/components/ui/badu/Hero";
import { AnimatedProductGrid } from "@/components/ui/badu/AnimatedProductGrid";
import { supabase } from "@/lib/supabase";

export const revalidate = 60; // Revalidate every minute

export default async function HomePage() {
    // Fetch top 4 active products
    const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .limit(4);

    const { data: assetsData } = await supabase.from("site_assets").select("*");
    const siteAssets = (assetsData || []).reduce((acc: any, asset: any) => {
        acc[asset.section_key] = asset;
        return acc;
    }, {});

    const productImages = [
        "https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=1000&auto=format&fit=crop", // Black Slide
        "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1000&auto=format&fit=crop",  // Brown Slide
        "https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=1000&auto=format&fit=crop",  // Textured Neutral
        "https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=1000&auto=format&fit=crop"   // Classic Leather
    ];

    const formattedProducts = (products || []).map((p: any, idx: number) => ({
        slug: p.slug || p.id,
        name: p.name,
        price: `${p.price_ghs} GHS`,
        imageUrl: p.image_urls?.[0] || productImages[idx % productImages.length],
        category: p.category_type || "Collection",
    }));

    return (
        <>
            <Hero
                title="Crafted in Ghana. Designed for Everywhere."
                subtitle="Visual Silence. Uncompromised Quality."
                imageUrl={siteAssets['home_hero']?.image_url || "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?q=80&w=2560&auto=format&fit=crop"}
                ctaText="Shop the Collection"
                ctaLink="/shop"
            />

            <section className="py-24 md:py-32 px-6 max-w-4xl mx-auto text-center">
                <h2 className="text-xs uppercase tracking-widest font-semibold mb-8 text-neutral-400">The Philosophy</h2>
                <p className="font-serif text-2xl md:text-4xl leading-relaxed text-neutral-900">
                    We strip away the non-essential to reveal the true character of our materials.
                    Every piece is a testament to the art of restraint.
                </p>
            </section>

            <section className="py-24 bg-creme px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-16">
                        <h2 className="font-serif text-4xl tracking-widest uppercase">The Collection</h2>
                        <a href="/shop" className="text-xs uppercase tracking-widest font-semibold hover:text-neutral-500 transition-colors border-b border-black pb-1">
                            View All
                        </a>
                    </div>

                    {formattedProducts.length > 0 ? (
                        <AnimatedProductGrid products={formattedProducts} />
                    ) : (
                        <div className="text-center py-12 text-neutral-500 tracking-widest uppercase text-sm">
                            Collection is currently being updated.
                        </div>
                    )}
                </div>
            </section>

            <section className="py-32 px-6 flex flex-col items-center justify-center text-center">
                <h2 className="font-serif text-5xl md:text-7xl tracking-widest uppercase mb-8">Handmade<br />in Ghana</h2>
                <p className="max-w-xl text-neutral-600 leading-relaxed mb-12">
                    Crafted by artisans who have honed their skills over generations.
                    We source the finest local leather to create footwear that only gets better with time.
                </p>
                <a href="/craft" className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors">
                    Discover The Craft
                </a>
            </section>
        </>
    );
}
