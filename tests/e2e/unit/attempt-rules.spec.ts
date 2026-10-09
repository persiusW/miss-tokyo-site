import { test, expect } from "@playwright/test";
import { channelFor, cleanSaleKey, countFailures, resultPatch, statusFromPaystack } from "../../../src/lib/payments/attemptRules";

test("Paystack statuses map; abandoned and unknown are unfinished, never failed", () => {
    expect(statusFromPaystack("success")).toBe("paid");
    expect(statusFromPaystack("failed")).toBe("failed");
    expect(statusFromPaystack("abandoned")).toBe("unfinished");
    expect(statusFromPaystack("ongoing")).toBe("unfinished");
    expect(statusFromPaystack(undefined)).toBe("unfinished");
});

test("resultPatch keeps Paystack's failed-try count when present", () => {
    expect(resultPatch({ status: "failed", log: { errors: 2 } })).toEqual({ status: "failed", paystack_status: "failed", paystack_errors: 2 });
    expect(resultPatch({ status: "abandoned" })).toEqual({ status: "unfinished", paystack_status: "abandoned" });
    expect(resultPatch({})).toEqual({ status: "unfinished", paystack_status: null });
});

test("failures: Paystack's count, else 1 per declined attempt, plus PAY-02 refusals; never unfinished or PAY-01", () => {
    expect(countFailures([])).toBe(0);
    expect(countFailures([{ status: "failed", paystack_errors: 0, error_code: null }])).toBe(1);
    expect(countFailures([{ status: "failed", paystack_errors: 2, error_code: null }])).toBe(2);
    expect(countFailures([{ status: "unfinished", paystack_errors: 1, error_code: null }])).toBe(1);
    expect(countFailures([{ status: "unfinished", paystack_errors: 0, error_code: null }])).toBe(0);
    expect(countFailures([{ status: "error", paystack_errors: 0, error_code: "PAY-02" }, { status: "error", paystack_errors: 0, error_code: "PAY-01" }])).toBe(1);
    expect(countFailures([{ status: "paid", paystack_errors: 1, error_code: null }])).toBe(1);
});

test("sale keys and channels", () => {
    const k = "3bbb1012-8789-456e-a4f8-741861408981";
    expect(cleanSaleKey(k)).toBe(k);
    expect(cleanSaleKey("nope")).toMatch(/^[0-9a-f-]{36}$/);
    expect(channelFor("storefront")).toBe("online");
    expect(channelFor("whatsapp")).toBe("online");
    expect(channelFor("dashboard")).toBe("ai");
    expect(channelFor("pos")).toBe("pos");
});
