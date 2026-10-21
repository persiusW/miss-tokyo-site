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

test("Orders: old pages go forward to the list, its tabs and the panel, and come back", () => {
    const on = { ...FLAGS_OFF, admin_v2: true, admin_v2_orders: true };
    expect(v2Redirect("/sales/orders", "tab=pickups&payment=cash", on)).toBe("/orders?tab=pickups&payment=cash");
    expect(v2Redirect("/sales/orders/0a1b2c3d-1111-2222-3333-444455556666", "", on)).toBe("/orders/0a1b2c3d-1111-2222-3333-444455556666");
    expect(v2Redirect("/admin/orders/abc", "", on)).toBe("/orders/abc");
    expect(v2Redirect("/sales/pre-orders", "", on)).toBe("/orders?preorder=1");
    expect(v2Redirect("/customers/abandoned", "", on)).toBe("/orders/abandoned");
    expect(v2Redirect("/finance", "", on)).toBe("/orders/invoices");
    expect(v2Redirect("/finance/links", "", on)).toBe("/orders/invoices?type=link");
    expect(v2Redirect("/finance/invoices/d1", "", on)).toBe("/orders/invoices/d1");
    // The real switches: Orders waits for its own.
    expect(v2Redirect("/sales/orders", "", { ...FLAGS_OFF, admin_v2: true })).toBeNull();
    expect(v2Redirect("/sales/orders", "", on)).toBe("/orders");
    // Off: Home's links into Orders land on the matching old tab.
    expect(v2Redirect("/orders", "view=ready", FLAGS_OFF)).toBe("/sales/orders?tab=pickups");
    expect(v2Redirect("/orders", "view=to-pack", FLAGS_OFF)).toBe("/sales/orders");
    expect(v2Redirect("/orders", "view=closed&pay=cash&q=ama", FLAGS_OFF)).toBe("/sales/orders?q=ama&tab=cancelled&payment=cash");
    expect(v2Redirect("/orders", "preorder=1&view=all", FLAGS_OFF)).toBe("/sales/pre-orders");
    expect(v2Redirect("/orders/invoices", "type=link", FLAGS_OFF)).toBe("/finance/links");
    expect(v2Redirect("/orders/invoices", "", FLAGS_OFF)).toBe("/finance/invoices");
    expect(v2Redirect("/orders/invoices/d1", "", FLAGS_OFF)).toBe("/finance/invoices/d1");
    expect(v2Redirect("/orders/abandoned", "range=30d", FLAGS_OFF)).toBe("/customers/abandoned?range=30d");
});

test("Till: /pos and its history go forward on the Till's own switch, and come back", () => {
    const on = { ...FLAGS_OFF, admin_v2: true, admin_v2_till: true };
    expect(v2Redirect("/pos", "", on)).toBe("/till");
    expect(v2Redirect("/pos", "customer=ama%40x.com", on)).toBe("/till?customer=ama%40x.com");
    expect(v2Redirect("/pos/history", "", on)).toBe("/till/today");
    // The real switches: the Till waits for its own.
    expect(v2Redirect("/pos", "", { ...FLAGS_OFF, admin_v2: true })).toBeNull();
    expect(v2Redirect("/till", "", { ...FLAGS_OFF, admin_v2: true })).toBe("/pos");
    expect(v2Redirect("/till", "", on)).toBeNull();
    expect(v2Redirect("/till/today", "", on)).toBeNull();
    // Off: links to the new Till (Customers' and Home's) land on the old one.
    expect(v2Redirect("/till", "customer=ama%40x.com", FLAGS_OFF)).toBe("/pos?customer=ama%40x.com");
    expect(v2Redirect("/till/today", "", FLAGS_OFF)).toBe("/pos/history");
});

test("Inbox: a chat link keeps working when the Inbox switch is off", () => {
    expect(v2Redirect("/inbox", "c=whatsapp:0a1b2c3d-1111-2222-3333-444455556666", FLAGS_OFF)).toBe("/customers/whatsapp?c=0a1b2c3d-1111-2222-3333-444455556666");
    expect(v2Redirect("/inbox", "c=form:9", FLAGS_OFF)).toBe("/customers/forms");
    expect(v2Redirect("/inbox", "c=request:9", FLAGS_OFF)).toBe("/customers/requests");
    expect(v2Redirect("/inbox", "f=ai", FLAGS_OFF)).toBe("/ai/inbox");
    // A bare id (old handoff links) is left as it is.
    expect(v2Redirect("/inbox", "c=0a1b2c3d", FLAGS_OFF)).toBe("/customers/whatsapp?c=0a1b2c3d");
    expect(v2Redirect("/inbox", "c=whatsapp:abc", FLAGS_ALL)).toBeNull();
});

test("shared paths are never redirected", () => {
    for (const p of ["/customers", "/customers/ama%40x.com", "/settings", "/agent", "/test-orders"]) {
        expect(v2Redirect(p, "", FLAGS_ALL, ALL)).toBeNull();
        expect(v2Redirect(p, "", FLAGS_OFF, ALL)).toBeNull();
    }
});

test("Products lives at /catalogue and waits for its own switch", () => {
    expect(v2Redirect("/catalog/products", "status=active", FLAGS_ALL, ALL)).toBe("/catalogue?status=active");
    expect(v2Redirect("/catalog/products/new", "", FLAGS_ALL, ALL)).toBe("/catalogue/new");
    expect(v2Redirect("/admin/products/new", "", FLAGS_ALL, ALL)).toBe("/catalogue/new");
    expect(v2Redirect("/catalog/products/0a1b2c3d-1111-2222-3333-444455556666/edit", "", FLAGS_ALL, ALL)).toBe("/catalogue/0a1b2c3d-1111-2222-3333-444455556666");
    expect(v2Redirect("/catalog/products/low-stock", "", FLAGS_ALL, ALL)).toBe("/catalogue/inventory?view=low");
    expect(v2Redirect("/catalog/categories", "", FLAGS_ALL, ALL)).toBe("/catalogue/categories");
    expect(v2Redirect("/admin/categories", "", FLAGS_ALL, ALL)).toBe("/catalogue/categories");
    expect(v2Redirect("/catalog/gift-cards", "", FLAGS_ALL, ALL)).toBe("/catalogue/gift-cards");
    // Built, so the real switch moves them, but only admin_v2_products does.
    const v2Only = { ...FLAGS_OFF, admin_v2: true };
    expect(v2Redirect("/catalog/products", "", v2Only)).toBeNull();
    expect(v2Redirect("/catalog/gift-cards", "", v2Only)).toBeNull();
    expect(v2Redirect("/catalogue", "", v2Only)).toBe("/catalog/products");
    expect(v2Redirect("/catalog/products", "", { ...v2Only, admin_v2_products: true })).toBe("/catalogue");
    // Switched off, every new address goes back.
    expect(v2Redirect("/catalogue/inventory", "view=low", FLAGS_OFF)).toBe("/catalog/products/low-stock");
    expect(v2Redirect("/catalogue/0a1b2c3d-1111-2222-3333-444455556666", "", FLAGS_OFF)).toBe("/catalog/products/0a1b2c3d-1111-2222-3333-444455556666/edit");
    expect(v2Redirect("/catalogue/categories", "", FLAGS_OFF)).toBe("/catalog/categories");
    expect(v2Redirect("/catalogue/gift-cards", "", FLAGS_OFF)).toBe("/catalog/gift-cards");
    expect(v2Redirect("/catalogue/new", "", FLAGS_OFF)).toBe("/catalog/products/new");
    expect(v2Redirect("/catalogue", "view=low", FLAGS_ALL)).toBeNull();
});

test("no redirect ever loops", () => {
    const paths = ["/overview", "/home", "/sales/orders", "/orders", "/orders/abandoned", "/pos", "/till", "/catalogue", "/catalog/products", "/team", "/staff", "/cms", "/content",
        "/catalog/discounts", "/catalog/auto-discounts", "/discounts", "/discounts/abc",
        "/sales/analytics", "/analytics", "/sales/payments", "/sales/riders", "/sales/riders/r9", "/analytics/reports/payments",
        "/catalog/products/new", "/catalogue/new", "/catalog/products/p1/edit", "/catalogue/p1", "/catalog/products/low-stock", "/catalogue/inventory",
        "/catalog/categories", "/catalogue/categories", "/admin/categories", "/catalog/gift-cards", "/catalogue/gift-cards", "/admin/products/new",
        "/sales/pre-orders", "/customers/abandoned", "/finance", "/finance/links", "/finance/invoices", "/finance/invoices/d1",
        "/orders/invoices", "/orders/invoices/d1", "/orders/0a1b2c3d-1111-2222-3333-444455556666", "/sales/orders/0a1b2c3d-1111-2222-3333-444455556666",
        "/inbox", "/customers/whatsapp", "/pos/history", "/till/today"];
    for (const flags of [FLAGS_ALL, FLAGS_OFF, { ...FLAGS_OFF, admin_v2: true }, { ...FLAGS_OFF, admin_v2: true, admin_v2_products: true }, { ...FLAGS_OFF, admin_v2: true, admin_v2_orders: true }, { ...FLAGS_OFF, admin_v2: true, admin_v2_till: true }]) {
        for (const p of paths) {
            const once = v2Redirect(p, "", flags, ALL);
            if (!once) continue;
            const [to, q] = once.split("?");
            expect(v2Redirect(to, q ?? "", flags, ALL), `${p} → ${once}`).toBeNull();
        }
    }
    const withQuery: [string, string][] = [["/orders", "preorder=1"], ["/orders", "view=ready&pay=cash"], ["/orders/invoices", "type=link"],
        ["/inbox", "c=whatsapp:abc"], ["/inbox", "c=form:1"], ["/sales/orders", "tab=pickups"], ["/finance/links", ""],
        ["/till", "customer=ama%40x.com"], ["/pos", "customer=ama%40x.com"]];
    for (const flags of [FLAGS_ALL, FLAGS_OFF, { ...FLAGS_OFF, admin_v2: true }, { ...FLAGS_OFF, admin_v2: true, admin_v2_till: true }]) {
        for (const [p, qs] of withQuery) {
            const once = v2Redirect(p, qs, flags, ALL);
            if (!once) continue;
            const [to, q] = once.split("?");
            expect(v2Redirect(to, q ?? "", flags, ALL), `${p}?${qs} → ${once}`).toBeNull();
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
