// src/lib/inventory.ts
// THE ONLY FILE ALLOWED TO WRITE TO inventory_count COLUMNS.
// All routes must import from here. Never touch products.inventory_count
// or product_variants.inventory_count directly in route handlers.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normAttr, variantKey, hasVariantAttrs } from "@/lib/utils/normAttr";

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

/** One settlement line, in the shape the ledger functions expect. */
export type SaleLine = { product_id: string; variant_id: string | null; quantity: number };

/**
 * Records a settlement in the stock ledger.
 *
 * Keyed on (order, product, variant), so the two callers that can both settle
 * one payment — the webhook and the verify route — write the same keys and the
 * second one is suppressed instead of taking the stock twice. That race used to
 * be invisible: the webhook's idempotency check was a plain read while verify's
 * was an atomic claim, so both could pass, and the duplicate decrement looked
 * exactly like a second sale.
 *
 * Throws on failure. A throw is now safe to let through: the caller retries,
 * finds the reservation gone, falls back to the order items, and produces the
 * same keys — so the retry settles correctly instead of double-counting.
 */
async function recordSale(orderId: string, lines: SaleLine[]): Promise<number> {
    const items = lines.filter(l => l.product_id && (l.quantity ?? 0) > 0);
    if (!items.length) return 0;

    const { data, error } = await supabaseAdmin.rpc("fn_record_sale", {
        p_order_id: orderId,
        p_items: items,
    });
    if (error) {
        console.error("[inventory] fn_record_sale failed:", error.message, { orderId });
        throw new Error(error.message);
    }
    return Number(data) || 0;
}

/**
 * Resolves cart/order lines to current variant IDs by (size, colour, brand).
 *
 * Stored lines carry the attributes the customer chose, not a variant UUID —
 * and any UUID they do carry goes stale the moment a product re-save recreates
 * its variant rows. 265 paid lines in production point at variant IDs that no
 * longer exist. Matching on attributes through variantKey is the durable route;
 * the stored UUID is only a last resort.
 */
async function resolveSaleLines(
    items: Array<{ productId: string; size?: string; color?: string; brand?: string; variantId?: string | null; quantity?: number }>,
): Promise<SaleLine[]> {
    const pIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
    if (!pIds.length) return [];

    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, track_inventory, track_variant_inventory")
        .in("id", pIds);
    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

    const variantTracked = new Set<string>(
        (products ?? []).filter((p: any) => p.track_variant_inventory).map((p: any) => p.id as string),
    );

    const lookup: Record<string, string> = {};
    if (variantTracked.size > 0) {
        const { data: variants } = await supabaseAdmin
            .from("product_variants")
            .select("id, product_id, size, color, brand")
            .in("product_id", [...variantTracked]);
        for (const v of variants ?? []) lookup[variantKey(v.product_id, v)] = v.id;
    }

    const out: SaleLine[] = [];
    for (const item of items) {
        const product = productMap.get(item.productId) as any;
        if (!product || product.track_inventory === false) continue;

        const variantId = product.track_variant_inventory
            ? (lookup[variantKey(item.productId, item)] ?? item.variantId ?? null)
            : null;

        out.push({ product_id: item.productId, variant_id: variantId, quantity: item.quantity ?? 1 });
    }
    return out;
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
                const key = variantKey(v.product_id, v);
                variantStockMap[key] = (v as any).inventory_count ?? 0;
                variantIdMap[key] = (v as any).id;
            }
        }
    }

    // Availability nets off live POS + online holds. Without it this check
    // green-lights stock another in-flight order already holds, and the buyer
    // only discovers it when reservation fails at payment time.
    const resolve = (item: ReserveItem, product: any) => {
        const key = variantKey(item.productId, item);
        return product.track_variant_inventory && hasVariantAttrs(item) ? (variantIdMap[key] ?? null) : null;
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

        const key = variantKey(item.productId, item);
        const rawStock = product.track_variant_inventory && hasVariantAttrs(item)
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
            const key = variantKey(v.product_id, v);
            variantStockMap[key] = (v as any).inventory_count ?? 0;
            variantIdMap[key] = (v as any).id;
        }
    }

    const keyFor = (item: ReserveItem) =>
        variantKey(item.productId, item);
    const resolve = (item: ReserveItem, product: any) =>
        product?.track_variant_inventory && hasVariantAttrs(item) ? (variantIdMap[keyFor(item)] ?? null) : null;

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

        const rawAvailable = product.track_variant_inventory && hasVariantAttrs(item)
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

    // Through the ledger, keyed on (order, product, variant). The reservation
    // rows already carry resolved variant IDs, so these are the authoritative
    // keys — a later fallback for the same order recomputes them identically
    // and is suppressed rather than decrementing a second time.
    await recordSale(
        orderId,
        (reservations as any[]).map(r => ({
            product_id: r.product_id,
            variant_id: r.variant_id ?? null,
            quantity: r.quantity,
        })),
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
 * Releases the stock a customer's own earlier, abandoned checkout attempt is
 * still holding, so their retry is not refused by their own reservation.
 *
 * A customer who reaches Paystack and comes back clicks Pay again. That creates
 * a fresh order, and fn_reserve_online_stock counts the previous attempt's hold
 * against them — so the retry fails with "just sold out" until the hold expires.
 * Observed in production: one customer made six consecutive attempts in three
 * minutes, all refused, and eventually removed an item from her basket to get
 * through.
 *
 * Safety, in three parts, because a settlement can be running concurrently:
 *  - only orders still pending on both status columns are considered;
 *  - the cancel is a CONDITIONAL update, re-checking both columns, so it can
 *    never flip an order that has just been marked paid;
 *  - if this deletes reservation rows a settling webhook was about to consume,
 *    confirmSale finds none, returns false, and the caller's
 *    fallbackDecrementFromItems still takes the stock down from order items.
 *
 * Note the payment_status CHECK constraint allows only pending / paid /
 * refunded / cancelled — there is no in-flight 'processing' value to test for,
 * which is why the conditional update carries the weight here.
 */
export async function releaseSupersededAttempts(opts: {
    email: string;
    currentOrderId: string;
    previousOrderId?: string | null;
    withinMinutes?: number;
}): Promise<number> {
    const { email, currentOrderId, previousOrderId, withinMinutes = 30 } = opts;
    const cutoff = new Date(Date.now() - withinMinutes * 60_000).toISOString();

    const { data: stale } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("customer_email", email)
        .eq("status", "pending")
        .eq("payment_status", "pending")
        .neq("id", currentOrderId)
        .gte("created_at", cutoff);

    const ids = new Set((stale ?? []).map((o: { id: string }) => o.id));

    // The browser reports which attempt it is abandoning. Outside the window
    // above it would otherwise be missed, so confirm it against the same guards.
    if (previousOrderId && previousOrderId !== currentOrderId && !ids.has(previousOrderId)) {
        const { data: prev } = await supabaseAdmin
            .from("orders")
            .select("id, status, payment_status")
            .eq("id", previousOrderId)
            .maybeSingle();
        if (prev && prev.status === "pending" && prev.payment_status === "pending") ids.add(prev.id);
    }

    if (ids.size === 0) return 0;

    const list = [...ids];

    // Cancel first, conditionally: an order that has just settled fails both
    // predicates and is left alone, and its rows are then not released either.
    const { data: cancelled } = await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .in("id", list)
        .eq("status", "pending")
        .eq("payment_status", "pending")
        .select("id");

    const released = (cancelled ?? []).map((o: { id: string }) => o.id);
    if (released.length === 0) return 0;

    await Promise.all(released.map(id => releaseReservation(id)));
    console.warn(`[checkout] released ${released.length} superseded attempt(s) for ${email.slice(0, 3)}***`);
    return released.length;
}

/**
 * Fallback decrement from an order's stored items, used when no reservation row
 * exists (order predates the reservation system, or the row was never created).
 * Resolves current variant IDs by (size, color, brand) and decrements variant +
 * product-level stock. This is the ONLY sanctioned direct-decrement path for the
 * online checkout fallbacks — keeps inventory writes inside this file.
 */
export async function fallbackDecrementFromItems(
    orderId: string | null,
    items: Array<{ productId: string; size?: string; color?: string; brand?: string; variantId?: string | null; quantity?: number }>,
): Promise<void> {
    if (!items?.length) return;

    const lines = await resolveSaleLines(items);
    if (!lines.length) return;

    // With an order id this goes through the ledger under the same keys
    // confirmSale would have used, so the webhook and the verify route can both
    // reach here for one payment and only the first takes the stock.
    if (orderId) {
        await recordSale(orderId, lines);
        return;
    }

    // No order context — the legacy single-product charge. Nothing to key on,
    // so this stays an unguarded decrement, recorded as such in the ledger.
    await Promise.allSettled(
        lines.map(l => decrementStock(l.product_id, l.variant_id, l.quantity)),
    );
}

/**
 * Signed stock adjustment for admin edits. Positive restocks, negative removes.
 *
 * The admin form used to post the counts it had loaded when the page opened,
 * which silently reverted every sale that settled while the form was on screen.
 * A delta carries only what the staff member actually changed, so a concurrent
 * sale survives the save.
 */
export async function adjustStock(
    productId: string,
    variantId: string | null,
    delta: number,
): Promise<void> {
    if (!delta) return;
    const { error } = await supabaseAdmin.rpc("fn_adjust_stock", {
        p_product_id: productId,
        p_variant_id: variantId,
        p_delta: delta,
    });
    if (error) throw new Error(error.message);
}

/**
 * Recomputes products.inventory_count from the variant rows.
 *
 * Run after a save adds or removes variants. Also repairs products stranded at
 * the 9999 "not tracked" sentinel, which read as unlimited stock.
 */
export async function syncProductStockFromVariants(productId: string): Promise<void> {
    const { error } = await supabaseAdmin.rpc("fn_sync_product_stock_from_variants", {
        p_product_id: productId,
    });
    if (error) console.error("[inventory] stock sync failed:", error.message, { productId });
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
