import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { HeroSection } from "@/components/ui/miss-tokyo/HeroSection";
import { SplitCategories } from "@/components/ui/miss-tokyo/SplitCategories";
import { LatestDropCarousel } from "@/components/ui/miss-tokyo/LatestDropCarousel";

export const revalidate = 60;

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E";

export default async function HomePage() {
    const [
        { data: assetsData },
        { data: copyData },
        { data: featuredCategories },
    ] = await Promise.all([
        supabase.from("site_assets").select("*"),
        supabase.from("site_copy").select("copy_key, value"),
        supabase.from("categories")
            .select("id, name, slug, image_url")
            .eq("is_featured", true)
            .eq("is_active", true)
            .limit(2),
    ]);

    const siteAssets = (assetsData || []).reduce((acc: Record<string, any>, asset: any) => {
        acc[asset.section_key] = asset;
        return acc;
    }, {});

    const copy = (copyData || []).reduce((acc: Record<string, string>, row: any) => {
        acc[row.copy_key] = row.value;
        return acc;
    }, {});

    const heroImageUrl    = siteAssets["home_hero"]?.image_url || FALLBACK_IMAGE;
    const heroTitle       = copy["hero_title"]       || "Crafted in Ghana.\nDesigned for Everywhere.";
    const heroCtaText     = copy["hero_cta_text"]    || "Shop the Collection";
    const manifestoTitle  = copy["handmade_title"]   || "We Design\nFor the Bold.";
    const manifestoBody   = copy["handmade_body"]    || "Crafted by artisans who have honed their skills over generations. We source the finest local materials to create pieces that only get better with time.";
    const manifestoCtaText = copy["handmade_cta_text"] || "The Process";
    const manifestoImage  = siteAssets["about_founder"]?.image_url || null;

    return (
        <>
            {/* 1. Cinematic Hero */}
            <HeroSection
                title={heroTitle}
                imageUrl={heroImageUrl}
                ctaText={heroCtaText}
                ctaLink="/shop"
            />

            {/* 2. Split Lookbook — featured categories */}
            {featuredCategories && featuredCategories.length > 0 && (
                <SplitCategories categories={featuredCategories} />
            )}

            {/* 3. Latest Drop Carousel — fully client-side, self-fetching */}
            <LatestDropCarousel />

            {/* 4. Brand Manifesto */}
            <section className="py-32 bg-white">
                <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center">
                    <div>
                        <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-[0.05em] uppercase mb-10 text-black leading-tight">
                            {manifestoTitle.split("\n").map((line: string, i: number, arr: string[]) => (
                                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                            ))}
                        </h2>
                        <p className="text-neutral-500 tracking-wide leading-relaxed mb-12 text-sm max-w-md">
                            {manifestoBody}
                        </p>
                        <Link
                            href="/craft"
                            className="inline-block bg-black text-white px-10 py-4 text-[10px] font-bold uppercase tracking-[0.3em] border border-black hover:bg-white hover:text-black transition-all duration-500 rounded-none"
                        >
                            {manifestoCtaText}
                        </Link>
                    </div>

                    {manifestoImage && (
                        <div className="relative aspect-[3/4] w-full overflow-hidden">
                            <Image
                                src={manifestoImage}
                                alt="Brand manifesto"
                                fill
                                className="object-cover object-center"
                            />
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
