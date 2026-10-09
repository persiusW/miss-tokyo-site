import { test, expect } from "@playwright/test";
import { WALKTHROUGHS, walkthroughsFor } from "../../../src/lib/ai/missTokyoAi/walkthroughs";
import { ANCHORS } from "../../../src/lib/ai/missTokyoAi/anchors";
import { ROUTES, routeAllowed } from "../../../src/lib/ai/missTokyoAi/routes";
import { walkthroughEffect } from "../../../src/lib/ai/missTokyoAi/effects";

// A walkthrough may only send people to pages they can open and ring
// controls that exist on the step's page.

test("every step is on a real page every role of the tour can open", () => {
    for (const w of WALKTHROUGHS) {
        expect(w.steps.length, w.id).toBeGreaterThan(0);
        for (const [i, s] of w.steps.entries()) {
            expect(Object.keys(ROUTES), `${w.id}#${i}`).toContain(s.route);
            for (const r of w.roles) expect(routeAllowed(s.route, r), `${w.id}#${i} for ${r}`).toBe(true);
            expect(s.text.length, `${w.id}#${i} text`).toBeGreaterThan(10);
        }
    }
});

test("every ringed control is registered and lives on the step's page (topbar is everywhere)", () => {
    for (const w of WALKTHROUGHS) {
        for (const [i, s] of w.steps.entries()) {
            if (!("anchor" in s) || !s.anchor) continue;
            const a = ANCHORS[s.anchor];
            expect(a, `${w.id}#${i}`).toBeTruthy();
            if (!s.anchor.startsWith("topbar.")) expect(a.route, `${w.id}#${i} ${s.anchor}`).toBe(s.route);
            if ("tab" in a) expect(s.route, `${w.id}#${i}`).toBe("settings");
        }
    }
});

test("tours are role-filtered, and the effect refuses tours a role can't run", () => {
    expect(walkthroughsFor("sales_staff").map(w => w.id)).not.toContain("delivery-fees");
    expect(walkthroughsFor("admin").map(w => w.id)).not.toContain("discount-code");
    expect(walkthroughEffect("delivery-fees", "sales_staff")).toBeNull();
    expect(walkthroughEffect("nope", "admin")).toBeNull();
    expect(walkthroughEffect("pos-sale", "sales_staff")).toEqual({ kind: "walkthrough", id: "pos-sale", href: "/pos", label: "Start walkthrough" });
});
