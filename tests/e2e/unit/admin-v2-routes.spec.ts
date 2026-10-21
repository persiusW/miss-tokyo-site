import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { v2Redirect, FLAGS_ALL, FLAGS_OFF, V2_PREFIXES, type V2Area } from "../../../src/lib/admin/v2/routeMap";

const ALL: V2Area[] = ["home", "inbox", "orders", "till", "products", "customers", "discounts", "content", "analytics", "staff", "billing", "settings"];
const ROOT = path.resolve(__dirname, "../../..");

test("old URLs go forward only while their area is on and built", () => {
    expect(v2Redirect("/overview", "", FLAGS_ALL, ALL)).toBe("/home");
    expect(v2Redirect("/overview", "", FLAGS_OFF, ALL)).toBeNull();
    expect(v2Redirect("/overview", "", FLAGS_ALL, [])).toBeNull();
    expect(v2Redirect("/sales/orders/abc-123", "", FLAGS_ALL, ALL)).toBe("/orders/abc-123");
    expect(v2Redirect("/sales/pre-orders", "", FLAGS_ALL, ALL)).toBe("/orders?preorder=1");
    expect(v2Redirect("/catalog/products/p1/edit", "", FLAGS_ALL, ALL)).toBe("/catalogue/p1");
    expect(v2Redirect("/sales/riders/r9", "", FLAGS_ALL, ALL)).toBe("/analytics?report=riders&rider=r9");
    expect(v2Redirect("/sales/wholesalers", "", FLAGS_ALL, ALL)).toBe("/customers?segment=wholesale");
    expect(v2Redirect("/settings/ai", "", FLAGS_ALL, ALL)).toBe("/settings/assistants");
    expect(v2Redirect("/sales/orders", "tab=packed&page=2", FLAGS_ALL, ALL)).toBe("/orders?tab=packed&page=2");
    expect(v2Redirect("/catalog/discounts", "", FLAGS_ALL, ALL)).toBe("/discounts");
    expect(v2Redirect("/catalog/auto-discounts", "", FLAGS_ALL, ALL)).toBe("/discounts?type=auto");
});

test("Payments and Riders open as reports on Analytics, and come back while it's off", () => {
    expect(v2Redirect("/sales/analytics", "", FLAGS_ALL, ALL)).toBe("/analytics");
    expect(v2Redirect("/admin/analytics", "", FLAGS_ALL, ALL)).toBe("/analytics");
    expect(v2Redirect("/sales/payments", "", FLAGS_ALL, ALL)).toBe("/analytics?report=payments");
    expect(v2Redirect("/sales/riders", "", FLAGS_ALL, ALL)).toBe("/analytics?report=riders");
    expect(v2Redirect("/sales/riders/0a1b2c3d-1111-2222-3333-444455556666", "", FLAGS_ALL, ALL))
        .toBe("/analytics?report=riders&rider=0a1b2c3d-1111-2222-3333-444455556666");
    // Analytics is built, so the real switch moves these too.
    const v2Only = { ...FLAGS_OFF, admin_v2: true };
    expect(v2Redirect("/sales/payments", "", v2Only)).toBe("/analytics?report=payments");
    expect(v2Redirect("/sales/analytics", "", FLAGS_OFF)).toBeNull();
    // Switched off: the new URLs go back to the old pages.
    expect(v2Redirect("/analytics", "report=payments&range=30d", FLAGS_OFF, ALL)).toBe("/sales/payments?range=30d");
    expect(v2Redirect("/analytics", "report=riders&rider=r9", FLAGS_OFF, ALL)).toBe("/sales/riders/r9");
    expect(v2Redirect("/analytics", "report=riders", FLAGS_OFF, ALL)).toBe("/sales/riders");
    expect(v2Redirect("/analytics", "report=timing", FLAGS_OFF, ALL)).toBe("/sales/analytics?report=timing");
    expect(v2Redirect("/analytics", "report=riders&rider=..%2F..", FLAGS_OFF, ALL)).toBe("/sales/riders?rider=..%2F..");
    expect(v2Redirect("/analytics/reports/payments", "", FLAGS_OFF, ALL)).toBe("/sales/payments");
    expect(v2Redirect("/analytics/reports/riders", "", FLAGS_OFF, ALL)).toBe("/sales/riders");
    expect(v2Redirect("/analytics/reports/timing", "", FLAGS_OFF, ALL)).toBe("/sales/analytics");
    expect(v2Redirect("/analytics", "range=30d", FLAGS_ALL, ALL)).toBeNull();
});

test("high-risk areas wait for their own switch", () => {
    const v2Only = { ...FLAGS_OFF, admin_v2: true };
    expect(v2Redirect("/sales/orders", "", v2Only, ALL)).toBeNull();
    expect(v2Redirect("/pos", "", v2Only, ALL)).toBeNull();
    expect(v2Redirect("/catalog/products", "", v2Only, ALL)).toBeNull();
    expect(v2Redirect("/team", "", v2Only, ALL)).toBe("/staff");
    expect(v2Redirect("/orders", "", v2Only, ALL)).toBe("/sales/orders");
});

test("new URLs go back while their area is off", () => {
    expect(v2Redirect("/home", "", FLAGS_OFF, ALL)).toBe("/overview");
    expect(v2Redirect("/orders/abandoned", "", FLAGS_OFF, ALL)).toBe("/customers/abandoned");
    expect(v2Redirect("/orders/xyz", "", FLAGS_OFF, ALL)).toBe("/sales/orders/xyz");
    expect(v2Redirect("/catalogue/inventory", "", FLAGS_OFF, ALL)).toBe("/catalog/products/low-stock");
    expect(v2Redirect("/catalogue/new", "", FLAGS_OFF, ALL)).toBe("/catalog/products/new");
    expect(v2Redirect("/billing", "", FLAGS_OFF, ALL)).toBe("/settings");
    expect(v2Redirect("/settings/assistants", "", FLAGS_OFF, ALL)).toBe("/settings/ai");
    expect(v2Redirect("/discounts", "status=active", FLAGS_OFF, ALL)).toBe("/catalog/discounts?status=active");
    expect(v2Redirect("/discounts/c90ace37-332e-4947-8601-a841661ad450", "", FLAGS_OFF, ALL)).toBe("/catalog/discounts");
    expect(v2Redirect("/home", "", FLAGS_ALL, ALL)).toBeNull();
});

test("shared paths are never redirected", () => {
    for (const p of ["/customers", "/customers/ama%40x.com", "/settings", "/agent", "/test-orders"]) {
        expect(v2Redirect(p, "", FLAGS_ALL, ALL)).toBeNull();
        expect(v2Redirect(p, "", FLAGS_OFF, ALL)).toBeNull();
    }
});

test("no redirect ever loops", () => {
    const paths = ["/overview", "/home", "/sales/orders", "/orders", "/orders/abandoned", "/pos", "/till", "/catalogue", "/catalog/products", "/team", "/staff", "/cms", "/content",
        "/catalog/discounts", "/catalog/auto-discounts", "/discounts", "/discounts/abc",
        "/sales/analytics", "/analytics", "/sales/payments", "/sales/riders", "/sales/riders/r9", "/analytics/reports/payments"];
    for (const flags of [FLAGS_ALL, FLAGS_OFF, { ...FLAGS_OFF, admin_v2: true }]) {
        for (const p of paths) {
            const once = v2Redirect(p, "", flags, ALL);
            if (!once) continue;
            const [to, q] = once.split("?");
            expect(v2Redirect(to, q ?? "", flags, ALL), `${p} → ${once}`).toBeNull();
        }
    }
});

test("proxy.ts and sw.js keep every new prefix private", () => {
    const proxy = fs.readFileSync(path.join(ROOT, "src/proxy.ts"), "utf8");
    const sw = fs.readFileSync(path.join(ROOT, "public/sw.js"), "utf8");
    expect(proxy).toContain("V2_PREFIXES");
    for (const p of V2_PREFIXES) expect(sw, `sw.js ${p}`).toContain(`"${p}"`);
    for (const p of ["/agent", "/ai", "/test-orders"]) {
        expect(sw, `sw.js ${p}`).toContain(`"${p}"`);
        expect(proxy, `proxy.ts ${p}`).toContain(`"${p}"`);
    }
});
