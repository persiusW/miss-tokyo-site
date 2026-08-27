import { test, expect } from "@playwright/test";
import { computeDiff } from "../../../src/lib/utils/activityDiff";

// A one-field edit used to log thirty phantom changes, because the full old row
// was diffed against a partial update payload and every untouched column came
// back as `{ from: <value>, to: undefined }`. These lock the payload-shaped walk.

const productRow = {
    id: "p1",
    name: "EMPIRE SLIPPERS",
    slug: "empire-slippers",
    created_at: "2026-01-01",
    updated_at: "2026-01-02",
    badge: null,
    brand: null,
    ribbon: null,
    sort_order: 0,
    is_featured: false,
    inventory_count: 21,
    available_colors: ["Black", "Brown"],
};

test("reports only the field the update actually wrote", () => {
    const diff = computeDiff(productRow, { inventory_count: 9999 });
    expect(diff).toEqual({ inventory_count: { from: 21, to: 9999 } });
});

test("untouched columns never appear", () => {
    const diff = computeDiff(productRow, { inventory_count: 9999 })!;
    for (const noise of ["badge", "brand", "ribbon", "sort_order", "is_featured"]) {
        expect(diff).not.toHaveProperty(noise);
    }
});

test("writing a column back unchanged is not a change", () => {
    expect(computeDiff(productRow, { inventory_count: 21 })).toBeNull();
});

test("id, timestamps and slug are always ignored", () => {
    const diff = computeDiff(productRow, {
        id: "p2",
        slug: "new-slug",
        created_at: "2026-05-05",
        updated_at: "2026-05-05",
        name: "EMPIRE SLIDES",
    });
    expect(diff).toEqual({ name: { from: "EMPIRE SLIPPERS", to: "EMPIRE SLIDES" } });
});

test("arrays compare by content, not by reference", () => {
    expect(computeDiff(productRow, { available_colors: ["Black", "Brown"] })).toBeNull();
    expect(computeDiff(productRow, { available_colors: ["Black", "Wine"] })).toEqual({
        available_colors: { from: ["Black", "Brown"], to: ["Black", "Wine"] },
    });
});

test("several real edits all survive", () => {
    expect(computeDiff(productRow, { name: "X", inventory_count: 5, badge: null })).toEqual({
        name: { from: "EMPIRE SLIPPERS", to: "X" },
        inventory_count: { from: 21, to: 5 },
    });
});

test("a null becoming a value reads as null, not undefined", () => {
    expect(computeDiff(productRow, { badge: "NEW" })).toEqual({ badge: { from: null, to: "NEW" } });
});

test("nothing to compare against yields nothing", () => {
    expect(computeDiff(null, { name: "X" })).toBeNull();
    expect(computeDiff(productRow, null)).toBeNull();
});
