import { chromium } from "playwright";
const BASE = "http://localhost:3001";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// ── 1. Check Pink Off Shoulder ribbon specifically ──
console.log("\n── Pink Off Shoulder ribbon ──");
await page.goto(`${BASE}/shop`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(3000);

// Find all product cards that link to pink-off-shoulder
const pinkAnchors = await page.locator("a[href*='pink-off-shoulder']").count();
console.log("Pink off shoulder anchors:", pinkAnchors);

if (pinkAnchors > 0) {
    // Get the container around the pink off shoulder link
    const container = page.locator("a[href*='pink-off-shoulder']").first().locator("xpath=ancestor::div[contains(@class,'group')]").first();
    const containerHTML = await container.innerHTML().catch(() => "error");
    console.log("Card HTML:", containerHTML.substring(0, 800));
}

// Get ALL ribbons with their containing text/href
const allRibbonData = await page.evaluate(() => {
    const spans = document.querySelectorAll("span.absolute");
    return Array.from(spans).map(s => ({
        text: s.textContent?.trim(),
        href: s.closest("a")?.getAttribute("href") || s.closest(".group")?.querySelector("a")?.getAttribute("href"),
    })).filter(r => r.text).slice(0, 20);
});
console.log("\nAll absolute spans (ribbon candidates):", allRibbonData);

// ── 2. Product page with longer wait ──
console.log("\n── Tiger Print Set (full wait) ──");
await page.goto(`${BASE}/products/tiger-print-set`, { waitUntil: "load", timeout: 30000 });
// Wait for client-side hydration
await page.waitForSelector("button, input[type='radio'], label", { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(3000);

const radioCount = await page.locator("input[type='radio']").count();
const buttonCount = await page.locator("button").count();
console.log(`Radios: ${radioCount}, Buttons: ${buttonCount}`);

const addBtn = await page.locator("button").allInnerTexts();
console.log("Buttons:", addBtn.slice(0, 10));

// ── 3. Pink Off Shoulder product page directly ──
console.log("\n── Pink Off Shoulder Product Page ──");
await page.goto(`${BASE}/products/pink-off-shoulder-dress`, { waitUntil: "load", timeout: 30000 });
await page.waitForSelector("button, input", { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(3000);

const pinkRadios = await page.locator("input[type='radio']").count();
const pinkBtns = await page.locator("button").allInnerTexts();
console.log(`Radios: ${pinkRadios}, Buttons:`, pinkBtns.slice(0, 8));

// Check for OOS indicator
const oosText = await page.locator("text=Out of Stock, text=Sold Out").count();
console.log("OOS indicator:", oosText > 0 ? "FOUND" : "NOT FOUND");

await browser.close();
