import { test, expect } from "@playwright/test";
import { searchDocs, terms, type SearchDoc } from "../../../src/lib/ai/missTokyoAi/guideSearch";
import { buildExcerpt, cleanPagePath, cleanQuestion, cleanRoles } from "../../../src/lib/ai/missTokyoAi/questions";
import { navigateEffect, sendToAdminEffect } from "../../../src/lib/ai/missTokyoAi/effects";
import { routesFor } from "../../../src/lib/ai/missTokyoAi/routes";
import { guideFor } from "../../../src/lib/ai/missTokyoAi/guide";

test("search terms drop stop words and plurals", () => {
    expect(terms("How do I send the pay links?")).toEqual(["send", "pay", "link"]);
});

test("a saved answer outranks a guide entry on equal hits", () => {
    const docs: SearchDoc[] = [
        { id: "g", title: "Pay links", body: "Send a link from the till.", source: "guide" },
        { id: "s", title: "Pay links", body: "Send a link from the till.", source: "saved" },
        { id: "x", title: "Riders", body: "Assign a rider.", source: "guide" },
    ];
    const hits = searchDocs("pay link", docs);
    expect(hits.map(h => h.id)).toEqual(["s", "g"]);
    expect(searchDocs("the and of", docs)).toEqual([]);
});

test("the excerpt keeps the last six text turns, redacted, without tool blocks", () => {
    const transcript = [
        { role: "user", content: "first" },
        ...Array.from({ length: 6 }, (_, i) => ({ role: i % 2 ? "user" : "assistant", content: [{ type: "text", text: `turn ${i}` }, { type: "tool_use", id: "t", name: "x", input: {} }] })),
        { role: "user", content: "my OTP is 482913" },
    ];
    const ex = buildExcerpt(transcript);
    expect(ex).toHaveLength(6);
    expect(ex[0].text).toBe("turn 1");
    expect(ex[5].text).not.toContain("482913");
    expect(buildExcerpt("nonsense")).toEqual([]);
});

test("question, page path and roles are cleaned", () => {
    expect(cleanQuestion("  how   do I\n do this? ")).toBe("how do I do this?");
    expect(cleanQuestion("x".repeat(400))).toHaveLength(300);
    expect(cleanPagePath("/sales/orders")).toBe("/sales/orders");
    expect(cleanPagePath("https://evil.example")).toBeNull();
    expect(cleanRoles(["owner", "hacker"])).toEqual(["owner"]);
    expect(cleanRoles("nope")).toEqual(["admin", "owner", "sales_staff"]);
});

test("send_to_admin effects need a real question", () => {
    expect(sendToAdminEffect("hi")).toBeNull();
    expect(sendToAdminEffect(42)).toBeNull();
    expect(sendToAdminEffect("How do I split a payment?")).toEqual({ kind: "send_to_admin", summary: "How do I split a payment?" });
});

test("the AI inbox is the admin's alone", () => {
    expect(routesFor("admin")).toContain("ai_inbox");
    expect(routesFor("owner")).not.toContain("ai_inbox");
    expect(routesFor("sales_staff")).not.toContain("ai_inbox");
    expect(navigateEffect("ai_inbox", "owner")).toBeNull();
    expect(guideFor("owner").map(e => e.id)).not.toContain("ai-inbox");
    expect(guideFor("admin").map(e => e.id)).toContain("ai-inbox");
});
