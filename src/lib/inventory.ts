// src/lib/inventory.ts
// THE ONLY FILE ALLOWED TO WRITE TO inventory_count COLUMNS.
// All routes must import from here. Never touch products.inventory_count
// or product_variants.inventory_count directly in route handlers.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normAttr } from "@/lib/utils/normAttr";

export type ReserveItem = {
    productId: string;
    variantId?: string | null;
    size?: string;
    color?: string;
    stitching?: string;
    quantity: number;
};

export type StockStatus = {
    productId: string;
    variantId?: string | null;
    available: number;
    isActive: boolean;
    preorderEnabled: boolean;
};

export type StockCheckResult =
    | { ok: true }
    | { ok: false; code: "INSUFFICIENT_STOCK" | "PRODUCT_UNAVAILABLE"; item: string; available: number };

/**
 * Read-only availability check. Does NOT hold stock.
 * Use for cart drawer validation and checkout page pre-check.
 */
export async function checkStock(items: ReserveItem[]): Promise<StockCheckResult> {
    if (!items.length) return { ok: true };

    const pIds = [...new Set(items.map(i => i.productId))];

    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, inventory_count, track_variant_inventory, is_active, preorder_enabled, name")
        .in("id", pIds);

    if (!products?.length) {
        return { ok: false, code: "PRODUCT_UNAVAILABLE", item: pIds[0], available: 0 };
    }

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const variantTrackedIds = products
        .filter((p: any) => p.track_variant_inventory)
        .map((p: any) => p.id);

    const variantStockMap: Record<string, number> = {};

    if (variantTrackedIds.length > 0) {
        const variantItems = items.filter(i => variantTrackedIds.includes(i.productId));
        if (variantItems.length > 0) {
            const { data: variants } = await supabaseAdmin
                .from("product_variants")
                .select("product_id, size, color, stitching, inventory_count")
                .in("product_id", variantTrackedIds);

            for (const v of variants ?? []) {
                const key = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.stitching)}`;
                variantStockMap[key] = (v as any).inventory_count ?? 0;
            }
        }
    }

    for (const item of items) {
        const product = productMap.get(item.productId) as any;
        if (!product?.is_active) {
            return { ok: false, code: "PRODUCT_UNAVAILABLE", item: item.productId, available: 0 };
        }
        if (product.preorder_enabled) continue;

        let stock: number;
        if (product.track_variant_inventory && item.size) {
            const key = `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.stitching)}`;
            stock = variantStockMap[key] ?? 0;
        } else {
            stock = product.inventory_count ?? 0;
        }

        if (stock !== 9999 && item.quantity > stock) {
            return { ok: false, code: "INSUFFICIENT_STOCK", item: item.productId, available: stock };
        }
    }

    return { ok: true };
}

/**
 * Batch stock status for multiple items. Used by GET /api/inventory/check.
 */
export async function getStockStatus(items: ReserveItem[]): Promise<StockStatus[]> {
    if (!items.length) return [];

    const pIds = [...new Set(items.map(i => i.productId))];

    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, inventory_count, track_variant_inventory, is_active, preorder_enabled")
        .in("id", pIds);

    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

    const variantTrackedIds = (products ?? [])
        .filter((p: any) => p.track_variant_inventory)
        .map((p: any) => p.id);

    const variantStockMap: Record<string, number> = {};

    if (variantTrackedIds.length > 0) {
        const { data: variants } = await supabaseAdmin
            .from("product_variants")
            .select("product_id, size, color, stitching, inventory_count")
            .in("product_id", variantTrackedIds);

        for (const v of variants ?? []) {
            const key = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.stitching)}`;
            variantStockMap[key] = (v as any).inventory_count ?? 0;
        }
    }

    return items.map(item => {
        const product = productMap.get(item.productId) as any;
        if (!product) {
            return { productId: item.productId, variantId: item.variantId, available: 0, isActive: false, preorderEnabled: false };
        }

        let available: number;
        if (product.track_variant_inventory && item.size) {
            const key = `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.stitching)}`;
            available = variantStockMap[key] ?? 0;
        } else {
            available = product.inventory_count ?? 0;
        }

        return {
            productId: item.productId,
            variantId: item.variantId ?? null,
            available,
            isActive: product.is_active ?? true,
            preorderEnabled: product.preorder_enabled ?? false,
        };
    });
}

/**
 * Atomic reservation. Acquires row-level DB lock via fn_reserve_online_stock.
 * Throws if any item is unavailable or the product is inactive.
 * MUST be called BEFORE initialising the Paystack transaction.
 */
export async function reserveStock(orderId: string, items: ReserveItem[]): Promise<void> {
    const rpcItems = items.map(i => ({
        product_id: i.productId,
        variant_id: i.variantId ?? null,
        quantity: i.quantity,
    }));

    const { error } = await supabaseAdmin.rpc("fn_reserve_online_stock", {
        p_order_id: orderId,
        p_items: rpcItems,
    });

    if (error) throw new Error(error.message);
}

/**
 * Converts a reservation into a confirmed sale.
 * Reads reservation quantities, decrements inventory_count, deletes the reservation row.
 * Called exclusively from the webhook on charge.success.
 *
 * Late webhook handling: the cron marks orders expired but intentionally does NOT delete
 * the reservation row. A late Paystack webhook still finds the row and decrements correctly.
 */
export async function confirmSale(orderId: string): Promise<void> {
    const { data: reservations, error: fetchError } = await supabaseAdmin
        .from("online_reservations")
        .select("product_id, variant_id, quantity, expires_at")
        .eq("order_id", orderId);

    if (fetchError) throw new Error(fetchError.message);
    if (!reservations?.length) {
        // No reservation found — order predates the reservation system.
        // The webhook's legacy fallback block (using parsedItems) will handle this.
        return;
    }

    const now = new Date();
    const isLate = reservations.some((r: any) => new Date(r.expires_at) < now);
    if (isLate) {
        console.warn(`[confirmSale] Late webhook for order ${orderId}: reservation expired but payment confirmed — processing sale`);
    }

    // Decrement variant-level stock
    const variantRows = reservations.filter((r: any) => r.variant_id);
    if (variantRows.length > 0) {
        const vIds = variantRows.map((r: any) => r.variant_id!);
        const { data: variants } = await supabaseAdmin
            .from("product_variants")
            .select("id, inventory_count")
            .in("id", vIds);

        const variantMap = new Map((variants ?? []).map((v: any) => [v.id, v.inventory_count ?? 0]));

        await Promise.all(
            variantRows.map((r: any) =>
                supabaseAdmin
                    .from("product_variants")
                    .update({ inventory_count: Math.max(0, (variantMap.get(r.variant_id) ?? 0) - r.quantity) })
                    .eq("id", r.variant_id)
            )
        );
    }

    // Decrement product-level stock (aggregate quantity per product)
    const qtyByProduct: Record<string, number> = {};
    for (const r of reservations as any[]) {
        qtyByProduct[r.product_id] = (qtyByProduct[r.product_id] ?? 0) + r.quantity;
    }

    const pIds = Object.keys(qtyByProduct);
    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, inventory_count")
        .in("id", pIds);

    const productMap = new Map((products ?? []).map((p: any) => [p.id, p.inventory_count ?? 0]));

    await Promise.all(
        Object.entries(qtyByProduct).map(([productId, qty]) =>
            supabaseAdmin
                .from("products")
                .update({ inventory_count: Math.max(0, (productMap.get(productId) ?? 0) - qty) })
                .eq("id", productId)
        )
    );

    // Delete the reservation row — sale is confirmed
    await supabaseAdmin
        .from("online_reservations")
        .delete()
        .eq("order_id", orderId);
}

/**
 * Releases a reservation back to available stock without decrementing.
 * Called on payment failure or order cancellation.
 * The cron does NOT call this — it only marks orders expired, leaving rows intact.
 */
export async function releaseReservation(orderId: string): Promise<void> {
    await supabaseAdmin
        .from("online_reservations")
        .delete()
        .eq("order_id", orderId);
}

/**
 * Direct decrement without a reservation. POS webhook only.
 * Do not use for new online checkout paths.
 */
export async function decrementDirect(
    productId: string,
    variantId: string | null,
    quantity: number,
    _reason: string
): Promise<void> {
    if (variantId) {
        const { data } = await supabaseAdmin
            .from("product_variants")
            .select("inventory_count")
            .eq("id", variantId)
            .single();
        await supabaseAdmin
            .from("product_variants")
            .update({ inventory_count: Math.max(0, (data?.inventory_count ?? 0) - quantity) })
            .eq("id", variantId);
    } else {
        const { data } = await supabaseAdmin
            .from("products")
            .select("inventory_count")
            .eq("id", productId)
            .single();
        await supabaseAdmin
            .from("products")
            .update({ inventory_count: Math.max(0, (data?.inventory_count ?? 0) - quantity) })
            .eq("id", productId);
    }
}
