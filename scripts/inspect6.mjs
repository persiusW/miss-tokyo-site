import { chromium } from "playwright";
const BASE = "http://localhost:3001";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// ── Pink Off Shoulder PDP after fix ──
console.log("\n── Pink Off Shoulder PDP (after fix) ──");
await page.goto(`${BASE}/products/pink-off-shoulder-dress`, { waitUntil: "load", timeout: 30000 });
// Wait for React hydration + useEffect to fire
await page.waitForTimeout(4000);

const btns = await page.locator("button").allInnerTexts();
const nonEmpty = btns.filter(t => t.trim().length > 0);
console.log("Buttons:", nonEmpty);

// Check for OOS
const oosVisible = await page.locator("button:has-text('OUT OF STOCK'), text=Out of stock").count();
const addToCart = await page.locator("button:has-text('ADD TO CART')").count();
console.log("OOS indicator:", oosVisible > 0 ? "SHOWING (BAD)" : "NOT SHOWING");
console.log("Add to Cart:", addToCart > 0 ? "SHOWING (GOOD)" : "NOT SHOWING");

// Get page screenshot
await page.screenshot({ path: "scripts/screenshots/pink-pdp-after-fix.png" });
console.log("Screenshot saved.");

await browser.close();
