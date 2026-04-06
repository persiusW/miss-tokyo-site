/**
 * Miss Tokyo - System-wide smoke test
 * Run: node scripts/test-site.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3001";
const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️ ";

let passed = 0, failed = 0;

function log(icon, label, detail = "") {
    console.log(`  ${icon} ${label}${detail ? "  →  " + detail : ""}`);
    if (icon === PASS) passed++;
    if (icon === FAIL) failed++;
}

async function shot(page, name) {
    await page.screenshot({ path: `scripts/screenshots/${name}.png`, fullPage: false });
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    // Collect console errors
    const consoleErrors = [];
    page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

    const { mkdirSync } = await import("fs");
    mkdirSync("scripts/screenshots", { recursive: true });

    // ─── 1. Homepage ───────────────────────────────────────────────────────
    console.log("\n── Homepage ──");
    await page.goto(BASE, { waitUntil: "networkidle" });
    await shot(page, "01-homepage");
    const title = await page.title();
    title ? log(PASS, "Page loads", title) : log(FAIL, "Page failed to load");

    // ─── 2. Shop grid ──────────────────────────────────────────────────────
    console.log("\n── Shop Grid ──");
    await page.goto(`${BASE}/shop`, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2000);
    await shot(page, "02-shop-grid");

    const productCards = await page.locator("a[href*='/products/']").count();
    productCards > 0 ? log(PASS, `Product cards visible`, `${productCards} found`) : log(FAIL, "No product cards found");

    // Check for Sold Out ribbon
    const soldOutRibbons = await page.locator("text=Sold Out").count();
    soldOutRibbons > 0
        ? log(PASS, `Sold Out ribbon present`, `${soldOutRibbons} product(s)`)
        : log(WARN, "No Sold Out ribbons found — may be none OOS, or ribbon logic issue");

    // Capture all ribbon labels visible
    const allRibbons = await page.locator("text=NEW, text=Sale, text=Sold Out, text=Only").allInnerTexts().catch(() => []);
    if (allRibbons.length) log(PASS, `Ribbons found`, allRibbons.slice(0, 8).join(", "));

    // ─── 3. Product Detail Page ────────────────────────────────────────────
    console.log("\n── Product Detail Page ──");
    const firstProductLink = await page.locator("a[href*='/products/']").first().getAttribute("href", { timeout: 5000 }).catch(() => null);
    if (firstProductLink) {
        await page.goto(`${BASE}${firstProductLink}`, { waitUntil: "load", timeout: 45000 });
        await page.waitForTimeout(1500);
        await shot(page, "03-product-detail");

        const addToCartBtn = await page.locator("button:has-text('Add to Cart'), button:has-text('Select a Size')").count();
        addToCartBtn > 0 ? log(PASS, "Add to cart / size prompt visible") : log(FAIL, "No add-to-cart button found");

        const sizeOptions = await page.locator("input[name='size'], label:has(input[name='size'])").count();
        sizeOptions > 0 ? log(PASS, `Size options rendered`, `${sizeOptions} found`) : log(WARN, "No size options found");
    } else {
        log(FAIL, "Could not find a product link to follow");
    }

    // ─── 4. Cart drawer ────────────────────────────────────────────────────
    console.log("\n── Cart ──");
    // Click first available "Add to Cart" flow — find a product with add-to-cart
    const cartIcon = await page.locator("button[aria-label*='shopping bag' i], button[aria-label*='cart' i]").first();
    if (await cartIcon.count() > 0) {
        await cartIcon.click();
        await page.waitForTimeout(600);
        await shot(page, "04-cart-drawer");
        log(PASS, "Cart drawer opens");
    } else {
        log(WARN, "Cart icon not found");
    }

    // ─── 5. Gallery page ───────────────────────────────────────────────────
    console.log("\n── Gallery ──");
    await page.goto(`${BASE}/gallery`, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2000);
    await shot(page, "05-gallery");
    const galleryItems = await page.locator("img, [data-testid='gallery-item']").count();
    const crash = await page.locator("text=Application error").count();
    crash > 0
        ? log(FAIL, "Gallery shows Application error crash")
        : log(PASS, "Gallery loads without crash", `${galleryItems} elements`);

    // ─── 6. Error boundary ─────────────────────────────────────────────────
    console.log("\n── Error Boundary ──");
    await page.goto(`${BASE}/this-page-does-not-exist-404`, { waitUntil: "load", timeout: 15000 });
    await shot(page, "06-404");
    const has404 = await page.locator("text=404, text=not found").count();
    has404 > 0 ? log(PASS, "404 page renders") : log(WARN, "No 404 indicator found");

    // ─── 7. Checkout page (unauthenticated) ───────────────────────────────
    console.log("\n── Checkout (guest) ──");
    await page.goto(`${BASE}/checkout`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(1000);
    await shot(page, "07-checkout");
    const checkoutForm = await page.locator("input[name='fullName'], input[placeholder*='name' i], input[placeholder*='Name' i]").count();
    checkoutForm > 0 ? log(PASS, "Checkout form visible") : log(WARN, "Checkout form not found (may redirect to cart)");

    // ─── 8. Console errors summary ─────────────────────────────────────────
    console.log("\n── Console Errors ──");
    if (consoleErrors.length === 0) {
        log(PASS, "No console errors recorded");
    } else {
        const unique = [...new Set(consoleErrors)];
        log(unique.length > 3 ? FAIL : WARN, `${unique.length} unique console error(s)`);
        unique.slice(0, 6).forEach(e => console.log(`     ${e.substring(0, 120)}`));
    }

    // ─── Summary ───────────────────────────────────────────────────────────
    console.log(`\n${"─".repeat(50)}`);
    console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
    console.log(`  Screenshots saved to scripts/screenshots/`);
    console.log("─".repeat(50));

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error("Test runner crashed:", err.message);
    process.exit(1);
});
