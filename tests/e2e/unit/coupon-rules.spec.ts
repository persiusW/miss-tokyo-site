import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { COUPON_BLOCK_TEXT, couponTimingBlock } from "../../../src/lib/couponRules";

// Whether a discount code can be used (switch, start, end). Pure: no database. The amount a code is
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

test.describe("both code paths use the shared rules", () => {
    test("the preview and the charge path read the start date and the switch", () => {
        for (const f of ["src/app/api/checkout/validate-code/route.ts", "src/lib/discountValidation.ts"]) {
            const src = fs.readFileSync(path.join(ROOT, f), "utf8");
            expect(src, f).toContain("couponTimingBlock(coupon)");
            expect(src, f).toContain("starts_at");
        }
    });
});
