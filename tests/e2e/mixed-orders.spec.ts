/**
 * mixed-orders.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the mixed-order routing and badge system.
 *
 * Badge/dot rendering tests use /test-orders — a fixture page inside the
 * dashboard route group that renders OrdersClient with hardcoded orders
 * covering all five scenarios. This avoids trying to intercept SSR-side
 * Supabase requests (which page.route() cannot reach).
 *
 * Smoke tests navigate the real /sales/orders and /sales/pre-orders pages.
 *
 * Run:
 *   npx playwright test tests/e2e/mixed-orders.spec.ts --project=dashboard
 */

import { test, expect } from "@playwright/test";

// ── Fixture page — badge and dot rendering ────────────────────────────────────
// The /test-orders page renders OrdersClient with five controlled fixtures:
//   row 0: REGULAR   (has_preorder=false, is_mixed_order=false)
//   row 1: PRE-ORDER (has_preorder=true,  is_mixed_order=false)
//   row 2: MIXED     (has_preorder=true,  is_mixed_order=true, no dispatch)
//   row 3: MIXED     (has_preorder=true,  is_mixed_order=true, shipped + dispatched)
//   row 4: MIXED     (has_preorder=true,  is_mixed_order=true, fulfilled + dispatched)

test.describe("Badge rendering — fixture page", () => {

    test.beforeEach(async ({ page }) => {
        await page.goto("/test-orders");
        // Switch to "All" tab so shipped/fulfilled fixtures are visible (Inbox only shows status=paid)
        // The tab button contains the label "All" + a count span, so match by text prefix
        await page.locator("button").filter({ hasText: /^All/ }).last().click();
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });
    });

    test("regular order shows no preorder badge or dot", async ({ page }) => {
        // Row 0 is the regular order — find the row by customer name
        const row = page.locator("table tbody tr").filter({ hasText: "Regular Customer" });
        await expect(row).toBeVisible();
        await expect(row).not.toContainText("Mixed");
        await expect(row).not.toContainText("Pre-Order");
        await expect(row.locator("span[title]")).toHaveCount(0);
    });

    test("pure preorder order shows PRE-ORDER badge", async ({ page }) => {
        const row = page.locator("table tbody tr").filter({ hasText: "Pure Preorder Customer" });
        await expect(row.getByText("Pre-Order", { exact: true })).toBeVisible();
        await expect(row).not.toContainText("Mixed");
    });

    test("mixed order with no dispatch shows MIXED badge and no dot", async ({ page }) => {
        const row = page.locator("table tbody tr").filter({ hasText: "Mixed Undispatched" });
        await expect(row.getByText("Mixed", { exact: true })).toBeVisible();
        await expect(row).not.toContainText("Pre-Order");
        // No dot indicator on undispatched mixed order
        await expect(row.locator("span[title*='Pre-order items pending']")).toHaveCount(0);
        await expect(row.locator("span[title*='Fully fulfilled']")).toHaveCount(0);
    });

    test("mixed order with regular_items_dispatched_at shows blue partial dot", async ({ page }) => {
        const row = page.locator("table tbody tr").filter({ hasText: "Mixed Partial" });
        const dot = row.locator("span[title*='Pre-order items pending']");
        await expect(dot).toBeVisible();
        await expect(dot).toHaveClass(/text-blue/);
    });

    test("fulfilled mixed order shows green dot", async ({ page }) => {
        const row = page.locator("table tbody tr").filter({ hasText: "Mixed Fulfilled" });
        const dot = row.locator("span[title*='Fully fulfilled']");
        await expect(dot).toBeVisible();
        await expect(dot).toHaveClass(/text-emerald/);
    });

    test("three MIXED badges for the three mixed fixture orders", async ({ page }) => {
        // Use exact match so customer names like "Mixed Undispatched" aren't counted
        const mixedBadges = page.locator("table tbody").getByText("Mixed", { exact: true });
        await expect(mixedBadges).toHaveCount(3); // rows 2, 3, 4 all have is_mixed_order=true
    });

    test("exactly one PRE-ORDER badge for the pure preorder fixture order", async ({ page }) => {
        const badges = page.locator("table tbody").getByText("Pre-Order", { exact: true });
        await expect(badges).toHaveCount(1);
    });
});

// ── Page structure smoke tests (real data) ────────────────────────────────────

test.describe("Orders pages load correctly", () => {

    test("orders page renders without error", async ({ page }) => {
        await page.goto("/sales/orders");
        await expect(page.locator("h1")).toContainText(/orders/i, { timeout: 15_000 });
        await expect(page.locator("table")).toBeVisible({ timeout: 15_000 });
    });

    test("pre-orders page renders without error", async ({ page }) => {
        await page.goto("/sales/pre-orders");
        await expect(page.locator("h1")).toContainText(/pre.?orders/i, { timeout: 15_000 });
        await expect(page.locator("table")).toBeVisible({ timeout: 15_000 });
    });

    test("orders page does not show pure preorder badge in real data", async ({ page }) => {
        await page.goto("/sales/orders");
        await page.waitForSelector("table tbody tr", { timeout: 20_000 });
        // If is_mixed_order filtering works, PRE-ORDER badge should never appear on the orders page
        const preorderBadge = page.locator("table tbody span").filter({ hasText: /^Pre-Order$/i });
        await expect(preorderBadge).toHaveCount(0);
    });
});
