# POS (Point of Sale) Feature — Design Spec
**Date:** 2026-03-30
**Branch:** feat/POS
**Status:** Approved by stakeholder — reviewed and hardened (2 review passes)

---

## Overview

An isolated admin POS feature that allows sales staff to build a cart for offline customers, generate a Paystack Payment Request link (`https://paystack.com/pay/{offline_reference}`), reserve inventory atomically for 30 minutes, and send the link via Email (Resend) and SMS (mNotify). No existing storefront, checkout flow, core DB schema, or revenue logic is modified beyond three minimal permitted surgical edits documented below.

---

## Architecture Principle

`pos_sessions` is the source of truth. A real `orders` row is only created when Paystack confirms payment via webhook (`invoice.payment` event). Draft and pending POS sessions never appear in the orders dashboard or revenue analytics — there are no draft order rows in `orders` at any point.

---

## Paystack API Choice: Payment Request (`/paymentrequest`)

Uses `POST https://api.paystack.co/paymentrequest` — same as the existing `/api/invoice/paystack-link` route. Returns `offline_reference`. The shareable payment URL is: `https://paystack.com/pay/{offline_reference}`.

- `pos_sessions.paystack_reference` stores the `offline_reference`
- The customer-facing page at `/pay/[pos_id]` checks status/expiry, then **redirects** to `https://paystack.com/pay/{offline_reference}` — no client-side JS popup
- Payment fires the `invoice.payment` Paystack webhook event (NOT `charge.success`)

---

## Database Changes

### New Table: `pos_sessions`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` PK | NO | |
| `created_by` | `uuid` FK → `profiles.id` | NO | Staff who created it |
| `customer_name` | `text` | NO | |
| `customer_email` | `text` | NO | |
| `customer_phone` | `text` | YES | |
| `customer_address` | `text` | YES | |
| `contact_id` | `uuid` FK → `contacts.id` | YES | If existing customer selected |
| `items` | `jsonb` | NO | `[{productId, variantId, name, size, color, price, quantity}]` |
| `total_amount` | `numeric` | NO | Server-calculated only — `CHECK (total_amount > 0)` |
| `status` | `text` | NO | `draft` \| `pending_payment` \| `paid` \| `expired` \| `cancelled` |
| `paystack_reference` | `text` | YES | `offline_reference` from Payment Request |
| `expires_at` | `timestamptz` | YES | `NOW() + interval '30 minutes'` — set when link is sent |
| `notes` | `text` | YES | |
| `created_at` | `timestamptz` | NO | |
| `paid_at` | `timestamptz` | YES | Set on webhook confirmation |
| `order_id` | `uuid` FK → `orders.id` | YES | Set after webhook confirms |

**Indexes:** `(status, expires_at)` — for cleanup and fn_available_stock

**RLS:** `ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY` with no public SELECT policy. All server-side access uses `supabaseAdmin` (service role). Prevents any client-side query from exposing PII.

### New Table: `pos_reservations`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` PK | NO | |
| `pos_session_id` | `uuid` FK → `pos_sessions.id` ON DELETE CASCADE | NO | |
| `product_id` | `uuid` FK → `products.id` | NO | |
| `variant_id` | `uuid` FK → `product_variants.id` | YES | NULL for non-variant products |
| `quantity` | `integer` | NO | `CHECK (quantity > 0)` |
| `expires_at` | `timestamptz` | NO | Mirrors session `expires_at` |

**Indexes:**
- `(product_id, expires_at)` — used by fn_available_stock
- `(pos_session_id)` — used for cascade deletes and cancellation
- Unique partial: `(product_id, pos_session_id) WHERE expires_at > NOW()` — prevent double-reservation of same product in same session

**RLS:** `ALTER TABLE pos_reservations ENABLE ROW LEVEL SECURITY` with no public SELECT policy.

### DB Function 1: `fn_available_stock(p_product_id uuid, p_variant_id uuid DEFAULT NULL) RETURNS integer`

- If `p_variant_id IS NULL`: returns `products.inventory_count` minus sum of `pos_reservations.quantity` where `product_id = p_product_id` AND `variant_id IS NULL` AND `expires_at > NOW()` AND joined session `status = 'pending_payment'`
- If `p_variant_id IS NOT NULL`: returns `product_variants.inventory_count` minus sum where `variant_id = p_variant_id` AND `expires_at > NOW()` AND session `status = 'pending_payment'`

### DB Function 2: `fn_reserve_pos_stock(p_session_id uuid, p_items jsonb) RETURNS void`

Atomic transaction:
1. **Delete any existing expired reservations for this session** (handles resend flow): `DELETE FROM pos_reservations WHERE pos_session_id = p_session_id`
2. For each item in `p_items`:
   - **If `variant_id` is non-null:** `SELECT inventory_count FROM product_variants WHERE id = variant_id FOR UPDATE` — locks the variant row
   - **If `variant_id` is null:** `SELECT inventory_count FROM products WHERE id = product_id FOR UPDATE` — locks the product row
   - Compute available = locked stock minus active reservations for that specific `(product_id, variant_id)` key
   - If available < requested quantity → `RAISE EXCEPTION 'Insufficient stock for product: %', product_id` (rolls back entire transaction)
3. `INSERT INTO pos_reservations` for each item
4. `UPDATE pos_sessions SET status = 'pending_payment', expires_at = NOW() + interval '30 minutes' WHERE id = p_session_id`

This function handles both the initial send and the resend flow (step 1 cleans up stale reservations before reinserting).

### `orders` Table — One Additive Column

`source text DEFAULT 'storefront'` — POS-created orders inserted with `source = 'pos'`. All existing rows default to `storefront`. No existing queries change.

### Auto-Expiry Strategy (Self-Healing, No pg_cron Required)

- **Stock always safe:** `fn_available_stock` filters `expires_at > NOW()` — expired reservations auto-ignored
- **Self-healing:** `/pay/[pos_id]` page detects `expires_at < NOW()`, shows expired state, fires fire-and-forget `POST /api/pos/expire?token={POS_EXPIRE_TOKEN}` (static env var token, no user auth)
- **Backstop:** Daily Supabase scheduled Edge Function marks stale `pending_payment` sessions as `expired`

---

## API Routes (All New)

### `POST /api/pos/session`
**Auth:** `sales_staff`, `admin`, `owner`
Creates or updates a `draft` `pos_sessions` row. No inventory touch. No Paystack call. Returns session ID.

### `POST /api/pos/send-link`
**Auth:** `sales_staff`, `admin`, `owner`
1. Fetch product prices from `products` by productId array — compute `total_amount` server-side. Never accept amount from request body
2. Call `fn_reserve_pos_stock()` inside the DB — atomic, serialised, rolls back on insufficient stock
3. Call Paystack `POST /paymentrequest` with `metadata: { pos_session_id, source: 'pos' }` — **do NOT include `cartItems` in metadata** (prevents inventory double-decrement if early return is ever bypassed)
4. Store `offline_reference` in `pos_sessions.paystack_reference`
5. Construct shareable URL: `https://paystack.com/pay/{offline_reference}`
6. Send Email (Resend) and SMS (`sendSMS`) in parallel — `Promise.all`
7. Return `{ paymentUrl, sessionId }`

### `GET /api/pos/session/[id]`
**Auth:** Public (UUID is unguessable)
Returns ONLY: `{ status, expires_at, total_amount, items: [{name, size, color, quantity}], paymentUrl }`.
**Never returns:** `customer_name`, `customer_email`, `customer_phone`, `customer_address`, `paystack_reference`, `contact_id`, `created_by`, `order_id`.

### `POST /api/pos/cancel`
**Auth:** `sales_staff`, `admin`, `owner`
- Verifies caller `user.id` matches `pos_sessions.created_by` OR caller role is `admin`/`owner`
- Returns 403 if `status = 'paid'`
- `UPDATE pos_sessions SET status = 'cancelled'`
- `DELETE FROM pos_reservations WHERE pos_session_id = $id` (explicit — FK cascade only fires on row delete, not status update)

### `POST /api/pos/expire`
**Auth:** Static token passed as `Authorization: Bearer {POS_EXPIRE_TOKEN}` header (not query param — avoids token appearing in server logs).

**Non-empty guard required** (matching webhook pattern at `/api/paystack/webhook/route.ts` line 176):
```
const token = process.env.POS_EXPIRE_TOKEN
if (!token) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
const incoming = req.headers.get('Authorization')?.replace('Bearer ', '')
if (incoming !== token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**Caller:** Supabase scheduled Edge Function (same pattern as existing cron routes). Falls back to being called fire-and-forget from the customer payment page with the token embedded server-side only (never exposed to client).

- Idempotent: `UPDATE pos_sessions SET status = 'expired' WHERE status = 'pending_payment' AND expires_at < NOW()`
- `DELETE FROM pos_reservations WHERE pos_session_id IN (just-expired session IDs)`
- Called fire-and-forget from payment page (server-side fetch only); also called by daily edge function backstop

### Paystack Webhook — `invoice.payment` Handler (Additive)

The existing webhook handles `charge.success` only. POS Payment Requests fire `invoice.payment`. The existing invoice feature at `/api/invoice/paystack-link` also uses `/paymentrequest` and also fires `invoice.payment`, with `metadata.source = 'invoice'`.

Add a **second event handler block** for `invoice.payment`. The handler **must discriminate by metadata** to avoid colliding with existing invoice payments:

```
if (event.event === 'invoice.payment') {
  const metadata = event.data?.metadata
  // Ignore non-POS invoice.payment events (e.g. standard invoices with source='invoice')
  if (metadata?.source !== 'pos' || !metadata?.pos_session_id) {
    return NextResponse.json({ received: true })
  }
  // 1. verify pos_session exists and status = 'pending_payment' (idempotency guard)
  // 2. create order row with source='pos', status='paid', items from pos_session
  // 3. UPDATE pos_sessions: status='paid', paid_at=NOW(), order_id=new_order_id
  // 4. DELETE FROM pos_reservations WHERE pos_session_id (free the hold)
  // 5. Decrement inventory using items from pos_session.items (not from Paystack metadata)
  return NextResponse.json({ received: true })
}
```

The existing `charge.success` handler is untouched. Standard invoice payments (source='invoice') pass through the `invoice.payment` block and return immediately without side effects.

---

## Dashboard Pages

```
src/app/(dashboard)/pos/
  page.tsx           ← Main POS interface
  history/
    page.tsx         ← POS History
```

### `/pos` — Main POS Interface (Two-Panel)
- **Left:** Product search by name, cards show available stock from `fn_available_stock`, variant selector (size/color), add-to-cart
- **Right:** Cart with quantity controls, Customer module (search `contacts` by name/email OR create new inline), notes field, computed total, "Generate & Send Payment Link" CTA
- On success: shows `https://paystack.com/pay/{offline_reference}` with copy button, CTA disabled to prevent re-send (use resend in history page instead)
- **Role guard:** `admin`, `owner`, `sales_staff` — all three roles can access POS
- **Sidebar placement:** Add to `salesItems` array (same tier as Orders, Analytics) — visible to `sales_staff`. Do NOT gate behind `isFullAccess` (admin/owner only).

### `/pos/history` — POS History
- All `pos_sessions` ordered by `created_at DESC`
- Columns: Reference, Customer, Items count, Total, **Staff** (join `profiles.full_name`), Status badge, Created, Expires/Paid
- Filter tabs: All / Draft / Pending Payment / Paid / Expired / Cancelled
- Row click → detail drawer: full item list, resend link button (calls `/api/pos/send-link` again — `fn_reserve_pos_stock` handles cleanup of old reservations), cancel button
- Read-only — no delete

---

## Customer-Facing Payment Page

```
src/app/(shop)/pay/[pos_id]/
  page.tsx    ← Server component
```

1. Fetch PII-stripped session from `/api/pos/session/[id]`
2. Not found → 404
3. `expires_at < NOW()` OR `status = expired` → "Link Expired" branded page + fire-and-forget `POST /api/pos/expire?token=...`
4. `status = paid` → "Already Paid" branded page
5. `status = cancelled` → "Order Cancelled" branded page
6. `status = pending_payment` + not expired → branded cart summary (item names, quantities, total) + "Pay Now" button → `<a href="https://paystack.com/pay/{offline_reference}">` redirect (standard anchor tag, no client JS needed)

---

## Notifications

### Email (Resend)
Sender: `info.misstokyo.shop`. Subject: `Your Miss Tokyo payment link`. Body: first name, cart summary (name + qty), total, payment URL, "Link expires in 30 minutes."

### SMS (mNotify)
Uses existing `sendSMS()` from `src/lib/sms.ts`.
Template: `Hi {name}, your Miss Tokyo order is ready. Pay GH₵{total} here: {url} (expires in 30 mins)`

---

## Permitted Surgical Edits to Existing Files

| File | Change | Justification |
|------|--------|---------------|
| `src/app/api/paystack/webhook/route.ts` | Add `invoice.payment` handler block alongside existing `charge.success` | POS Payment Request fires this event |
| `src/app/(dashboard)/layout.tsx` or `AdminSidebar.tsx` | Add POS nav entries to `salesItems` array | Pages unreachable otherwise |
| `supabase/migrations/` | Add `source text DEFAULT 'storefront'` to `orders` | Additive, all existing rows default to storefront |

---

## What is NOT Modified

- `orders` table schema: only additive `source` column with safe default
- `products` / `product_variants`
- `/api/paystack/initialize` or `/api/paystack/verify`
- Consumer storefront, checkout, cart
- Revenue analytics (paid POS orders legitimately count as revenue)
- `contacts` table schema
- All existing dashboard pages (except sidebar nav addition)

---

## File Delivery Checklist

- [ ] `supabase/migrations/YYYYMMDD_pos_tables.sql` — `pos_sessions`, `pos_reservations`, `fn_available_stock`, `fn_reserve_pos_stock`, all indexes, CHECK constraints, RLS policies, `source` column on `orders`
- [ ] `src/app/(dashboard)/pos/page.tsx` — main POS UI
- [ ] `src/app/(dashboard)/pos/history/page.tsx` — history page
- [ ] `src/app/api/pos/session/route.ts` — POST create/update draft
- [ ] `src/app/api/pos/send-link/route.ts` — server-side price calc, atomic reserve, Paystack `/paymentrequest`, email + SMS
- [ ] `src/app/api/pos/session/[id]/route.ts` — public PII-stripped GET
- [ ] `src/app/api/pos/cancel/route.ts` — ownership check, blocks if paid, status update + explicit reservation delete
- [ ] `src/app/api/pos/expire/route.ts` — static token auth, idempotent expiry setter
- [ ] `src/app/(shop)/pay/[pos_id]/page.tsx` — server component payment page
- [ ] `src/app/api/paystack/webhook/route.ts` — additive `invoice.payment` handler block
- [ ] `src/app/(dashboard)/layout.tsx` or `AdminSidebar.tsx` — POS nav items in salesItems
