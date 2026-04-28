import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Miss Tokyo e-commerce E2E tests.
 *
 * Base URL reads from NEXT_PUBLIC_SITE_URL so the same suite runs against
 * local dev, Vercel preview, and production without code changes:
 *
 *   NEXT_PUBLIC_SITE_URL=https://misstokyo.shop npx playwright test
 *
 * Admin credentials are read from env vars (see .env.test, gitignored):
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 */

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 90_000,          // 90s — SSR shop/PDP pages with Supabase queries can be slow
    retries: process.env.CI ? 2 : 0,
    // 1 worker locally — prevents the dev server (Next.js + Supabase SSR) from being
    // overwhelmed by concurrent PDP requests, which causes cascade timeouts.
    // CI uses 2 workers since it tests against a deployed instance.
    workers: process.env.CI ? 2 : 1,
    reporter: [["html", { outputFolder: "tests/reports/playwright" }], ["list"]],

    use: {
        baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        storageState: undefined,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },

    projects: [
        // ── 1. Storefront — no auth required ────────────────────────────────
        {
            name: "storefront-chrome",
            testMatch: /\/(checkout|wholesale-exclusion|storefront|account-portal)\.spec\.ts/,
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "storefront-mobile",
            testMatch: /\/(storefront|checkout)\.spec\.ts/,
            use: { ...devices["iPhone 14"] },
        },

        // ── 2. Admin auth flow tests (tests the login page itself — no pre-saved state) ─
        // Must run BEFORE admin-setup: these tests log in/out with admin credentials.
        // On Supabase projects with single-session or global-revoke behaviour,
        // a login here invalidates any previously saved session in admin.json.
        // Running first ensures admin-setup always creates the session last.
        {
            name: "admin-auth",
            testMatch: /admin-auth\.spec\.ts/,
            use: { ...devices["Desktop Chrome"] },
        },

        // ── 3. Admin auth setup ──────────────────────────────────────────────
        // Runs after admin-auth so the saved session is the freshest one.
        // Saves session cookie to disk for the dashboard project below.
        {
            name: "admin-setup",
            testMatch: /auth\.setup\.ts/,
            dependencies: ["admin-auth"],
            use: { ...devices["Desktop Chrome"] },
        },

        // ── 4. Dashboard — requires admin session saved by admin-setup ───────
        {
            name: "dashboard",
            testMatch: /dashboard\.spec\.ts/,
            dependencies: ["admin-setup"],
            use: {
                ...devices["Desktop Chrome"],
                storageState: "tests/fixtures/.auth/admin.json",
            },
        },
    ],
});
