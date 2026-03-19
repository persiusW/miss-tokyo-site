# Miss Tokyo — Production Pre-Flight Audit Report

**Date:** 2026-03-19
**Auditor:** Claude Code (Sonnet 4.6)
**Scope:** Full-stack Next.js 15 / Supabase / Paystack application

---

## Executive Summary

The application is **near production-ready**. TypeScript compiles clean. The primary issues found were **unauthenticated admin API routes** (now fixed), a **dangerous supabaseAdmin fallback** (now fixed), and a few performance/image optimisation items that do not block launch.

---

## Phase 1 — TypeScript & Build

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `next build` (prior session) | ✅ Passes |
| Unused imports flagged | None critical |

---

## Phase 2 — Security Hardening (API Auth)

### Fixed This Session

| Route | Vulnerability | Fix Applied |
|-------|---------------|-------------|
| `POST /api/admin/test-email` | No auth — anyone could trigger test emails | Added session + role guard (`admin`/`owner`) |
| `POST /api/admin/test-sms` | No auth — anyone could send test SMS | Added session + role guard (`admin`/`owner`) |
| `PATCH /api/admin/contact-submissions/[id]` | No auth — anyone could update submission status | Added session + role guard (`admin`/`owner`/`sales_staff`) |
| `DELETE /api/admin/push/subscribe` | No auth on DELETE only (POST was guarded) | Added session auth check |
| `POST /api/dispatch` | No auth — anyone could assign riders and spam customers | Added session + role guard (`admin`/`owner`/`sales_staff`) |
| `POST /api/pickup-ready` | No auth — anyone could mark orders ready and spam customers | Added session + role guard (`admin`/`owner`/`sales_staff`) |
| `POST /api/gift-cards/issue` | No auth — anyone could issue free gift cards | Added session + role guard (`admin`/`owner`) |
| `src/app/api/auth/login/route.ts` | Hardcoded admin credentials as env fallbacks (`persiuswilder@gmail.com` / `Killdecat1`) | Removed fallback values — empty strings; env vars must be set |
| `src/lib/supabaseAdmin.ts` | `SUPABASE_SERVICE_ROLE_KEY \|\| NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback | Removed fallback; explicit error log if key missing |
| `src/app/api/verify-payment/route.ts` | Inlined own `supabaseAdmin` client (not using shared singleton) | Replaced with `import { supabaseAdmin } from "@/lib/supabaseAdmin"` |
| `src/app/api/newsletter/subscribe/route.ts` | No top-level try/catch | Wrapped handler in try/catch |
| `src/app/api/paystack/webhook/route.ts` | Two `Promise.all()` calls — email failure would abort the entire webhook | Changed both to `Promise.allSettled()` |

### Already Correctly Guarded

- `POST /api/admin/invite-team` — admin/owner role check ✅
- `GET /api/admin/invite-team` — admin/owner role check ✅
- `POST /api/admin/push/subscribe` — session check ✅
- `POST /api/admin/set-wholesale` — role check ✅

### Remaining Concern (Not Fixed — Architectural Decision Required)

**`POST /api/verify-payment`** — This endpoint accepts `order_id` + `customer_email` and marks orders as `payment_status: "paid"` without any Paystack signature verification. It is a legacy/redundant route — the canonical `POST /api/paystack/webhook` already handles this with full HMAC-SHA512 signature verification. **Recommendation:** Remove or deprecate `/api/verify-payment` and rely solely on the webhook. If it must remain, add a server-side call to Paystack's verify API instead of trusting the client payload.

---

## Phase 3 — Image Optimisation

### `<img>` Tags in Customer-Facing Code

| File | Usage | Recommendation |
|------|-------|---------------|
| `CartDrawer.tsx:57` | Cart item thumbnails (dynamic `item.imageUrl`) | Low priority — thumbnails are small. Acceptable as-is. |
| `checkout/page.tsx:435` | Order summary thumbnails | Low priority. Same as above. |
| `about/AboutSections.tsx:286` | Team member photos (from Supabase Storage) | Replace with `<Image>` if dimensions are known. |
| `ImageUploader.tsx` (both) | Upload preview inside admin tool | Admin-only, not SEO-critical. Acceptable. |

### ISR / Dynamic Config

All product listing pages (`/shop`, `/sale`, `/new-arrivals`, `/dresses`) use `export const revalidate = 60` — correct for product data.

Product detail pages (`/products/[slug]`) also use `revalidate = 60`.

All account/checkout pages are `"use client"` components — no server rendering, no `force-dynamic` needed.

`/search` page: uses `searchParams` as a Promise (Next.js 15 pattern) — automatically dynamic.

**No `force-dynamic` additions required.**

---

## Phase 4 — Paystack → Order → Email → SMS Pipeline

### Full Flow

```
Customer fills checkout form
  → POST /api/paystack/initialize
      Creates order (status: "pending") in DB
      Returns Paystack payment URL (with orderId in metadata)

  → [Customer completes Paystack payment]

  → Paystack fires POST /api/paystack/webhook (charge.success)
      1. Verifies HMAC-SHA512 signature ✅
      2. Reads metadata: orderId, cartItems, fullName, phone, address, deliveryMethod, discount_*
      3. Decrements inventory for each cart item
      4. ensureCustomerAccount(email) — creates/links Supabase auth user
         - Generates password-reset "setup link" for first-time buyers
      5. Updates order: status → "paid", paystack_reference, customer_id, shipping_address
      6. In parallel:
         a. sendOrderConfirmation() → Resend email with line items, pickup/delivery block, setup CTA
         b. trackDiscountUsage() → Increments coupon used_count or reduces gift card balance
         c. sendSMS() → Customer confirmation SMS (from communication_templates or fallback)
         d. sendAdminPushNotifications() → Web push to all subscribed admin devices

  → Customer redirected to /checkout/success
      Displays order reference, clears cart
```

### Performance Fix — `ensureCustomerAccount` ✅ RESOLVED

~~`supabaseAdmin.auth.admin.listUsers()` fetches all auth users to find one by email.~~

**Fixed:** Now queries `profiles` table by `email` (O(1) with index) instead of listing all auth users. New user upserts also include `email` column so future lookups always hit the index.

### Admin Notification Emails

Admin "new order" emails (if configured in `communication_templates`) would be sent separately — pipeline for those was not traced this session but follows the same template-injection pattern.

---

## Phase 5 — N+1 Query Review

| Location | Issue | Status |
|----------|-------|--------|
| `webhook/route.ts` inventory decrement | ~~Sequential `for` loop with individual DB queries per item~~ | ✅ Fixed — batch SELECT + `Promise.allSettled()` |
| `paystack/verify/route.ts` inventory decrement | ~~Same sequential pattern in fallback verify path~~ | ✅ Fixed — same batch pattern applied |
| `products/[slug]/page.tsx` | 3 sequential queries (product, related, reviews) | Low — all fast indexed lookups. ISR caches result. |
| Dashboard orders list | Not reviewed this session | Recommend checking with pagination |

---

## QA Checklist — Pre-Launch

### Must Pass Before Go-Live

- [x] TypeScript compiles clean
- [x] All admin API routes require authenticated admin/owner session
- [x] `supabaseAdmin` singleton uses service role key only (no anon fallback)
- [x] Paystack webhook verifies HMAC-SHA512 signature
- [x] DB variant data normalized (Wix migration cleanup complete)
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables
- [ ] Verify `PAYSTACK_SECRET_KEY` is set in Vercel environment variables
- [ ] Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in Vercel
- [ ] Verify `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` set (for push notifications)
- [ ] Test end-to-end checkout with Paystack test card
- [ ] Confirm order confirmation email arrives with correct data
- [ ] Confirm admin push notification fires on new order
- [ ] Confirm first-time buyer receives "set up account" email with working link
- [ ] Test mobile cart drawer, filter sidebar, and nav z-index ordering

### Nice-to-Have Before Go-Live

- [x] `/api/verify-payment` deleted — order fulfilment relies solely on signed webhook
- [x] `listUsers()` replaced with O(1) `profiles` email lookup in `ensureCustomerAccount`
- [ ] Replace `<img>` with Next.js `<Image>` in CartDrawer and checkout
- [ ] Add rate limiting to `/api/newsletter/subscribe`
- [ ] Add RLS policy audit (ensure customers can only read their own orders)

---

## Environment Variables Audit

| Variable | Used By | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | ✅ Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase | ✅ Required |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseAdmin` singleton | ✅ Required (now fails loudly if missing) |
| `PAYSTACK_SECRET_KEY` | Webhook verification, initialize | ✅ Required |
| `RESEND_API_KEY` | Email sending | ✅ Required for emails |
| `RESEND_FROM_EMAIL` | From address | ✅ Required for emails |
| `NEXT_PUBLIC_SITE_URL` | Links in emails, redirects | ✅ Required |
| `BIZ_NAME` | Email branding | Optional (defaults to "Miss Tokyo") |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push | Optional (push disabled if absent) |
| `VAPID_PRIVATE_KEY` | Web push | Optional (push disabled if absent) |
| `VAPID_SUBJECT` | Web push | Optional (defaults to mailto) |

---

*Report generated by automated audit. All fixed items have been applied to source and verified with `tsc --noEmit`.*
