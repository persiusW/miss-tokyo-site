import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
    cleanAbout, cleanFeatured, cleanGiftCards, cleanLink, cleanModalRows, cleanReview, cleanSeo, cleanSlide, cleanTrustItems,
} from "../../../src/lib/content/adminInput";

// Content's server actions run on the service role, so what the browser sends
// is cleaned before it is written.

test("slides need a heading; links stay on the shop or https; opacity is bounded", () => {
    expect(cleanSlide({ headline_line1: "  " })).toBeNull();
    const s = cleanSlide({ id: "not-a-uuid", headline_line1: "Hi", cta_primary_url: "javascript:alert(1)", cta_secondary_url: "//evil.example", overlay_opacity: 7, image_url: "http://x/y.png", extra: "drop me" })!;
    expect(s).not.toHaveProperty("id");
    expect(s).not.toHaveProperty("extra");
    expect(s.cta_primary_url).toBe("/shop");
    expect(s.cta_secondary_url).toBe("");
    expect(s.overlay_opacity).toBe(1);
    expect(s.image_url).toBe("");
    expect(cleanLink("/shop?category=dresses")).toBe("/shop?category=dresses");
    expect(cleanLink("https://misstokyo.shop")).toBe("https://misstokyo.shop");
});

test("reviews: rating 1–5, two-letter initials, colour from hex only", () => {
    expect(cleanReview({ reviewer_name: "" })).toBeNull();
    const r = cleanReview({ reviewer_name: "Ama", star_rating: 9, avatar_initials: "abc", avatar_color: "red" })!;
    expect(r.star_rating).toBe(5);
    expect(r.avatar_initials).toBe("AB");
    expect(r.avatar_color).toBe("#C4896A");
    expect(cleanReview({ reviewer_name: "Ama", star_rating: 0 })!.star_rating).toBe(1);
});

test("promise strip drops empty messages; featured keeps four places in order", () => {
    expect(cleanTrustItems([{ text: "Free pickup", enabled: true }, { text: " " }]).map(t => t.text)).toEqual(["Free pickup"]);
    const f = cleanFeatured([{ category_id: "bad", item_count_override: "" }, { item_count_override: 12.4 }, {}, {}, {}]);
    expect(f).toHaveLength(4);
    expect(f.map(x => x.position)).toEqual([0, 1, 2, 3]);
    expect(f[0].category_id).toBeNull();
    expect(f[0].item_count_override).toBeNull();
    expect(f[1].item_count_override).toBe(12);
});

test("about keeps only its own columns and known icons", () => {
    const a = cleanAbout({ about_eyebrow: " Our story ", store_email: "x@y.z", about_values: [{ icon: "skull", title: "Care", body: "" }], about_team: [{ name: "", role: "r" }, { name: "Esi", avatar_color: "nope" }] });
    expect(a).not.toHaveProperty("store_email");
    expect(a.about_eyebrow).toBe("Our story");
    expect(a.about_values).toEqual([{ icon: "heart", title: "Care", body: "" }]);
    expect(a.about_team).toHaveLength(1);
    expect(a.about_team[0].avatar_color).toBe("#1a1a1a");
    expect(a.about_cta_btn_url).toBe("/shop");
});

test("gift cards: smallest can't exceed largest; presets unique and sorted", () => {
    expect(cleanGiftCards({ gc_min_amount: 600, gc_max_amount: 500 })).toBeNull();
    expect(cleanGiftCards({ gc_min_amount: 20, gc_max_amount: 500, gc_preset_amounts: [100, 50, 100, -5, "x"] })!.gc_preset_amounts).toEqual([50, 100]);
});

test("search-engine text is capped and the image must be https", () => {
    const s = cleanSeo({ title: "x".repeat(500), og_image_url: "data:image/png;base64,AAA" });
    expect(s.title.length).toBe(120);
    expect(s.og_image_url).toBe("");
    expect(cleanModalRows([{ label: "S" }, { label: "" }])).toEqual([{ label: "S", bust: "", waist: "", hips: "" }]);
});

test("every Content server action checks the role before writing", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../../src/components/admin/v2/content/actions.ts"), "utf8");
    const exported = [...src.matchAll(/export async function (\w+)\((.*)\)[^\n]*\{\n([\s\S]*?)\n\}/g)];
    expect(exported.length).toBeGreaterThan(20);
    for (const [, name, , body] of exported) {
        const first = body.trim().split("\n")[0];
        const delegates = /return reorder\(/.test(first);
        expect(delegates || /await gate\(\)/.test(first), `${name} must call gate() first`).toBe(true);
    }
    expect(src).toMatch(/requireStaff\(\["admin", "owner"\]\)/);
});
