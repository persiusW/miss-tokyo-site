/**
 * Miss Tokyo — Full system test (shop + admin + dashboard)
 * Run: node scripts/test-full.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3001";
const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️ ";
const INFO = "   ";

let passed = 0, failed = 0, warned = 0;
const issues = [];

mkdirSync("scripts/screenshots/full", { recursive: true });

let _shotIdx = 0;
async function shot(page, name) {
    await page.screenshot({ path: `scripts/screenshots/full/${String(++_shotIdx).padStart(2,"0")}-${name}.png`, fullPage: false }).catch(() => {});
}

function log(icon, section, label, detail = "") {
    const line = `  ${icon} [${section}] ${label}${detail ? "  →  " + detail : ""}`;
    console.log(line);
    if (icon === PASS) passed++;
    else if (icon === FAIL) { failed++; issues.push(`${section}: ${label}`); }
    else if (icon === WARN) warned++;
}

async function checkPage(page, section, url, opts = {}) {
    const { expectRedirect, expectText, expectNoText, failOn404 = true } = opts;
    try {
        const res = await page.goto(`${BASE}${url}`, { waitUntil: "load", timeout: 30000 });
        await page.waitForTimeout(1500);
        const status = res?.status() ?? 0;
        const finalUrl = page.url();

        if (expectRedirect) {
            const redirected = !finalUrl.includes(url) || finalUrl.includes(expectRedirect);
            redirected
                ? log(PASS, section, `${url} redirects as expected`, finalUrl.replace(BASE, ""))
                : log(WARN, section, `${url} no redirect detected`, finalUrl.replace(BASE, ""));
            return;
        }

        if (failOn404 && status === 404) {
            log(FAIL, section, `${url} returned 404`);
            return;
        }

        if (status >= 500) {
            log(FAIL, section, `${url} returned ${status} server error`);
            return;
        }

        // Check for crash markers
        const bodyText = await page.locator("body").innerText().catch(() => "");
        if (bodyText.includes("Application error") || bodyText.includes("Internal error")) {
            log(FAIL, section, `${url} shows application crash`);
            return;
        }

        if (expectText) {
            const found = await page.locator(`text=${expectText}`).count().catch(() => 0);
            found > 0
                ? log(PASS, section, `${url} renders "${expectText}"`)
                : log(WARN, section, `${url} missing expected text "${expectText}"`, `status ${status}`);
            return;
        }

        log(PASS, section, `${url} loads`, `HTTP ${status}`);
    } catch (err) {
        log(FAIL, section, `${url} threw error`, err.message.substring(0, 80));
    }
}

async function run() {
    const browser = await chromium.launch({ headless: true });

    // ══════════════════════════════════════════════════════════════════
    // SECTION 1: PUBLIC SHOP PAGES
    // ══════════════════════════════════════════════════════════════════
    console.log("\n╔══════════════════════════════╗");
    console.log("║   PUBLIC SHOP PAGES          ║");
    console.log("╚══════════════════════════════╝");

    const shopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const shopPage = await shopCtx.newPage();
    const shopErrors = [];
    shopPage.on("response", r => { if (r.status() >= 500) shopErrors.push(`${r.status()} ${r.url().split("?")[0].replace(BASE,"")}`); });

    await checkPage(shopPage, "Shop", "/", { expectText: "Miss Tokyo" });
    await shot(shopPage, "homepage");
    await checkPage(shopPage, "Shop", "/shop", { expectText: "GH₵" });
    await shot(shopPage, "shop");
    await checkPage(shopPage, "Shop", "/gallery");
    await shot(shopPage, "gallery");
    await checkPage(shopPage, "Shop", "/new-arrivals");
    await checkPage(shopPage, "Shop", "/sale");
    await checkPage(shopPage, "Shop", "/gift-cards");
    await checkPage(shopPage, "Shop", "/search");
    await checkPage(shopPage, "Shop", "/about");
    await checkPage(shopPage, "Shop", "/contact");
    await checkPage(shopPage, "Shop", "/faq");
    await checkPage(shopPage, "Shop", "/size-guide");
    await checkPage(shopPage, "Shop", "/shipping");
    await checkPage(shopPage, "Shop", "/track");

    // Policy pages
    await checkPage(shopPage, "Policies", "/policies/privacy-policy");
    await checkPage(shopPage, "Policies", "/policies/refund-policy");
    await checkPage(shopPage, "Policies", "/policies/shipping-policy");
    await checkPage(shopPage, "Policies", "/policies/terms-and-conditions");

    // Auth pages
    await checkPage(shopPage, "Auth", "/login", { expectText: "Log In" });
    await shot(shopPage, "login");
    await checkPage(shopPage, "Auth", "/register");

    // Protected pages (should redirect to login)
    await checkPage(shopPage, "Auth", "/account", { expectRedirect: "/login" });
    await checkPage(shopPage, "Auth", "/checkout", { expectRedirect: "/cart" });

    // Product page
    await checkPage(shopPage, "Product", "/products/tiger-print-set", { expectText: "ADD TO CART" });
    await shot(shopPage, "product-tiger");
    await checkPage(shopPage, "Product", "/products/pink-off-shoulder-dress", { expectText: "L-12" });
    await shot(shopPage, "product-pink");

    if (shopErrors.length) {
        log(WARN, "Shop", `${shopErrors.length} server errors on shop pages`, shopErrors.slice(0,3).join(", "));
    } else {
        log(PASS, "Shop", "No 5xx errors on public pages");
    }

    await shopCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // SECTION 2: ADMIN LOGIN + PAGES (legacy /admin/*)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n╔══════════════════════════════╗");
    console.log("║   LEGACY ADMIN (/admin)      ║");
    console.log("╚══════════════════════════════╝");

    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const adminPage = await adminCtx.newPage();

    await checkPage(adminPage, "Admin", "/admin/login", { expectText: "Login" });
    await shot(adminPage, "admin-login");

    // Unauthenticated admin pages — should redirect to login
    await checkPage(adminPage, "Admin", "/admin", { expectRedirect: "/admin/login" });
    await checkPage(adminPage, "Admin", "/admin/analytics", { expectRedirect: "/admin/login" });
    await checkPage(adminPage, "Admin", "/admin/customers", { expectRedirect: "/admin/login" });
    await checkPage(adminPage, "Admin", "/admin/settings", { expectRedirect: "/admin/login" });

    await adminCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // SECTION 3: DASHBOARD (/overview, /pos, etc.)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n╔══════════════════════════════╗");
    console.log("║   DASHBOARD PAGES            ║");
    console.log("╚══════════════════════════════╝");

    const dashCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const dashPage = await dashCtx.newPage();

    // All dashboard pages should redirect to /login when unauthenticated
    const dashRoutes = [
        "/overview",
        "/pos",
        "/pos/history",
        "/catalog/products",
        "/catalog/categories",
        "/catalog/discounts",
        "/catalog/auto-discounts",
        "/catalog/gift-cards",
        "/sales/orders",
        "/sales/analytics",
        "/sales/payments",
        "/sales/wholesalers",
        "/sales/riders",
        "/customers",
        "/customers/abandoned",
        "/customers/forms",
        "/customers/requests",
        "/finance",
        "/finance/invoices",
        "/finance/links",
        "/cms",
        "/seo",
        "/team",
        "/settings",
        "/settings/assets",
        "/settings/emails",
        "/communications/emails",
    ];

    for (const route of dashRoutes) {
        const res = await dashPage.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 20000 }).catch(() => null);
        await dashPage.waitForTimeout(500);
        const finalUrl = dashPage.url();
        const status = res?.status() ?? 0;
        const bodyText = await dashPage.locator("body").innerText().catch(() => "");

        if (bodyText.includes("Application error") || bodyText.includes("Internal error")) {
            log(FAIL, "Dashboard", `${route} crashed`);
        } else if (status >= 500) {
            log(FAIL, "Dashboard", `${route} returned ${status}`);
        } else if (finalUrl.includes("/login") || finalUrl.includes("/admin/login")) {
            log(PASS, "Dashboard", `${route} → redirects to login`);
        } else {
            // Loaded directly — check it's not a blank page
            const hasContent = bodyText.trim().length > 50;
            hasContent
                ? log(WARN, "Dashboard", `${route} loaded without auth redirect`, finalUrl.replace(BASE,""))
                : log(FAIL, "Dashboard", `${route} blank/broken page`);
        }
    }

    await shot(dashPage, "dashboard-redirect");
    await dashCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // SECTION 4: ERROR BOUNDARY
    // ══════════════════════════════════════════════════════════════════
    console.log("\n╔══════════════════════════════╗");
    console.log("║   ERROR HANDLING             ║");
    console.log("╚══════════════════════════════╝");

    const errCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const errPage = await errCtx.newPage();

    await errPage.goto(`${BASE}/this-does-not-exist-404xyz`, { waitUntil: "load", timeout: 15000 }).catch(() => {});
    await errPage.waitForTimeout(1000);
    await shot(errPage, "404-page");
    const notFoundBody = await errPage.locator("body").innerText().catch(() => "");
    const hasAppError = notFoundBody.includes("Application error");
    const has404Content = notFoundBody.length > 20;
    hasAppError
        ? log(FAIL, "Errors", "404 page shows application crash")
        : has404Content
            ? log(PASS, "Errors", "404 page renders gracefully", notFoundBody.substring(0, 60).replace(/\n/g, " "))
            : log(WARN, "Errors", "404 page is empty");

    await errCtx.close();

    // ══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ══════════════════════════════════════════════════════════════════
    await browser.close();

    console.log(`\n${"═".repeat(55)}`);
    console.log(`  PASSED: ${passed}   WARNED: ${warned}   FAILED: ${failed}`);
    if (issues.length) {
        console.log(`\n  Issues to fix:`);
        issues.forEach(i => console.log(`    ✗ ${i}`));
    }
    console.log(`\n  Screenshots: scripts/screenshots/full/`);
    console.log("═".repeat(55));

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error("Test runner crashed:", err.message);
    process.exit(1);
});
