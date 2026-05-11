import { chromium } from "playwright";
const BASE = "http://localhost:3001";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// ── Pink Off Shoulder Dress ribbon check ──
console.log("\n── Pink Off Shoulder Dress ──");
await page.goto(`${BASE}/shop`, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(3000);

// Find the Pink Off Shoulder card and check ribbon
const pinkCard = page.locator("a[href*='pink-off-shoulder']").first();
const pinkParent = pinkCard.locator("..").locator("..");
const pinkHtml = await pinkParent.innerHTML().catch(() => "not found");
console.log("Pink card parent HTML (truncated):", pinkHtml.substring(0, 600));

// ── Product page form ──
console.log("\n── Tiger Print Set Product Page ──");
await page.goto(`${BASE}/products/tiger-print-set`, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(3000);

const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 3000));
console.log("Body HTML sample:", bodyHTML);

await browser.close();
