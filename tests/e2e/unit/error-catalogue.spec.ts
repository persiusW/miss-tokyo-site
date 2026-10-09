import { test, expect } from "@playwright/test";
import { ERRORS, errorBody, errorText, fromCheckoutCode, isCatalogueText, isErrorCode, staffLine } from "../../../src/lib/errors/catalogue";

test("every code has staff and customer text, and none suggests cash", () => {
    for (const [code, d] of Object.entries(ERRORS)) {
        expect(code).toMatch(/^[A-Z]{3,4}-\d{2}$/);
        expect(d.staff.length).toBeGreaterThan(10);
        expect(d.customer.length).toBeGreaterThan(10);
        for (const t of [d.staff, d.customer, ...((d as { steps?: string[] }).steps ?? [])]) expect(t, code).not.toMatch(/\bcash\b/i);
        expect(d.customer, code).not.toMatch(/[A-Z]{3,4}-\d{2}/);
    }
});

test("staff get codes, customers never; unknown codes fall back to GEN-00", () => {
    expect(staffLine("PAY-04")).toBe("The payment was declined. Nothing was charged. (PAY-04)");
    expect(errorText("PAY-04", "customer")).toMatch(/^Your payment didn't go through/);
    expect(errorText("NOPE-99", "staff")).toBe(ERRORS["GEN-00"].staff);
    expect(errorText("SMS-01", "customer")).toBe(ERRORS["GEN-00"].customer);
    expect(errorBody("PAY-01", "customer")).toEqual({ code: "PAY-01", error: "We couldn't reach our payment provider. Please try again in a minute." });
    expect(isErrorCode("PAY-02")).toBe(true);
    expect(isErrorCode("PAY-99")).toBe(false);
});

test("catalogue texts are recognised, so the backstop never hides them", () => {
    expect(isCatalogueText(ERRORS["PAY-01"].staff)).toBe(true);
    expect(isCatalogueText(staffLine("PAY-01"))).toBe(true);
    expect(isCatalogueText("relation \"x\" does not exist")).toBe(false);
});

test("checkout codes map onto the catalogue", () => {
    expect(fromCheckoutCode("gateway")).toBe("PAY-01");
    expect(fromCheckoutCode("unavailable")).toBe("STK-01");
    expect(fromCheckoutCode("internal")).toBe("ORD-01");
    expect(fromCheckoutCode("payments_unconfigured")).toBe("PAY-03");
    expect(fromCheckoutCode("refused")).toBe("PAY-02");
    expect(fromCheckoutCode("invalid")).toBeNull();
});
