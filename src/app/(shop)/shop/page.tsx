import { supabase } from "@/lib/supabase";
import { ShopClient } from "@/components/ui/badu/ShopClient";

export const revalidate = 60;

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3C/svg%3E";

export default async function ShopPage() {
    const [{ data: products }, { data: categories }] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name, slug, image_url").eq("is_active", true).order("name"),
    ]);

    const formattedProducts = (products || []).map((p, idx) => ({
        slug: p.slug || p.id,
        name: p.name,
        price: `${p.price_ghs} GHS`,
        imageUrl: p.image_urls?.[0] || FALLBACK_IMAGE,
        hoverImageUrl: p.image_urls?.[1],
        category: p.category_type || "",
    }));

    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-[1400px] mx-auto min-h-screen">
            <header className="mb-16 md:mb-24 text-center">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">The Collection</h1>
                <p className="text-sm tracking-[0.2em] text-neutral-500 uppercase">Enduring Quality. Quiet Aesthetics.</p>
            </header>

            <ShopClient
                products={formattedProducts}
                categories={(categories || []).map(c => ({
                    id: c.id,
                    name: c.name,
                    slug: c.slug,
                    image_url: c.image_url || null,
                }))}
            />
        </div>
    );
}
