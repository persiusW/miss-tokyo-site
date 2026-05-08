# Inventory Hardening Design
**Date:** 2026-05-03  
**Branch:** fix/inventory-oversell-hardening  
**Author:** Persius A  
**Status:** Approved for Implementation

---

## 1. Problem Statement

The Miss Tokyo storefront currently has three independently exploitable oversell paths, five checkout button verification gaps, a legacy unsafe payment route, and a fundamental architecture problem: no single function owns the sales lifecycle from item selection to confirmed stock deduction. Instead, 4 order creation paths and 3 stock decrement paths exist with no coordination layer between them.

The system also serves stale inventory data for up to 60 seconds due to ISR and unstable_cache TTLs, compounding the race windows.

---

## 2. Full Findings from Deep System Audit

### 2.1 Order Creation Paths (Currently 4)

| Path | File | Creates Order? | Decrements Stock? | Atomic? |
|---|---|---|---|---|
| `POST /api/paystack/initialize` | `initialize/route.ts` | ✅ (pending) | ❌ | ❌ |
| `GET /api/paystack/verify` | `verify/route.ts` | ✅ (fallback) | ❌ | ❌ |
| `POST /api/paystack/webhook` | `webhook/route.ts` | ✅ (fallback) | ✅ | ❌ |
| `POST /api/verify-payment` | `verify-payment/route.ts` | ❌ | ❌ | ❌ |

The `/api/verify-payment` route is a legacy prototype. It accepts any `order_id` + `customer_email` with **no Paystack signature verification**, and sets `payment_status: "paid"`. It is a security vulnerability.

### 2.2 Stock Decrement Paths (Currently 3)

| Path | File | Guard | Atomic? |
|---|---|---|---|
| Webhook `charge.success` (online) | `webhook/route.ts:508–609` | `isAlreadyProcessed` | ❌ Read-then-write |
| Webhook `charge.success` (POS) | `webhook/route.ts:354–388` | Session status check | ❌ Read-then-write |
| Webhook `invoice.payment` (POS) | `webhook/route.ts:214–299` | Session status check | ❌ Read-then-write |

### 2.3 Verify Page → Webhook Race (NEW — Critical)

The success page (`checkout/success/page.tsx`) immediately calls `GET /api/paystack/verify` on mount. This route:
- Fetches the Paystack transaction
- Updates the pre-created order to `status: "paid"` (line 66–78)

The webhook's idempotency check (line 416) reads:
```typescript
if (existingOrder.status === "paid" || existingOrder.status === "confirmed") {
    isAlreadyProcessed = true;
}
```

**The race:** If the success page verify runs before the webhook fires (very likely, since the redirect is instant and webhook delivery has millisecond latency), the webhook finds `status = "paid"` and skips `if (!isAlreadyProcessed)` — which contains the entire stock decrement block. **Stock is never decremented.**

The webhook's order update guard uses `payment_status` (`.in("payment_status", ["pending"])`), which is a different column. The verify route sets `status` but not `payment_status`. So the webhook's order update fires, but the stock deduction block is still guarded by `isAlreadyProcessed`, which was set based on `status`.

Result: `payment_status` gets updated, email fires (if not already sent), but **`inventory_count` is never decremented**.

### 2.4 Admin Variant Save Resets Stock (NEW — High)

In `admin/products/route.ts:204-210`:
```typescript
await supabaseAdmin.from("product_variants").delete().eq("product_id", id);
await supabaseAdmin.from("product_variants").insert(variants);
```

Admin opens product edit form. 5 sales happen while form is open. Admin saves. Variant inventory is reset to the values that were in the form when it loaded, undoing the 5 deductions.

### 2.5 POS Already Has the Right Pattern

`fn_reserve_pos_stock` (migration `20260330000001_pos_tables.sql`) does:
1. `SELECT ... FOR UPDATE` — row-level lock on product/variant
2. `fn_available_stock` — computes available as `inventory_count - active_reservations`
3. `INSERT INTO pos_reservations` — creates a TTL-bound hold
4. On payment success, webhook deletes reservation + decrements actual stock
5. On rollback, reservation deleted

This exact pattern needs to be extended to cover online checkout.

### 2.6 Cache Delay

| Cache | TTL | Impact |
|---|---|---|
| `getCachedProducts` (`lib/products.ts:66`) | 60s | Shop grid shows stale OOS |
| PDP ISR (`products/[slug]/page.tsx:60`) | 60s | Product page serves stale stock |
| `getPdpSettings` | 300s | Settings 5 min stale |
| `getActiveAutoDiscounts` | 300s | Discount rules 5 min stale |

The `revalidatePath` calls in the webhook provide on-demand cache busting but only fire after payment — not during checkout. The 60-second TTL on products-list means a flash-sale can show "in stock" for a full minute after the last unit sells.

### 2.7 isPreOrder Trusted from Client

Cart items store `isPreOrder: true/false` at add-time in localStorage (Zustand persist). The initialize route trusts this value and uses it to bypass ALL stock checks. If a product had preorder enabled when added to cart, then admin disables preorder, the item still bypasses stock checks indefinitely.

### 2.8 No `is_active` Check in Stock Gate

The initialize route's stock guard fetches products without an `is_active` filter. A deactivated product with stock > 0 can still be purchased.

### 2.9 Cart Staleness — No Re-validation Before Checkout

- Cart drawer: never queries DB for current stock when opened
- Checkout page: never queries DB for current stock on mount
- `inventoryCount` in each cart item is frozen at add-time
- No "added X minutes ago" warning
- No `cartAddedAt` timestamp on cart items
- Checkout button always enabled if cart not empty and form valid

### 2.10 Variant Normalisation Duplicated

`normAttr` exists as two separate functions with different names (`normAttr` in webhook, `normAttrInit` in initialize). Logic is identical today, but any future divergence silently breaks variant matching.

### 2.11 OOS Soft-Pass Inconsistency

Two competing stock checks in initialize:
1. Hard 409 block if `totalQty > stock` (lines 77–131)
2. Soft OOS list — only blocks if **all** items are OOS (lines 133–160)

The soft check runs a second query for the same product data. Under concurrent load, both queries can return different values. OOS items collected by the soft path are charged and included in the order — the customer is notified on the success page. This is by design but should be explicit behaviour, not a side effect of two conflicting checks.

---

## 3. Root Cause Analysis

```
Problem: Oversell
  ├── No reservation layer (stock not held between check and payment)
  │     └── Two customers can both pass the check, both pay
  ├── Verify page + webhook race (verify sets status=paid → webhook skips decrement)
  │     └── Stock may never be decremented even for legitimate sales
  ├── Webhook read-then-write race (concurrent webhooks double-deduct or miss)
  ├── isPreOrder trusted from stale localStorage → bypasses all stock checks
  └── Admin edit form resets variant stock to form-load values
  
Problem: Stale stock shown to customers
  ├── 60s ISR cache on PDP
  ├── 60s TTL on products-list cache
  └── No live re-check in cart drawer or checkout page mount
  
Problem: Too many systems / no single owner
  ├── 4 order creation paths
  ├── 3 stock decrement paths
  └── No shared inventory module — stock logic inline in every route
```

---

## 4. Proposed Architecture: Unified Inventory Ledger

### 4.1 The Core Principle

**One module. One contract. All stock operations go through it.**

Create `src/lib/inventory.ts` — the single authoritative source for all inventory reads and writes. No route is allowed to touch `products.inventory_count` or `product_variants.inventory_count` directly; they call functions from this module.

```
┌──────────────────────────────────────────────────────────────┐
│                    src/lib/inventory.ts                      │
│                                                              │
│  checkStock()       → read-only availability check          │
│  reserveStock()     → atomic hold via DB function            │
│  confirmSale()      → convert reservation → deduction        │
│  releaseReservation() → release hold (cancel/expire)         │
│  decrementDirect()  → legacy path (POS webhook, admin adj.)  │
└──────────────────────┬───────────────────────────────────────┘
                       │ used by
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   /paystack/    /paystack/    admin/products
   initialize    webhook        (variant save)
```

### 4.2 New DB Function: `fn_reserve_online_stock`

Mirror of `fn_reserve_pos_stock`, extended for online checkout:

```sql
CREATE OR REPLACE FUNCTION public.fn_reserve_online_stock(
    p_order_id   UUID,     -- The pre-created pending order
    p_items      JSONB,    -- [{product_id, variant_id, size, color, quantity}]
    p_ttl_mins   INTEGER DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    item        JSONB;
    p_id        UUID;
    v_id        UUID;
    qty         INTEGER;
    available   INTEGER;
    exp_at      TIMESTAMPTZ := NOW() + (p_ttl_mins || ' minutes')::INTERVAL;
BEGIN
    -- Clear any existing reservations for this order (idempotent)
    DELETE FROM public.online_reservations WHERE order_id = p_order_id;

    -- Sort by product_id before acquiring row locks.
    -- Without a consistent order, two sessions locking [A, B] and [B, A] simultaneously
    -- will deadlock. Sorting by product_id guarantees every session acquires locks in the
    -- same global sequence, making a deadlock mathematically impossible.
    FOR item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY (value->>'product_id')
    LOOP
        p_id := (item->>'product_id')::UUID;
        v_id := NULLIF(item->>'variant_id', 'null')::UUID;
        qty  := (item->>'quantity')::INTEGER;

        -- Re-verify product is active
        IF NOT EXISTS (
            SELECT 1 FROM public.products
            WHERE id = p_id AND (is_active IS NULL OR is_active = TRUE)
        ) THEN
            RAISE EXCEPTION 'Product % is not available', p_id;
        END IF;

        -- Re-verify preorder_enabled server-side
        IF (SELECT preorder_enabled FROM public.products WHERE id = p_id) THEN
            CONTINUE; -- pre-order items: no stock lock needed
        END IF;

        -- Row-level lock
        IF v_id IS NOT NULL THEN
            PERFORM 1 FROM public.product_variants WHERE id = v_id FOR UPDATE;
        ELSE
            PERFORM 1 FROM public.products WHERE id = p_id FOR UPDATE;
        END IF;

        -- Available = on_hand - active_online_reservations - active_pos_reservations
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
```

### 4.3 New Table: `online_reservations`

```sql
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
```

### 4.4 Updated `fn_combined_available_stock`

Replace current `fn_available_stock` (POS-only) with one that accounts for both POS and online reservations:

```sql
CREATE OR REPLACE FUNCTION public.fn_combined_available_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
    SELECT 
        CASE WHEN p_variant_id IS NULL
            THEN COALESCE((SELECT inventory_count FROM products WHERE id = p_product_id), 0)
            ELSE COALESCE((SELECT inventory_count FROM product_variants WHERE id = p_variant_id), 0)
        END
        - COALESCE((
            SELECT SUM(r.quantity) FROM pos_reservations r
            JOIN pos_sessions s ON s.id = r.pos_session_id
            WHERE (p_variant_id IS NULL AND r.product_id = p_product_id AND r.variant_id IS NULL
                   OR r.variant_id = p_variant_id)
              AND r.expires_at > NOW() AND s.status = 'pending_payment'
        ), 0)
        - COALESCE((
            SELECT SUM(r.quantity) FROM online_reservations r
            JOIN orders o ON o.id = r.order_id
            WHERE (p_variant_id IS NULL AND r.product_id = p_product_id AND r.variant_id IS NULL
                   OR r.variant_id = p_variant_id)
              AND r.expires_at > NOW() AND o.status = 'pending'
        ), 0);
$$;
```

---

## 5. The Unified Sale Lifecycle

### 5.1 New Flow (Online Checkout)

```
Step 1: INITIALIZE  (POST /api/paystack/initialize)
  ├── Server re-reads is_active, preorder_enabled from DB (not client)
  ├── Run fn_reserve_online_stock() via supabase.rpc()
  │     ├── Row-level lock on product/variant rows
  │     ├── Check available = on_hand - pos_reservations - online_reservations
  │     ├── If insufficient: RAISE EXCEPTION → 409 to client
  │     └── INSERT online_reservations with 30-min TTL
  ├── CREATE pending order with status='pending'
  └── Redirect to Paystack

Step 2: PAYMENT WINDOW (Paystack)
  ├── Stock is HELD in online_reservations
  ├── No other buyer can claim those units
  └── TTL = 30 minutes; cron releases if expired

Step 3: WEBHOOK (POST /api/paystack/webhook charge.success)
  ├── Verify Paystack signature
  ├── Check order idempotency by payment_status='pending' only
  │     (NOT by status — remove the status-based isAlreadyProcessed check)
  ├── Call inventory.confirmSale(orderId)
  │     ├── Read quantities from online_reservations
  │     ├── Decrement products.inventory_count atomically (UPDATE WHERE id=x RETURNING)
  │     ├── Decrement product_variants.inventory_count atomically
  │     └── DELETE online_reservations for this order
  ├── Update order: payment_status='paid', status='paid'
  └── Send email/SMS/push

Step 4: VERIFY PAGE (GET /api/paystack/verify)
  ├── Fetch transaction from Paystack
  ├── Update order metadata (name, phone, address) ONLY
  ├── DO NOT update order.status here — only webhook sets status
  └── Return order data for receipt display

Step 5: EXPIRY CRON (every 5 minutes)
  ├── SELECT order_id FROM online_reservations WHERE expires_at < NOW()
  ├── For each: update order status='expired' WHERE status='pending' only
  ├── Do NOT delete the reservation row (late webhooks need it — see §14)
  └── Client sees "your reservation expired, please re-checkout"
```

### 5.2 Updated Flow (POS) — No Change

POS already uses `fn_reserve_pos_stock`. No change to POS logic. The `fn_combined_available_stock` replaces `fn_available_stock` so POS reservations are still accounted for in online checks (and vice versa).

---

## 6. The Unified Inventory Module

### `src/lib/inventory.ts` — Public API

```typescript
// The ONLY file allowed to write to inventory_count columns.
// All routes must import from here.

export type ReserveItem = {
    productId: string;
    variantId?: string | null;
    size?: string;
    color?: string;
    quantity: number;
    isPreOrder?: boolean;  // server-verified, not client-supplied
};

export type StockCheckResult =
    | { ok: true }
    | { ok: false; code: 'INSUFFICIENT_STOCK' | 'PRODUCT_UNAVAILABLE'; item: string; available: number };

/**
 * Read-only check. Does not hold stock. Use for cart validation only.
 */
export async function checkStock(items: ReserveItem[]): Promise<StockCheckResult>

/**
 * Atomic reservation. Throws if any item is unavailable.
 * Wraps fn_reserve_online_stock DB function.
 * Must be called BEFORE creating the Paystack transaction.
 */
export async function reserveStock(orderId: string, items: ReserveItem[]): Promise<void>

/**
 * Confirms a reservation as a real sale.
 * Decrements inventory_count atomically.
 * Deletes the reservation record.
 * Called exclusively from the webhook on charge.success.
 */
export async function confirmSale(orderId: string): Promise<void>

/**
 * Releases a reservation back to available stock.
 * Called on payment failure, order cancellation, or TTL expiry.
 */
export async function releaseReservation(orderId: string): Promise<void>

/**
 * Direct decrement without reservation (admin adjustments only).
 * Requires explicit reason string for audit trail.
 */
export async function decrementDirect(
    productId: string,
    variantId: string | null,
    quantity: number,
    reason: string
): Promise<void>
```

---

## 7. Fix: Verify Page → Webhook Race

**Root cause:** `GET /api/paystack/verify` sets `order.status = "paid"` before the webhook fires. The webhook checks `order.status === "paid"` and sets `isAlreadyProcessed = true`, skipping stock decrement.

**Fix:** The verify route must **not** set `order.status`. It should only:
1. Call Paystack to confirm the transaction is real
2. Update non-critical metadata (name, phone, address, delivery method)
3. Return the order data for the receipt UI

`order.status` and `order.payment_status` are set **exclusively** by the webhook.

The webhook idempotency check should use `payment_status` only (already has this), and the `status`-based `isAlreadyProcessed` check should be removed from the stock decrement guard.

---

## 8. Fix: Cache Delays

### Inventory-sensitive caches — switch to tag-based invalidation

**`src/lib/products.ts:66–149`** — `getCachedProducts`:
- Change `{ revalidate: 60 }` to `{ revalidate: false, tags: ["products"] }`.
- The webhook calls `revalidateTag("products")` after every confirmed payment — one call clears every shop grid and product page simultaneously, with no extra DB query.
- Using `revalidatePath` per slug (old approach) required a DB round-trip just to build the list of paths. `revalidateTag` eliminates that entirely.

**`src/app/(shop)/products/[slug]/page.tsx:60`** — `export const revalidate = 60`:
- Remove this export entirely. The page becomes dynamic SSR, serving fresh `inventory_count` on every request.
- The `revalidateTag("products")` call in the webhook also invalidates any data fetch in this page that carries the `"products"` tag.

**Webhook cache bust** — replace the slug-loop with:
```typescript
revalidateTag("products");
```
One line replaces the previous per-slug DB query + `revalidatePath` loop.

### Non-inventory caches — keep TTL

- `getCachedCategories` (300s): fine, categories don't affect stock availability
- `getPdpSettings` (300s): fine, UI settings only
- `getActiveAutoDiscounts` (300s): fine, discount rules only

---

## 9. Fix: Cart Staleness & Checkout Button Verification

### 9.1 `cartAddedAt` timestamp on CartItem

Add `cartAddedAt: number` (Unix ms) to the `CartItem` type. Set at `addItem()` time.

### 9.2 Cart staleness constant

```typescript
const CART_ITEM_STALE_MS = 15 * 60 * 1000; // 15 minutes
```

### 9.3 New API endpoint: `GET /api/inventory/check`

```
GET /api/inventory/check?items=[{productId, variantId, size, color, quantity}]

Response 200: { results: [{ id, available, isActive, preorderEnabled }] }
```

This is a lightweight read-only endpoint. No locks, no writes.

### 9.4 Cart Drawer re-validation

When the cart drawer opens, if any item has `cartAddedAt` older than 15 minutes OR if the drawer hasn't fetched stock in the last 5 minutes:
- Fire `GET /api/inventory/check` for all cart items
- For each item where `available < item.quantity` or `!isActive`: mark as stale with a warning badge
- Keep the Checkout button enabled but show an inline warning: "Some items may no longer be available — quantities will be verified at checkout"

### 9.5 Checkout page: block on stale items

On checkout page mount:
- Fire `GET /api/inventory/check` for all cart items
- Disable the Pay button while check is in flight (show "Verifying availability…")
- If any item is unavailable or deactivated: show inline warning per item, disable Pay button
- If all items verified: enable Pay button normally

For pre-order items: `checkStock` marks them as `isPreOrder: true` based on server-verified DB value, not cart item flag.

---

## 10. Fix: Admin Variant Save

Replace delete-then-reinsert with a merge strategy that preserves DB-current inventory counts:

```typescript
// For each variant in the incoming array:
// 1. If variant exists in DB (match by size+color+stitching key):
//    - UPDATE only non-stock fields (size label, color label, etc.)
//    - Do NOT overwrite inventory_count — use DB's current value
// 2. If variant is new: INSERT with the form's inventory_count
// 3. If DB variant is not in incoming array: mark inactive, don't delete
```

This prevents admin edits from overwriting sales-driven inventory deductions.

### Variant inventory sync

Remove the auto-sync that sets `products.inventory_count = sum(variants.inventory_count)` on save. Instead, this sync should only happen when admin explicitly runs "recalculate" or when the webhook fires.

---

## 11. Fix: Security Issues

### 11.1 Remove `/api/verify-payment`

This route (`src/app/api/verify-payment/route.ts`) is a legacy prototype with no Paystack signature verification. It should be deleted entirely. No current UI calls it (confirmed by grep).

### 11.2 Add `is_active` check to initialize stock gate

```typescript
const { data: dbProducts } = await supabaseAdmin
    .from("products")
    .select("id, price_ghs, is_sale, discount_value, inventory_count, track_variant_inventory, is_active, preorder_enabled")
    .in("id", pIds);

// Reject inactive products
for (const item of cartArr) {
    const product = dbProductMap[item.productId];
    if (!product?.is_active) {
        return NextResponse.json(
            { error: `"${item.name}" is no longer available.` },
            { status: 409 }
        );
    }
}
```

### 11.3 Server-verify `isPreOrder` at initialize

Replace client-supplied `item.isPreOrder` with server-read `product.preorder_enabled`:

```typescript
const serverIsPreOrder = dbProductMap[item.productId]?.preorder_enabled ?? false;
// Use serverIsPreOrder instead of item.isPreOrder in all stock check bypasses
```

---

## 12. Fix: Normalisation Function

Extract to `src/lib/utils/normAttr.ts`:

```typescript
export function normAttr(s: string | null | undefined): string {
    if (s == null) return "null";
    return s.replace(/\s*[—–-]\s*/g, "-").trim().toLowerCase();
}
```

Import in both `paystack/initialize/route.ts` and `paystack/webhook/route.ts`.

---

## 13. Fix: OOS Soft-Pass — Make Explicit

Remove the dual-query pattern. One check, clear behaviour:

- If `track_inventory = true` AND `totalQty > available`: hard 409 with the item name
- No "OOS items excluded and charged anyway" behaviour
- If the business wants "skip OOS items from cart", that should be a UI-level action (remove item from cart) before checkout, not a server-side silent exclusion after payment

---

## 14. Expiry Cron: `POST /api/cron/expire-reservations`

**Vercel tier requirement:** The `*/5 * * * *` schedule requires Vercel Pro or higher. On the free Hobby tier, cron jobs are limited to once per day. Alternative: use [cron-job.org](https://cron-job.org) or a GitHub Actions scheduled workflow to POST to the endpoint with the `Authorization: Bearer <CRON_SECRET>` header.

**Critical design rule: the cron must NOT delete reservation rows.**

`fn_combined_available_stock` already ignores reservation rows where `expires_at < NOW()`, so stock frees itself automatically at the moment of expiry — no row deletion is needed to release the hold. Deleting the row creates a dangerous loophole: if Paystack delivers a webhook after the TTL (delayed delivery, Paystack retry), `confirmSale()` would find no reservation, assume it's a legacy order, fall through to the manual decrement path which has no quantities, and **stock would never be decremented** — driving inventory negative on any late payment.

The correct behaviour: keep the row. A late webhook arriving after the 30-minute TTL will still call `confirmSale()`, find the reservation, and correctly decrement stock.

```typescript
// Called by Vercel Cron every 5 minutes
export async function POST(req: Request) {
    // Verify CRON_SECRET
    const expiredReservations = await supabaseAdmin
        .from("online_reservations")
        .select("order_id")
        .lt("expires_at", new Date().toISOString());

    // Mark orders expired — do NOT delete reservation rows (see note above)
    for (const { order_id } of expiredReservations.data ?? []) {
        await supabaseAdmin
            .from("orders")
            .update({ status: "expired" })
            .eq("id", order_id)
            .eq("status", "pending"); // never overwrite paid/confirmed orders
    }
}
```

---

## 15. Summary of Changes

| Area | Change | Files Affected |
|---|---|---|
| **DB** | New `online_reservations` table | new migration |
| **DB** | New `fn_reserve_online_stock` function | new migration |
| **DB** | Updated `fn_combined_available_stock` | new migration |
| **New** | `src/lib/inventory.ts` — unified inventory module | new file |
| **New** | `src/lib/utils/normAttr.ts` | new file |
| **New** | `GET /api/inventory/check` | new file |
| **New** | `POST /api/cron/expire-reservations` | new file |
| **Modify** | `paystack/initialize` — reserve before Paystack init; server-verify is_active + preorder; remove dual OOS check | `initialize/route.ts` |
| **Modify** | `paystack/webhook` — use `confirmSale()`; remove status-based isAlreadyProcessed from stock block | `webhook/route.ts` |
| **Modify** | `paystack/verify` — remove `status` update; metadata-only | `verify/route.ts` |
| **Modify** | `admin/products PATCH` — merge strategy for variants, preserve inventory_count | `admin/products/route.ts` |
| **Modify** | `lib/products.ts` — replace `{ revalidate: 60 }` with `{ revalidate: false, tags: ["products"] }` | `lib/products.ts` |
| **Modify** | `products/[slug]/page.tsx` — remove `export const revalidate = 60`; replace slug-loop cache bust with `revalidateTag("products")` | `products/[slug]/page.tsx`, `webhook/route.ts` |
| **Modify** | `store/useCart.ts` — add `cartAddedAt` to CartItem | `store/useCart.ts` |
| **Modify** | `CartDrawer.tsx` — live stock re-check on open | `CartDrawer.tsx` |
| **Modify** | `checkout/page.tsx` — pre-submit stock verification | `checkout/page.tsx` |
| **Delete** | `src/app/api/verify-payment/route.ts` — unsafe legacy route | `verify-payment/route.ts` |

---

## 16. Migration Checklist (DB)

- [ ] Create `online_reservations` table
- [ ] Create `fn_reserve_online_stock` function
- [ ] Create `fn_combined_available_stock` (replaces/extends `fn_available_stock`)
- [ ] Add index: `online_reservations(expires_at)` for cron query
- [ ] Add index: `online_reservations(order_id)` for webhook lookup
- [ ] Update `fn_available_stock` to call `fn_combined_available_stock` for backward compat with POS

---

## 17. What Does NOT Change

- POS reservation system: already correct, no changes needed
- Payment gateway integration (Paystack): no changes
- Order structure, fulfilment, or shipping logic
- Email/SMS notifications
- Wholesale pricing logic
- Auto discount evaluation
- Gift card / coupon system

---

*Spec complete. Updated 2026-05-08 with post-review hardening: deadlock prevention (ORDER BY in fn_reserve_online_stock), late-webhook safe cron (no row deletion), tag-based cache invalidation (revalidateTag), Vercel tier note.*
