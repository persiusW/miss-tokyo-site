import { test, expect } from "@playwright/test";
import { normAttr, normSize, variantKey, hasVariantAttrs } from "../../../src/lib/utils/normAttr";

const P = "prod-1";

test.describe("normSize", () => {
    test('"One Size" folds to the same token as an absent size', () => {
        expect(normSize("One Size")).toBe(normSize(null));
        expect(normSize("one size")).toBe("null");
        expect(normSize("ONE SIZE")).toBe("null");
        expect(normSize("One-Size")).toBe("null");
    });

    test("a blank size is an absent size", () => {
        expect(normSize("")).toBe("null");
        expect(normSize("   ")).toBe("null");
        expect(normSize(undefined)).toBe("null");
    });

    test("a real size is left alone", () => {
        expect(normSize("XL — 14")).toBe("xl-14");
        expect(normSize("M")).toBe("m");
    });

    test("the em dash, en dash and hyphen forms all agree", () => {
        expect(normSize("S — 8")).toBe(normSize("S - 8"));
        expect(normSize("S – 8")).toBe(normSize("S-8"));
    });
});

test.describe("variantKey", () => {
    // The bug this file exists for: a colour-only product stores size NULL on
    // the variant row while the cart line carries the literal "One Size".
    test('a "One Size" cart line matches a NULL-size variant row', () => {
        const row = variantKey(P, { size: null, color: "Black", brand: null });
        const line = variantKey(P, { size: "One Size", color: "Black" });
        expect(line).toBe(row);
    });

    test("a blank colour matches a NULL colour", () => {
        expect(variantKey(P, { color: "" })).toBe(variantKey(P, { color: null }));
    });

    test("different colours still produce different keys", () => {
        expect(variantKey(P, { size: "One Size", color: "Black" }))
            .not.toBe(variantKey(P, { size: "One Size", color: "Nude" }));
    });

    test("different products still produce different keys", () => {
        expect(variantKey("a", { color: "Black" })).not.toBe(variantKey("b", { color: "Black" }));
    });

    test("a real size still distinguishes rows", () => {
        expect(variantKey(P, { size: "S — 8", color: "Pink" }))
            .not.toBe(variantKey(P, { size: "M — 10", color: "Pink" }));
        expect(variantKey(P, { size: "S — 8", color: "Pink" }))
            .toBe(variantKey(P, { size: "S - 8", color: "pink" }));
    });
});

test.describe("hasVariantAttrs", () => {
    // Gating variant stock on `size` alone sent colour-only products to the
    // product roll-up, which advertises every unit of every colour as available
    // in each single colour.
    test("a colour alone identifies a variant", () => {
        expect(hasVariantAttrs({ color: "Black" })).toBe(true);
    });

    test("a size alone identifies a variant", () => {
        expect(hasVariantAttrs({ size: "XL — 14" })).toBe(true);
    });

    test('"One Size" alone identifies nothing', () => {
        expect(hasVariantAttrs({ size: "One Size" })).toBe(false);
    });

    test("nothing at all identifies nothing", () => {
        expect(hasVariantAttrs({})).toBe(false);
        expect(hasVariantAttrs({ size: null, color: null, brand: null })).toBe(false);
        expect(hasVariantAttrs({ size: "", color: "" })).toBe(false);
    });

    test('"One Size" plus a colour identifies a variant', () => {
        expect(hasVariantAttrs({ size: "One Size", color: "SeaBlue" })).toBe(true);
    });
});

test.describe("normAttr", () => {
    test("a blank value and an absent value agree", () => {
        expect(normAttr("")).toBe("null");
        expect(normAttr(null)).toBe("null");
    });
});
