import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { COUPON_BLOCK_TEXT, STAND_IN_EMAIL_DOMAIN, couponTimingBlock, customerKeys, hasCustomerKeys } from "../../../src/lib/couponRules";

// Whether a discount code can be used (switch, start, end) and how "one use
// per customer" recognises a customer. Pure: no database. The amount a code is
// worth is discount-split.spec.ts and is not touched here.

const ROOT = path.resolve(__dirname, "../../..");
const NOW = new Date("2026-10-21T12:00:00Z");

test.describe("coupon timing", () => {
    test("a switched-off code is blocked whatever its dates", () => {
        expect(couponTimingBlock({ is_active: false }, NOW)).toBe("inactive");
        expect(couponTimingBlock({ is_active: null }, NOW)).toBe("inactive");
    });
    test("no dates: works from when it was made, for ever", () => {
        expect(couponTimingBlock({ is_active: true, starts_at: null, expires_at: null }, NOW)).toBeNull();
        expect(couponTimingBlock({ is_active: true }, NOW)).toBeNull();
    });
    test("a later start date schedules it", () => {
        expect(couponTimingBlock({ is_active: true, starts_at: "2026-10-22T00:00:00Z" }, NOW)).toBe("not_started");
        expect(couponTimingBlock({ is_active: true, starts_at: "2026-10-21T11:59:00Z" }, NOW)).toBeNull();
    });
    test("an end date in the past ends it", () => {
        expect(couponTimingBlock({ is_active: true, expires_at: "2026-10-21T11:00:00Z" }, NOW)).toBe("expired");
        expect(couponTimingBlock({ is_active: true, expires_at: "2026-10-31T23:59:00Z" }, NOW)).toBeNull();
    });
    test("every block has calm words for the customer", () => {
        for (const t of Object.values(COUPON_BLOCK_TEXT)) {
            expect(t).toMatch(/^[A-Z].*\.$/);
            expect(t).not.toMatch(/error|exception|null|undefined/i);
        }
    });
});

test.describe("one use per customer: who is the customer", () => {
    test("email is lower-cased; phone becomes its last 9 digits", () => {
        expect(customerKeys({ email: " Ama@Example.COM ", phone: "+233 24 123 4567" })).toEqual({ email: "ama@example.com", phoneTail: "241234567" });
        expect(customerKeys({ phone: "0241234567" }).phoneTail).toBe("241234567");
        expect(customerKeys({ phone: "233241234567" }).phoneTail).toBe("241234567");
    });
    test("the shop's own stand-in addresses never identify a customer", () => {
        expect(customerKeys({ email: `233241234567@${STAND_IN_EMAIL_DOMAIN}` }).email).toBeNull();
        expect(customerKeys({ email: "Studio@Shop.example" }, ["studio@shop.example"]).email).toBeNull();
        expect(customerKeys({ email: "studio@shop.example" }).email).toBe("studio@shop.example");
    });
    test("nothing usable means the check can't run (and so doesn't block)", () => {
        const k = customerKeys({ email: "not an email", phone: "12345" });
        expect(k).toEqual({ email: null, phoneTail: null });
        expect(hasCustomerKeys(k)).toBe(false);
        expect(hasCustomerKeys(customerKeys(null))).toBe(false);
        expect(hasCustomerKeys(customerKeys({ phone: "024 123 4567" }))).toBe(true);
    });
    test("the stand-in domain matches the one checkout writes", () => {
        const src = fs.readFileSync(path.join(ROOT, "src/lib/checkout/createCheckoutOrder.ts"), "utf8");
        expect(src).toContain(`PLACEHOLDER_EMAIL_DOMAIN = "${STAND_IN_EMAIL_DOMAIN}"`);
    });
});

test.describe("both code paths use the shared rules", () => {
    test("the preview and the charge path read the start date, the switch and the per-customer flag", () => {
        for (const f of ["src/app/api/checkout/validate-code/route.ts", "src/lib/discountValidation.ts"]) {
            const src = fs.readFileSync(path.join(ROOT, f), "utf8");
            expect(src, f).toContain("couponTimingBlock(coupon)");
            expect(src, f).toContain("starts_at");
            expect(src, f).toMatch(/single_use_per_customer\s*&& await couponUsedByCustomer/);
        }
    });
    test("every caller of the charge path says who is buying", () => {
        for (const f of ["src/lib/checkout/createCheckoutOrder.ts", "src/app/api/pos/send-link/route.ts"]) {
            const src = fs.readFileSync(path.join(ROOT, f), "utf8");
            expect(src, f).toMatch(/validateDiscountCode\([^;]*email[^;]*phone/s);
        }
    });
});
