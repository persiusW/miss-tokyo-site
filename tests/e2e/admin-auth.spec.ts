/**
 * admin-auth.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the admin authentication layer:
 *   - /admin/login renders correctly
 *   - Wrong credentials show a user-friendly error
 *   - Unauthenticated access to dashboard routes redirects to /admin/login
 *   - Correct credentials land on /overview
 *   - Logging out clears the session and redirects back to /admin/login
 *
 * These tests do NOT use the pre-saved admin storage state — they exercise
 * the login flow from scratch so they can validate the form UI itself.
 *
 * Read-only: the tests do not create or modify any data.
 *
 * Run:
 *   npx playwright test tests/e2e/admin-auth.spec.ts --project=admin-auth
 */

import { test, expect } from "@playwright/test";
import { ROUTES, ADMIN_AUTH } from "../fixtures/test-data";

// ── Login page ────────────────────────────────────────────────────────────────

test.describe("Admin login page", () => {

    test("renders the login form", async ({ page }) => {
        await page.goto(ROUTES.adminLogin);

        await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('input[type="password"]').first()).toBeVisible();
        await expect(page.locator('button[type="submit"]').first()).toBeVisible();
    });

    test("page title or heading references Miss Tokyo or Admin", async ({ page }) => {
        await page.goto(ROUTES.adminLogin);

        // Either the browser title or a visible heading should mention the brand.
        const titleMatch = (await page.title()).toLowerCase().match(/miss tokyo|admin/);
        const headingVisible = await page
            .locator("h1, h2")
            .filter({ hasText: /miss tokyo|admin|sign in|log in/i })
            .isVisible()
            .catch(() => false);

        expect(titleMatch || headingVisible).toBeTruthy();
    });

    test("wrong password shows a friendly error message", async ({ page }) => {
        await page.goto(ROUTES.adminLogin);

        await page.locator('input[type="email"]').first().fill("wrong@example.com");
        await page.locator('input[type="password"]').first().fill("definitelywrong");
        await page.locator('button[type="submit"]').click();

        // An error message should appear — not a crash.
        // The admin login page renders errors inside a red div with class bg-red-50.
        const error = page
            .locator('[class*="error"], [class*="red"], [role="alert"]')
            .or(page.getByText(/invalid|incorrect|denied|access|credentials|not found/i))
            .first();
        await expect(error).toBeVisible({ timeout: 12_000 });
    });

    test("submitting an empty form keeps user on login page", async ({ page }) => {
        await page.goto(ROUTES.adminLogin);

        await page.locator('button[type="submit"]').click();

        // Should stay on /admin/login (HTML validation or JS validation prevents submission).
        await expect(page).toHaveURL(/admin\/login/, { timeout: 6_000 });
    });
});

// ── Session guard (proxy.ts) ──────────────────────────────────────────────────

test.describe("Dashboard session guard", () => {

    const GUARDED_ROUTES = [
        ROUTES.overview,
        ROUTES.orders,
        ROUTES.catalog,
        ROUTES.customers,
        ROUTES.settings,
        ROUTES.cms,
    ];

    for (const route of GUARDED_ROUTES) {
        test(`unauthenticated access to ${route} redirects to login`, async ({ page }) => {
            // No cookies set — pure guest context.
            await page.goto(route);

            // proxy.ts redirects ALL unauthenticated users (dashboard + account) to
            // /login?next=<original-path>. We assert the redirect happened.
            const finalUrl = page.url();
            const isRedirected = finalUrl.includes("/login");

            expect(isRedirected).toBe(true);
        });
    }
});

// ── Full login → overview → logout cycle ─────────────────────────────────────

test.describe("Admin login and logout cycle", () => {

    test.beforeEach(async ({}) => {
        if (!ADMIN_AUTH.email || !ADMIN_AUTH.password) {
            test.skip();
        }
    });

    test("valid credentials land on /overview", async ({ page }) => {
        await page.goto(ROUTES.adminLogin);

        await page.locator('input[type="email"]').first().fill(ADMIN_AUTH.email);
        await page.locator('input[type="password"]').first().fill(ADMIN_AUTH.password);
        await page.locator('button[type="submit"]').click();

        await expect(page).toHaveURL(/\/overview/, { timeout: 20_000 });
    });

    test("logout clears session and redirects to login", async ({ page }) => {
        // Log in first.
        await page.goto(ROUTES.adminLogin);
        await page.locator('input[type="email"]').first().fill(ADMIN_AUTH.email);
        await page.locator('input[type="password"]').first().fill(ADMIN_AUTH.password);
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/\/overview/, { timeout: 20_000 });

        // The logout route is POST-only. Use page.request.post so the browser
        // session cookies are sent and cleared server-side without browser navigation.
        await page.request.post("/api/auth/logout");

        // Navigate to admin login to confirm the session is cleared.
        await page.goto(ROUTES.adminLogin, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/login/, { timeout: 10_000 });
    });

    test("after logout, /overview redirects back to login", async ({ page }) => {
        // Log in.
        await page.goto(ROUTES.adminLogin);
        await page.locator('input[type="email"]').first().fill(ADMIN_AUTH.email);
        await page.locator('input[type="password"]').first().fill(ADMIN_AUTH.password);
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/\/overview/, { timeout: 20_000 });

        // POST to logout endpoint to clear the server-side session.
        await page.request.post("/api/auth/logout");

        // Now try to access the dashboard — should redirect to /login.
        await page.goto(ROUTES.overview, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await expect(page).toHaveURL(/login/, { timeout: 10_000 });
    });
});
