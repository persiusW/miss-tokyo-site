// PERF-20: async server component — data fetched at render time, no client-side loading state or CLS skeleton
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { NewArrivalsCarousel } from "./NewArrivalsCarousel";
import { NewArrivalsTabs } from "./NewArrivalsTabs";
import { splitLastWord, type NewArrivalsConfig } from "@/lib/content/homeSections";
import type { CarouselTab } from "@/lib/content/adminInput";

interface Product {
    slug: string;
    name: string;
    price_ghs: number;
    image_urls: string[] | null;
    is_sale: boolean;
    discount_value: number;
    inventory_count: number | null;
    track_inventory: boolean | null;
    preorder_enabled: boolean;
}

type Cat = { id: string; name: string | null; preorder_enabled: boolean | null };

/**
 * The home page's New Arrivals, as set in Content › Home page › New arrivals:
 * each tab is newest-first or in the shop's own order, from one category or
 * all, up to the saved number of products. With one tab the carousel shows
 * on its own, with no tab buttons.
 */
export async function NewArrivalsSection({ config }: { config: NewArrivalsConfig }) {
    const db = createClient();
    const { data: cats } = await db.from("categories").select("id, name, preorder_enabled");
    const allCats = (cats ?? []) as Cat[];

    // A tab's own category wins; with none, the section's category; else all products.
    const categoryFor = (tab: CarouselTab): Cat | null => {
        const byName = tab.category_name.trim().toLowerCase();
        if (byName) return allCats.find(c => (c.name ?? "").toLowerCase() === byName) ?? null;
        return config.categoryId ? allCats.find(c => c.id === config.categoryId) ?? null : null;
    };

    const productsFor = async (tab: CarouselTab) => {
        let q = db
            .from("products")
            .select("slug, name, price_ghs, image_urls, is_sale, discount_value, inventory_count, track_inventory, preorder_enabled, category_ids, category_type")
            .eq("is_active", true);
        const cat = categoryFor(tab);
        if (cat) q = q.or(`category_id.eq.${cat.id},category_type.ilike."${cat.name ?? ""}",category_ids.cs.{"${cat.id}"}`);
        // A tab whose category no longer exists shows nothing rather than everything.
        else if (tab.category_name.trim()) return [];
        q = tab.mode === "sort_order"
            ? q.order("sort_order", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false })
            : q.order("created_at", { ascending: false });
        const { data } = await q.limit(config.limit);
        return data ?? [];
    };

    const lists = await Promise.all(config.tabs.map(productsFor));

    const preorderCatById = new Map(allCats.filter(c => c.preorder_enabled).map(c => [c.id, true]));
    const preorderCatByName = new Map(allCats.filter(c => c.preorder_enabled).map(c => [(c.name ?? "").toLowerCase(), true]));
    type Row = Product & { category_ids: string[] | null; category_type: string | null };
    const withPreorder = (rows: unknown[]): Product[] => (rows as Row[]).map(p => ({
        ...p,
        preorder_enabled: p.preorder_enabled ||
            !!p.category_ids?.some(id => preorderCatById.has(id)) ||
            (p.category_type ? preorderCatByName.has(p.category_type.toLowerCase()) : false),
    }));

    // Tabs with nothing in them aren't shown.
    const tabs = config.tabs
        .map((t, i) => ({ label: t.label || `Tab ${i + 1}`, products: withPreorder(lists[i]) }))
        .filter(t => t.products.length > 0);
    if (tabs.length === 0) return null;

    const [head, last] = splitLastWord(config.title);

    return (
        <section className="bg-white py-20">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <p className="section-eyebrow">{config.eyebrow}</p>
                        <h2 className="section-title">
                            {head ? `${head} ` : null}<em>{last}</em>
                        </h2>
                    </div>
                    <Link href="/shop" className="view-all">
                        {config.linkLabel}
                    </Link>
                </div>

                {tabs.length === 1
                    ? <NewArrivalsCarousel products={tabs[0].products} />
                    : <NewArrivalsTabs tabs={tabs} />}
            </div>
        </section>
    );
}
