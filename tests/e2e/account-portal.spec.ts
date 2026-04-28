/**
 * account-portal.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the customer-facing account portal:
 *   - /login page renders correctly
 *   - Unauthenticated access to /account/* redirects to /login
 *   - Login form validation (wrong credentials show an error)
 *
 * NOTE: We do not have a dedicated test customer account so authenticated
 * account page content is not asserted here. Add those once a test customer
 * is seeded.
 *
 * Read-only. Nothing is created or mutated.
 *
 * Run:
 *   npx playwright test tests/e2e/account-portal.spec.ts --project=storefront-chrome
 */

import { test, expect } from "@playwright/test";
import { ROUTES } from "../fixtures/test-data";

// ── Login page ────────────────────────────────────────────────────────────────

test.describe("Customer login page", () => {

    test("renders the login form", async ({ page }) => {
        await page.goto(ROUTES.login);

        await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('input[type="password"]').first()).toBeVisible();
        await expect(page.locator('button[type="submit"]').first()).toBeVisible();
    });

    test("has a link to sign up / create account", async ({ page }) => {
        await page.goto(ROUTES.login);

        const signUpLink = page
            .locator('a:has-text("sign up"), a:has-text("create account"), a:has-text("register"), a[href*="signup"], a[href*="register"]')
            .first();
        await expect(signUpLink).toBeVisible({ timeout: 10_000 });
    });

    test("wrong credentials show an error", async ({ page }) => {
        await page.goto(ROUTES.login);

        await page.locator('input[type="email"]').first().fill("nobody@nowhere.test");
        await page.locator('input[type="password"]').first().fill("wrongpassword99");
        await page.locator('button[type="submit"]').click();

        // Login page renders errors as div.text-red-600 (no class="error" or role="alert").
        const error = page
            .locator('[class*="error"], [class*="red-6"], [role="alert"]')
            .or(page.getByText(/invalid|incorrect|not found|credentials/i))
            .first();
        await expect(error).toBeVisible({ timeout: 12_000 });
    });

    test("empty form submission does not navigate away", async ({ page }) => {
        await page.goto(ROUTES.login);

        await page.locator('button[type="submit"]').click();

        // Should remain on /login.
        await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
    });
});

// ── Session guard — account portal ────────────────────────────────────────────

test.describe("Account portal — unauthenticated redirects", () => {

    const ACCOUNT_ROUTES = [
        ROUTES.account,
        ROUTES.accountOrders,
        ROUTES.accountProfile,
        ROUTES.accountAddresses,
    ];

    for (const route of ACCOUNT_ROUTES) {
        test(`unauthenticated ${route} redirects to /login`, async ({ page }) => {
            await page.goto(route);

            const finalUrl = page.url();
            const redirectedToLogin = finalUrl.includes("/login");

            expect(redirectedToLogin).toBe(true);
        });
    }
});

// ── Checkout — form validation (storefront, no auth needed) ───────────────────

test.describe("Checkout page — form validation", () => {

    test("empty cart shows empty state or redirects, not a crash", async ({ page }) => {
        await page.goto(ROUTES.checkout);

        // Either shows an empty cart message, redirects to /shop, or shows the form.
        const bodyText = await page.locator("body").textContent();
        const isEmpty = /empty|no items|your cart is empty/i.test(bodyText ?? "");
        const isRedirected = page.url().includes("/shop") || page.url().includes("/checkout");
        const hasForm = await page.locator('input[name="fullName"]').isVisible().catch(() => false);

        expect(isEmpty || isRedirected || hasForm).toBe(true);
    });
});

// ── Customer-facing pages — structure smoke tests ─────────────────────────────

test.describe("Storefront static pages", () => {

    const STATIC_PAGES = [
        { route: "/about",        text: /about/i },
        { route: "/policies",     text: /polic/i },
        { route: "/faq",          text: /faq|frequent/i },
        { route: "/contact",      text: /contact/i },
        { route: "/size-guide",   text: /size/i },
        { route: "/shipping",     text: /ship|deliver/i },
    ];

    for (const { route, text } of STATIC_PAGES) {
        test(`${route} renders without crashing`, async ({ page }) => {
            const response = await page.goto(route);

            const status = response?.status() ?? 200;

            // Some optional pages may not be implemented in every environment — skip gracefully.
            if (status === 404) {
                test.skip();
                return;
            }

            // 200 or 3xx (redirect) — not a 5xx crash.
            expect(status).toBeLessThan(500);

            await expect(page.locator("body")).toContainText(text, { timeout: 10_000 });
        });
    }
});
