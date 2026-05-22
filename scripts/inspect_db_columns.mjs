import fs from "fs";
import path from "path";

// Read from .env.local
const envFile = fs.readFileSync(path.resolve(".env.local"), "utf8");
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
if (!url || !key) {
    console.error("No Supabase env vars in .env.local");
    process.exit(1);
}

const selectQuery = `id, name, slug, description, price_ghs, compare_at_price_ghs,
image_urls, is_featured, is_active, category_id, category_type, category_ids,
available_colors, available_sizes, available_brands, color_variants, size_variants, brand_variants,
bundle_label, badge, is_sale, discount_value, inventory_count, track_inventory, track_variant_inventory, preorder_enabled, preorder_estimated_date, sku, created_at`;

console.log("Fetching products with select query...");
const res = await fetch(`${url}/rest/v1/products?select=${encodeURIComponent(selectQuery)}&limit=1`, {
    headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
    }
});

const text = await res.text();
try {
    const data = JSON.parse(text);
    console.log("API Response status:", res.status);
    console.log("API Response (JSON):", JSON.stringify(data, null, 2));
} catch (e) {
    console.log("API Response status:", res.status);
    console.log("API Response (Text):", text);
}
