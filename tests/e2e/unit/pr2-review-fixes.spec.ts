import { test, expect } from "@playwright/test";
import { checkoutErrorLine, ERRORS } from "../../../src/lib/errors/catalogue";
import { looksRaw } from "../../../src/lib/errors/looksRaw";
import { responseMessage } from "../../../src/lib/toast";
import { uniqueViolationMessage } from "../../../src/lib/errors/dbError";

test("the AI keeps the hand-written stock line and adds the code", () => {
    expect(checkoutErrorLine("unavailable", '"Kente Wrap" only has 2 units in stock.')).toBe('"Kente Wrap" only has 2 units in stock. (STK-01)');
    expect(checkoutErrorLine("invalid", "A valid phone number is required.")).toBe("A valid phone number is required.");
    expect(checkoutErrorLine("gateway", "whatever")).toBe(`${ERRORS["PAY-01"].staff} (PAY-01)`);
});

test("a till failure reply shows the code to staff", () => {
    expect(responseMessage({ code: "PAY-01", error: ERRORS["PAY-01"].staff }, "staff")).toBe(`${ERRORS["PAY-01"].staff} (PAY-01)`);
    expect(responseMessage({ code: "PAY-01", error: ERRORS["PAY-01"].customer }, "customer")).toBe(ERRORS["PAY-01"].customer);
    expect(responseMessage({ error: "relation \"x\" does not exist" }, "staff", "GEN-00")).toBe(ERRORS["GEN-00"].staff);
});

test("'Internal Server Error' is raw; times and long notices are not", () => {
    expect(looksRaw("Internal Server Error")).toBe(true);
    expect(looksRaw("Internal error")).toBe(true);
    expect(looksRaw("Your slot at 10:30 is taken.")).toBe(false);
    expect(looksRaw("Some items changed: " + '"Kay Ali Set" was removed (sold out). '.repeat(9))).toBe(false); // ~400 chars
    expect(looksRaw("x ".repeat(600))).toBe(true);
    expect(looksRaw("    at Object.handler (/var/task/route.js:12:5)")).toBe(true);
});

test("a duplicate slug or variant gets a plain, fixable message", () => {
    expect(uniqueViolationMessage({ code: "23505", message: 'duplicate key value violates unique constraint "products_slug_key"' }))
        .toBe("That web address (slug) is already used by another product. Change it and save again.");
    expect(uniqueViolationMessage({ code: "23505", message: 'violates unique constraint "product_variants_product_id_size_color_stitching_key"' }))
        .toBe("Two variants have the same size, colour and brand. Remove the duplicate and save again.");
    expect(uniqueViolationMessage({ code: "23505", message: "something else" })).toBe("That value is already used by another product. Change it and save again.");
    expect(uniqueViolationMessage({ code: "23503", message: "fk" })).toBeNull();
    expect(uniqueViolationMessage(null)).toBeNull();
});
