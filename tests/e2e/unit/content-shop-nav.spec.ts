import { test, expect } from "@playwright/test";
import { DEFAULT_NAV, navLinkShown, shopNavFrom, tabShown } from "../../../src/lib/content/shopNav";
import { NAV_KEYS } from "../../../src/lib/content/adminInput";

// The shop's menu and phone tab bar: Content › Menu switches plus the
// Settings › Shop pages switches, read the way the old NavBar read them.

test("menu: as the old NavBar read it, plus the page switches", () => {
    // No settings row: every link (the old NavBar kept its defaults).
    expect(shopNavFrom(null, null)).toEqual(DEFAULT_NAV);
    // With the row, each switch as saved; an empty one hides its link.
    const site = Object.fromEntries(NAV_KEYS.map(k => [k, true])) as Record<string, boolean | null>;
    site.nav_show_sale = false;
    site.nav_show_dresses = null;
    const nav = shopNavFrom(site, { enable_gallery: true, enable_gift_cards: null });
    expect(navLinkShown(nav, "nav_show_sale")).toBe(false);
    expect(navLinkShown(nav, "nav_show_dresses")).toBe(false);
    expect(navLinkShown(nav, "nav_show_gallery")).toBe(true);
    expect(navLinkShown(nav, "nav_show_gift_card")).toBe(true);
    // A page switched off hides its link and its phone tab, whatever the menu switch says.
    const off = shopNavFrom(site, { enable_gallery: false, enable_gift_cards: false });
    expect(navLinkShown(off, "nav_show_gallery")).toBe(false);
    expect(navLinkShown(off, "nav_show_gift_card")).toBe(false);
    expect(tabShown(off, "/gallery")).toBe(false);
    expect(tabShown(off, "/gift-cards")).toBe(false);
    expect(tabShown(off, "/shop")).toBe(true);
    expect(navLinkShown(off, "nav_show_home")).toBe(true);
});
