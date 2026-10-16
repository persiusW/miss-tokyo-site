import { test, expect } from "@playwright/test";
import { categoriesOf, inStock, normaliseSku, phraseMatches, pickResults, searchWords, similarTo, skuMatches, stem, wordScore, type Candidate, type Shown } from "../../../src/lib/ai/shopAssistant/selection";

const p = (id: string, price: number, stock: string[], over: Partial<Shown> = {}): Shown => ({
    product_id: id, name: id, price_ghs: price, takes_preorders: false,
    options: stock.map((s, i) => ({ size: "M — 10", colour: i === 0 ? "Black" : "Peach", brand: null, stock: s })), ...over,
});
const c = (out: Shown, cats = ["dresses"]): Candidate<Shown> => ({ out, categories: cats });

test("SKUs match however they are written", () => {
    for (const asked of ["D7", "d7", "SKU:D7", "SKU: D7", "sku d-07", "#D7", "D07", " d 7 "]) expect(skuMatches("D7", asked), asked).toBe(true);
    expect(skuMatches("D7", "D70")).toBe(false);
    expect(skuMatches("D7", "E7")).toBe(false);
    expect(skuMatches("D7", "")).toBe(false);
    expect(normaliseSku("SKU:D7")).toBe("D7");
    expect(normaliseSku("Z012")).toBe("Z12");
});

test("in stock means at least one option (or the product) is not sold out", () => {
    expect(inStock(p("a", 100, ["Sold out", "Only 1 left"]))).toBe(true);
    expect(inStock(p("a", 100, ["Sold out", "Sold out"]))).toBe(false);
    expect(inStock(p("a", 100, []))).toBe(false);                       // the asked-for size does not exist
    expect(inStock({ product_id: "b", name: "b", price_ghs: 1, takes_preorders: false, stock: "In stock" })).toBe(true);
});

test("browsing shows only pieces in stock, and says so when there are none", () => {
    const r = pickResults([c(p("sold", 100, ["Sold out"])), c(p("ok", 120, ["In stock"]))], [], { named: false, colour: null });
    expect(r.products.map(x => [x.product_id, x.in_stock])).toEqual([["ok", true]]);
    const none = pickResults([c(p("sold", 100, ["Sold out"]))], [], { named: false, colour: null });
    expect(none.products).toEqual([]);
    expect(none.note).toMatch(/Do not suggest sold-out pieces/);
});

test("a named sold-out piece comes back marked, with similar pieces in stock from its category", () => {
    const named = c(p("D7", 180, ["Sold out"], { takes_preorders: true }));
    const pool = [
        named,
        c(p("far", 400, ["In stock"])),
        c(p("near", 170, ["In stock"])),
        c(p("near-black", 200, ["In stock"])),
        c(p("other-cat", 180, ["In stock"]), ["bags"]),
        c(p("sold-too", 180, ["Sold out"])),
    ];
    const r = pickResults([named], pool, { named: true, colour: null });
    expect(r.products[0]).toMatchObject({ product_id: "D7", in_stock: false, takes_preorders: true });
    expect(r.products[0].similar_in_stock!.map(x => x.product_id)).toEqual(["near", "near-black", "far"]);
    // The asked-for colour comes first.
    expect(similarTo(named, pool, "Black").map(x => x.product_id)[0]).toBe("near");
});

test("categories include extra categories and the type", () => {
    expect(categoriesOf({ category_id: "a", category_ids: ["a", "b"], category_type: " Dresses " })).toEqual(["a", "b", "type:dresses"]);
    expect(categoriesOf({})).toEqual([]);
});

// ── Word search ─────────────────────────────────────────────────────────────

test("search words: lower case, singular, no stop words, at most 5", () => {
    expect(searchWords("Red BODYCON dresses for a party")).toEqual(["red", "bodycon", "dress", "party"]);
    expect(searchWords("heels")).toEqual(["heel"]);
    expect(searchWords("shoes, bags & glasses")).toEqual(["shoe", "bag", "glass"]);
    expect(searchWords("a b the")).toEqual([]);
    expect(searchWords("one two three four five six")).toHaveLength(5);
    expect([stem("dress"), stem("boss"), stem("sets"), stem("bus")]).toEqual(["dress", "boss", "set", "bus"]);
});

test("pieces matching more words rank first; type and brand count", () => {
    const words = searchWords("red bodycon dress");
    expect(wordScore({ name: "Lindsy Bodycon  ", category_type: "Dresses" }, words)).toBe(2);
    expect(wordScore({ name: "S Buttoned Maxi Dress", category_type: "Dresses" }, words)).toBe(1);
    expect(wordScore({ name: "Lala Heel", category_type: "Footwear " }, words)).toBe(0);
    expect(wordScore({ name: "Slides", category_type: null, brand: "Coach" }, searchWords("coach"))).toBe(1);
});

test("the whole phrase in a name is the customer naming that piece", () => {
    const rows = [{ name: "Lisa Heels " }, { name: "Lala Heel" }, { name: "Jiji heel" }];
    expect(phraseMatches(rows, "Lisa  heels")).toEqual([{ name: "Lisa Heels " }]);
    expect(phraseMatches(rows, "heel")).toHaveLength(3);
    expect(phraseMatches(rows, "x")).toEqual([]);
});
