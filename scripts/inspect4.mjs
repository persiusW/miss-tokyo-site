import { chromium } from "playwright";
const BASE = "http://localhost:3001";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// ── Pink Off Shoulder PDP full body ──
console.log("\n── Pink Off Shoulder PDP ──");
await page.goto(`${BASE}/products/pink-off-shoulder-dress`, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(4000);

// Get all button text
const btns = await page.locator("button").allInnerTexts();
console.log("All buttons:", btns);

// Get all visible text that mentions stock/size/color
const bodyText = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while (node = walker.nextNode()) {
        const t = node.textContent?.trim();
        if (t && t.length > 1 && t.length < 80) texts.push(t);
    }
    return [...new Set(texts)].slice(0, 60);
});
console.log("Page text nodes:", bodyText);

// ── Tiger Print Set - verify new size labels ──
console.log("\n── Tiger Print Set - size labels ──");
await page.goto(`${BASE}/products/tiger-print-set`, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(3000);
const sizeBtns = await page.locator("button").allInnerTexts();
const sizesOnly = sizeBtns.filter(t => t.trim().length > 0);
console.log("Size/color buttons:", sizesOnly);

await browser.close();
