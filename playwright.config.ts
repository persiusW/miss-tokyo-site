import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Miss Tokyo e-commerce E2E tests.
 *
 * Base URL reads from NEXT_PUBLIC_SITE_URL so the same suite runs against
 * local dev, Vercel preview, and production without code changes:
 *
 *   NEXT_PUBLIC_SITE_URL=https://staging.misstokyo.shop npx playwright test
 */

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 30_000,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [["html", { outputFolder: "tests/reports/playwright" }], ["list"]],

    use: {
        baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        // Treat the app as a real browser would: no auth cookies pre-seeded.
        storageState: undefined,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "mobile-safari",
            use: { ...devices["iPhone 14"] },
        },
    ],
});
