import { test, expect } from "@playwright/test";
import { SITE_ASSETS, shownImage } from "../../../src/lib/content/wording";

// Site images show on their page only when saved, switched on and secure;
// with none, the page keeps its usual look.

test("site images show only when saved, switched on and secure", () => {
    const row = { section_key: "shop_banner", image_url: "https://x.supabase.co/a.webp", alt_text: " Rails ", link_url: "/shop", is_active: true };
    expect(shownImage(row)).toEqual({ url: "https://x.supabase.co/a.webp", alt: "Rails", link: "/shop" });
    expect(shownImage(undefined)).toBeNull();
    expect(shownImage({ ...row, is_active: false })).toBeNull();
    expect(shownImage({ ...row, image_url: null })).toBeNull();
    expect(shownImage({ ...row, image_url: "http://x/a.webp" })).toBeNull();
    // An unsafe link is dropped, the image still shows.
    expect(shownImage({ ...row, link_url: "javascript:alert(1)" })?.link).toBeNull();
    expect(shownImage({ ...row, link_url: "//evil.example" })?.link).toBeNull();
    expect(shownImage({ ...row, is_active: null })).not.toBeNull();
    // Slots a page shows name it; the others say why not.
    for (const a of SITE_ASSETS) expect(a.note.length).toBeGreaterThan(10);
    expect(SITE_ASSETS.filter(a => !a.path).map(a => a.key)).toEqual(["home_hero", "craft_banner", "gallery_banner"]);
});
