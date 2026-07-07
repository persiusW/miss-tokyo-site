# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-auth.spec.ts >> Admin login and logout cycle >> logout clears session and redirects to login
- Location: tests/e2e/admin-auth.spec.ts:142:9

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/overview/
Received string:  "http://localhost:3000/admin/plans"
Timeout: 20000ms

Call log:
  - Expect "toHaveURL" with timeout 20000ms
    6 × unexpected value "http://localhost:3000/admin/login"
    18 × unexpected value "http://localhost:3000/admin/plans"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e7]:
        - list [ref=e9]:
          - listitem [ref=e10]:
            - generic [ref=e11]:
              - img [ref=e13]
              - generic [ref=e17]:
                - generic [ref=e18]: Turtle Admin
                - generic [ref=e19]: Dashboard v1.0
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: Management
            - list [ref=e24]:
              - listitem [ref=e25]:
                - button "Overview" [ref=e26] [cursor=pointer]:
                  - img [ref=e27]
                  - generic [ref=e32]: Overview
              - listitem [ref=e33]:
                - button "Businesses" [ref=e34] [cursor=pointer]:
                  - img [ref=e35]
                  - generic [ref=e39]: Businesses
              - listitem [ref=e40]:
                - button "Claim Requests" [ref=e41] [cursor=pointer]:
                  - img [ref=e42]
                  - generic [ref=e45]: Claim Requests
              - listitem [ref=e46]:
                - button "Verification Docs" [ref=e47] [cursor=pointer]:
                  - img [ref=e48]
                  - generic [ref=e51]: Verification Docs
              - listitem [ref=e52]:
                - button "Renewal Reminders" [ref=e53] [cursor=pointer]:
                  - img [ref=e54]
                  - generic [ref=e57]: Renewal Reminders
              - listitem [ref=e58]:
                - button "Reviews" [ref=e59] [cursor=pointer]:
                  - img [ref=e60]
                  - generic [ref=e62]: Reviews
          - generic [ref=e63]:
            - generic [ref=e64]: Trust & Safety
            - list [ref=e66]:
              - listitem [ref=e67]:
                - button "Flagged Numbers" [ref=e68] [cursor=pointer]:
                  - img [ref=e69]
                  - generic [ref=e73]: Flagged Numbers
              - listitem [ref=e74]:
                - button "Scam Reports" [ref=e75] [cursor=pointer]:
                  - img [ref=e76]
                  - generic [ref=e78]: Scam Reports
              - listitem [ref=e79]:
                - button "Support Tickets" [ref=e80] [cursor=pointer]:
                  - img [ref=e81]
                  - generic [ref=e84]: Support Tickets
          - generic [ref=e85]:
            - generic [ref=e86]: Content
            - list [ref=e88]:
              - listitem [ref=e89]:
                - button "Blog Posts" [ref=e90] [cursor=pointer]:
                  - img [ref=e91]
                  - generic [ref=e93]: Blog Posts
          - generic [ref=e94]:
            - generic [ref=e95]: Administration
            - list [ref=e97]:
              - listitem [ref=e98]:
                - button "Staff / Sub-admins" [ref=e99] [cursor=pointer]:
                  - img [ref=e100]
                  - generic [ref=e105]: Staff / Sub-admins
              - listitem [ref=e106]:
                - button "Subscription Plans" [ref=e107] [cursor=pointer]:
                  - img [ref=e108]
                  - generic [ref=e110]: Subscription Plans
          - generic [ref=e111]:
            - generic [ref=e112]: System
            - list [ref=e114]:
              - listitem [ref=e115]:
                - button "Email Templates" [ref=e116] [cursor=pointer]:
                  - img [ref=e117]
                  - generic [ref=e120]: Email Templates
              - listitem [ref=e121]:
                - button "Platform Settings" [ref=e122] [cursor=pointer]:
                  - img [ref=e123]
                  - generic [ref=e126]: Platform Settings
        - list [ref=e128]:
          - listitem [ref=e129]:
            - button "Sign out" [ref=e130] [cursor=pointer]:
              - img [ref=e131]
              - generic [ref=e134]: Sign out
        - button "Toggle Sidebar" [ref=e135]
      - main [ref=e136]:
        - generic [ref=e137]:
          - button "Toggle Sidebar" [ref=e138] [cursor=pointer]:
            - img
            - generic [ref=e139]: Toggle Sidebar
          - navigation "breadcrumb" [ref=e140]:
            - list [ref=e141]:
              - listitem [ref=e142]:
                - link "Admin" [ref=e143] [cursor=pointer]:
                  - /url: /admin
              - listitem [ref=e144]:
                - img [ref=e145]
              - listitem [ref=e147]:
                - link "plans" [disabled] [ref=e148]
          - generic [ref=e149]:
            - button "Toggle theme" [ref=e150] [cursor=pointer]:
              - img
              - generic [ref=e151]: Toggle theme
            - button "Sign out" [ref=e152] [cursor=pointer]
        - main [ref=e153]:
          - generic [ref=e154]:
            - generic [ref=e155]:
              - generic [ref=e156]:
                - heading "Subscription Plans" [level=1] [ref=e157]
                - paragraph [ref=e158]: Manage SaaS pricing tiers safely as persiuswilder@gmail.com.
              - button "Create Plan" [ref=e160] [cursor=pointer]:
                - img
                - text: Create Plan
            - table [ref=e163]:
              - rowgroup [ref=e164]:
                - row "Plan Name Paystack Code Pricing Active Subs Total Revenue Status Actions" [ref=e165]:
                  - columnheader "Plan Name" [ref=e166]
                  - columnheader "Paystack Code" [ref=e167]
                  - columnheader "Pricing" [ref=e168]
                  - columnheader "Active Subs" [ref=e169]
                  - columnheader "Total Revenue" [ref=e170]
                  - columnheader "Status" [ref=e171]
                  - columnheader "Actions" [ref=e172]
              - rowgroup [ref=e173]:
                - row "Starter Get your business profile online and start managing your digital ledger. PLN_0wq8twcc9wiyvtv GHS 39 /monthly 2 GHS 0.00 Active Subscribers" [ref=e174]:
                  - cell "Starter Get your business profile online and start managing your digital ledger." [ref=e175]:
                    - paragraph [ref=e176]: Starter
                    - paragraph [ref=e177]: Get your business profile online and start managing your digital ledger.
                  - cell "PLN_0wq8twcc9wiyvtv" [ref=e178]:
                    - paragraph [ref=e179]: PLN_0wq8twcc9wiyvtv
                  - cell "GHS 39 /monthly" [ref=e180]:
                    - paragraph [ref=e181]: GHS 39
                    - paragraph [ref=e182]: /monthly
                  - cell "2" [ref=e183]:
                    - paragraph [ref=e184]: "2"
                  - cell "GHS 0.00" [ref=e185]:
                    - paragraph [ref=e186]: GHS 0.00
                  - cell "Active" [ref=e187]:
                    - generic [ref=e188]: Active
                  - cell "Subscribers" [ref=e189]:
                    - button "Subscribers" [ref=e190] [cursor=pointer]:
                      - img
                      - text: Subscribers
                    - button [ref=e191] [cursor=pointer]:
                      - img
                - row "Business Everything in Starter plus lead capture, logo branding, and QR poster. PLN_dje98nh8b1ow47h GHS 99 /monthly 0 GHS 0.00 Active Subscribers" [ref=e192]:
                  - cell "Business Everything in Starter plus lead capture, logo branding, and QR poster." [ref=e193]:
                    - paragraph [ref=e194]: Business
                    - paragraph [ref=e195]: Everything in Starter plus lead capture, logo branding, and QR poster.
                  - cell "PLN_dje98nh8b1ow47h" [ref=e196]:
                    - paragraph [ref=e197]: PLN_dje98nh8b1ow47h
                  - cell "GHS 99 /monthly" [ref=e198]:
                    - paragraph [ref=e199]: GHS 99
                    - paragraph [ref=e200]: /monthly
                  - cell "0" [ref=e201]:
                    - paragraph [ref=e202]: "0"
                  - cell "GHS 0.00" [ref=e203]:
                    - paragraph [ref=e204]: GHS 0.00
                  - cell "Active" [ref=e205]:
                    - generic [ref=e206]: Active
                  - cell "Subscribers" [ref=e207]:
                    - button "Subscribers" [ref=e208] [cursor=pointer]:
                      - img
                      - text: Subscribers
                    - button [ref=e209] [cursor=pointer]:
                      - img
                - 'row "Enterprise Full suite: scam alerts, multi-branch management, and branded ledger. PLN_m9rd8pnhmu5g8r9 GHS 150 /monthly 1 GHS 0.00 Active Subscribers" [ref=e210]':
                  - 'cell "Enterprise Full suite: scam alerts, multi-branch management, and branded ledger." [ref=e211]':
                    - paragraph [ref=e212]: Enterprise
                    - paragraph [ref=e213]: "Full suite: scam alerts, multi-branch management, and branded ledger."
                  - cell "PLN_m9rd8pnhmu5g8r9" [ref=e214]:
                    - paragraph [ref=e215]: PLN_m9rd8pnhmu5g8r9
                  - cell "GHS 150 /monthly" [ref=e216]:
                    - paragraph [ref=e217]: GHS 150
                    - paragraph [ref=e218]: /monthly
                  - cell "1" [ref=e219]:
                    - paragraph [ref=e220]: "1"
                  - cell "GHS 0.00" [ref=e221]:
                    - paragraph [ref=e222]: GHS 0.00
                  - cell "Active" [ref=e223]:
                    - generic [ref=e224]: Active
                  - cell "Subscribers" [ref=e225]:
                    - button "Subscribers" [ref=e226] [cursor=pointer]:
                      - img
                      - text: Subscribers
                    - button [ref=e227] [cursor=pointer]:
                      - img
    - button "Help and support" [ref=e228] [cursor=pointer]:
      - img [ref=e229]
    - region "Notifications (F8)":
      - list
  - alert [ref=e232]
  - button "Open Next.js Dev Tools" [ref=e238] [cursor=pointer]:
    - img [ref=e239]
```

# Test source

```ts
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
  98  |             expect(isRedirected).toBe(true);
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
> 127 |     await expect(page).toHaveURL(/\/overview/, { timeout: 20_000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
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