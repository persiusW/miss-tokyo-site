import { test, expect } from "@playwright/test";
import {
    DEFAULT_FAQS, DEFAULT_POLICIES, DEFAULT_SIZE_GUIDE_PAGE, POLICY_KEYS, bodyBlocks, cleanPolicy, docToText, inlineParts,
    parseFaqs, parsePolicy, parseSizeGuidePage, safeHref,
} from "../../../src/lib/content/pageDocs";
import { shopInfoTextFor } from "../../../src/lib/content/shopInfoText";
import { DEFAULT_LAYOUT, cleanLayout, parseLayout } from "../../../src/lib/content/homeLayout";
import { isConfigCopyKey, wordingOriginal } from "../../../src/lib/content/wording";
import { FAQS, REFUND_POLICY, SIZE_CHART } from "../../../src/content/shopInfo";

// Content › Pages: the owner's saved policy, FAQ and size-guide text, with the
// original as the fallback, and the same text for Ask Miss Tokyo.

const defaults = { faqs: DEFAULT_FAQS, refund: DEFAULT_POLICIES.refund, shipping: DEFAULT_POLICIES.shipping, size: DEFAULT_SIZE_GUIDE_PAGE };

test("nothing saved, or a broken save, shows the original text", () => {
    for (const k of POLICY_KEYS) {
        expect(parsePolicy(k, null)).toBe(DEFAULT_POLICIES[k]);
        expect(parsePolicy(k, "not json")).toBe(DEFAULT_POLICIES[k]);
        expect(parsePolicy(k, JSON.stringify({ intro: "", sections: [] }))).toBe(DEFAULT_POLICIES[k]);
    }
    expect(parseFaqs("[]")).toBe(DEFAULT_FAQS);
    expect(parseFaqs(JSON.stringify([{ section: "X", question: "", answer: "a" }]))).toBe(DEFAULT_FAQS);
    expect(parseSizeGuidePage(JSON.stringify({ rows: [] }))).toBe(DEFAULT_SIZE_GUIDE_PAGE);
    expect(DEFAULT_FAQS).toEqual(FAQS);
    expect(DEFAULT_SIZE_GUIDE_PAGE.rows).toEqual(SIZE_CHART);
});

test("the original refund policy keeps every line of today's page", () => {
    const text = docToText(DEFAULT_POLICIES.refund);
    for (const line of [REFUND_POLICY.intro, ...REFUND_POLICY.eligibility, ...REFUND_POLICY.approved, REFUND_POLICY.note]) expect(text).toContain(line);
    expect(text).toContain(REFUND_POLICY.contactEmail);
});

test("a saved policy is used as written, trimmed and capped", () => {
    const doc = parsePolicy("terms", JSON.stringify({ intro: "  Hello  ", sections: [{ heading: "A", body: "- one\n- two\nplain" }, { heading: "", body: "" }] }));
    expect(doc).toEqual({ intro: "Hello", sections: [{ heading: "A", body: "- one\n- two\nplain" }] });
    expect(cleanPolicy({ intro: "x", sections: Array.from({ length: 50 }, () => ({ heading: "h", body: "b" })) })!.sections.length).toBe(30);
});

test("section text splits into lists and paragraphs", () => {
    expect(bodyBlocks("Intro\n- a\n- b\n\nAfter")).toEqual([
        { kind: "p", text: "Intro" }, { kind: "ul", items: ["a", "b"] }, { kind: "p", text: "After" },
    ]);
});

test("links: shop paths, https and mail only; emails become mail links", () => {
    expect(inlineParts("See our [Refund Policy](/policies/refund-policy) now")).toEqual([
        { kind: "text", text: "See our " }, { kind: "link", text: "Refund Policy", href: "/policies/refund-policy" }, { kind: "text", text: " now" },
    ]);
    expect(inlineParts("[x](javascript:alert(1))")[0]).toEqual({ kind: "text", text: "x" });
    expect(inlineParts("Email orders@misstokyo.shop.")).toEqual([
        { kind: "text", text: "Email " }, { kind: "link", text: "orders@misstokyo.shop", href: "mailto:orders@misstokyo.shop" }, { kind: "text", text: "." },
    ]);
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("http://plain.example")).toBeNull();
    expect(safeHref("https://misstokyo.shop/x")).toBe("https://misstokyo.shop/x");
});

test("Ask Miss Tokyo answers from the pages as published", () => {
    expect(shopInfoTextFor("returns", defaults)).toMatch(/72 hours/);
    expect(shopInfoTextFor("sizing", defaults)).toMatch(/XL — 14/);
    expect(shopInfoTextFor("payment", defaults)).toBe(FAQS.find(f => f.question === "What payment methods do you accept?")!.answer);
    expect(shopInfoTextFor("contact", defaults)).toBe("For help with an order, email orders@misstokyo.shop.");
    expect(shopInfoTextFor("delivery", defaults)).toContain(FAQS.find(f => f.question === "Do you offer pickup?")!.answer);

    const edited = { ...defaults, refund: { intro: "Returns within 5 days.", sections: [] } };
    expect(shopInfoTextFor("returns", edited)).toBe("Returns within 5 days.");
    expect(shopInfoTextFor("faq", { ...defaults, faqs: [{ section: "S", question: "Q?", answer: "A [link](/x)." }] })).toBe("Q: Q?\nA: A [link](/x).");
});

test("home layout: today's order by default; unknown ids dropped, missing ones put back", () => {
    expect(parseLayout(null)).toBe(DEFAULT_LAYOUT);
    expect(parseLayout("{bad")).toBe(DEFAULT_LAYOUT);
    const l = cleanLayout({ order: ["reviews", "hero", "nope", "hero"], hidden: ["instagram", "trust", "zzz"] });
    // Each missing section goes straight after the one it usually follows.
    expect(l.order).toEqual(["reviews", "newsletter", "instagram", "hero", "trust", "categories", "new_arrivals"]);
    // The promise strip keeps its own switch, so it can't be hidden twice.
    expect(l.hidden).toEqual(["instagram"]);
});

test("settings rows never show up as shop wording", () => {
    for (const k of ["size_guide_rows", "carousel_config", "wholesale_tiers", "homepage_layout", "page_faq", "page_policy_refund"]) expect(isConfigCopyKey(k)).toBe(true);
    expect(isConfigCopyKey("hero_title")).toBe(false);
    expect(wordingOriginal("craft_heritage_heading")).toBe("The Name Is Personal");
});
