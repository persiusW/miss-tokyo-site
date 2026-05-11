import { chromium } from "playwright";
const BASE = "http://localhost:3001";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture all network errors
const errors = [];
page.on("response", r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url().substring(0, 120)}`); });

// Shop page - get all ribbon text
await page.goto(`${BASE}/shop`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(3000);

// Get all visible ribbon text
const ribbons = await page.evaluate(() => {
    const els = document.querySelectorAll("*");
    const found = [];
    for (const el of els) {
        const t = el.textContent?.trim();
        if (t && el.children.length === 0 && (t === "Sold Out" || t === "NEW" || t.startsWith("Only") || t === "Sale")) {
            found.push(t);
        }
    }
    return [...new Set(found)];
});
console.log("Ribbons on shop page:", ribbons);

// Check for pink/off-shoulder product link
const pinkLink = await page.locator("a[href*='pink'], a[href*='off-shoulder'], a[href*='shoulder']").first().getAttribute("href").catch(() => null);
console.log("Pink/Off-shoulder link:", pinkLink);

// Check first product detail for size selector markup
const firstLink = await page.locator("a[href*='/products/']").first().getAttribute("href");
console.log("Checking product:", firstLink);
await page.goto(`${BASE}${firstLink}`, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(2000);
const sizeInputs = await page.locator("input[type='radio']").count();
const sizeLabels = await page.locator("label").count();
console.log(`Product page: ${sizeInputs} radio inputs, ${sizeLabels} labels`);

// Get size label text from radio inputs
const sizeTexts = await page.evaluate(() => {
    const labels = document.querySelectorAll("label");
    return Array.from(labels).map(l => l.textContent?.trim()).filter(Boolean).slice(0, 10);
});
console.log("Label texts sample:", sizeTexts);

console.log("\nNetwork errors:", errors.slice(0, 10));
await browser.close();
