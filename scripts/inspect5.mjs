// Check what the Supabase API returns for Pink Off Shoulder variants
// Uses the public anon key (read-only, safe)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    // Try reading from .env.local
    const fs = await import("fs");
    const path = await import("path");
    const envFile = fs.readFileSync(path.resolve(".env.local"), "utf8");
    const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
    const key = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
    if (!url || !key) { console.error("No Supabase env vars"); process.exit(1); }
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    process.env.NEXT_PUBLIC_SUPABASE_KEY = key;

    const res = await fetch(`${url}/rest/v1/products?slug=eq.pink-off-shoulder-dress&select=id,slug,name,track_inventory,track_variant_inventory,inventory_count,ribbon,product_variants(id,size,color,inventory_count)`, {
        headers: {
            "apikey": key,
            "Authorization": `Bearer ${key}`,
        }
    });
    const data = await res.json();
    console.log("Pink Off Shoulder DB record:");
    console.log(JSON.stringify(data, null, 2));
}
