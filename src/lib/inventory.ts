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
    brand?: string;
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
 * The single sanctioned way to reduce stock.
 *
 * Every decrement in this file used to read inventory_count and write back
 * count - qty in a separate statement. Two orders for the same product settling
 * at the same moment both read the same starting value, so one decrement was
 * lost and the item oversold. fn_decrement_stock does it in one UPDATE, where
 * the row lock makes concurrent decrements queue instead of racing.
 */
async function decrementStock(productId: string, variantId: string | null, quantity: number): Promise<void> {
    const { error } = await supabaseAdmin.rpc("fn_decrement_stock", {
        p_product_id: productId,
        p_variant_id: variantId,
        p_quantity: quantity,
    });
    if (error) console.error("[inventory] fn_decrement_stock failed:", error.message, { productId, variantId, quantity });
}

/**
 * Availability for (product, variant) pairs, net of live POS and online holds.
 * Reading raw inventory_count lets two buyers each see the last unit as free.
 * Falls back to null when the RPC is unavailable so callers can degrade.
 */
async function availabilityMap(
    pairs: Array<{ productId: string; variantId: string | null }>,
): Promise<Map<string, number> | null> {
    if (!pairs.length) return new Map();
    const { data, error } = await supabaseAdmin.rpc("fn_available_stock_batch", {
        p_items: pairs.map(p => ({ product_id: p.productId, variant_id: p.variantId })),
    });
    if (error || !Array.isArray(data)) return null;
    return new Map(
        (data as any[]).map(r => [`${r.product_id}|${r.variant_id ?? "null"}`, Number(r.available)]),
    );
}

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
    const variantIdMap: Record<string, string> = {};

    if (variantTrackedIds.length > 0) {
        const variantItems = items.filter(i => variantTrackedIds.includes(i.productId));
        if (variantItems.length > 0) {
            const { data: variants } = await supabaseAdmin
                .from("product_variants")
                .select("id, product_id, size, color, brand, inventory_count")
                .in("product_id", variantTrackedIds);

            for (const v of variants ?? []) {
                const key = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.brand)}`;
                variantStockMap[key] = (v as any).inventory_count ?? 0;
                variantIdMap[key] = (v as any).id;
            }
        }
    }

    // Availability nets off live POS + online holds. Without it this check
    // green-lights stock another in-flight order already holds, and the buyer
    // only discovers it when reservation fails at payment time.
    const resolve = (item: ReserveItem, product: any) => {
        const key = `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.brand)}`;
        return product.track_variant_inventory && item.size ? (variantIdMap[key] ?? null) : null;
    };
    const netAvailable = await availabilityMap(
        items
            .map(i => ({ item: i, product: productMap.get(i.productId) as any }))
            .filter(x => x.product && !x.product.preorder_enabled)
            .map(x => ({ productId: x.item.productId, variantId: resolve(x.item, x.product) })),
    );

    for (const item of items) {
        const product = productMap.get(item.productId) as any;
        if (!product?.is_active) {
            return { ok: false, code: "PRODUCT_UNAVAILABLE", item: item.productId, available: 0 };
        }
        if (product.preorder_enabled) continue;

        const key = `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.brand)}`;
        const rawStock = product.track_variant_inventory && item.size
            ? (variantStockMap[key] ?? 0)
            : (product.inventory_count ?? 0);

        // 9999 is the "not tracked" sentinel — never gate on it
        if (rawStock === 9999) continue;

        const netKey = `${item.productId}|${resolve(item, product) ?? "null"}`;
        const stock = netAvailable?.get(netKey) ?? rawStock;

        if (item.quantity > stock) {
            return { ok: false, code: "INSUFFICIENT_STOCK", item: item.productId, available: Math.max(0, stock) };
        }
    }

    return { ok: true };
}

/**
 * Batch stock status for multiple items. Used by GET /api/inventory/check.
 *
 * `excludeOrderId` is the caller's own pending order. Availability nets off
 * every live hold, so a customer who reached Paystack and came back without
 * paying was told their own item had sold out — they were competing with their
 * own reservation. Adding that order's quantities back keeps everyone else's
 * holds counting while the customer's own does not count against them.
 */
export async function getStockStatus(
    items: ReserveItem[],
    opts: { excludeOrderId?: string } = {},
): Promise<StockStatus[]> {
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
    const variantIdMap: Record<string, string> = {};

    if (variantTrackedIds.length > 0) {
        const { data: variants } = await supabaseAdmin
            .from("product_variants")
            .select("id, product_id, size, color, brand, inventory_count")
            .in("product_id", variantTrackedIds);

        for (const v of variants ?? []) {
            const key = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.brand)}`;
            variantStockMap[key] = (v as any).inventory_count ?? 0;
            variantIdMap[key] = (v as any).id;
        }
    }

    const keyFor = (item: ReserveItem) =>
        `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.brand)}`;
    const resolve = (item: ReserveItem, product: any) =>
        product?.track_variant_inventory && item.size ? (variantIdMap[keyFor(item)] ?? null) : null;

    // Same netting as checkStock — the cart drawer and PDP must not advertise
    // units that are already held by an in-flight order.
    const netAvailable = await availabilityMap(
        items
            .map(i => ({ item: i, product: productMap.get(i.productId) as any }))
            .filter(x => x.product && !x.product.preorder_enabled)
            .map(x => ({ productId: x.item.productId, variantId: resolve(x.item, x.product) })),
    );

    // Quantities held by the caller's own still-pending order, keyed the same
    // way as netAvailable. Only a *pending* order qualifies: once it is paid the
    // reservation rows are deliberately kept for a late webhook to settle, and
    // adding those back would advertise stock that is already sold.
    const ownHolds = await getOwnHolds(opts.excludeOrderId);

    return items.map(item => {
        const product = productMap.get(item.productId) as any;
        if (!product) {
            return { productId: item.productId, variantId: item.variantId, available: 0, isActive: false, preorderEnabled: false };
        }

        const rawAvailable = product.track_variant_inventory && item.size
            ? (variantStockMap[keyFor(item)] ?? 0)
            : (product.inventory_count ?? 0);

        const resolvedVariantId = resolve(item, product);
        const mapKey = `${item.productId}|${resolvedVariantId ?? "null"}`;
        const net = rawAvailable === 9999
            ? rawAvailable
            : (netAvailable?.get(mapKey) ?? rawAvailable);

        // Never report more than physically exists, however the holds add up.
        const withOwn = rawAvailable === 9999
            ? net
            : Math.min(rawAvailable, net + (ownHolds.get(mapKey) ?? 0));

        return {
            productId: item.productId,
            variantId: item.variantId ?? resolvedVariantId,
            available: Math.max(0, withOwn),
            isActive: product.is_active ?? true,
            preorderEnabled: product.preorder_enabled ?? false,
        };
    });
}

/**
 * Live reservation quantities belonging to one still-pending order, keyed
 * product|variant. Empty for anything else — a missing id, an order that is no
 * longer pending, or an expired hold.
 */
async function getOwnHolds(orderId?: string): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!orderId) return out;

    const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("id", orderId)
        .maybeSingle();
    if (!order || order.status !== "pending") return out;

    const { data: rows } = await supabaseAdmin
        .from("online_reservations")
        .select("product_id, variant_id, quantity, expires_at")
        .eq("order_id", orderId);

    const now = Date.now();
    for (const r of rows ?? []) {
        if (new Date(r.expires_at).getTime() < now) continue;
        const key = `${r.product_id}|${r.variant_id ?? "null"}`;
        out.set(key, (out.get(key) ?? 0) + (Number(r.quantity) || 0));
    }
    return out;
}

/**
 * How long an online checkout holds stock while the customer is on Paystack.
 *
 * The DB function defaults to 30, which meant a customer who opened Paystack
 * and backed out could not buy their own item for half an hour — their own
 * hold counted against them. Passing it explicitly keeps that window short
 * without a migration.
 */
export const ONLINE_HOLD_MINUTES = 5;

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
        p_ttl_mins: ONLINE_HOLD_MINUTES,
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
// Returns true if reservations were found and stock was decremented.
// Returns false if no reservation row existed (caller should apply fallback).
export async function confirmSale(orderId: string): Promise<boolean> {
    // Atomically claim the reservation by deleting it and reading the rows back.
    // Only ONE concurrent caller (verify or webhook) gets non-empty rows — the other
    // gets [] and returns false immediately. This prevents double-decrement oversells.
    const { data: reservations, error: deleteError } = await supabaseAdmin
        .from("online_reservations")
        .delete()
        .eq("order_id", orderId)
        .select("product_id, variant_id, quantity, expires_at");

    if (deleteError) throw new Error(deleteError.message);
    if (!reservations?.length) {
        return false; // No reservation, or already claimed by a concurrent caller
    }

    const now = new Date();
    const isLate = reservations.some((r: any) => new Date(r.expires_at) < now);
    if (isLate) {
        console.warn(`[confirmSale] Late webhook for order ${orderId}: reservation expired but payment confirmed — processing sale`);
    }

    // One atomic call per reservation row. fn_decrement_stock takes the variant
    // down (when present) and the product-level count together, so the two can
    // never drift apart.
    await Promise.all(
        (reservations as any[]).map(r =>
            decrementStock(r.product_id, r.variant_id ?? null, r.quantity),
        ),
    );

    return true;
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
 * Fallback decrement from an order's stored items, used when no reservation row
 * exists (order predates the reservation system, or the row was never created).
 * Resolves current variant IDs by (size, color, brand) and decrements variant +
 * product-level stock. This is the ONLY sanctioned direct-decrement path for the
 * online checkout fallbacks — keeps inventory writes inside this file.
 */
export async function fallbackDecrementFromItems(
    items: Array<{ productId: string; size?: string; color?: string; brand?: string; variantId?: string | null; quantity?: number }>,
): Promise<void> {
    if (!items?.length) return;

    const pIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
    if (pIds.length === 0) return;

    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, inventory_count, track_inventory, track_variant_inventory")
        .in("id", pIds);
    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

    const variantTrackedPIds = new Set<string>(
        (products ?? []).filter((p: any) => p.track_variant_inventory).map((p: any) => p.id as string)
    );

    const variantIdLookup: Record<string, string> = {};
    if (variantTrackedPIds.size > 0) {
        const { data: variants } = await supabaseAdmin
            .from("product_variants")
            .select("id, product_id, size, color, brand")
            .in("product_id", [...variantTrackedPIds]);
        for (const v of variants ?? []) {
            const k = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.brand)}`;
            variantIdLookup[k] = v.id;
        }
    }

    await Promise.allSettled(items.map(async (item) => {
        const product = productMap.get(item.productId) as any;
        if (!product || product.track_inventory === false) return;
        const qty = item.quantity ?? 1;

        if (product.track_variant_inventory) {
            const lookupKey = `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.brand)}`;
            const resolvedVariantId = variantIdLookup[lookupKey] ?? item.variantId ?? null;
            await decrementStock(item.productId, resolvedVariantId, qty);
        } else {
            await decrementStock(item.productId, null, qty);
        }
    }));
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
    await decrementStock(productId, variantId, quantity);
}
