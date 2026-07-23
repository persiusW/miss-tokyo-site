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

        // New customer, no address
        await page.getByRole("button", { name: "New", exact: true }).click();
        await page.getByPlaceholder("Full Name *").fill("Fulfilment Test");
        await page.getByPlaceholder("Email *").fill("fulfilment-test@example.com");

        await page.getByRole("button", { name: "Delivery", exact: true }).click();
        await page.getByRole("button", { name: /^Send Link/ }).click();

        await expect(page.getByText("Delivery address is required")).toBeVisible();
        await page.screenshot({ path: "tests/reports/pos-fulfilment-validation.png" });
    });
});
