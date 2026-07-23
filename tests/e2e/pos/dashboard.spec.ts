import { test, expect } from "@playwright/test";

/**
 * POS fulfilment selector — staff must be able to choose Store Pickup or
 * Delivery, and Delivery must require an address before a link can be sent.
 */
test.describe("POS fulfilment", () => {
    test("defaults to pickup, exposes delivery, and gates the address", async ({ page }) => {
        await page.goto("/pos");
        await expect(page.getByRole("heading", { name: "Point of Sale" })).toBeVisible();

        const pickupBtn = page.getByRole("button", { name: "Store Pickup" });
        const deliveryBtn = page.getByRole("button", { name: "Delivery", exact: true });
        const addressField = page.getByPlaceholder("Delivery address *");

        await expect(pickupBtn).toBeVisible();
        await expect(deliveryBtn).toBeVisible();

        // Pickup is the default → no address field
        await expect(addressField).toHaveCount(0);

        await deliveryBtn.click();
        await expect(addressField).toBeVisible();

        // Country + region mirror storefront checkout so the order stores the
        // same shipping_address shape
        const country = page.locator("select").filter({ hasText: "Ghana" }).first();
        await expect(country).toBeVisible();
        await expect(country).toHaveValue("Ghana");
        const region = page.locator("select").filter({ hasText: "Greater Accra" }).first();
        await expect(region).toHaveValue("Greater Accra");

        // Outside Ghana the region becomes free text, as on the storefront
        await country.selectOption("United Kingdom");
        await expect(page.getByPlaceholder("State / Region")).toBeVisible();
        await country.selectOption("Ghana");
        await expect(page.locator("select").filter({ hasText: "Greater Accra" }).first()).toBeVisible();

        await pickupBtn.click();
        await expect(addressField).toHaveCount(0);

        await page.screenshot({ path: "tests/reports/pos-fulfilment-pickup.png", fullPage: false });
        await deliveryBtn.click();
        await page.screenshot({ path: "tests/reports/pos-fulfilment-delivery.png", fullPage: false });
    });

    test("blocks send when delivery is selected without an address", async ({ page }) => {
        await page.goto("/pos");
        await expect(page.getByRole("heading", { name: "Point of Sale" })).toBeVisible();

        // Add the first available product to the cart
        const addBtn = page.getByRole("button", { name: "Add", exact: true }).first();
        await addBtn.waitFor({ state: "visible" });
        await addBtn.click();

        // New customer, phone supplied so the address is the only thing missing
        await page.getByRole("button", { name: "New", exact: true }).click();
        await page.getByPlaceholder("Full Name *").fill("Fulfilment Test");
        await page.getByPlaceholder("Email *").fill("fulfilment-test@example.com");
        await page.getByPlaceholder(/^Phone \*/).fill("0244123456");

        await page.getByRole("button", { name: "Delivery", exact: true }).click();
        await page.getByRole("button", { name: /^Send Link/ }).click();

        await expect(page.getByText("Delivery address is required")).toBeVisible();
        await page.screenshot({ path: "tests/reports/pos-fulfilment-validation.png" });
    });
});

/**
 * The payment link goes out by email AND SMS. A missing phone silently skipped
 * the text, so staff believed both had been sent.
 */
test.describe("POS payment link delivery", () => {
    test("blocks send when no phone is given", async ({ page }) => {
        await page.goto("/pos");
        await expect(page.getByRole("heading", { name: "Point of Sale" })).toBeVisible();

        const addBtn = page.getByRole("button", { name: "Add", exact: true }).first();
        await addBtn.waitFor({ state: "visible" });
        await addBtn.click();

        await page.getByRole("button", { name: "New", exact: true }).click();
        await page.getByPlaceholder("Full Name *").fill("No Phone");
        await page.getByPlaceholder("Email *").fill("no-phone@example.com");

        await page.getByRole("button", { name: /^Send Link/ }).click();
        await expect(page.getByText(/phone is required/i)).toBeVisible();
        await page.screenshot({ path: "tests/reports/pos-phone-required.png" });
    });

    test("rejects an obviously incomplete phone number", async ({ page }) => {
        await page.goto("/pos");
        const addBtn = page.getByRole("button", { name: "Add", exact: true }).first();
        await addBtn.waitFor({ state: "visible" });
        await addBtn.click();

        await page.getByRole("button", { name: "New", exact: true }).click();
        await page.getByPlaceholder("Full Name *").fill("Short Phone");
        await page.getByPlaceholder("Email *").fill("short-phone@example.com");
        await page.getByPlaceholder(/^Phone \*/).fill("0244");

        await page.getByRole("button", { name: /^Send Link/ }).click();
        await expect(page.getByText(/looks incomplete/i)).toBeVisible();
    });

    test("phone field is shown for existing contacts too", async ({ page }) => {
        // An existing contact with no phone on file previously had no way to add
        // one, so the SMS was skipped with no indication
        await page.goto("/pos");
        await expect(page.getByRole("heading", { name: "Point of Sale" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Existing", exact: true })).toBeVisible();
        await expect(page.getByPlaceholder(/^Phone \*/)).toBeVisible();
    });
});

/**
 * Gift card / discount code at the till — the same codes a customer can redeem
 * at checkout.
 */
test.describe("POS discount code", () => {
    test("rejects an unknown code", async ({ page }) => {
        await page.goto("/pos");
        await expect(page.getByRole("heading", { name: "Point of Sale" })).toBeVisible();

        const addBtn = page.getByRole("button", { name: "Add", exact: true }).first();
        await addBtn.waitFor({ state: "visible" });
        await addBtn.click();

        await page.getByPlaceholder("Enter code").fill("DEFINITELYNOTAREALCODE");
        await page.getByRole("button", { name: "Apply", exact: true }).click();

        await expect(page.getByText(/not found or invalid/i)).toBeVisible();
        await page.screenshot({ path: "tests/reports/pos-discount-invalid.png" });
    });

    test("applies a real code and reprices the total", async ({ page }) => {
        await page.goto("/pos");
        const addBtn = page.getByRole("button", { name: "Add", exact: true }).first();
        await addBtn.waitFor({ state: "visible" });
        await addBtn.click();

        const sendBtn = page.getByRole("button", { name: /^Send Link/ });
        const totalBefore = await sendBtn.innerText();
        const subtotal = Number(totalBefore.replace(/[^0-9.]/g, ""));

        // Pull live codes out of the catalogue rather than hardcoding one, then
        // keep the first that actually validates for a partial discount. The
        // catalogue's status column and the redemption check can disagree, and a
        // code worth the whole basket leaves nothing to charge.
        const candidates: string[] = [];
        for (const [url, filter] of [["/catalog/discounts", false], ["/catalog/gift-cards", true]] as const) {
            await page.goto(url);
            if (filter) await page.locator("select.ac-select").first().selectOption("active");
            const cells = page.locator("tbody tr td:first-child");
            await cells.first().waitFor({ state: "visible" }).catch(() => {});
            // The table renders a "Loading…" placeholder row first — harvesting
            // before it resolves yields no codes at all
            await expect(cells.first()).not.toHaveText(/loading/i, { timeout: 15_000 }).catch(() => {});
            for (const text of await cells.allInnerTexts()) {
                const t = text.trim();
                if (t && !/no .*(found|yet)|loading/i.test(t)) candidates.push(t);
            }
        }

        let code = "";
        let expectedTotal = 0;
        for (const candidate of candidates) {
            const res = await page.request.post("/api/checkout/validate-code", {
                data: { code: candidate, subtotal },
            });
            const body = await res.json();
            if (body.valid && body.discount_amount > 0 && body.discount_amount < subtotal) {
                code = body.code;
                expectedTotal = subtotal - body.discount_amount;
                break;
            }
        }
        test.skip(!code, "no coupon or gift card yields a partial discount on this basket");

        await page.goto("/pos");
        await page.getByRole("button", { name: "Add", exact: true }).first().click();
        await page.getByPlaceholder("Enter code").fill(code);
        await page.getByRole("button", { name: "Apply", exact: true }).click();

        // Applied badge replaces the input, and a Discount row appears
        await expect(page.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
        await expect(page.getByText(`Discount (${code})`)).toBeVisible();
        await page.screenshot({ path: "tests/reports/pos-discount-applied.png" });

        // The Send Link button must now quote the post-discount amount.
        // Assert on the figure, not the label — CSS uppercases the button text.
        await expect(sendBtn).toContainText(expectedTotal.toFixed(2));

        // Removing the code restores the original total
        await page.getByRole("button", { name: "Remove", exact: true }).click();
        await expect(page.getByPlaceholder("Enter code")).toBeVisible();
        await expect(sendBtn).toContainText(subtotal.toFixed(2));
    });
});
