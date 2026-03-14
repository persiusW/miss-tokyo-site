import { HeroBanner } from "@/components/ui/miss-tokyo/HeroBanner";
import { CategoryGrid } from "@/components/ui/miss-tokyo/CategoryGrid";
import { ProductGrid } from "@/components/ui/miss-tokyo/ProductGrid";
import { createClient } from "@/lib/supabaseServer";

export const revalidate = 0; // Ensure live data on refresh

export default async function HomePage() {
    const supabase = await createClient();
    
    // Fetch Hero Banner Asset & Site Copy concurrently
    const [{ data: asset }, { data: copyData }] = await Promise.all([
        supabase
            .from("site_assets")
            .select("image_url")
            .eq("section_key", "home_hero")
            .eq("is_active", true)
            .single(),
        supabase
            .from("site_copy")
            .select("copy_key, value")
            .in("copy_key", ["hero_headline", "hero_subheadline"])
    ]);

    const siteCopy = (copyData || []).reduce((acc: Record<string, string>, row) => ({
        ...acc,
        [row.copy_key]: row.value
    }), {} as Record<string, string>);

    return (
        <>
            <HeroBanner 
                imageUrl={asset?.image_url || "/hero-banner.jpg"} 
                title={siteCopy["hero_headline"]}
                subtitle={siteCopy["hero_subheadline"]}
            />
            <CategoryGrid />
            <ProductGrid />
        </>
    );
}
