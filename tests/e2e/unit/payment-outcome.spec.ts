import { test, expect } from "@playwright/test";
import { outcomeFrom } from "../../../src/lib/checkout/paymentOutcome";

// The success page used to show "Order Confirmed" for every return from
// Paystack. Only a successful charge may count as paid.

test("only a successful charge is paid", () => {
    expect(outcomeFrom({ status: "paid", paystackStatus: "success" })).toBe("paid");
    expect(outcomeFrom({ status: "paid" })).toBe("paid"); // older response shape
    expect(outcomeFrom({ status: "skipped" })).toBe("paid"); // dev without a key
});

test("a decline is not paid", () => {
    expect(outcomeFrom({ status: "cancelled", paystackStatus: "failed" })).toBe("declined");
});

test("abandoned and ongoing are unfinished, never declined (MoMo can still complete)", () => {
    expect(outcomeFrom({ status: "cancelled", paystackStatus: "abandoned" })).toBe("unfinished");
    expect(outcomeFrom({ status: "pending", paystackStatus: "ongoing" })).toBe("unfinished");
    expect(outcomeFrom({ status: "pending", paystackStatus: "pending" })).toBe("unfinished");
});

test("no answer, a verify failure or an old cancelled response is unknown, never paid", () => {
    expect(outcomeFrom(null)).toBe("unknown");
    expect(outcomeFrom({ status: "failed" })).toBe("unknown");
    expect(outcomeFrom({ status: "cancelled" })).toBe("unknown");
    expect(outcomeFrom("nope")).toBe("unknown");
});
