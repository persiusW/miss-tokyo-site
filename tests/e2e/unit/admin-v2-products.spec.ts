import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
    baselineOf, cleanAdjust, combos, emptyProductForm, firstErrorTab, formFromProduct, historyLine, marginPct, optionText, parseInventoryQuery,
    parseProductQuery, planAdjust, productIdFromPath, productPayload, profitText, querySearch, reasonText, salePrice, slugify, statusOf, stockCell,
    stockCsv, validateProductForm, weeksFromDate, weeksToDate,
    type HistoryRow, type ProductDetail,
} from "../../../src/lib/admin/v2/catalogue";

// Admin v2 Products (/catalogue): list URL state, the stock cell, margin (gap
// 7), stock-adjust planning (gap 9), stock history wording (gap 10) and what
// the product panel saves. Pure: no database.

const ROOT = path.resolve(__dirname, "../../..");
const NOW = new Date("2026-10-21T12:00:00Z");

test("list views come from ?view=, and the old ?status= / ?stock= still land on a chip", () => {
    expect(parseProductQuery({ view: "nophoto" })).toEqual({ view: "nophoto", q: "", page: 1 });
    expect(parseProductQuery({ stock: "low" }).view).toBe("low");
    expect(parseProductQuery({ stock: "out" }).view).toBe("out");
    expect(parseProductQuery({ status: "inactive" }).view).toBe("draft");
    expect(parseProductQuery({ status: "preorder" }).view).toBe("preorder");
    expect(parseProductQuery({ view: "bogus", page: "-4" })).toEqual({ view: "all", q: "", page: 1 });
    expect(parseInventoryQuery({ view: "low", q: " dress " })).toEqual({ view: "low", q: "dress", page: 1 });
    expect(querySearch({ view: "all", q: "", page: 1 })).toBe("");
    expect(querySearch({ view: "low", q: "silk", page: 1 }, { page: 2 })).toBe("?view=low&q=silk&page=2");
});

test("the panel's address: /catalogue/<id>, never a tab or new", () => {
    expect(productIdFromPath("/catalogue/7b1c0a3e-1111-2222-3333-444455556666")).toBe("7b1c0a3e-1111-2222-3333-444455556666");
    for (const p of ["/catalogue", "/catalogue/new", "/catalogue/inventory", "/catalogue/categories", "/catalogue/gift-cards", "/catalogue/x/y"]) {
        expect(productIdFromPath(p)).toBeNull();
    }
});

test("status: archived needs archived_at and switched off", () => {
    expect(statusOf({ is_active: true, archived_at: null })).toBe("active");
    expect(statusOf({ is_active: true, archived_at: "2026-10-01" })).toBe("active");
    expect(statusOf({ is_active: false, archived_at: null })).toBe("draft");
    expect(statusOf({ is_active: false, archived_at: "2026-10-01" })).toBe("archived");
});

test("stock cell says what's left, what's sold out and pre-orders", () => {
    const base = { preorder_enabled: false, preorder_estimated_date: null, tracked: true, stock_total: 12, options: 4, options_out: 0, options_low: 0 };
    expect(stockCell(base, NOW)).toEqual({ main: "12 in stock", sub: "across 4 options", tone: null });
    expect(stockCell({ ...base, options_out: 1, options_low: 2 }, NOW)).toEqual({ main: "12 in stock", sub: "1 sold out · 2 low", tone: "warn" });
    expect(stockCell({ ...base, stock_total: 0 }, NOW).main).toBe("Sold out");
    expect(stockCell({ ...base, tracked: false }, NOW).main).toBe("Not tracked");
    expect(stockCell({ ...base, preorder_enabled: true, preorder_estimated_date: weeksToDate(3, NOW) }, NOW).main).toBe("Pre-order · 3 weeks");
    expect(stockCell({ ...base, options: 1 }, NOW).sub).toBeNull();
});

test("pre-order weeks round-trip through the date column", () => {
    expect(weeksToDate(2, NOW)).toBe("2026-11-04");
    expect(weeksFromDate("2026-11-04", NOW)).toBe(2);
    expect(weeksFromDate("2026-10-01", NOW)).toBe(1);
    expect(weeksFromDate(null, NOW)).toBeNull();
});

test("margin and the old On sale price (gap 7)", () => {
    expect(marginPct(400, 160)).toBe(60);
    expect(marginPct(400, "")).toBeNull();
    expect(marginPct(400, null)).toBeNull();
    expect(marginPct(0, 10)).toBeNull();
    expect(marginPct(100, 130)).toBe(-30);
    expect(profitText(400, 160)).toBe("GH₵ 240.00 profit on each sale");
    expect(profitText(100, 130)).toBe("GH₵ 30.00 lost on each sale");
    expect(salePrice(300, 20)).toBe(240);
    expect(salePrice(300, 0)).toBeNull();
});

test("adjust plan matches fn_stock_adjust: never more off than is there (gap 9)", () => {
    expect(planAdjust("restock", 3, 6)).toEqual({ delta: 6, after: 9 });
    expect(planAdjust("stock_count", 6, 4)).toEqual({ delta: -2, after: 4 });
    expect(planAdjust("stock_count", 2, 2)).toEqual({ delta: 0, after: 2 });
    expect(planAdjust("write_off", 1, 5)).toEqual({ delta: -1, after: 0 });
    expect(planAdjust("correction", 2, -5)).toEqual({ delta: -2, after: 0 });
    expect(planAdjust("correction", 2, 3)).toEqual({ delta: 3, after: 5 });
});

test("an adjust request is checked before it reaches the database", () => {
    const pid = "7b1c0a3e-1111-2222-3333-444455556666";
    const ok = cleanAdjust({ product_id: pid, variant_id: null, reason: "stock_count", counted: 0, idempotency_key: "k-12345678" });
    expect(ok).toEqual({ product_id: pid, variant_id: null, reason: "stock_count", quantity: 0, note: null, key: "adjust:k-12345678" });
    expect(cleanAdjust({ product_id: pid, reason: "write_off", quantity: 2, note: "  Zip broke ", idempotency_key: "k-12345678" })?.note).toBe("Zip broke");
    expect(cleanAdjust({ product_id: pid, reason: "restock", quantity: -1, idempotency_key: "k-12345678" })).toBeNull();
    expect(cleanAdjust({ product_id: pid, reason: "restock", quantity: 0, idempotency_key: "k-12345678" })).toBeNull();
    expect(cleanAdjust({ product_id: pid, reason: "correction", quantity: -2, idempotency_key: "k-12345678" })?.quantity).toBe(-2);
    expect(cleanAdjust({ product_id: pid, reason: "sale", quantity: 1, idempotency_key: "k-12345678" })).toBeNull();
    expect(cleanAdjust({ product_id: "x", reason: "restock", quantity: 1, idempotency_key: "k-12345678" })).toBeNull();
    expect(cleanAdjust({ product_id: pid, reason: "restock", quantity: 1, idempotency_key: "short" })).toBeNull();
    expect(cleanAdjust({ product_id: pid, reason: "restock", quantity: 1.5, idempotency_key: "k-12345678" })).toBeNull();
});

test("stock history reads in plain words (gap 10)", () => {
    const row = (o: Partial<HistoryRow>): HistoryRow => ({
        id: "m1", created_at: "2026-10-21T11:21:00Z", reason: "sale", delta: -1, applied_delta: -1, note: null, variant_id: "v1",
        size: "M", color: "Pink", brand: null, order_id: "o1", order_ref: "MT-4830", customer_name: "Ama Owusu", actor_name: null, ...o,
    });
    expect(historyLine(row({}))).toEqual({ title: "Sold", sub: "M / Pink · Order MT-4830 · Ama Owusu", qty: "−1", up: false });
    expect(historyLine(row({ reason: "reversal", delta: 1, applied_delta: 1, note: "paid -> cancelled by cd0fdae3-1f3c-4e03-bccb-d15bb10c3dd1" })).sub).toBe("M / Pink · Order MT-4830 · Ama Owusu");
    expect(historyLine(row({ reason: "restock", delta: 6, applied_delta: 6, order_id: null, order_ref: null, actor_name: "Maame Serwaa", note: "From the workshop" })))
        .toEqual({ title: "Restocked", sub: "M / Pink · Maame Serwaa · “From the workshop”", qty: "+6", up: true });
    expect(historyLine(row({ reason: "admin_adjust", delta: -3, applied_delta: -1, order_id: null, order_ref: null })).sub).toContain("asked for −3");
    expect(reasonText("write_off")).toBe("Written off");
    expect(reasonText("stock_count")).toBe("Counted");
    expect(reasonText("sync")).toBe("Total rebuilt from sizes");
    expect(reasonText("something_new")).toBe("Stock changed");
    expect(optionText({ size: "38", color: null, brand: "Coach" })).toBe("38 / Coach");
});

const detail = (o: Partial<ProductDetail> = {}): ProductDetail => ({
    id: "7b1c0a3e-1111-2222-3333-444455556666", name: "Pink Off Shoulder Dress", slug: "pink-off-shoulder-dress", sku: "MT-DR-040", description: "Silk",
    category_type: "Dresses", category_ids: ["c1"], image_urls: ["https://x/a.jpg"], available_sizes: ["S", "M"], available_colors: ["Pink"], available_brands: [],
    track_inventory: true, track_variant_inventory: true, inventory_count: 5, price_ghs: 450, compare_at_price_ghs: 520, is_sale: false, discount_value: 0,
    wholesale_override: false, wholesale_price_tier_1: null, wholesale_price_tier_2: null, wholesale_price_tier_3: null,
    is_active: true, archived_at: null, preorder_enabled: false, preorder_estimated_date: null, is_wholesale_only: false, low_stock_at: 2, ...o,
});
const variants = [
    { id: "v1", size: "S", color: "Pink", brand: null, sku: "MT-DR-040-S", inventory_count: 2 },
    { id: "v2", size: "M", color: "Pink", brand: null, sku: "MT-DR-040-M", inventory_count: 3 },
];

test("the panel loads every saved field, and posts stock as a difference from what it loaded", () => {
    const f = formFromProduct(detail(), variants, [{ variant_id: null, cost_ghs: 180 }, { variant_id: "v2", cost_ghs: 200 }], NOW);
    expect(f.variants["S||Pink||"]).toEqual({ sku: "MT-DR-040-S", stock: "2", cost: "" });
    expect(f.variants["M||Pink||"]).toEqual({ sku: "MT-DR-040-M", stock: "3", cost: "200" });
    expect(f.cost).toBe("180");
    expect(f.status).toBe("active");
    expect(combos(f).map(c => c.key)).toEqual(["S||Pink||", "M||Pink||"]);

    const base = baselineOf(detail(), variants);
    f.variants["S||Pink||"].stock = "5";
    const body = productPayload(f, base, { id: "p1", withCost: true, now: NOW }) as any;
    expect(body.variants).toEqual([
        { size: "S", color: "Pink", brand: null, sku: "MT-DR-040-S", inventory_count: 5, baseline: 2 },
        { size: "M", color: "Pink", brand: null, sku: "MT-DR-040-M", inventory_count: 3, baseline: 3 },
    ]);
    expect(body.inventory_count).toBe(9999);
    expect(body.costs).toEqual({ product: 180, variants: [{ size: "S", color: "Pink", brand: null, cost: null }, { size: "M", color: "Pink", brand: null, cost: 200 }] });
    expect(body.status).toBe("active");
    expect(body.is_active).toBe(true);

    // Sales staff: no cost leaves the browser at all.
    expect("costs" in productPayload(f, base, { id: "p1", withCost: false, now: NOW })).toBe(false);
    // Without a cost the panel never invents one.
    expect(formFromProduct(detail(), variants, null, NOW).cost).toBe("");
});

test("a new product starts as a draft and posts no baseline", () => {
    const f = { ...emptyProductForm(), name: "Silk Scarf", price: "120", stock: "4" };
    const body = productPayload(f, baselineOf(null, []), { withCost: false, now: NOW }) as any;
    expect(body.slug).toBe("silk-scarf");
    expect(body.status).toBe("draft");
    expect(body.is_active).toBe(false);
    expect(body.inventory_count).toBe(4);
    expect("inventory_baseline" in body).toBe(false);
    expect(body.variants).toBeUndefined();
    expect(body.preorder_estimated_date).toBeNull();
    expect(body.low_stock_at).toBe(2);
    const pre = productPayload({ ...f, preorder: true, preorderWeeks: "2" }, baselineOf(null, []), { withCost: false, now: NOW }) as any;
    expect(pre.preorder_estimated_date).toBe("2026-11-04");
});

test("validation sends you to the tab with the problem", () => {
    const e = validateProductForm({ ...emptyProductForm(), name: "", price: "" });
    expect(e.name).toBeTruthy();
    expect(e.price).toBeTruthy();
    expect(firstErrorTab(e)).toBe("details");
    const s = validateProductForm({ ...emptyProductForm(), name: "Scarf", price: "120", stock: "two" });
    expect(firstErrorTab(s)).toBe("stock");
    const v = validateProductForm({ ...emptyProductForm(), name: "Scarf", price: "120", preorder: true, preorderWeeks: "0" });
    expect(firstErrorTab(v)).toBe("visibility");
    expect(validateProductForm({ ...emptyProductForm(), name: "Scarf", price: "120", isSale: true, discount: "120" }).discount).toBeTruthy();
    expect(Object.keys(validateProductForm({ ...emptyProductForm(), name: "Scarf", price: "120.50" }))).toEqual([]);
});

test("slugs and the stock export", () => {
    expect(slugify("Café Noir — Slides 02")).toBe("cafe-noir-slides-02");
    const csv = stockCsv([{ product_name: "Pink, Dress", sku: "=1+1", size: "M", color: null, brand: null, inventory_count: 2, low_stock_at: 2, state: "low" }]);
    expect(csv.startsWith("﻿Product,SKU,Size,Colour,Brand,In stock,Warn at,Status\r\n")).toBe(true);
    expect(csv).toContain('"Pink, Dress",\'=1+1,M,,,2,2,Running low');
});

test("cost never reaches the storefront: only admin Products code reads product_costs", () => {
    const allowed = new Set([
        "src/app/api/admin/products/route.ts",
        "src/lib/admin/v2/catalogueLoad.ts",
        "src/components/admin/v2/catalogue/actions.ts",
    ]);
    const hits: string[] = [];
    const walk = (d: string) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else if (/\.(ts|tsx)$/.test(e.name) && fs.readFileSync(p, "utf8").includes("product_costs")) hits.push(path.relative(ROOT, p));
        }
    };
    walk(path.join(ROOT, "src"));
    expect(hits.filter(h => !allowed.has(h) && !h.startsWith("src/types/"))).toEqual([]);
    // The table is service-role only: RLS on, nothing granted to anon or authenticated.
    const sql = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261022091000_product_costs.sql"), "utf8");
    expect(sql).toContain("enable row level security");
    expect(sql).toMatch(/revoke all on table public\.product_costs from public, anon, authenticated/);
    expect(sql).not.toMatch(/create policy/i);
});
