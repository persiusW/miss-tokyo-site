import { test, expect } from "@playwright/test";
import { displayPhone, normaliseOrderPhone } from "../../../src/lib/phone";

test("Ghana numbers in every common form become 233XXXXXXXXX", () => {
    for (const raw of ["0241234567", "024 123 4567", "+233 24 123 4567", "233241234567", "00233241234567", "+233 024 123 4567", "241234567", "(024) 123-4567"]) {
        expect(normaliseOrderPhone(raw), raw).toBe("233241234567");
    }
});

test("another country's number is kept as given, never forced into Ghana", () => {
    expect(normaliseOrderPhone("+44 7733 384758")).toBe("447733384758");   // the UK customer of 2026-10-20 (was saved as 233733384758)
    expect(normaliseOrderPhone("0044 7733 384758")).toBe("447733384758");
    expect(normaliseOrderPhone("+1 202 555 0123")).toBe("12025550123");
    expect(normaliseOrderPhone("+234 803 123 4567")).toBe("2348031234567");  // Nigeria
});

test("nothing usable is refused (checkout then asks for a valid number)", () => {
    for (const raw of ["", null, undefined, "12345", "0241234", "23324123", "+1234567890123456"]) expect(normaliseOrderPhone(raw as any), String(raw)).toBe(null);
});

test("shown to people the local way", () => {
    expect(displayPhone("233241234567")).toBe("0241234567");
    expect(displayPhone("447733384758")).toBe("+447733384758");
});
