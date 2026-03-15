import { Hero } from "@/components/ui/badu/Hero";
import { HomepageGrid } from "@/components/ui/badu/HomepageGrid";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 60; // Revalidate every minute

export default async function HomePage() {
    const [{ data: assetsData }, { data: copyData }, { data: storeSettingsData }, { data: featuredCategories }] = await Promise.all([
        supabase.from("site_assets").select("*"),
        supabase.from("site_copy").select("copy_key, value"),
        supabase.from("store_settings").select("home_grid_cols, home_product_limit").eq("id", "default").single(),
        supabase.from("categories").select("id, name, slug, image_url").eq("is_featured", true).eq("is_active", true).limit(3),
    ]);

    const homeGridCols = ([2, 3, 4].includes(storeSettingsData?.home_grid_cols)
        ? storeSettingsData!.home_grid_cols
        : 4) as 2 | 3 | 4;

    const homeProductLimit = ([4, 6, 8, 12].includes(storeSettingsData?.home_product_limit)
        ? storeSettingsData!.home_product_limit
        : 4) as number;

    const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .limit(homeProductLimit);

    const siteAssets = (assetsData || []).reduce((acc: any, asset: any) => {
        acc[asset.section_key] = asset;
        return acc;
    }, {});

    const copy = (copyData || []).reduce((acc: any, row: any) => {
        acc[row.copy_key] = row.value;
        return acc;
    }, {});

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

            {/* Shop By Category Section */}
            <section className="py-24 bg-white px-6 md:px-12 rounded-none">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-serif text-center uppercase tracking-widest text-black mb-4">
                        Shop By Category
                    </h2>
                    <p className="text-center text-sm text-gray-500 uppercase tracking-widest mb-12">
                        Explore our curated collections
                    </p>
                    
                    {featuredCategories && featuredCategories.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {featuredCategories.map((cat) => (
                                <Link key={cat.id} href={`/shop?category=${cat.slug}`} className="group relative aspect-[4/5] overflow-hidden">
                                    {cat.image_url ? (
                                        <Image
                                            src={cat.image_url}
                                            alt={cat.name}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-100" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="bg-white text-black px-8 py-3 text-sm uppercase tracking-widest shadow-md">
                                            {cat.name}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-neutral-400 italic font-serif">No featured categories yet.</p>
                    )}
                </div>
            </section>

            <section className="py-24 bg-white px-6 md:px-12 rounded-none border-t border-neutral-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-serif uppercase tracking-[0.25em] text-black mb-4">
                            Latest Arrivals
                        </h2>
                        <p className="text-sm text-gray-500 uppercase tracking-widest mb-12">
                            The newest pieces from the archive
                        </p>
                    </div>

                    {formattedProducts.length > 0 ? (
                        <div className="space-y-12">
                            <HomepageGrid products={formattedProducts} gridCols={homeGridCols} />
                            <div className="flex justify-center mt-16">
                                <Link 
                                    href="/shop" 
                                    className="text-[10px] uppercase tracking-[0.3em] font-bold border-b border-black pb-2 hover:text-neutral-500 transition-colors"
                                >
                                    Explore All Arrivals
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-neutral-500 tracking-[0.2em] uppercase text-[10px]">
                            Archive is currently being updated.
                        </div>
                    )}
                </div>
            </section>

            <section className="py-32 px-6 flex flex-col items-center justify-center text-center bg-neutral-50 rounded-none">
                <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-[0.1em] uppercase mb-10 text-black">
                    {(copy['handmade_title'] || "Atelier Ghana").split("\n").map((line: string, i: number, arr: string[]) => (
                        <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                    ))}
                </h2>
                <p className="max-w-xl text-neutral-500 tracking-wide leading-relaxed mb-16 text-sm">
                    {copy['handmade_body'] || "Crafted by artisans who have honed their skills over generations. We source the finest local leather to create footwear that only gets better with time."}
                </p>
                <Link 
                    href="/craft" 
                    className="inline-block bg-black text-white px-12 py-5 text-[10px] font-bold uppercase tracking-[0.3em] border border-black hover:bg-white hover:text-black transition-all duration-500 rounded-none shadow-xl"
                >
                    {copy['handmade_cta_text'] || "The Process"}
                </Link>
            </section>
        </>
    );
}
