import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
    // Auth check — only admin/owner can create products
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: caller } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!caller || !["admin", "owner", "sales_staff"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const {
        name,
        slug,
        price_ghs,
        inventory_count,
        track_inventory,
        description,
        category_type,
        category_ids,
        image_urls,
        available_sizes,
        available_colors,
        available_stitching,
        wholesale_override,
        wholesale_price_tier_1,
        wholesale_price_tier_2,
        wholesale_price_tier_3,
    } = body;

    if (!name || !slug || price_ghs == null) {
        return NextResponse.json({ error: "name, slug, and price_ghs are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("products")
        .insert([{
            name,
            slug,
            price_ghs: Number(price_ghs),
            inventory_count: track_inventory ? Number(inventory_count) : 9999,
            track_inventory: track_inventory ?? true,
            description,
            category_type,
            category_ids: category_ids ?? [],
            image_urls: image_urls ?? [],
            available_sizes: available_sizes ?? [],
            available_colors: available_colors ?? [],
            available_stitching: available_stitching ?? [],
            is_active: true,
            wholesale_override: wholesale_override ?? false,
            wholesale_price_tier_1: wholesale_override && wholesale_price_tier_1 ? Number(wholesale_price_tier_1) : null,
            wholesale_price_tier_2: wholesale_override && wholesale_price_tier_2 ? Number(wholesale_price_tier_2) : null,
            wholesale_price_tier_3: wholesale_override && wholesale_price_tier_3 ? Number(wholesale_price_tier_3) : null,
        }])
        .select("id, slug")
        .single();

    if (error) {
        console.error("[admin/products POST]", error);
        return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: data });
}

export async function PATCH(req: NextRequest) {
    // Auth check — only admin/owner/sales_staff can update products
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: caller } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!caller || !["admin", "owner", "sales_staff"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const {
        name,
        slug,
        price_ghs,
        inventory_count,
        track_inventory,
        description,
        category_type,
        category_ids,
        image_urls,
        available_sizes,
        available_colors,
        available_stitching,
        is_active,
        wholesale_override,
        wholesale_price_tier_1,
        wholesale_price_tier_2,
        wholesale_price_tier_3,
    } = fields;

    const { error } = await supabaseAdmin
        .from("products")
        .update({
            name,
            slug,
            price_ghs: Number(price_ghs),
            inventory_count: track_inventory ? Number(inventory_count) : 9999,
            track_inventory: track_inventory ?? true,
            description,
            category_type,
            category_ids: category_ids ?? [],
            image_urls: image_urls ?? [],
            available_sizes: available_sizes ?? [],
            available_colors: available_colors ?? [],
            available_stitching: available_stitching ?? [],
            is_active: is_active ?? true,
            wholesale_override: wholesale_override ?? false,
            wholesale_price_tier_1: wholesale_override && wholesale_price_tier_1 ? Number(wholesale_price_tier_1) : null,
            wholesale_price_tier_2: wholesale_override && wholesale_price_tier_2 ? Number(wholesale_price_tier_2) : null,
            wholesale_price_tier_3: wholesale_override && wholesale_price_tier_3 ? Number(wholesale_price_tier_3) : null,
        })
        .eq("id", id);

    if (error) {
        console.error("[admin/products PATCH]", error);
        return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
