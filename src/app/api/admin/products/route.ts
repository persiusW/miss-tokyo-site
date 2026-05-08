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
    const TOGGLE_FIELDS = new Set(["is_active", "is_sale", "discount_value", "compare_at_price_ghs"]);
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
        compare_at_price_ghs,
        is_sale,
        discount_value,
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
        compare_at_price_ghs: compare_at_price_ghs != null && compare_at_price_ghs !== "" ? Number(compare_at_price_ghs) : null,
        is_sale: is_sale ?? false,
        discount_value: discount_value != null ? Number(discount_value) : 0,
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

    // Merge strategy: preserve DB-current inventory_count so admin saves
    // don't overwrite stock deductions that happened while the form was open.
    if (variants && variants.length > 0) {
        function normVariant(s: string | null | undefined): string {
            if (s == null) return "null";
            return s.replace(/\s*[—–-]\s*/g, "-").trim().toLowerCase();
        }

        // Fetch current DB variants to get live inventory_count values
        const { data: existingVariants } = await supabaseAdmin
            .from("product_variants")
            .select("id, size, color, stitching, inventory_count")
            .eq("product_id", id);

        const existingMap = new Map(
            (existingVariants ?? []).map(v => [
                `${normVariant(v.size)}|${normVariant(v.color)}|${normVariant(v.stitching)}`,
                v
            ])
        );

        // Delete variants that are no longer in the incoming list
        const incomingKeys = new Set(
            variants.map((v: any) =>
                `${normVariant(v.size)}|${normVariant(v.color)}|${normVariant(v.stitching)}`
            )
        );
        const toDelete = (existingVariants ?? []).filter(v => {
            const key = `${normVariant(v.size)}|${normVariant(v.color)}|${normVariant(v.stitching)}`;
            return !incomingKeys.has(key);
        });
        if (toDelete.length > 0) {
            await supabaseAdmin
                .from("product_variants")
                .delete()
                .in("id", toDelete.map((v: any) => v.id));
        }

        // Upsert variants, preserving live inventory_count for existing ones
        const toUpsert = variants.map((v: any) => {
            const key = `${normVariant(v.size)}|${normVariant(v.color)}|${normVariant(v.stitching)}`;
            const existing = existingMap.get(key);
            return {
                ...v,
                product_id: id,
                inventory_count: existing !== undefined
                    ? existing.inventory_count  // preserve DB-current stock
                    : (v.inventory_count ?? 0), // new variant: use form value
            };
        });

        const { error: upsertErr } = await supabaseAdmin
            .from("product_variants")
            .upsert(toUpsert, { onConflict: "product_id,size,color,stitching" });

        if (upsertErr) {
            console.error("[admin/products PATCH] variant upsert failed, falling back to manual merge:", upsertErr.message);
            // Fallback: manual merge without upsert (handles missing unique constraint)
            for (const v of toUpsert) {
                const key = `${normVariant(v.size)}|${normVariant(v.color)}|${normVariant(v.stitching)}`;
                const existing = existingMap.get(key);
                if (existing) {
                    // UPDATE existing variant — preserve inventory_count, update other fields
                    const { error: updateErr } = await supabaseAdmin
                        .from("product_variants")
                        .update({
                            size: v.size,
                            color: v.color,
                            stitching: v.stitching,
                            price_ghs: v.price_ghs,
                            sku: v.sku,
                            // inventory_count intentionally not updated — preserve DB-current stock
                        })
                        .eq("id", existing.id);
                    if (updateErr) {
                        console.error("[admin/products PATCH] variant update failed:", updateErr.message);
                        return NextResponse.json({ error: `Variant update failed: ${updateErr.message}` }, { status: 500 });
                    }
                } else {
                    // INSERT new variant
                    const { error: insertErr } = await supabaseAdmin
                        .from("product_variants")
                        .insert(v);
                    if (insertErr) {
                        console.error("[admin/products PATCH] variant insert failed:", insertErr.message);
                        return NextResponse.json({ error: `Variant insert failed: ${insertErr.message}` }, { status: 500 });
                    }
                }
            }
        }

        // Sync product-level inventory_count to real variant sum so shop grid,
        // sold-out ribbons, and JSON-LD reflect actual stock rather than the 9999 sentinel.
        // Only applies when tracking is active — avoids overwriting the 9999 sentinel
        // for untracked products that happen to have variant rows.
        if (track_inventory && track_variant_inventory) {
            // Re-fetch the updated variants to get accurate DB-current totals
            const { data: updatedVariants } = await supabaseAdmin
                .from("product_variants")
                .select("inventory_count")
                .eq("product_id", id);
            const variantSum = (updatedVariants ?? []).reduce(
                (sum: number, v: { inventory_count?: number }) => sum + (v.inventory_count ?? 0),
                0
            );
            const { error: syncErr } = await supabaseAdmin
                .from("products")
                .update({ inventory_count: variantSum })
                .eq("id", id);
            if (syncErr) {
                console.error("[admin/products PATCH] inventory_count sync failed:", syncErr.message);
            }
        }
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
