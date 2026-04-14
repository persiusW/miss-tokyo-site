/**
 * auth.setup.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Playwright setup step: logs in as admin once and saves the browser storage
 * state (cookies + localStorage) to tests/fixtures/.auth/admin.json.
 *
 * The "dashboard" project in playwright.config.ts declares a dependency on
 * this setup step so it always runs first.
 *
 * Credentials are read from env vars — set them in .env.test (gitignored):
 *   TEST_ADMIN_EMAIL=...
 *   TEST_ADMIN_PASSWORD=...
 *
 * Run in isolation:
 *   npx playwright test tests/e2e/auth.setup.ts --project=admin-setup
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    ?? "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";
const AUTH_FILE      = path.join(__dirname, "../fixtures/.auth/admin.json");

setup("authenticate as admin and save session", async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        throw new Error(
            "TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set. " +
            "Add them to .env.test (gitignored)."
        );
    }

    // Ensure the auth directory exists.
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

    await page.goto("/admin/login");

    // Wait for the login form to be interactive.
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 10_000 });

    await emailInput.fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);

    // Submit.
    await page.locator('button[type="submit"]').click();

    // Wait until we land on the overview page.
    await page.waitForURL("**/overview", { timeout: 20_000 });
    await expect(page).toHaveURL(/\/overview/);

    // Persist auth state.
    await page.context().storageState({ path: AUTH_FILE });
});
