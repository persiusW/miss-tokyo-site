import { createClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import EditProductForm from "./EditProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const [
        { data: product },
        { data: categories },
        { data: storeData },
        { data: existingVariants },
    ] = await Promise.all([
        supabase.from("products").select("id, name, slug, sku, price_ghs, compare_at_price_ghs, is_sale, discount_value, inventory_count, description, category_type, is_active, track_inventory, track_variant_inventory, image_urls, available_sizes, available_colors, available_brands, category_ids, wholesale_override, wholesale_price_tier_1, wholesale_price_tier_2, wholesale_price_tier_3").eq("id", id).single(),
        supabase.from("categories").select("id, name, slug, is_wholesale").eq("is_active", true).order("name"),
        supabase.from("store_settings").select("global_sizes, global_colors, global_brands, wholesale_enabled, wholesale_tier_1_min, wholesale_tier_1_max, wholesale_tier_2_min, wholesale_tier_2_max, wholesale_tier_3_min, wholesale_tier_3_max").eq("id", "default").single(),
        supabase.from("product_variants").select("size, color, brand, sku, inventory_count").eq("product_id", id),
    ]);

    if (!product) notFound();

    return (
        <EditProductForm
            id={id}
            product={product}
            categories={categories ?? []}
            storeData={storeData}
            existingVariants={existingVariants ?? []}
        />
    );
}
