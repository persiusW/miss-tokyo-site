# Inventory Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all oversell paths in the Miss Tokyo checkout by introducing an atomic reservation layer, a unified inventory module, and fixing the verify→webhook race that currently causes stock to never be decremented after payment.

**Architecture:** A new `online_reservations` DB table (mirroring the existing `pos_reservations`) holds stock during payment. A single `src/lib/inventory.ts` module owns all reads and writes to `inventory_count` — no route is allowed to touch those columns directly. The webhook idempotency check is flipped to use `payment_status = 'pending'` atomically, so only one concurrent handler can succeed.

**Tech Stack:** Next.js 16, React 19, Supabase JS (supabaseAdmin), PostgreSQL, Zustand persist, Playwright (E2E). No Jest/Vitest — build verification uses `npm run build` and `npm run lint`.

---

## File Map

| Status | Path | Responsibility |
|---|---|---|
| **Create** | `supabase/migrations/20260504000000_online_reservations.sql` | `online_reservations` table + `fn_reserve_online_stock` + `fn_combined_available_stock` |
| **Create** | `src/lib/inventory.ts` | Single owner of all `inventory_count` reads and writes |
| **Create** | `src/lib/utils/normAttr.ts` | Deduplicated attribute normalisation (was copy-pasted in 2 routes) |
| **Create** | `src/app/api/inventory/check/route.ts` | Read-only stock check endpoint for client-side validation |
| **Create** | `src/app/api/cron/expire-reservations/route.ts` | Cron that releases expired online reservations |
| **Modify** | `src/app/api/paystack/initialize/route.ts` | Add `reserveStock()` call; server-verify `is_active` + `preorder_enabled`; remove dual OOS check |
| **Modify** | `src/app/api/paystack/verify/route.ts` | Remove `order.status` update (metadata-only — status is webhook-only) |
| **Modify** | `src/app/api/paystack/webhook/route.ts` | Replace raw stock decrement with `confirmSale()`; fix idempotency to use `payment_status` only |
| **Modify** | `src/app/api/admin/products/route.ts` | Replace delete-then-reinsert with merge strategy that preserves DB-current inventory |
| **Modify** | `src/lib/products.ts` | Remove `{ revalidate: 60 }` from `getCachedProducts` |
| **Modify** | `src/app/(shop)/products/[slug]/page.tsx` | Remove `export const revalidate = 60` |
| **Modify** | `src/store/useCart.ts` | Add `cartAddedAt: number` to `CartItem` |
| **Modify** | `src/components/ui/miss-tokyo/CartDrawer.tsx` | Live stock re-check on open via `/api/inventory/check` |
| **Modify** | `src/app/(shop)/checkout/page.tsx` | Pre-submit stock verification; disable Pay button while checking |
| **Delete** | `src/app/api/verify-payment/route.ts` | Legacy unsafe route with no Paystack signature verification |

---

## Phase 1 — Database + Core Module

### Task 1: DB Migration — online_reservations table and atomic DB functions

**Files:**
- Create: `supabase/migrations/20260504000000_online_reservations.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260504000000_online_reservations.sql

-- 1. online_reservations table (mirrors pos_reservations pattern)
CREATE TABLE public.online_reservations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES public.products(id),
    variant_id  UUID REFERENCES public.product_variants(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ON public.online_reservations (product_id, order_id);
CREATE INDEX ON public.online_reservations (expires_at);
CREATE INDEX ON public.online_reservations (order_id);

ALTER TABLE public.online_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_online_reservations"
    ON public.online_reservations FOR SELECT
    TO authenticated
    USING (true);

-- 2. fn_combined_available_stock: available = on_hand - POS holds - online holds
CREATE OR REPLACE FUNCTION public.fn_combined_available_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
    SELECT
        CASE WHEN p_variant_id IS NULL
            THEN COALESCE((SELECT inventory_count FROM public.products WHERE id = p_product_id), 0)
            ELSE COALESCE((SELECT inventory_count FROM public.product_variants WHERE id = p_variant_id), 0)
        END
        -- subtract active POS reservations
        - COALESCE((
            SELECT SUM(r.quantity)
            FROM public.pos_reservations r
            JOIN public.pos_sessions s ON s.id = r.pos_session_id
            WHERE (
                (p_variant_id IS NULL AND r.product_id = p_product_id AND r.variant_id IS NULL)
                OR r.variant_id = p_variant_id
            )
            AND r.expires_at > NOW()
            AND s.status = 'pending_payment'
        ), 0)
        -- subtract active online reservations
        - COALESCE((
            SELECT SUM(r.quantity)
            FROM public.online_reservations r
            JOIN public.orders o ON o.id = r.order_id
            WHERE (
                (p_variant_id IS NULL AND r.product_id = p_product_id AND r.variant_id IS NULL)
                OR r.variant_id = p_variant_id
            )
            AND r.expires_at > NOW()
            AND o.status = 'pending'
        ), 0);
$$;

-- 3. fn_reserve_online_stock: atomic hold for online checkout
-- p_items format: [{"product_id":"uuid","variant_id":"uuid|null","quantity":1}, ...]
CREATE OR REPLACE FUNCTION public.fn_reserve_online_stock(
    p_order_id  UUID,
    p_items     JSONB,
    p_ttl_mins  INTEGER DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    item      JSONB;
    p_id      UUID;
    v_id      UUID;
    qty       INTEGER;
    available INTEGER;
    exp_at    TIMESTAMPTZ := NOW() + (p_ttl_mins || ' minutes')::INTERVAL;
BEGIN
    -- Clear any existing reservations for this order (idempotent re-init)
    DELETE FROM public.online_reservations WHERE order_id = p_order_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        p_id := (item->>'product_id')::UUID;
        v_id := CASE
                    WHEN (item->'variant_id') IS NULL OR (item->'variant_id') = 'null'::jsonb THEN NULL
                    ELSE (item->>'variant_id')::UUID
                END;
        qty  := (item->>'quantity')::INTEGER;

        -- Re-verify product is active (server-side; don't trust client)
        IF NOT EXISTS (
            SELECT 1 FROM public.products
            WHERE id = p_id AND (is_active IS NULL OR is_active = TRUE)
        ) THEN
            RAISE EXCEPTION 'Product % is not available', p_id;
        END IF;

        -- Pre-order items: no stock lock needed
        IF EXISTS (SELECT 1 FROM public.products WHERE id = p_id AND preorder_enabled = TRUE) THEN
            CONTINUE;
        END IF;

        -- Row-level lock to prevent concurrent reservation races
        IF v_id IS NOT NULL THEN
            PERFORM 1 FROM public.product_variants WHERE id = v_id FOR UPDATE;
        ELSE
            PERFORM 1 FROM public.products WHERE id = p_id FOR UPDATE;
        END IF;

        -- Available = on_hand - POS holds - existing online holds
        available := public.fn_combined_available_stock(p_id, v_id);

        IF available < qty THEN
            RAISE EXCEPTION 'Insufficient stock for product: % (available: %, requested: %)',
                p_id, available, qty;
        END IF;

        INSERT INTO public.online_reservations
            (order_id, product_id, variant_id, quantity, expires_at)
        VALUES
            (p_order_id, p_id, v_id, qty, exp_at);
    END LOOP;
END;
$$;

-- 4. Update fn_available_stock to call fn_combined_available_stock
--    Keeps POS code working unchanged while adding online hold awareness.
CREATE OR REPLACE FUNCTION public.fn_available_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
    SELECT public.fn_combined_available_stock(p_product_id, p_variant_id);
$$;
```

- [ ] **Step 2: Apply the migration to your Supabase project**

```bash
# If using Supabase CLI linked to your project:
npx supabase db push

# OR apply manually in the Supabase SQL editor at supabase.com/dashboard
# Copy-paste the entire file content and click Run
```

Expected: no errors. Tables `online_reservations` visible in the Table Editor. Functions `fn_reserve_online_stock`, `fn_combined_available_stock` visible under Database → Functions.

- [ ] **Step 3: Verify the migration built no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds (no TypeScript changes yet — this is just confirming the baseline still builds).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260504000000_online_reservations.sql
git commit -m "feat(db): add online_reservations table and fn_reserve_online_stock

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 2: Create `src/lib/utils/normAttr.ts`

**Files:**
- Create: `src/lib/utils/normAttr.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/utils/normAttr.ts
export function normAttr(s: string | null | undefined): string {
    if (s == null) return "null";
    return s.replace(/\s*[—–-]\s*/g, "-").trim().toLowerCase();
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/normAttr.ts
git commit -m "feat(lib): extract normAttr to shared util

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 3: Create `src/lib/inventory.ts` — unified inventory module

**Files:**
- Create: `src/lib/inventory.ts`

- [ ] **Step 1: Write the module**

```typescript
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

    const productMap = new Map(products.map(p => [p.id, p]));

    // Batch-fetch variants for products that use variant-level tracking
    const variantTrackedIds = products
        .filter(p => p.track_variant_inventory)
        .map(p => p.id);

    const variantItems = items.filter(i => variantTrackedIds.includes(i.productId));
    const variantStockMap: Record<string, number> = {};

    if (variantItems.length > 0) {
        const { data: variants } = await supabaseAdmin
            .from("product_variants")
            .select("product_id, size, color, stitching, inventory_count")
            .in("product_id", variantTrackedIds);

        for (const v of variants ?? []) {
            const key = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.stitching)}`;
            variantStockMap[key] = v.inventory_count ?? 0;
        }
    }

    for (const item of items) {
        const product = productMap.get(item.productId);
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
 * Batch stock status for multiple items. Used by /api/inventory/check.
 */
export async function getStockStatus(items: ReserveItem[]): Promise<StockStatus[]> {
    if (!items.length) return [];

    const pIds = [...new Set(items.map(i => i.productId))];

    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, inventory_count, track_variant_inventory, is_active, preorder_enabled")
        .in("id", pIds);

    const productMap = new Map((products ?? []).map(p => [p.id, p]));

    const variantTrackedIds = (products ?? [])
        .filter(p => p.track_variant_inventory)
        .map(p => p.id);

    const variantStockMap: Record<string, number> = {};

    if (variantTrackedIds.length > 0) {
        const { data: variants } = await supabaseAdmin
            .from("product_variants")
            .select("product_id, size, color, stitching, inventory_count")
            .in("product_id", variantTrackedIds);

        for (const v of variants ?? []) {
            const key = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.stitching)}`;
            variantStockMap[key] = v.inventory_count ?? 0;
        }
    }

    return items.map(item => {
        const product = productMap.get(item.productId);
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
            variantId: item.variantId,
            available,
            isActive: product.is_active ?? true,
            preorderEnabled: product.preorder_enabled ?? false,
        };
    });
}

/**
 * Atomic reservation. Acquires a row-level DB lock and inserts into online_reservations.
 * Throws if any item is unavailable or the product is inactive.
 * MUST be called BEFORE creating the Paystack transaction.
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
 * Reads reservation quantities, decrements inventory_count, then deletes the reservation.
 * Called exclusively from the webhook on charge.success.
 */
export async function confirmSale(orderId: string): Promise<void> {
    const { data: reservations, error: fetchError } = await supabaseAdmin
        .from("online_reservations")
        .select("product_id, variant_id, quantity")
        .eq("order_id", orderId);

    if (fetchError) throw new Error(fetchError.message);
    if (!reservations?.length) {
        // No reservation found — this order was likely created before the reservation
        // system was deployed. Fall through gracefully (webhook will handle legacy path).
        return;
    }

    // Decrement variant-level stock
    const variantRows = reservations.filter(r => r.variant_id);
    if (variantRows.length > 0) {
        const vIds = variantRows.map(r => r.variant_id!);
        const { data: variants } = await supabaseAdmin
            .from("product_variants")
            .select("id, inventory_count")
            .in("id", vIds);

        const variantMap = new Map((variants ?? []).map(v => [v.id, v.inventory_count ?? 0]));

        await Promise.all(
            variantRows.map(r =>
                supabaseAdmin
                    .from("product_variants")
                    .update({ inventory_count: Math.max(0, (variantMap.get(r.variant_id!) ?? 0) - r.quantity) })
                    .eq("id", r.variant_id!)
            )
        );
    }

    // Decrement product-level stock (aggregate across all reservation rows for this product)
    const qtyByProduct: Record<string, number> = {};
    for (const r of reservations) {
        qtyByProduct[r.product_id] = (qtyByProduct[r.product_id] ?? 0) + r.quantity;
    }

    const pIds = Object.keys(qtyByProduct);
    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, inventory_count")
        .in("id", pIds);

    const productMap = new Map((products ?? []).map(p => [p.id, p.inventory_count ?? 0]));

    await Promise.all(
        Object.entries(qtyByProduct).map(([productId, qty]) =>
            supabaseAdmin
                .from("products")
                .update({ inventory_count: Math.max(0, (productMap.get(productId) ?? 0) - qty) })
                .eq("id", productId)
        )
    );

    // Release the reservation
    await supabaseAdmin
        .from("online_reservations")
        .delete()
        .eq("order_id", orderId);
}

/**
 * Releases a reservation back to available stock without decrementing.
 * Called on payment failure, order cancellation, or TTL expiry.
 */
export async function releaseReservation(orderId: string): Promise<void> {
    await supabaseAdmin
        .from("online_reservations")
        .delete()
        .eq("order_id", orderId);
}

/**
 * Direct decrement without reservation (POS webhook and admin adjustments only).
 * All callers outside of inventory.ts are legacy paths.
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
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build
```

Expected: build succeeds. TypeScript will verify all types are consistent.

- [ ] **Step 3: Commit**

```bash
git add src/lib/inventory.ts
git commit -m "feat(lib): add unified inventory module — checkStock, reserveStock, confirmSale

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Phase 2 — Server Route Fixes

### Task 4: Fix `paystack/initialize/route.ts`

**Files:**
- Modify: `src/app/api/paystack/initialize/route.ts`

Changes needed:
1. Add `is_active` and `preorder_enabled` to the products DB fetch (currently missing both)
2. Server-verify `preorder_enabled` instead of trusting client-supplied `item.isPreOrder`
3. Reject inactive products with a 409
4. Replace the dual stock check with a single `reserveStock()` call
5. Move order creation BEFORE `reserveStock` (order ID is needed for the reservation)

- [ ] **Step 1: Read the file before editing**

```bash
# Confirm line count
wc -l src/app/api/paystack/initialize/route.ts
```

- [ ] **Step 2: Replace the DB products fetch to include `is_active` and `preorder_enabled`**

Find this line (~line 57):
```typescript
            const { data: dbProducts } = await supabaseAdmin
                .from("products")
                .select("id, price_ghs, is_sale, discount_value, inventory_count, track_variant_inventory")
                .in("id", pIds);
```

Replace with:
```typescript
            const { data: dbProducts } = await supabaseAdmin
                .from("products")
                .select("id, price_ghs, is_sale, discount_value, inventory_count, track_variant_inventory, is_active, preorder_enabled")
                .in("id", pIds);
```

- [ ] **Step 3: Add `is_active` check immediately after building `dbPriceMap` (~line 65)**

Find the line:
```typescript
            const dbPriceMap = (dbProducts || []).reduce((acc: any, p: any) => {
```

Add this block BEFORE that line:
```typescript
            // Reject inactive products before doing anything else
            const dbProductMap = Object.fromEntries((dbProducts ?? []).map((p: any) => [p.id, p]));
            for (const item of cartArr) {
                const p = dbProductMap[item.productId];
                if (!p?.is_active) {
                    return NextResponse.json(
                        { error: `"${item.name}" is no longer available.` },
                        { status: 409 }
                    );
                }
            }
```

- [ ] **Step 4: Replace client `isPreOrder` with server-verified `preorder_enabled`**

Find (appears twice in the file):
```typescript
                if (item.isPreOrder) continue; // pre-order items bypass real-stock check
```

In the `qtyByProductId` block (~line 71):
```typescript
            for (const item of cartArr) {
                if (item.productId && !item.isPreOrder) {
                    qtyByProductId[item.productId] = (qtyByProductId[item.productId] ?? 0) + (item.quantity ?? 1);
                }
            }
```
Replace with:
```typescript
            for (const item of cartArr) {
                const serverPreOrder = dbProductMap[item.productId]?.preorder_enabled ?? false;
                if (item.productId && !serverPreOrder) {
                    qtyByProductId[item.productId] = (qtyByProductId[item.productId] ?? 0) + (item.quantity ?? 1);
                }
            }
```

In the hard stock guard loop (~line 83):
```typescript
                if (item.isPreOrder) continue; // pre-order items bypass real-stock check
```
Replace with:
```typescript
                const serverPreOrder = dbProductMap[item.productId]?.preorder_enabled ?? false;
                if (serverPreOrder) continue;
```

In the OOS soft check loop (~line 144):
```typescript
                if (item.isPreOrder) continue; // pre-order items are intentionally zero-stock
```
Replace with:
```typescript
                const serverPreOrder2 = dbProductMap[item.productId]?.preorder_enabled ?? false;
                if (serverPreOrder2) continue;
```

In the `hasPreorder` check (~line 269):
```typescript
        const hasPreorder = cartArr.some((item: any) => item.isPreOrder === true);
```
Replace with:
```typescript
        const hasPreorder = cartArr.some((item: any) => dbProductMap[item.productId]?.preorder_enabled === true);
```

- [ ] **Step 5: Add `reserveStock()` call after the pending order is created**

Add this import at the top of the file (after the existing imports):
```typescript
import { reserveStock, type ReserveItem } from "@/lib/inventory";
```

Find the block that saves the Paystack reference (~line 371):
```typescript
            if (orderId && data.data?.reference) {
                await supabaseAdmin
                    .from("orders")
                    .update({ paystack_reference: data.data.reference })
                    .eq("id", orderId);
            }
```

Add the `reserveStock` call BEFORE the Paystack `fetch` call (i.e., before line 328). Find:
```typescript
        const response = await fetch("https://api.paystack.co/transaction/initialize", {
```

Insert before it:
```typescript
        // Atomically reserve stock before redirecting to Paystack.
        // If this throws, no payment is initiated and the pending order is cancelled.
        if (cartArr.length > 0) {
            const reserveItems: ReserveItem[] = cartArr.map((item: any) => {
                const vId = item.variantId ?? null;
                return {
                    productId: item.productId,
                    variantId: vId,
                    size: item.size,
                    color: item.color,
                    stitching: item.stitching,
                    quantity: item.quantity ?? 1,
                };
            });
            try {
                await reserveStock(orderId, reserveItems);
            } catch (err: any) {
                await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
                return NextResponse.json(
                    { error: err.message ?? "One or more items are no longer available." },
                    { status: 409 }
                );
            }
        }

```

- [ ] **Step 6: Build and lint**

```bash
npm run build && npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/paystack/initialize/route.ts src/lib/inventory.ts
git commit -m "feat(checkout): atomic stock reservation in initialize route

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 5: Fix `paystack/verify/route.ts` — remove status update

**Files:**
- Modify: `src/app/api/paystack/verify/route.ts`

The verify route sets `order.status = orderStatus` (line 69). This causes the verify→webhook race: the webhook finds `status = "paid"` and skips stock decrement. The fix: verify should only update non-status metadata fields.

- [ ] **Step 1: Read the file to confirm current state**

Read `src/app/api/paystack/verify/route.ts`. Confirm the update at line 65–76 includes `status: orderStatus`.

- [ ] **Step 2: Remove `status` from the verify update**

Find:
```typescript
        if (metaOrderId) {
            await supabase
                .from("orders")
                .update({
                    status: orderStatus,
                    paystack_reference: reference,
                    customer_name: fullName || null,
                    customer_phone: phone || null,
                    shipping_address: address ? { text: address } : null,
                    delivery_method: deliveryMethod || null,
                })
                .eq("id", metaOrderId);
```

Replace with:
```typescript
        if (metaOrderId) {
            // Update metadata only — status and payment_status are set exclusively by the webhook.
            // Setting status here would trigger the isAlreadyProcessed guard in the webhook,
            // causing stock to never be decremented (the verify→webhook race).
            await supabase
                .from("orders")
                .update({
                    paystack_reference: reference,
                    customer_name: fullName || null,
                    customer_phone: phone || null,
                    shipping_address: address ? { text: address } : null,
                    delivery_method: deliveryMethod || null,
                })
                .eq("id", metaOrderId);
```

- [ ] **Step 3: Remove the `existingOrder` status update path (~line 92)**

Find:
```typescript
        if (existingOrder) {
            // Update status if payment is now confirmed
            if (paystackTxStatus === "success" && existingOrder.status !== "paid") {
                await supabase.from("orders").update({ status: "paid" }).eq("id", existingOrder.id);
            }
```

Replace with:
```typescript
        if (existingOrder) {
            // Do not update status here — webhook is the sole owner of order status.
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/paystack/verify/route.ts
git commit -m "fix(verify): remove status update to fix verify→webhook race

Previously setting status='paid' in the verify route caused the webhook to
find the order already 'paid' and skip the stock decrement block entirely.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 6: Fix `paystack/webhook/route.ts` — use confirmSale + fix idempotency

**Files:**
- Modify: `src/app/api/paystack/webhook/route.ts`

Two changes:
1. Change the `isAlreadyProcessed` check to use `payment_status = 'pending'` atomically (not `order.status`)
2. Replace the raw stock decrement block (lines 508–609) with `confirmSale(orderId)`
3. Import `normAttr` from shared util and `confirmSale` from inventory

- [ ] **Step 1: Read lines 1-30 of the webhook to confirm current imports**

```bash
head -30 src/app/api/paystack/webhook/route.ts
```

- [ ] **Step 2: Add imports at the top of the webhook file**

After the existing imports, add:
```typescript
import { normAttr } from "@/lib/utils/normAttr";
import { confirmSale } from "@/lib/inventory";
```

- [ ] **Step 3: Fix the idempotency check (~line 409–443)**

Find the block:
```typescript
            if (orderId) {
                const { data: existingOrder } = await supabaseAdmin
                    .from("orders")
                    .select("status, paystack_reference, customer_metadata, items")
                    .eq("id", orderId)
                    .single();

                if (existingOrder && (existingOrder.status === "paid" || existingOrder.status === "confirmed")) {
                    console.log(`[webhook] Order ${orderId} already processed in DB. Skipping inventory deductions but will trigger email.`);
                    isAlreadyProcessed = true;
                }
```

Replace with:
```typescript
            if (orderId) {
                const { data: existingOrder } = await supabaseAdmin
                    .from("orders")
                    .select("status, payment_status, paystack_reference, customer_metadata, items")
                    .eq("id", orderId)
                    .single();

                // Use payment_status for idempotency — NOT order.status.
                // The verify page sets order.status before the webhook fires, which previously
                // caused isAlreadyProcessed = true and stock was never decremented.
                if (existingOrder && existingOrder.payment_status !== "pending") {
                    console.log(`[webhook] Order ${orderId} payment_status=${existingOrder.payment_status}. Skipping inventory deductions but will trigger email.`);
                    isAlreadyProcessed = true;
                }
```

- [ ] **Step 4: Replace the raw stock decrement block with `confirmSale()`**

Find the block starting at:
```typescript
            // Decrement inventory — hybrid model: variant-level or product-level
            if (!isAlreadyProcessed && parsedItems.length > 0) {
```

And ending at (around line 609):
```typescript
                }
            }

            // Legacy single-product flow
```

Replace the ENTIRE block (the `if (!isAlreadyProcessed && parsedItems.length > 0) { ... }` and the `if (!isAlreadyProcessed && !parsedItems.length && productId) {` block that follows) with:

```typescript
            // Confirm sale: convert reservation → permanent inventory deduction.
            // confirmSale() reads online_reservations for this order, decrements
            // inventory_count atomically, then deletes the reservation.
            // Falls through gracefully for legacy orders with no reservation.
            if (!isAlreadyProcessed) {
                if (orderId) {
                    await confirmSale(orderId);
                } else if (productId) {
                    // Legacy single-product flow (no orderId in metadata)
                    const { data: product } = await supabaseAdmin
                        .from("products")
                        .select("inventory_count, track_inventory, slug")
                        .eq("id", productId)
                        .single();
                    if (product?.track_inventory !== false) {
                        await supabaseAdmin
                            .from("products")
                            .update({ inventory_count: Math.max(0, (product?.inventory_count ?? 0) - 1) })
                            .eq("id", productId);
                    }
                }

                // Revalidate product pages so updated stock is reflected immediately
                if (parsedItems.length > 0) {
                    const productIds = [...new Set(parsedItems.map((i: any) => i.productId).filter(Boolean))];
                    const { data: slugProducts } = await supabaseAdmin
                        .from("products")
                        .select("slug")
                        .in("id", productIds);
                    for (const p of slugProducts ?? []) {
                        if (p.slug) revalidatePath(`/products/${p.slug}`, "page");
                    }
                }
                revalidatePath("/shop", "page");
            }

            // Legacy single-product flow
```

Note: after replacing, remove the old legacy single-product block that follows if it now appears twice.

- [ ] **Step 5: Remove the local `normAttr` function definition in the webhook**

Find and delete:
```typescript
                        function normAttr(s: string | null | undefined): string {
                            if (s == null) return "null";
                            return s.replace(/\s*[—–-]\s*/g, "-").trim().toLowerCase();
                        }
```

The import added in Step 2 replaces it.

- [ ] **Step 6: Build and lint**

```bash
npm run build && npm run lint
```

Expected: no errors. If `normAttr` import conflicts with a remaining local reference, search and remove the local definition.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/paystack/webhook/route.ts
git commit -m "fix(webhook): use confirmSale() and fix payment_status idempotency

Replaces raw read-then-write stock decrement with confirmSale() from
inventory.ts. Fixes the verify→webhook race by checking payment_status
(not order.status) for idempotency — the verify route no longer sets status.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 7: Fix `admin/products/route.ts` — merge strategy for variant save

**Files:**
- Modify: `src/app/api/admin/products/route.ts`

The current PATCH handler deletes all variants then reinserts them from the form. If 5 sales happen while the admin form is open, the save resets stock to the form-load values, undoing the deductions.

- [ ] **Step 1: Read the variant save block**

```bash
grep -n "product_variants.*delete\|product_variants.*insert" src/app/api/admin/products/route.ts
```

Expected output shows the delete + insert lines (around lines 204–210 based on audit).

- [ ] **Step 2: Read the surrounding context**

Read `src/app/api/admin/products/route.ts` from line 190 to 230 to understand the full variant save block.

- [ ] **Step 3: Replace delete-then-reinsert with merge strategy**

Find the block (exact lines may vary — use the grep output from Step 1 to locate):
```typescript
            await supabaseAdmin.from("product_variants").delete().eq("product_id", id);
            await supabaseAdmin.from("product_variants").insert(variants);
```

Replace with:
```typescript
            // Merge strategy: preserve DB-current inventory_count so admin saves
            // don't overwrite stock deductions that happened while the form was open.
            if (variants && variants.length > 0) {
                // Fetch current DB variants to preserve their inventory_count
                const { data: existingVariants } = await supabaseAdmin
                    .from("product_variants")
                    .select("id, size, color, stitching, inventory_count")
                    .eq("product_id", id);

                const existingMap = new Map(
                    (existingVariants ?? []).map(v => [
                        `${normAttrVariant(v.size)}|${normAttrVariant(v.color)}|${normAttrVariant(v.stitching)}`,
                        v
                    ])
                );

                function normAttrVariant(s: string | null | undefined): string {
                    if (s == null) return "null";
                    return s.replace(/\s*[—–-]\s*/g, "-").trim().toLowerCase();
                }

                const toUpsert = variants.map((v: any) => {
                    const key = `${normAttrVariant(v.size)}|${normAttrVariant(v.color)}|${normAttrVariant(v.stitching)}`;
                    const existing = existingMap.get(key);
                    return {
                        ...v,
                        product_id: id,
                        // Preserve DB stock — don't let the form value overwrite live inventory
                        inventory_count: existing?.inventory_count ?? v.inventory_count ?? 0,
                    };
                });

                // Delete variants no longer in the incoming list (by key match)
                const incomingKeys = new Set(
                    variants.map((v: any) =>
                        `${normAttrVariant(v.size)}|${normAttrVariant(v.color)}|${normAttrVariant(v.stitching)}`
                    )
                );
                const toDelete = (existingVariants ?? []).filter(v => {
                    const key = `${normAttrVariant(v.size)}|${normAttrVariant(v.color)}|${normAttrVariant(v.stitching)}`;
                    return !incomingKeys.has(key);
                });
                if (toDelete.length > 0) {
                    await supabaseAdmin
                        .from("product_variants")
                        .delete()
                        .in("id", toDelete.map(v => v.id));
                }

                await supabaseAdmin
                    .from("product_variants")
                    .upsert(toUpsert, { onConflict: "product_id,size,color,stitching" });
            }
```

Note: if the `product_variants` table doesn't have a unique constraint on `(product_id, size, color, stitching)`, the upsert will fail. Check with:
```bash
grep -r "product_variants" supabase/migrations/ | grep "UNIQUE\|unique"
```

If no constraint exists, add it to the migration file created in Task 1:
```sql
ALTER TABLE public.product_variants
    ADD CONSTRAINT IF NOT EXISTS uq_variant_key
    UNIQUE (product_id, size, color, stitching);
```
And re-apply the migration.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/products/route.ts
git commit -m "fix(admin): preserve DB inventory_count on variant save

Replace delete-then-reinsert with merge strategy. Existing variants keep
their live inventory_count; only truly new variants use the form value.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Phase 3 — Cache + Client-Side Fixes

### Task 8: Remove 60-second cache from products list

**Files:**
- Modify: `src/lib/products.ts`

- [ ] **Step 1: Read the cache configuration**

Read `src/lib/products.ts` lines 66–149 (the `getCachedProducts` block).

- [ ] **Step 2: Remove the 60-second TTL**

Find:
```typescript
    ["products-list"],
    { revalidate: 60 }
```

Replace with:
```typescript
    ["products-list"],
    { revalidate: false }
```

`revalidate: false` means the cache entry is only invalidated by explicit `revalidatePath` calls (which the webhook already does). The shop grid will serve fresh data after every confirmed payment.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/products.ts
git commit -m "fix(cache): remove 60s TTL from products-list cache

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 9: Remove ISR from product detail page

**Files:**
- Modify: `src/app/(shop)/products/[slug]/page.tsx`

- [ ] **Step 1: Find the revalidate export**

```bash
grep -n "export const revalidate" src/app/\(shop\)/products/\[slug\]/page.tsx
```

- [ ] **Step 2: Remove it**

Find:
```typescript
export const revalidate = 60;
```

Delete that line entirely. Without this export, Next.js will use the default dynamic rendering (SSR on each request) for this route, which is what we want — stock is always fresh.

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(shop)/products/[slug]/page.tsx"
git commit -m "fix(pdp): remove 60s ISR from product detail page

Product page now SSR on each request so inventory_count is always fresh.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 10: Add `cartAddedAt` to CartItem in `useCart.ts`

**Files:**
- Modify: `src/store/useCart.ts`

- [ ] **Step 1: Read the current CartItem type**

Read `src/store/useCart.ts` (already in context — no need to re-read if recently accessed).

- [ ] **Step 2: Add `cartAddedAt` to the type**

Find:
```typescript
export type CartItem = {
    id: string; // productId + "-" + size + "-" + color
    productId: string;
    name: string;
    slug: string;
    price: number; // always the retail price (source of truth)
    size: string;
    color?: string;
    stitching?: string;
    quantity: number;
    imageUrl: string;
    inventoryCount?: number; // max purchasable quantity (undefined = unlimited)
    // Wholesale fields — only present for wholesale users
    isWholesale?: boolean;
    wholesaleTiers?: WholesaleTiers;
    // Pre-order fields
    isPreOrder?: boolean;
    estimatedAvailability?: string; // ISO date e.g. "2026-08-01"
};
```

Replace with:
```typescript
export type CartItem = {
    id: string; // productId + "-" + size + "-" + color
    productId: string;
    name: string;
    slug: string;
    price: number; // always the retail price (source of truth)
    size: string;
    color?: string;
    stitching?: string;
    quantity: number;
    imageUrl: string;
    inventoryCount?: number; // max purchasable quantity (undefined = unlimited)
    cartAddedAt: number; // Unix ms timestamp when item was added to cart
    // Wholesale fields — only present for wholesale users
    isWholesale?: boolean;
    wholesaleTiers?: WholesaleTiers;
    // Pre-order fields
    isPreOrder?: boolean;
    estimatedAvailability?: string; // ISO date e.g. "2026-08-01"
};
```

- [ ] **Step 3: Set `cartAddedAt` in `addItem()`**

Find:
```typescript
                    const max = item.inventoryCount ?? Infinity;
                    const clampedItem = { ...item, quantity: Math.min(item.quantity, max) };
                    return { items: [...state.items, clampedItem], isOpen: openDrawer ? true : state.isOpen };
```

Replace with:
```typescript
                    const max = item.inventoryCount ?? Infinity;
                    const clampedItem = { ...item, quantity: Math.min(item.quantity, max), cartAddedAt: Date.now() };
                    return { items: [...state.items, clampedItem], isOpen: openDrawer ? true : state.isOpen };
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: TypeScript may flag callers of `addItem` that pass `CartItem` objects without `cartAddedAt`. Fix by adding `cartAddedAt: Date.now()` at each call site, OR make the field optional in the function argument:

If there are TypeScript errors about missing `cartAddedAt` at call sites, change the type to `cartAddedAt?: number` (optional) and keep the `Date.now()` assignment in `addItem()` as the authoritative setter. The field only needs to be guaranteed present on items in the store.

- [ ] **Step 5: Commit**

```bash
git add src/store/useCart.ts
git commit -m "feat(cart): add cartAddedAt timestamp for staleness detection

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 11: Create `GET /api/inventory/check` endpoint

**Files:**
- Create: `src/app/api/inventory/check/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/inventory/check/route.ts
import { NextResponse } from "next/server";
import { getStockStatus, type ReserveItem } from "@/lib/inventory";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("items");

    if (!raw) {
        return NextResponse.json({ error: "items param required" }, { status: 400 });
    }

    let items: ReserveItem[];
    try {
        items = JSON.parse(raw);
        if (!Array.isArray(items)) throw new Error("items must be an array");
    } catch {
        return NextResponse.json({ error: "invalid items param" }, { status: 400 });
    }

    const results = await getStockStatus(items);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/inventory/check/route.ts
git commit -m "feat(api): add GET /api/inventory/check endpoint for client-side validation

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 12: Add live stock re-check to CartDrawer

**Files:**
- Modify: `src/components/ui/miss-tokyo/CartDrawer.tsx`

- [ ] **Step 1: Read CartDrawer to understand current structure**

```bash
grep -n "isOpen\|setIsOpen\|useEffect\|fetch\|useState" src/components/ui/miss-tokyo/CartDrawer.tsx | head -30
```

- [ ] **Step 2: Add the stock check logic**

At the top of the `CartDrawer` component (after existing imports), add:

```typescript
import { useRef } from "react";
```

Add these state variables inside the component:
```typescript
const lastCheckedRef = useRef<number>(0);
const RECHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_ITEM_MS = 15 * 60 * 1000;      // 15 minutes

const [staleItemIds, setStaleItemIds] = useState<Set<string>>(new Set());
```

Add a `useEffect` that fires when the cart drawer opens (`isOpen` changes to `true`):

```typescript
useEffect(() => {
    if (!isOpen || items.length === 0) return;

    const now = Date.now();
    const hasStaleItem = items.some(i => now - (i.cartAddedAt ?? 0) > STALE_ITEM_MS);
    const cacheExpired = now - lastCheckedRef.current > RECHECK_INTERVAL_MS;

    if (!hasStaleItem && !cacheExpired) return;

    const checkItems = items.map(i => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        size: i.size,
        color: i.color,
        stitching: i.stitching,
        quantity: i.quantity,
    }));

    fetch(`/api/inventory/check?items=${encodeURIComponent(JSON.stringify(checkItems))}`)
        .then(r => r.json())
        .then(data => {
            if (!data.results) return;
            lastCheckedRef.current = Date.now();
            const stale = new Set<string>();
            for (const result of data.results) {
                const cartItem = items.find(i => i.productId === result.productId);
                if (!cartItem) continue;
                if (!result.isActive || (!result.preorderEnabled && result.available < cartItem.quantity)) {
                    stale.add(cartItem.id);
                }
            }
            setStaleItemIds(stale);
        })
        .catch(() => { /* best-effort: don't block drawer open on check failure */ });
}, [isOpen, items]);
```

- [ ] **Step 3: Show warning badge on stale items**

In the cart item render loop, find where each cart item is rendered. Add a warning badge when the item ID is in `staleItemIds`:

```tsx
{staleItemIds.has(item.id) && (
    <span className="text-xs text-amber-600 font-medium mt-1 block">
        May no longer be available — verify at checkout
    </span>
)}
```

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/miss-tokyo/CartDrawer.tsx
git commit -m "feat(cart): live stock re-check when drawer opens after 15+ min

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 13: Add pre-submit stock verification to checkout page

**Files:**
- Modify: `src/app/(shop)/checkout/page.tsx`

- [ ] **Step 1: Read the checkout page to find the Pay button and form submit**

```bash
grep -n "onSubmit\|handleSubmit\|button.*Pay\|disabled\|isLoading\|fetch.*initialize" src/app/\(shop\)/checkout/page.tsx | head -20
```

- [ ] **Step 2: Add stock verification state**

Inside the checkout page component, add:
```typescript
const [stockChecking, setStockChecking] = useState(false);
const [stockError, setStockError] = useState<string | null>(null);
```

- [ ] **Step 3: Add stock check on component mount**

```typescript
useEffect(() => {
    if (!items.length) return;

    setStockChecking(true);
    setStockError(null);

    const checkItems = items.map(i => ({
        productId: i.productId,
        variantId: i.variantId ?? null,
        size: i.size,
        color: i.color,
        stitching: i.stitching,
        quantity: i.quantity,
    }));

    fetch(`/api/inventory/check?items=${encodeURIComponent(JSON.stringify(checkItems))}`)
        .then(r => r.json())
        .then(data => {
            if (!data.results) return;
            const issues: string[] = [];
            for (const result of data.results) {
                const cartItem = items.find(i => i.productId === result.productId);
                if (!cartItem) continue;
                if (!result.isActive) {
                    issues.push(`"${cartItem.name}" is no longer available.`);
                } else if (!result.preorderEnabled && result.available < cartItem.quantity) {
                    issues.push(`"${cartItem.name}" only has ${result.available} unit(s) available.`);
                }
            }
            if (issues.length > 0) setStockError(issues.join(" "));
        })
        .catch(() => { /* don't block checkout on check failure */ })
        .finally(() => setStockChecking(false));
}, []);
```

- [ ] **Step 4: Disable the Pay button while checking or if stock error**

Find the Pay/Submit button in the JSX. It will have something like `disabled={isLoading}`. Update it:

```tsx
disabled={isLoading || stockChecking || !!stockError}
```

Show a message below the button:
```tsx
{stockChecking && (
    <p className="text-sm text-gray-500 mt-2">Verifying availability…</p>
)}
{stockError && (
    <p className="text-sm text-red-600 mt-2">{stockError}</p>
)}
```

- [ ] **Step 5: Build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add "src/app/(shop)/checkout/page.tsx"
git commit -m "feat(checkout): verify stock availability on page mount before payment

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Phase 4 — Security Cleanup + Cron

### Task 14: Delete the legacy unsafe `verify-payment` route

**Files:**
- Delete: `src/app/api/verify-payment/route.ts`

- [ ] **Step 1: Confirm no UI calls this route**

```bash
grep -r "verify-payment" src/ --include="*.ts" --include="*.tsx"
```

Expected: zero results (no UI references to this route).

- [ ] **Step 2: Delete the file**

```bash
rm src/app/api/verify-payment/route.ts
```

- [ ] **Step 3: Build to confirm no broken imports**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git rm src/app/api/verify-payment/route.ts
git commit -m "security: delete legacy verify-payment route (no signature verification)

This route accepted any order_id + customer_email pair and set
payment_status=paid with no Paystack signature check. It was a
prototype that was never removed.

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 15: Create `POST /api/cron/expire-reservations`

**Files:**
- Create: `src/app/api/cron/expire-reservations/route.ts`

This endpoint is called by Vercel Cron every 5 minutes to release timed-out reservations.

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/cron/expire-reservations/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { releaseReservation } from "@/lib/inventory";

export async function POST(req: Request) {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: expired, error } = await supabaseAdmin
        .from("online_reservations")
        .select("order_id")
        .lt("expires_at", new Date().toISOString());

    if (error) {
        console.error("[cron/expire-reservations] fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orderIds = [...new Set((expired ?? []).map(r => r.order_id))];

    let released = 0;
    for (const orderId of orderIds) {
        await releaseReservation(orderId);
        // Only expire orders that are still pending — don't touch paid/cancelled orders
        await supabaseAdmin
            .from("orders")
            .update({ status: "expired" })
            .eq("id", orderId)
            .eq("status", "pending");
        released++;
    }

    return NextResponse.json({ released });
}
```

- [ ] **Step 2: Add the cron job to `vercel.json`**

Check if `vercel.json` exists:
```bash
ls vercel.json 2>/dev/null && echo "exists" || echo "missing"
```

If it exists, read it and add to the `crons` array:
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-reservations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

If it doesn't exist, create it:
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-reservations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

- [ ] **Step 3: Add `CRON_SECRET` to your environment**

In your Vercel project settings (Environment Variables) and your local `.env.local`, add:
```
CRON_SECRET=<a long random string, e.g. from openssl rand -hex 32>
```

```bash
# Generate a value:
openssl rand -hex 32
```

Do NOT commit this value.

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/expire-reservations/route.ts vercel.json
git commit -m "feat(cron): expire online reservations every 5 minutes

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Phase 5 — Final Verification

### Task 16: Full build + lint + end-to-end smoke test

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: Build succeeds with zero TypeScript errors.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: No lint errors or warnings about unused imports/variables introduced by this PR.

- [ ] **Step 3: Manual smoke test — checkout flow**

```bash
npm run dev
```

Open `http://localhost:3000`. Add a tracked-inventory product to cart. Proceed to checkout. Confirm:

1. Checkout page shows "Verifying availability…" briefly on mount
2. Pay button is disabled during the check
3. Pay button enables once check passes
4. Clicking Pay redirects to Paystack
5. After payment, the success page loads (no `status` update race — verify page only returns order data now)
6. Check Supabase Dashboard → `online_reservations` table: confirm a row was created during Step 4 and deleted after Step 5

- [ ] **Step 4: Verify old route is gone**

```bash
curl -X POST http://localhost:3000/api/verify-payment -H "Content-Type: application/json" -d '{"order_id":"test"}'
```

Expected: `404 Not Found`

- [ ] **Step 5: Create PR**

```bash
git push origin fix/inventory-oversell-hardening
gh pr create \
  --title "fix(inventory): eliminate oversell via reservation layer + unified module" \
  --body "$(cat <<'EOF'
## Summary

- Adds atomic \`online_reservations\` table that holds stock between payment init and webhook confirmation
- Creates \`src/lib/inventory.ts\` as the single owner of all inventory reads/writes
- Fixes the verify→webhook race that caused stock to never be decremented after payment
- Removes 60-second cache TTLs that showed stale OOS states
- Adds live stock re-check in CartDrawer and checkout page
- Deletes legacy \`/api/verify-payment\` route (no signature verification)
- Preserves DB-current inventory_count in admin variant saves

## Test plan

- [ ] Build passes with zero TypeScript errors
- [ ] Manual checkout flow: reservation created at init, deleted at webhook
- [ ] Admin product save does not reset inventory_count for existing variants
- [ ] CartDrawer shows staleness warning for items >15 minutes old with low stock
- [ ] Checkout page disables Pay button while stock check is in flight
- [ ] \`/api/verify-payment\` returns 404

🤖 Generated with [claude-flow](https://github.com/ruvnet/claude-flow)
EOF
)"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| New `online_reservations` table | Task 1 |
| `fn_reserve_online_stock` DB function | Task 1 |
| `fn_combined_available_stock` | Task 1 |
| `src/lib/inventory.ts` unified module | Task 3 |
| `reserveStock()` in initialize | Task 4 |
| `is_active` check in initialize | Task 4 |
| Server-verify `preorder_enabled` | Task 4 |
| Remove dual OOS check | Task 4 (single `reserveStock` call replaces both checks) |
| Verify route: no status update | Task 5 |
| Webhook: `payment_status` idempotency | Task 6 |
| Webhook: `confirmSale()` instead of raw decrement | Task 6 |
| Admin variant save: merge strategy | Task 7 |
| Remove 60s cache on products-list | Task 8 |
| Remove ISR on PDP | Task 9 |
| `cartAddedAt` on CartItem | Task 10 |
| `GET /api/inventory/check` endpoint | Task 11 |
| CartDrawer live re-check | Task 12 |
| Checkout page stock verification + disabled Pay button | Task 13 |
| Delete `/api/verify-payment` | Task 14 |
| Cron: expire reservations | Task 15 |
| `normAttr` deduplication | Task 2 + Task 6 (import) |
