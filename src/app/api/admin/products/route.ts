import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/utils/logActivity";

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
        sku,
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
            sku: sku ?? null,
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

    // LOG ACTIVITY
    await logActivity({
        userId: user.id,
        userRole: caller.role,
        actionType: "CREATE",
        resource: "product",
        resourceId: data.id,
        details: { name: name, slug: data.slug }
    });

    revalidatePath("/shop", "page");
    revalidatePath("/catalog/products", "page");

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

    // Fast path: toggle-only fields (is_active, is_sale, discount_value).
    // When the body contains ONLY these fields, do a targeted update without
    // touching any other columns — avoids nulling out price, name, etc.
    const TOGGLE_FIELDS = new Set(["is_active", "is_sale", "discount_value"]);
    if (Object.keys(fields).length > 0 && Object.keys(fields).every(k => TOGGLE_FIELDS.has(k))) {
        const { error } = await supabaseAdmin.from("products").update(fields).eq("id", id);
        if (error) {
            console.error("[admin/products PATCH toggle]", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        revalidatePath("/shop", "page");
        revalidatePath("/catalog/products", "page");
        return NextResponse.json({ success: true });
    }

    const {
        name,
        slug,
        sku,
        price_ghs,
        inventory_count,
        track_inventory,
        track_variant_inventory,
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
        variants,
    } = fields;

    // 1. Fetch current record for diffing
    const { data: oldData } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

    const updateFields = {
        name,
        slug,
        sku: sku ?? null,
        price_ghs: Number(price_ghs),
        inventory_count: track_inventory ? Number(inventory_count) : 9999,
        track_inventory: track_inventory ?? true,
        track_variant_inventory: track_variant_inventory ?? false,
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
    };

    const { error } = await supabaseAdmin
        .from("products")
        .update(updateFields)
        .eq("id", id);


    if (error) {
        console.error("[admin/products PATCH]", error);
        return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    // Save variants: delete existing then insert fresh.
    // Avoids NULL conflict key issues (NULL != NULL in SQL breaks ON CONFLICT).
    if (Array.isArray(variants) && variants.length > 0) {
        await supabaseAdmin.from("product_variants").delete().eq("product_id", id);
        const { error: variantErr } = await supabaseAdmin
            .from("product_variants")
            .insert(variants);
        if (variantErr) {
            console.error("[admin/products PATCH] variant insert failed:", variantErr.message);
            return NextResponse.json({ error: `Variant save failed: ${variantErr.message}` }, { status: 500 });
        }

        // Sync product-level inventory_count to real variant sum so shop grid,
        // sold-out ribbons, and JSON-LD reflect actual stock rather than the 9999 sentinel.
        const variantSum = variants.reduce(
            (sum: number, v: { inventory_count?: number }) => sum + (v.inventory_count ?? 0),
            0
        );
        await supabaseAdmin
            .from("products")
            .update({ inventory_count: variantSum })
            .eq("id", id);
    }

    // LOG ACTIVITY
    await logActivity({
        userId: user.id,
        userRole: caller.role,
        actionType: "UPDATE",
        resource: "product",
        resourceId: id,
        oldData,
        newData: updateFields
    });

    revalidatePath("/shop", "page");
    revalidatePath("/catalog/products", "page");

    return NextResponse.json({ success: true });
}
