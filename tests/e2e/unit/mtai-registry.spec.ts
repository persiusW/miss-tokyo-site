import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { ANCHORS } from "../../../src/lib/ai/missTokyoAi/anchors";
import { ROUTES, SETTINGS_TABS, routesFor } from "../../../src/lib/ai/missTokyoAi/routes";
import { GUIDE, guideFor } from "../../../src/lib/ai/missTokyoAi/guide";
import { navigateEffect, showMeEffect } from "../../../src/lib/ai/missTokyoAi/effects";

// The assistant may only point at real pages and real controls. These fail when
// the dashboard and the registries drift apart, in either direction.

const ROOT = path.resolve(__dirname, "../../..");
const SRC = path.join(ROOT, "src");
const DASH = path.join(SRC, "app", "(dashboard)");

function filesUnder(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) filesUnder(p, out);
        else if (/\.tsx$/.test(entry.name)) out.push(p);
    }
    return out;
}

test("every registered anchor is on exactly one element, and every data-assist is registered", () => {
    const counts = new Map<string, number>();
    for (const file of filesUnder(SRC)) {
        // Literal ids only; the Spotlight builds its selector from a variable.
        for (const m of fs.readFileSync(file, "utf8").matchAll(/data-assist="([a-z0-9.-]+)"/g)) {
            counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
        }
    }
    for (const id of Object.keys(ANCHORS)) expect(counts.get(id), `anchor ${id} in JSX`).toBe(1);
    for (const id of counts.keys()) expect(Object.keys(ANCHORS), `data-assist="${id}" registered`).toContain(id);
});

test("every route is a real dashboard page", () => {
    for (const [key, r] of Object.entries(ROUTES)) {
        const page = path.join(DASH, ...r.path.split("/").filter(Boolean), "page.tsx");
        expect(fs.existsSync(page), `${key} → ${r.path}`).toBe(true);
    }
});

test("Settings tab ids match the tabs on the Settings page", () => {
    const src = fs.readFileSync(path.join(DASH, "settings", "page.tsx"), "utf8");
    // The page's top-level tabs array only (the CMS sub-tabs are a different list).
    const block = src.slice(src.indexOf("const tabs: { key: TabKey"), src.indexOf("];", src.indexOf("const tabs: { key: TabKey")));
    const keys = [...block.matchAll(/\{ key: "([a-z-]+)",\s+label:/g)].map(m => m[1]);
    expect(keys.sort()).toEqual([...SETTINGS_TABS].sort());
});

test("guide entries point at known routes, and sales staff never see admin/owner-only pages", () => {
    for (const e of GUIDE) if (e.route) expect(Object.keys(ROUTES)).toContain(e.route);
    const staffRoutes = routesFor("sales_staff");
    for (const k of ["settings", "team", "pay_links", "invoices", "wholesalers", "ai_settings"] as const) {
        expect(staffRoutes).not.toContain(k);
    }
    for (const e of guideFor("sales_staff")) {
        if (e.route) expect(staffRoutes, `guide ${e.id}`).toContain(e.route);
    }
});

test("effects are validated by role, route and tab", () => {
    expect(navigateEffect("settings", "sales_staff", "store")).toBeNull();
    expect(navigateEffect("settings", "owner", "store")?.href).toBe("/settings?tab=store");
    expect(navigateEffect("settings", "owner", "not-a-tab")).toBeNull();
    expect(navigateEffect("orders", "owner", "store")).toBeNull();
    expect(navigateEffect("nope", "admin")).toBeNull();
    expect(showMeEffect("settings.delivery-fees", "sales_staff")).toBeNull();
    expect(showMeEffect("settings.delivery-fees", "admin")?.href).toBe("/settings?tab=store");
    expect(showMeEffect("pos.cash", "sales_staff")?.href).toBe("/pos");
    expect(showMeEffect("pos.nope", "admin")).toBeNull();
});
