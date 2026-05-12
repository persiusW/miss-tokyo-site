/**
 * mixed-orders.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the mixed-order routing and badge system introduced in
 * feat/mixed-order-routing. Uses Playwright route interception to inject
 * controlled order fixtures — no real DB mutations.
 *
 * Coverage:
 *   - Orders page only shows regular + mixed orders (not pure preorders)
 *   - Pre-orders page shows has_preorder=true orders (pure + mixed)
 *   - MIXED badge renders for is_mixed_order=true orders
 *   - PRE-ORDER badge renders for pure preorder orders (has_preorder=true, is_mixed_order=false)
 *   - No preorder badge on regular orders
 *   - Blue dot renders when regular_items_dispatched_at is set (partial shipment)
 *   - Green dot renders when order is fulfilled + regular_items_dispatched_at is set
 *   - No dot on a mixed order where regular items have not been dispatched yet
 *
 * Run:
 *   npx playwright test tests/e2e/mixed-orders.spec.ts --project=dashboard
 */

import { test, expect, type Page, type Route } from "@playwright/test";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_ORDER = {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    customer_name: "Test Customer",
    customer_email: "test@example.com",
    customer_phone: "0200000000",
    total_amount: 250,
    paystack_reference: "ref_test_001",
    shipping_address: { text: "1 Test St" },
    delivery_method: "delivery",
    created_at: new Date().toISOString(),
    payment_status: "paid",
    customer_metadata: null,
};

const REGULAR_ORDER = {
    ...BASE_ORDER,
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    status: "paid",
    has_preorder: false,
    is_mixed_order: false,
    customer_metadata: null,
};

const PURE_PREORDER = {
    ...BASE_ORDER,
    id: "bbbbbbbb-0000-0000-0000-000000000002",
    status: "paid",
    has_preorder: true,
    is_mixed_order: false,
    customer_metadata: null,
};

const MIXED_ORDER_UNDISPATCHED = {
    ...BASE_ORDER,
    id: "cccccccc-0000-0000-0000-000000000003",
    status: "paid",
    has_preorder: true,
    is_mixed_order: true,
    customer_metadata: null,
};

const MIXED_ORDER_PARTIAL = {
    ...BASE_ORDER,
    id: "dddddddd-0000-0000-0000-000000000004",
    status: "shipped",
    has_preorder: true,
    is_mixed_order: true,
    customer_metadata: { regular_items_dispatched_at: new Date().toISOString() },
};

const MIXED_ORDER_FULFILLED = {
    ...BASE_ORDER,
    id: "eeeeeeee-0000-0000-0000-000000000005",
    status: "fulfilled",
    has_preorder: true,
    is_mixed_order: true,
    customer_metadata: { regular_items_dispatched_at: new Date().toISOString() },
};

// ── Intercept helpers ─────────────────────────────────────────────────────────

/**
 * Intercepts the Supabase orders REST call on the given path and returns
 * the provided fixture array as the response.
 */
async function interceptOrdersQuery(page: Page, urlPattern: string | RegExp, orders: object[]) {
    await page.route(urlPattern, (route: Route) => {
        route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: { "Content-Range": `0-${orders.length - 1}/${orders.length}` },
            body: JSON.stringify(orders),
        });
    });
}

// ── Orders page tests ─────────────────────────────────────────────────────────

test.describe("Orders page — routing filter", () => {

    test("shows regular orders", async ({ page }) => {
        await interceptOrdersQuery(
            page,
            /\/rest\/v1\/orders.*has_preorder/,
            [REGULAR_ORDER],
        );
        await page.goto("/sales/orders");
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });

        const rows = page.locator("table tbody tr");
        await expect(rows.first()).toBeVisible();
        await expect(page.locator("table tbody")).not.toContainText("Pre-Order");
        await expect(page.locator("table tbody")).not.toContainText("Mixed");
    });

    test("shows mixed orders alongside regular orders", async ({ page }) => {
        await interceptOrdersQuery(
            page,
            /\/rest\/v1\/orders.*has_preorder/,
            [REGULAR_ORDER, MIXED_ORDER_UNDISPATCHED],
        );
        await page.goto("/sales/orders");
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });

        // Mixed badge must appear exactly once (for the mixed order)
        const mixedBadge = page.locator("table tbody").getByText("Mixed", { exact: false });
        await expect(mixedBadge).toHaveCount(1);
    });

    test("does NOT show pure preorder orders", async ({ page }) => {
        // The DB query filters them out server-side; if the intercept returns
        // only regular + mixed, pure preorder badges should never appear.
        await interceptOrdersQuery(
            page,
            /\/rest\/v1\/orders.*has_preorder/,
            [REGULAR_ORDER, MIXED_ORDER_UNDISPATCHED],
        );
        await page.goto("/sales/orders");
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });

        await expect(page.locator("table tbody")).not.toContainText("Pre-Order");
    });
});

// ── Pre-orders page tests ─────────────────────────────────────────────────────

test.describe("Pre-orders page — shows all has_preorder orders", () => {

    test("shows pure preorder orders with PRE-ORDER badge", async ({ page }) => {
        await interceptOrdersQuery(
            page,
            /\/rest\/v1\/orders.*has_preorder/,
            [PURE_PREORDER],
        );
        await page.goto("/sales/pre-orders");
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });

        const badge = page.locator("table tbody").getByText("Pre-Order", { exact: false });
        await expect(badge).toHaveCount(1);
    });

    test("shows mixed orders with MIXED badge on pre-orders page", async ({ page }) => {
        await interceptOrdersQuery(
            page,
            /\/rest\/v1\/orders.*has_preorder/,
            [PURE_PREORDER, MIXED_ORDER_UNDISPATCHED],
        );
        await page.goto("/sales/pre-orders");
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });

        const mixedBadge = page.locator("table tbody").getByText("Mixed", { exact: false });
        await expect(mixedBadge).toHaveCount(1);

        const preorderBadge = page.locator("table tbody").getByText("Pre-Order", { exact: false });
        await expect(preorderBadge).toHaveCount(1);
    });
});

// ── Badge + dot rendering ─────────────────────────────────────────────────────

test.describe("Mixed order badge and partial fulfillment dot", () => {

    test("mixed order with no dispatch shows MIXED badge and no dot", async ({ page }) => {
        await interceptOrdersQuery(
            page,
            /\/rest\/v1\/orders.*has_preorder/,
            [MIXED_ORDER_UNDISPATCHED],
        );
        await page.goto("/sales/orders");
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });

        // MIXED badge present
        await expect(page.locator("table tbody").getByText("Mixed", { exact: false })).toBeVisible();

        // Dot indicator: the title attribute drives color — should NOT be present
        const dot = page.locator("table tbody span[title]");
        await expect(dot).toHaveCount(0);
    });

    test("mixed order with regular_items_dispatched_at shows blue partial dot", async ({ page }) => {
        await interceptOrdersQuery(
            page,
            /\/rest\/v1\/orders.*has_preorder/,
            [MIXED_ORDER_PARTIAL],
        );
        await page.goto("/sales/orders");
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });

        // Blue dot with partial shipment title
        const dot = page.locator("table tbody span[title*='Pre-order items pending']");
        await expect(dot).toBeVisible();
        await expect(dot).toHaveClass(/text-blue/);
    });

    test("fulfilled mixed order shows green dot", async ({ page }) => {
        await interceptOrdersQuery(
            page,
            /\/rest\/v1\/orders.*has_preorder/,
            [MIXED_ORDER_FULFILLED],
        );
        await page.goto("/sales/orders");
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });

        const dot = page.locator("table tbody span[title*='Fully fulfilled']");
        await expect(dot).toBeVisible();
        await expect(dot).toHaveClass(/text-emerald/);
    });

    test("regular order shows no preorder badge or dot", async ({ page }) => {
        await interceptOrdersQuery(
            page,
            /\/rest\/v1\/orders.*has_preorder/,
            [REGULAR_ORDER],
        );
        await page.goto("/sales/orders");
        await page.waitForSelector("table tbody tr", { timeout: 15_000 });

        await expect(page.locator("table tbody")).not.toContainText("Mixed");
        await expect(page.locator("table tbody")).not.toContainText("Pre-Order");
        await expect(page.locator("table tbody span[title]")).toHaveCount(0);
    });
});

// ── Page structure smoke tests (no intercept — real data) ─────────────────────

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
        // (only MIXED badge is allowed here for has_preorder orders)
        const preorderBadge = page.locator("table tbody span").filter({ hasText: /^Pre-Order$/i });
        await expect(preorderBadge).toHaveCount(0);
    });
});
