import { test, expect, type Page } from "@playwright/test";

// The storefront service worker would answer fetches before page.route sees them.
test.use({ serviceWorkers: "block" });

async function stub(page: Page, reply: object, status = 200) {
    await page.route("**/api/shop-assistant", route => {
        const m = route.request().method();
        if (m === "GET") return route.fulfill({ json: { enabled: true, whatsappHref: "https://wa.me/233553898704?text=Hi" } });
        if (m === "DELETE") return route.fulfill({ json: { ok: true } });
        return route.fulfill({ status, json: reply });
    });
}

test("launcher is visible bottom-right and opens the panel", async ({ page }) => {
    await stub(page, { reply: "Size 38 is in stock.", buttons: [] });
    await page.goto("/shop");
    const launcher = page.locator('[data-ask-mt="launcher"]');
    await expect(launcher).toBeVisible();
    const box = (await launcher.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
    if (vp.width <= 768) {
        const tab = await page.locator(".mobile-tab-bar").boundingBox();
        if (tab) expect(box.y + box.height).toBeLessThanOrEqual(tab.y);
    }
    await page.screenshot({ path: `test-results/ask-mt-launcher-${vp.width}.png` });
    await launcher.click();
    const panel = page.getByRole("dialog", { name: "Ask Miss Tokyo" });
    await expect(panel).toBeVisible();
    await page.getByLabel("Your message").fill("Lisa Heels in 38?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(panel.getByText("Size 38 is in stock.").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(launcher).toBeFocused();
});

test("hidden on checkout and pay pages and while the cart drawer is open", async ({ page }) => {
    await stub(page, { reply: "x", buttons: [] });
    for (const p of ["/checkout", "/pay/00000000-0000-4000-8000-000000000000"]) {
        await page.goto(p);
        await expect(page.locator('[data-ask-mt="launcher"]')).toHaveCount(0);
    }
    await page.goto("/shop");
    await expect(page.locator('[data-ask-mt="launcher"]')).toBeVisible();
    await page.evaluate(() => (window as any).__openCart?.());   // dev-only hook in AskMissTokyo.tsx
    await expect(page.locator('[data-ask-mt="launcher"]')).toHaveCount(0);
});

test("calm states: limit, raw text, network failure", async ({ page }) => {
    await stub(page, { reply: "Ask Miss Tokyo can't chat right now. You can message us on WhatsApp instead.", buttons: [{ kind: "talk_to_us", label: "Talk to us on WhatsApp", href: "https://wa.me/233553898704?text=Hi" }] });
    await page.goto("/shop");
    await page.locator('[data-ask-mt="launcher"]').click();
    await page.getByLabel("Your message").fill("hi");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("button", { name: "Talk to us on WhatsApp" })).toBeVisible();

    await page.unroute("**/api/shop-assistant");
    await stub(page, { reply: "TypeError: x is undefined", buttons: [] });
    await page.getByLabel("Your message").fill("again");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Something happened. Please try again shortly.").last()).toBeVisible();

    await page.unroute("**/api/shop-assistant");
    await page.route("**/api/shop-assistant", r => r.request().method() === "POST" ? r.abort() : r.fulfill({ json: { enabled: true, whatsappHref: null } }));
    await page.getByLabel("Your message").fill("third");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/TypeError|fetch failed/);
});

test("Add to bag puts the item in the cart drawer", async ({ page }) => {
    await stub(page, { reply: "Here it is.", buttons: [{ kind: "add_to_cart", label: "Add to bag", item: {
        id: "p1-38-Black-", productId: "11111111-1111-4111-8111-111111111111", name: "Test Heels", slug: "test-heels", price: 270, size: "38", color: "Black", quantity: 1, imageUrl: "", isPreOrder: false } }] });
    await page.goto("/shop");
    await page.locator('[data-ask-mt="launcher"]').click();
    await page.getByLabel("Your message").fill("add it");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(page.getByText("Test Heels")).toBeVisible();
});
