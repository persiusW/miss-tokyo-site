import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { revalidatePath, revalidateTag } from "next/cache";
import { logActivity } from "@/lib/utils/logActivity";
import { adjustStock, syncProductStockFromVariants } from "@/lib/inventory";
import { normAttr } from "@/lib/utils/normAttr";

/**
 * Removes variant rows the staff member dropped from the product, skipping any
 * row a live checkout is still holding.
 *
 * The route used to delete the holds themselves to get past the FK, which took
 * a paying customer's unit away mid-checkout. A held row is left in place and
 * the next save clears it once the hold has settled or expired.
 */
async function deleteVariantsUnlessHeld(variantIds: string[], productId: string): Promise<void> {
    if (variantIds.length === 0) return;

    const { data: held } = await supabaseAdmin
        .from("online_reservations")
        .select("variant_id")
        .in("variant_id", variantIds);

    const heldIds = new Set((held ?? []).map((r: any) => r.variant_id as string));
    const deletable = variantIds.filter(vid => !heldIds.has(vid));

    if (heldIds.size > 0) {
        console.warn("[admin/products] kept variant rows with live reservations", {
            productId,
            kept: [...heldIds],
        });
    }
    if (deletable.length === 0) return;

    const { error } = await supabaseAdmin.from("product_variants").delete().in("id", deletable);
    if (error) console.error("[admin/products] variant delete failed:", error.message, { productId });
}

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
        track_variant_inventory,
        description,
        category_type,
        category_ids,
        image_urls,
        available_sizes,
        available_colors,
        available_brands,
        brand_variants,
        wholesale_override,
        wholesale_price_tier_1,
        wholesale_price_tier_2,
        wholesale_price_tier_3,
        variants,
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
            inventory_count: track_inventory && !track_variant_inventory ? Number(inventory_count) : 9999,
            track_inventory: track_inventory ?? true,
            track_variant_inventory: track_variant_inventory ?? false,
            description,
            category_type,
            category_ids: category_ids ?? [],
            image_urls: image_urls ?? [],
            available_sizes: available_sizes ?? [],
            available_colors: available_colors ?? [],
            available_brands: available_brands ?? [],
            brand_variants: brand_variants ?? null,
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

    // Insert per-variant inventory rows when tracking by variant
    if (track_inventory && track_variant_inventory && variants && variants.length > 0) {
        const toInsert = variants.map((v: any) => ({
            product_id: data.id,
            size: v.size || null,
            color: v.color || null,
            brand: v.brand || null,
            sku: v.sku || null,
            inventory_count: v.inventory_count ?? 0,
        }));

        const { error: insertErr } = await supabaseAdmin
            .from("product_variants")
            .insert(toInsert);

        if (insertErr) {
            console.error("[admin/products POST] variant insert failed:", insertErr.message);
            return NextResponse.json({ error: `Variant insert failed: ${insertErr.message}` }, { status: 500 });
        }

        // Sync product-level inventory_count to variant sum. The product was
        // inserted with the 9999 sentinel; leaving it there would read as
        // unlimited stock for a product that does track inventory.
        await syncProductStockFromVariants(data.id);
    }

    revalidatePath("/", "page");
    revalidatePath("/shop", "page");
    revalidatePath("/catalog/products", "page");
    revalidateTag("products", "max");

    // Activity logging is telemetry — run after the response so the UI isn't blocked on it
    after(() => logActivity({
        userId: user.id,
        userRole: caller.role,
        actionType: "CREATE",
        resource: "product",
        resourceId: data.id,
        details: { name: name, slug: data.slug }
    }));

    return NextResponse.json({ success: true, product: data });
}

export async function PATCH(req: NextRequest) {
    // Auth check — only admin/owner/sales_staff can update products
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Role check and old-record fetch (for activity-log diffing) are independent
    // reads — run them in parallel to cut one DB round trip per update.
    const [{ data: caller }, { data: oldData }] = await Promise.all([
        supabaseAdmin.from("profiles").select("role").eq("id", user.id).single(),
        supabaseAdmin.from("products").select("*").eq("id", id).single(),
    ]);

    if (!caller || !["admin", "owner", "sales_staff"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        revalidateTag("products", "max");
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
        available_brands,
        brand_variants,
        is_active,
        wholesale_override,
        wholesale_price_tier_1,
        wholesale_price_tier_2,
        wholesale_price_tier_3,
        variants,
        inventory_baseline,
    } = fields;

    // Stock is never written as an absolute value from this form.
    //
    // The form loads inventory_count when the page opens; posting that number
    // back reverted every sale that settled while the form was on screen, so
    // stock climbed on its own and the same unit sold twice. Instead the form
    // sends what it loaded (inventory_baseline) alongside what the staff member
    // typed, and only the difference is applied — see the fn_adjust_stock call
    // below. `inventory_count` stays out of updateFields entirely for tracked
    // products; the 9999 sentinel is still written when tracking is off, which
    // is the one case where the column is a flag rather than a count.
    const productStockDelta =
        track_inventory && !track_variant_inventory && Number.isFinite(Number(inventory_baseline))
            ? Number(inventory_count) - Number(inventory_baseline)
            : 0;

    // No baseline means an older client (or another caller) that still posts an
    // absolute count. Honour it rather than silently ignoring the edit.
    const absoluteStockWrite =
        track_inventory && !track_variant_inventory && !Number.isFinite(Number(inventory_baseline))
            ? { inventory_count: Number(inventory_count) }
            : {};

    const updateFields = {
        name,
        slug,
        sku: sku ?? null,
        price_ghs: Number(price_ghs),
        compare_at_price_ghs: compare_at_price_ghs != null && compare_at_price_ghs !== "" ? Number(compare_at_price_ghs) : null,
        is_sale: is_sale ?? false,
        discount_value: discount_value != null ? Number(discount_value) : 0,
        ...(track_inventory ? absoluteStockWrite : { inventory_count: 9999 }),
        track_inventory: track_inventory ?? true,
        track_variant_inventory: track_variant_inventory ?? false,
        description,
        category_type,
        category_ids: category_ids ?? [],
        image_urls: image_urls ?? [],
        available_sizes: available_sizes ?? [],
        available_colors: available_colors ?? [],
        available_brands: available_brands ?? [],
        brand_variants: brand_variants ?? null,
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

    // Product-level stock for a product that does not track by variant.
    if (productStockDelta !== 0) {
        try {
            await adjustStock(id, null, productStockDelta);
        } catch (e: any) {
            console.error("[admin/products PATCH] stock adjust failed:", e?.message, { id, productStockDelta });
            return NextResponse.json({ error: "Stock update failed. Nothing was changed." }, { status: 500 });
        }
    }

    if (variants && variants.length > 0) {
        // Variant rows are matched and adjusted in place — never deleted and
        // re-inserted. The old delete-then-insert issued brand new variant IDs,
        // which orphaned every live online_reservations row (the route deleted
        // them outright to get past the FK), so customers on the Paystack page
        // lost their hold and their unit went back on sale mid-checkout.
        const { data: existingVariants, error: readErr } = await supabaseAdmin
            .from("product_variants")
            .select("id, size, color, brand, sku, inventory_count")
            .eq("product_id", id)
            .order("id", { ascending: true });

        if (readErr) {
            console.error("[admin/products PATCH] variant read failed:", readErr.message);
            return NextResponse.json({ error: `Variant read failed: ${readErr.message}` }, { status: 500 });
        }

        const keyOf = (v: { size?: string | null; color?: string | null; brand?: string | null }) =>
            `${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.brand)}`;

        // 20 duplicate (product, size, colour, brand) rows exist in production and
        // there is no unique constraint to lean on, so first row wins and the rest
        // are left untouched rather than being merged away.
        const existingByKey = new Map<string, any>();
        for (const v of existingVariants ?? []) {
            if (!existingByKey.has(keyOf(v))) existingByKey.set(keyOf(v), v);
        }

        const submittedKeys = new Set<string>();
        const toInsert: any[] = [];

        for (const v of variants) {
            const key = keyOf(v);
            submittedKeys.add(key);
            const existing = existingByKey.get(key);
            const desired = Number(v.inventory_count ?? 0);

            if (!existing) {
                toInsert.push({
                    product_id: id,
                    size: v.size || null,
                    color: v.color || null,
                    brand: v.brand || null,
                    sku: v.sku || null,
                    inventory_count: Number.isFinite(desired) ? desired : 0,
                });
                continue;
            }

            // Same delta rule as the product-level count: apply only what the
            // staff member changed, so a sale that settled while the form was
            // open is not overwritten.
            const baseline = Number.isFinite(Number(v.baseline))
                ? Number(v.baseline)
                : Number(existing.inventory_count ?? 0);
            const delta = (Number.isFinite(desired) ? desired : baseline) - baseline;

            if (delta !== 0) {
                try {
                    await adjustStock(id, existing.id, delta);
                } catch (e: any) {
                    console.error("[admin/products PATCH] variant stock adjust failed:", e?.message, { id, variantId: existing.id, delta });
                    return NextResponse.json({ error: "Stock update failed. Nothing was changed." }, { status: 500 });
                }
            }

            const nextSku = v.sku || null;
            if (nextSku !== (existing.sku ?? null)) {
                await supabaseAdmin.from("product_variants").update({ sku: nextSku }).eq("id", existing.id);
            }
        }

        if (toInsert.length > 0) {
            const { error: insertErr } = await supabaseAdmin.from("product_variants").insert(toInsert);
            if (insertErr) {
                console.error("[admin/products PATCH] variant insert failed:", insertErr.message);
                return NextResponse.json({ error: `Variant insert failed: ${insertErr.message}` }, { status: 500 });
            }
        }

        const removed = (existingVariants ?? []).filter(v => !submittedKeys.has(keyOf(v)));
        await deleteVariantsUnlessHeld(removed.map((v: any) => v.id), id);

        if (track_inventory && track_variant_inventory) {
            await syncProductStockFromVariants(id);
        }
    } else if (variants !== undefined) {
        // Variants sent as an empty array — the staff member turned variant
        // options off. Rows a live checkout is holding stay put; deleting them
        // would cancel that customer's hold mid-payment.
        const { data: existingVariants } = await supabaseAdmin
            .from("product_variants").select("id").eq("product_id", id);
        await deleteVariantsUnlessHeld((existingVariants ?? []).map((v: any) => v.id), id);
    }

    revalidatePath("/", "page");
    revalidatePath("/shop", "page");
    revalidatePath("/catalog/products", "page");
    revalidateTag("products", "max");

    // Activity logging is telemetry — run after the response so the UI isn't blocked on it
    after(() => logActivity({
        userId: user.id,
        userRole: caller.role,
        actionType: "UPDATE",
        resource: "product",
        resourceId: id,
        oldData,
        newData: updateFields
    }));

    return NextResponse.json({ success: true });
}
