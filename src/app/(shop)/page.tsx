import { Hero } from "@/components/ui/badu/Hero";
import { HomepageGrid } from "@/components/ui/badu/HomepageGrid";
import { supabase } from "@/lib/supabase";

export const revalidate = 60; // Revalidate every minute

export default async function HomePage() {
    // Fetch top 4 active products
    const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .limit(4);

    const [{ data: assetsData }, { data: copyData }, { data: storeSettingsData }] = await Promise.all([
        supabase.from("site_assets").select("*"),
        supabase.from("site_copy").select("copy_key, value"),
        supabase.from("store_settings").select("home_grid_cols").eq("id", "default").single(),
    ]);

    const siteAssets = (assetsData || []).reduce((acc: any, asset: any) => {
        acc[asset.section_key] = asset;
        return acc;
    }, {});

    const copy = (copyData || []).reduce((acc: any, row: any) => {
        acc[row.copy_key] = row.value;
        return acc;
    }, {});

    const homeGridCols = ([2, 3, 4].includes(storeSettingsData?.home_grid_cols)
        ? storeSettingsData!.home_grid_cols
        : 4) as 2 | 3 | 4;

    const formattedProducts = (products || []).map((p: any) => ({
        slug: p.slug || p.id,
        name: p.name,
        price: `${p.price_ghs} GHS`,
        imageUrl: p.image_urls?.[0] || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E", // fallback to empty if missing
        hoverImageUrl: p.image_urls?.[1],
        category: p.category_type || "Collection",
    }));

    return (
        <>
            <Hero
                title={copy['hero_title'] || "Crafted in Ghana. Designed for Everywhere."}
                subtitle={copy['hero_subtitle'] || "Visual Silence. Uncompromised Quality."}
                imageUrl={siteAssets['home_hero']?.image_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E"}
                ctaText={copy['hero_cta_text'] || "Shop the Collection"}
                ctaLink="/shop"
            />

            <section className="py-24 md:py-32 px-6 max-w-4xl mx-auto text-center">
                <h2 className="text-xs uppercase tracking-widest font-semibold mb-8 text-neutral-400">
                    {copy['philosophy_eyebrow'] || "The Philosophy"}
                </h2>
                <p className="font-serif text-2xl md:text-4xl leading-relaxed text-neutral-900">
                    {copy['philosophy_body'] || "We strip away the non-essential to reveal the true character of our materials. Every piece is a testament to the art of restraint."}
                </p>
            </section>

            <section className="py-24 bg-white px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-16">
                        <h2 className="font-serif text-4xl tracking-widest uppercase">The Collection</h2>
                        <a href="/shop" className="text-xs uppercase tracking-widest font-semibold hover:text-neutral-500 transition-colors border-b border-black pb-1">
                            View All
                        </a>
                    </div>

                    {formattedProducts.length > 0 ? (
                        <HomepageGrid products={formattedProducts} gridCols={homeGridCols} />
                    ) : (
                        <div className="text-center py-12 text-neutral-500 tracking-widest uppercase text-sm">
                            Collection is currently being updated.
                        </div>
                    )}
                </div>
            </section>

            <section className="py-32 px-6 flex flex-col items-center justify-center text-center">
                <h2 className="font-serif text-5xl md:text-7xl tracking-widest uppercase mb-8">
                    {(copy['handmade_title'] || "Handmade in Ghana").split("\n").map((line: string, i: number, arr: string[]) => (
                        <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                    ))}
                </h2>
                <p className="max-w-xl text-neutral-600 leading-relaxed mb-12">
                    {copy['handmade_body'] || "Crafted by artisans who have honed their skills over generations. We source the finest local leather to create footwear that only gets better with time."}
                </p>
                <a href="/craft" className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors">
                    {copy['handmade_cta_text'] || "Discover The Craft"}
                </a>
            </section>
        </>
    );
}
