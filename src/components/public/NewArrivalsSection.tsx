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
}

export async function NewArrivalsSection() {
    const db = createClient();
    const { data } = await db
        .from("products")
        .select("slug, name, price_ghs, image_urls, is_sale, discount_value")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(16);

    const products = (data ?? []) as Product[];
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
