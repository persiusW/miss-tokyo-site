import { supabase } from "@/lib/supabase";
import { ShopClient } from "@/components/ui/badu/ShopClient";

export const revalidate = 60;

const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=1000&auto=format&fit=crop",
];

export default async function ShopPage() {
    const [{ data: products }, { data: categories }] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name, slug, image_url").eq("is_active", true).order("name"),
    ]);

    const formattedProducts = (products || []).map((p, idx) => ({
        slug: p.slug || p.id,
        name: p.name,
        price: `${p.price_ghs} GHS`,
        imageUrl: p.image_urls?.[0] || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length],
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
