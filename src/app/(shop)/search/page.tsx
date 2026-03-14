import ShopCatalog from "@/components/ui/miss-tokyo/ShopCatalog";
import { supabase } from "@/lib/supabase";

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q: string }>;
}) {
    const { q: query } = await searchParams;

    // Check if we have results
    let hasResults = false;
    if (query) {
        const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true)
            .ilike("name", `%${query}%`);
        
        hasResults = (count || 0) > 0;
    }

    if (!query || hasResults) {
        return (
            <div className="pt-8">
                 <header className="mb-12">
                    <h1 className="text-xl md:text-2xl font-serif uppercase tracking-[0.3em] text-black text-center">
                        Search Results For: "{query || 'All'}"
                    </h1>
                    <div className="h-px w-12 bg-black mx-auto mt-6"></div>
                </header>

                <ShopCatalog searchQuery={query} />
            </div>
        );
    }

    // Zero results state
    return (
        <div className="pt-24 min-h-screen">
            <div className="max-w-4xl mx-auto px-6 text-center mb-32">
                <h1 className="text-xl md:text-2xl font-serif uppercase tracking-[0.3em] text-black mb-8">
                    We couldn't find anything matching your search.
                </h1>
                <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 font-bold mb-12">
                     Discover Our Latest Arrivals Below.
                </p>
                <div className="h-px w-12 bg-black mx-auto"></div>
            </div>

            <ShopCatalog 
                title="Latest Arrivals" 
                subtitle="Curated Archives. New Silence."
                defaultSort="newest"
            />
        </div>
    );
}
