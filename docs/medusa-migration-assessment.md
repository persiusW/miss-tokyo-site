# Medusa Storefront Migration Assessment

**Date:** 2026-04-30
**Context:** Evaluating whether to migrate the Miss Tokyo custom Next.js/Supabase storefront to a Medusa.js storefront.

---

## Verdict: Very complex, and probably not worth it for where you are right now.

---

## What You'd Be Migrating Away From

The current stack is a custom Next.js 14 App Router storefront with Supabase as the database. It's not a thin frontend — the business logic lives in it: Paystack payments, order flow, inventory tracking, pre-orders, wholesale tiers, discount engine, POS, rider dispatch, custom CMS, mNotify SMS, Resend email. That's not a storefront skin — that's a full commerce backend built into Next.js.

---

## What Medusa Actually Gives You

Medusa replaces your order management, cart, product, discount, and checkout logic with its own opinionated modules. You'd get a standardised API, plugin ecosystem, and a React Storefront template.

**The problem:** almost everything custom about your store doesn't map cleanly to Medusa:

| Your feature | Medusa equivalent | Complexity |
|---|---|---|
| Paystack (GHS) | Custom payment provider plugin | Medium |
| mNotify SMS notifications | Custom event subscriber | Medium |
| Pre-orders (zero-stock bypass) | Custom inventory module override | High |
| Wholesale tiers per category | Custom pricing strategy | High |
| POS system | Not in Medusa — rebuild from scratch | Very high |
| Rider dispatch / delivery flow | Not in Medusa — custom module | Very high |
| Custom discount engine | Partially covered, needs extension | Medium |
| Supabase auth + profiles | Medusa uses its own auth — migrate all users | High |
| Supabase RLS + admin roles | Rebuild in Medusa's RBAC | High |
| Custom CMS / site copy | Not in Medusa — rebuild | Medium |

---

## The Real Costs

**Data migration** — all orders, customers, products, inventory, discounts, gift cards live in your Supabase schema. You'd have to write migration scripts into Medusa's schema, and Medusa's data model doesn't match yours 1:1 (e.g. your variant/inventory structure is custom).

**Time** — realistically 3–6 months of focused work to reach feature parity, not counting the POS and rider systems which have no Medusa equivalent.

**Risk** — you'd be running two systems in parallel during migration, and your current Paystack + mNotify integrations are deeply wired into your Next.js API routes. Untangling that mid-operation is risky.

---

## When It Would Make Sense

Medusa is a good fit when you're starting fresh, or when your current system is so messy that a clean-room rebuild is cheaper than continued maintenance. The current codebase is custom but coherent — the bugs being fixed are surface-level UX/flow issues, not deep architectural rot.

---

## What Would Actually Solve the Problems

The inconsistencies and flow breaks are mostly gaps in the custom code, not a platform problem. The cost of fixing them in-place is far lower than a platform migration. The main things that would meaningfully improve reliability:

1. **Move business logic out of route handlers** into proper service functions (testable, reusable)
2. **A proper test suite** for checkout, cart, and order flow (started on `fix/e2e-test-suite`)
3. **Supabase Row-Level Security** tightened on orders/payments

Those three would give 90% of the stability benefit of a rewrite at 10% of the cost.

---

## Summary

Medusa migration is a 4–6 month project that would mostly recreate what already exists. Not the right move unless the store outgrows Supabase at scale or needs a multi-region/multi-currency architecture. Fix the current system — it's closer to solid than it looks.
