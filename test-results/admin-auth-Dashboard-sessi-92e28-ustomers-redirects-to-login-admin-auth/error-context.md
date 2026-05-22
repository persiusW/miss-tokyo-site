# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-auth.spec.ts >> Dashboard session guard >> unauthenticated access to /customers redirects to login
- Location: tests/e2e/admin-auth.spec.ts:89:13

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - main [ref=e3]:
      - generic [ref=e4]:
        - img "Transparent Turtle" [ref=e6]
        - heading "404" [level=1] [ref=e7]
        - paragraph [ref=e8]: This page went missing.
        - paragraph [ref=e9]: The page you were looking for doesn't exist or may have been moved. You haven't done anything wrong.
        - generic [ref=e10]:
          - link "Return Home" [ref=e11] [cursor=pointer]:
            - /url: /
            - img
            - text: Return Home
          - button "Go Back" [ref=e12] [cursor=pointer]:
            - img
            - text: Go Back
    - button "Help and support" [ref=e13] [cursor=pointer]:
      - img [ref=e14]
    - region "Notifications (F8)":
      - list
  - alert [ref=e17]
  - button "Open Next.js Dev Tools" [ref=e23] [cursor=pointer]:
    - img [ref=e24]
```

# Test source

```ts
  1   | /**
  2   |  * admin-auth.spec.ts
  3   |  * ─────────────────────────────────────────────────────────────────────────────
  4   |  * Tests the admin authentication layer:
  5   |  *   - /admin/login renders correctly
  6   |  *   - Wrong credentials show a user-friendly error
  7   |  *   - Unauthenticated access to dashboard routes redirects to /admin/login
  8   |  *   - Correct credentials land on /overview
  9   |  *   - Logging out clears the session and redirects back to /admin/login
  10  |  *
  11  |  * These tests do NOT use the pre-saved admin storage state — they exercise
  12  |  * the login flow from scratch so they can validate the form UI itself.
  13  |  *
  14  |  * Read-only: the tests do not create or modify any data.
  15  |  *
  16  |  * Run:
  17  |  *   npx playwright test tests/e2e/admin-auth.spec.ts --project=admin-auth
  18  |  */
  19  | 
  20  | import { test, expect } from "@playwright/test";
  21  | import { ROUTES, ADMIN_AUTH } from "../fixtures/test-data";
  22  | 
  23  | // ── Login page ────────────────────────────────────────────────────────────────
  24  | 
  25  | test.describe("Admin login page", () => {
  26  | 
  27  |     test("renders the login form", async ({ page }) => {
  28  |         await page.goto(ROUTES.adminLogin);
  29  | 
  30  |         await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10_000 });
  31  |         await expect(page.locator('input[type="password"]').first()).toBeVisible();
  32  |         await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  33  |     });
  34  | 
  35  |     test("page title or heading references Miss Tokyo or Admin", async ({ page }) => {
  36  |         await page.goto(ROUTES.adminLogin);
  37  | 
  38  |         // Either the browser title or a visible heading should mention the brand.
  39  |         const titleMatch = (await page.title()).toLowerCase().match(/miss tokyo|admin/);
  40  |         const headingVisible = await page
  41  |             .locator("h1, h2")
  42  |             .filter({ hasText: /miss tokyo|admin|sign in|log in/i })
  43  |             .isVisible()
  44  |             .catch(() => false);
  45  | 
  46  |         expect(titleMatch || headingVisible).toBeTruthy();
  47  |     });
  48  | 
  49  |     test("wrong password shows a friendly error message", async ({ page }) => {
  50  |         await page.goto(ROUTES.adminLogin);
  51  | 
  52  |         await page.locator('input[type="email"]').first().fill("wrong@example.com");
  53  |         await page.locator('input[type="password"]').first().fill("definitelywrong");
  54  |         await page.locator('button[type="submit"]').click();
  55  | 
  56  |         // An error message should appear — not a crash.
  57  |         // The admin login page renders errors inside a red div with class bg-red-50.
  58  |         const error = page
  59  |             .locator('[class*="error"], [class*="red"], [role="alert"]')
  60  |             .or(page.getByText(/invalid|incorrect|denied|access|credentials|not found/i))
  61  |             .first();
  62  |         await expect(error).toBeVisible({ timeout: 12_000 });
  63  |     });
  64  | 
  65  |     test("submitting an empty form keeps user on login page", async ({ page }) => {
  66  |         await page.goto(ROUTES.adminLogin);
  67  | 
  68  |         await page.locator('button[type="submit"]').click();
  69  | 
  70  |         // Should stay on /admin/login (HTML validation or JS validation prevents submission).
  71  |         await expect(page).toHaveURL(/admin\/login/, { timeout: 6_000 });
  72  |     });
  73  | });
  74  | 
  75  | // ── Session guard (proxy.ts) ──────────────────────────────────────────────────
  76  | 
  77  | test.describe("Dashboard session guard", () => {
  78  | 
  79  |     const GUARDED_ROUTES = [
  80  |         ROUTES.overview,
  81  |         ROUTES.orders,
  82  |         ROUTES.catalog,
  83  |         ROUTES.customers,
  84  |         ROUTES.settings,
  85  |         ROUTES.cms,
  86  |     ];
  87  | 
  88  |     for (const route of GUARDED_ROUTES) {
  89  |         test(`unauthenticated access to ${route} redirects to login`, async ({ page }) => {
  90  |             // No cookies set — pure guest context.
  91  |             await page.goto(route);
  92  | 
  93  |             // proxy.ts redirects ALL unauthenticated users (dashboard + account) to
  94  |             // /login?next=<original-path>. We assert the redirect happened.
  95  |             const finalUrl = page.url();
  96  |             const isRedirected = finalUrl.includes("/login");
  97  | 
> 98  |             expect(isRedirected).toBe(true);
      |                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  99  |         });
  100 |     }
  101 | });
  102 | 
  103 | // ── Full login → overview → logout cycle ─────────────────────────────────────
  104 | 
  105 | /**
  106 |  * Helper — submit the admin login form and assert we reach /overview.
  107 |  * Fails fast (3 s) if the form shows a credential error rather than waiting
  108 |  * the full 20 s timeout, producing a clear message in CI output.
  109 |  */
  110 | async function loginAsAdmin(page: import("@playwright/test").Page) {
  111 |     await page.goto(ROUTES.adminLogin);
  112 |     await page.locator('input[type="email"]').first().fill(ADMIN_AUTH.email);
  113 |     await page.locator('input[type="password"]').first().fill(ADMIN_AUTH.password);
  114 |     await page.locator('button[type="submit"]').click();
  115 | 
  116 |     // Detect a credential error within 3 s so the test fails with a helpful
  117 |     // message instead of silently timing out after 20 s.
  118 |     const errorEl = page.locator('[class*="red"], [role="alert"]').first();
  119 |     const maybeError = await errorEl.textContent({ timeout: 3_000 }).catch(() => null);
  120 |     if (maybeError?.trim()) {
  121 |         throw new Error(
  122 |             `Login rejected — check TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD in .env.test. ` +
  123 |             `Form error: "${maybeError.trim()}"`
  124 |         );
  125 |     }
  126 | 
  127 |     await expect(page).toHaveURL(/\/overview/, { timeout: 20_000 });
  128 | }
  129 | 
  130 | test.describe("Admin login and logout cycle", () => {
  131 | 
  132 |     test.beforeEach(async ({}) => {
  133 |         if (!ADMIN_AUTH.email || !ADMIN_AUTH.password) {
  134 |             test.skip();
  135 |         }
  136 |     });
  137 | 
  138 |     test("valid credentials land on /overview", async ({ page }) => {
  139 |         await loginAsAdmin(page);
  140 |     });
  141 | 
  142 |     test("logout clears session and redirects to login", async ({ page }) => {
  143 |         await loginAsAdmin(page);
  144 | 
  145 |         // The logout route is POST-only. Use page.request.post so the browser
  146 |         // session cookies are sent and cleared server-side without browser navigation.
  147 |         await page.request.post("/api/auth/logout");
  148 | 
  149 |         // Navigate to admin login to confirm the session is cleared.
  150 |         await page.goto(ROUTES.adminLogin, { waitUntil: "domcontentloaded" });
  151 |         await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  152 |     });
  153 | 
  154 |     test("after logout, /overview redirects back to login", async ({ page }) => {
  155 |         await loginAsAdmin(page);
  156 | 
  157 |         // POST to logout endpoint to clear the server-side session.
  158 |         await page.request.post("/api/auth/logout");
  159 | 
  160 |         // Now try to access the dashboard — should redirect to /login.
  161 |         await page.goto(ROUTES.overview, { waitUntil: "domcontentloaded", timeout: 30_000 });
  162 |         await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  163 |     });
  164 | });
  165 | 
```