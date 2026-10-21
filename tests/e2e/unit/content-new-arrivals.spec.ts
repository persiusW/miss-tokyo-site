import { test, expect } from "@playwright/test";
import { DEFAULT_CAROUSEL_TABS, newArrivalsConfig, parseCarouselTabs, splitLastWord } from "../../../src/lib/content/homeSections";

// The home page's New Arrivals reads Content › Home page › New arrivals.
// With nothing saved (or a broken value) it is what the shop always showed.

test("new arrivals with nothing saved: the 16 newest, one list, the old heading", () => {
    const c = newArrivalsConfig(null, {});
    expect(c).toEqual({ title: "New Arrivals", eyebrow: "JUST LANDED", linkLabel: "VIEW ALL", limit: 16, categoryId: null, tabs: DEFAULT_CAROUSEL_TABS });
    expect(DEFAULT_CAROUSEL_TABS).toEqual([{ label: "New In", mode: "newest", category_name: "" }]);
});

test("new arrivals reads the saved title, number, category, tabs and wording", () => {
    const c = newArrivalsConfig(
        { homepage_new_arrivals_title: "  Just In  ", homepage_new_arrivals_limit: 8, homepage_new_arrivals_category_id: "3fb9aad9-ea2e-42f6-9289-a33aa19906c5" },
        { carousel_config: JSON.stringify({ tabs: [{ label: "New", mode: "newest" }, { label: "Best", mode: "sort_order", category_name: "Dresses" }] }), home_new_arrivals_eyebrow: "FRESH", home_new_arrivals_link: "   " },
    );
    expect(c.title).toBe("Just In");
    expect(c.limit).toBe(8);
    expect(c.categoryId).toBe("3fb9aad9-ea2e-42f6-9289-a33aa19906c5");
    expect(c.tabs).toEqual([{ label: "New", mode: "newest", category_name: "" }, { label: "Best", mode: "sort_order", category_name: "Dresses" }]);
    expect(c.eyebrow).toBe("FRESH");
    // Only spaces saved: the original wording, never a blank heading.
    expect(c.linkLabel).toBe("VIEW ALL");
    // A nonsense number falls back; a huge one is capped.
    expect(newArrivalsConfig({ homepage_new_arrivals_limit: Number.NaN }, {}).limit).toBe(16);
    expect(newArrivalsConfig({ homepage_new_arrivals_limit: 500 }, {}).limit).toBe(24);
});

test("carousel tabs: broken, empty or missing values are the one list", () => {
    for (const raw of [null, undefined, "", "not json", "{}", '{"tabs":[]}', '{"tabs":"x"}', "[1,2]"]) expect(parseCarouselTabs(raw)).toEqual(DEFAULT_CAROUSEL_TABS);
    // At most four tabs; an unknown order is newest first.
    const many = parseCarouselTabs(JSON.stringify({ tabs: Array.from({ length: 6 }, (_, i) => ({ label: `T${i}`, mode: "weird" })) }));
    expect(many).toHaveLength(4);
    expect(many.every(t => t.mode === "newest")).toBe(true);
});

test("the section title sets its last word apart, like the shop always did", () => {
    expect(splitLastWord("New Arrivals")).toEqual(["New", "Arrivals"]);
    expect(splitLastWord("Arrivals")).toEqual(["", "Arrivals"]);
    expect(splitLastWord("  Fresh  This Week ")).toEqual(["Fresh  This", "Week"]);
});
