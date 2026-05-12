// PERF-20: async server component — data fetched at render time, no client-side loading state or CLS skeleton
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { NewArrivalsCarousel } from "./NewArrivalsCarousel";

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

export async function NewArrivalsSection() {
    const db = createClient();
    const [{ data }, { data: preorderCats }] = await Promise.all([
        db
            .from("products")
            .select("slug, name, price_ghs, image_urls, is_sale, discount_value, inventory_count, track_inventory, preorder_enabled, category_ids, category_type")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(16),
        db
            .from("categories")
            .select("id, name, preorder_enabled")
            .eq("preorder_enabled", true),
    ]);

    const preorderCatById = new Map((preorderCats ?? []).map((c: any) => [c.id, true]));
    const preorderCatByName = new Map((preorderCats ?? []).map((c: any) => [(c.name ?? "").toLowerCase(), true]));

    const products: Product[] = (data ?? []).map((p: any) => ({
        ...p,
        preorder_enabled: p.preorder_enabled ||
            (p.category_ids as string[] | null)?.some((id: string) => preorderCatById.has(id)) ||
            (p.category_type ? preorderCatByName.has((p.category_type as string).toLowerCase()) : false),
    }));

    if (products.length === 0) return null;

    return (
        <section className="bg-white py-20">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <p className="section-eyebrow">JUST LANDED</p>
                        <h2 className="section-title">
                            New <em>Arrivals</em>
                        </h2>
                    </div>
                    <Link href="/shop" className="view-all">
                        VIEW ALL
                    </Link>
                </div>

                <NewArrivalsCarousel products={products} />
            </div>
        </section>
    );
}
