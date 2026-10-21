import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { toolsAllowed, TOOLS_TABS, toolsHref, isToolsTab } from "../../../src/lib/admin/v2/tools";
import { NAV_GENERAL, navVisible } from "../../../src/components/admin/shell/nav";
import { v2Redirect, FLAGS_ALL, FLAGS_OFF, V2_PREFIXES } from "../../../src/lib/admin/v2/routeMap";
import { V2_ROUTES } from "../../../src/lib/ai/missTokyoAi/routes";

// Admin tools is the admin role ONLY, checked on the server on every page and
// every action; owners and sales staff get the admin-only notice. Billing is
// owners and admins. Hiding the menu item gates nothing, so these read the
// server code itself.

const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("the one rule: admin yes; owner, sales staff, customers and nobody no", () => {
    expect(toolsAllowed("admin")).toBe(true);
    for (const r of ["owner", "sales_staff", "customer", "wholesale", "", null, undefined]) expect(toolsAllowed(r as string), String(r)).toBe(false);
});

test("both Admin tools pages check for the admin role on the server before loading anything", () => {
    for (const f of ["src/app/(dashboard)/(v2)/tools/page.tsx", "src/app/(dashboard)/(v2)/tools/[tab]/page.tsx"]) {
        const src = read(f);
        expect(src, f).toMatch(/requireV2Page\("tools", [^,]+, \["admin"\]\)/);
        const guard = src.indexOf("if (!g.allowed) return <Denied title=\"Admin tools\" adminOnly />;");
        expect(guard, f).toBeGreaterThan(0);
        expect(src.indexOf("<ToolsRoute"), f).toBeGreaterThan(guard);
    }
    expect(read("src/components/admin/ui/primitives.tsx")).toContain("Only the admin can open this page");
});

test("every Admin tools action refuses anyone but the admin, first thing", () => {
    const src = read("src/components/admin/v2/tools/actions.ts");
    expect(src).toContain('const me = await requireStaff(["admin"]);');
    expect(src).toContain('if ("status" in me || !toolsAllowed(me.role)) return null;');
    const fns = [...src.matchAll(/^export async function (\w+)\(.*\{\n([^\n]*)\n([^\n]*)/gm)];
    expect(fns.length).toBeGreaterThan(20);
    for (const [, name, l1, l2] of fns) {
        const ok = /^\s+if \(!\(await toolsAdmin\(\)\)\) return DENIED;$/.test(l1) || (/^\s+const me = await toolsAdmin\(\);$/.test(l1) && /^\s+if \(!me\) return DENIED;$/.test(l2));
        expect(ok, name).toBe(true);
    }
    const route = read("src/app/api/admin/v2/tools/find-order/route.ts");
    expect(route).toContain('requireStaff(["admin"])');
    expect(route).toContain("toolsAllowed(me.role)");
});

test("Billing is owners and admins, on the page and in every action", () => {
    expect(read("src/app/(dashboard)/(v2)/billing/page.tsx")).toContain('requireV2Page("billing", "/billing", ["owner", "admin"])');
    const src = read("src/components/admin/v2/billing/actions.ts");
    expect(src).toContain('requireStaff(["admin", "owner"])');
    const fns = [...src.matchAll(/^export async function (\w+)\(.*\{\n([^\n]*)\n([^\n]*)/gm)];
    expect(fns.length).toBe(4);
    for (const [, name, l1, l2] of fns) expect(/const me = await billingStaff\(\);/.test(l1) && /if \(!me\) return DENIED;/.test(l2), name).toBe(true);
});

test("the menu shows Admin tools to the admin only; Billing to owners and admins", () => {
    const tools = NAV_GENERAL.find(n => n.k === "tools")!;
    const billing = NAV_GENERAL.find(n => n.k === "billing")!;
    expect(navVisible(tools, "admin")).toBe(true);
    expect(navVisible(tools, "owner")).toBe(false);
    expect(navVisible(tools, "sales_staff")).toBe(false);
    expect(navVisible(billing, "owner")).toBe(true);
    expect(navVisible(billing, "sales_staff")).toBe(false);
    expect(V2_ROUTES.tools.roles).toEqual(["admin"]);
});

test("routes: /tools is private, has a page per tab, and goes to Settings while the new admin is off", () => {
    expect(V2_PREFIXES).toContain("/tools");
    expect(read("public/sw.js")).toContain('"/tools"');
    expect(v2Redirect("/tools", "", FLAGS_ALL)).toBeNull();
    expect(v2Redirect("/tools/fees", "", FLAGS_ALL)).toBeNull();
    expect(v2Redirect("/tools", "", FLAGS_OFF)).toBe("/settings");
    expect(v2Redirect("/tools/rates", "", FLAGS_OFF)).toBe("/settings");
    expect(toolsHref("payouts")).toBe("/tools");
    expect(TOOLS_TABS.map(t => toolsHref(t.v)).filter(h => h !== "/tools").every(h => /^\/tools\/[a-z]+$/.test(h))).toBe(true);
    expect(isToolsTab("payouts") && !isToolsTab("../settings") && !isToolsTab("")).toBe(true);
});

test("the old Billing sample figures are gone", () => {
    expect(fs.existsSync(path.join(ROOT, "src/components/admin/v2/billing/billingPreview.ts"))).toBe(false);
    const page = read("src/components/admin/v2/billing/BillingPage.tsx");
    expect(page).not.toMatch(/4821|1284\.6|Studio plan|BILLING_PREVIEW/);
});
