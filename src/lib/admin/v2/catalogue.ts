// Products (admin v2, /catalogue): list views and their URL, the stock cell,
// margin, the product form ↔ save payload, stock-adjust planning and the
// stock history wording. Pure: no database, safe for client and server.
//
// Nothing here moves stock. The panel and Inventory › Adjust send what the
// staff member typed; the route and fn_stock_adjust apply it through the
// ledger. The rules for Low stock / Sold out mirror fn_admin_product_rows and
// fn_inventory_rows (migration 20261022094000), which mirror
// fn_low_stock_variants, so Home, Products and Inventory agree.
import { ghs, plural } from "@/components/admin/ui/format";

export const NOT_TRACKED = 9999;
export const PAGE_SIZE = 50;

// ── List views ─────────────────────────────────────────────────────────────

export type ProductView = "all" | "active" | "draft" | "low" | "out" | "nophoto" | "preorder" | "archived";
export const PRODUCT_VIEWS: { v: ProductView; l: string }[] = [
    { v: "all", l: "All" }, { v: "active", l: "Active" }, { v: "draft", l: "Draft" }, { v: "low", l: "Low stock" },
    { v: "out", l: "Sold out" }, { v: "nophoto", l: "No photo" }, { v: "preorder", l: "Pre-order" }, { v: "archived", l: "Archived" },
];
export type ProductCounts = Record<ProductView, number>;

export type InventoryView = "all" | "low" | "out";
export const INVENTORY_VIEWS: { v: InventoryView; l: string }[] = [
    { v: "all", l: "All" }, { v: "low", l: "Running low" }, { v: "out", l: "Sold out" },
];

type SP = Record<string, string | string[] | undefined>;
const get = (sp: SP, k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) ?? ""; };

export type ListQuery = { view: ProductView; q: string; page: number };
export type InventoryQuery = { view: InventoryView; q: string; page: number };

/** The old list's ?status= and ?stock= still land on the matching chip. */
export function parseProductQuery(sp: SP): ListQuery {
    let view = get(sp, "view") as ProductView;
    if (!PRODUCT_VIEWS.some(x => x.v === view)) {
        const status = get(sp, "status"), stock = get(sp, "stock");
        view = stock === "low" ? "low" : stock === "out" ? "out" : status === "active" ? "active" : status === "inactive" ? "draft" : status === "preorder" ? "preorder" : "all";
    }
    return { view, q: get(sp, "q").trim().slice(0, 80), page: Math.max(1, Math.min(1000, Number(get(sp, "page")) || 1)) };
}

export function parseInventoryQuery(sp: SP): InventoryQuery {
    const view = get(sp, "view") as InventoryView;
    return {
        view: INVENTORY_VIEWS.some(x => x.v === view) ? view : "all",
        q: get(sp, "q").trim().slice(0, 80),
        page: Math.max(1, Math.min(1000, Number(get(sp, "page")) || 1)),
    };
}

/** "?view=low&q=dress&page=2", leaving defaults out. */
export function querySearch(q: { view: string; q: string; page: number }, patch: Partial<{ view: string; q: string; page: number }> = {}): string {
    const m = { ...q, ...patch };
    const p = new URLSearchParams();
    if (m.view !== "all") p.set("view", m.view);
    if (m.q.trim()) p.set("q", m.q.trim());
    if (m.page > 1) p.set("page", String(m.page));
    const s = p.toString();
    return s ? `?${s}` : "";
}

/** /catalogue/<id> → the id; /catalogue, /catalogue/new and the tabs → null. */
export function productIdFromPath(pathname: string): string | null {
    const m = /^\/catalogue\/([^/?#]+)$/.exec(pathname);
    if (!m) return null;
    const id = decodeURIComponent(m[1]);
    return ["new", "inventory", "categories", "gift-cards"].includes(id) ? null : id;
}

// ── One product row (fn_admin_product_rows) ────────────────────────────────

export type ProductStatus = "active" | "draft" | "archived";
export type ProductRow = {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    category_type: string | null;
    category_ids: string[] | null;
    price_ghs: number | string;
    compare_at_price_ghs: number | string | null;
    is_active: boolean;
    archived_at: string | null;
    status: ProductStatus;
    created_at: string | null;
    track_inventory: boolean | null;
    track_variant_inventory: boolean | null;
    preorder_enabled: boolean;
    preorder_estimated_date: string | null;
    low_stock_at: number;
    thumb: string | null;
    photos: number;
    tracked: boolean;
    stock_total: number;
    options: number;
    options_out: number;
    options_low: number;
    view_low: boolean;
    view_out: boolean;
};

export const STATUS_BADGE: Record<ProductStatus, [string, "ok" | "neutral"]> = {
    active: ["Active", "ok"], draft: ["Draft", "neutral"], archived: ["Archived", "neutral"],
};

/** Status from the two columns: archived needs archived_at AND not active. */
export function statusOf(p: { is_active: boolean | null; archived_at: string | null }): ProductStatus {
    if (p.is_active) return "active";
    return p.archived_at ? "archived" : "draft";
}

/** Whole weeks from today until a pre-order date, at least 1. */
export function weeksFromDate(date: string | null, now = new Date()): number | null {
    if (!date) return null;
    const t = new Date(date).getTime();
    if (Number.isNaN(t)) return null;
    return Math.max(1, Math.round((t - now.getTime()) / (7 * 86_400_000)));
}

/** The date N weeks from today, as the date column stores it. */
export function weeksToDate(weeks: number, now = new Date()): string {
    const d = new Date(now.getTime() + weeks * 7 * 86_400_000);
    return d.toISOString().slice(0, 10);
}

export type StockCell = { main: string; sub: string | null; tone: "danger" | "warn" | "muted" | null };

/** The Stock column: "12 in stock / across 4 options", "2 sold out · 1 low", "Pre-order · 3 weeks", "Sold out". */
export function stockCell(p: Pick<ProductRow, "preorder_enabled" | "preorder_estimated_date" | "tracked" | "stock_total" | "options" | "options_out" | "options_low">, now = new Date()): StockCell {
    if (p.preorder_enabled) {
        const w = weeksFromDate(p.preorder_estimated_date, now);
        return { main: w ? `Pre-order · ${plural(w, "week")}` : "Pre-order", sub: null, tone: "muted" };
    }
    if (!p.tracked) return { main: "Not tracked", sub: "Always available", tone: "muted" };
    if (p.stock_total <= 0) return { main: "Sold out", sub: null, tone: "danger" };
    const main = `${p.stock_total.toLocaleString("en-GB")} in stock`;
    const parts = [p.options_out ? `${p.options_out} sold out` : "", p.options_low ? `${p.options_low} low` : ""].filter(Boolean);
    if (parts.length) return { main, sub: parts.join(" · "), tone: "warn" };
    return { main, sub: p.options > 1 ? `across ${plural(p.options, "option")}` : null, tone: null };
}

/** Margin on the selling price, whole percent. Null without a usable price and cost. */
export function marginPct(price: number | string | null | undefined, cost: number | string | null | undefined): number | null {
    const p = Number(price), c = Number(cost);
    if (cost == null || cost === "" || !Number.isFinite(p) || !Number.isFinite(c) || p <= 0 || c < 0) return null;
    return Math.round((1 - c / p) * 100);
}

/** "GH₵ 120.00 profit on each sale" / "GH₵ 15.00 lost on each sale". */
export function profitText(price: number | string, cost: number | string): string {
    const d = Number(price) - Number(cost);
    return d >= 0 ? `${ghs(d)} profit on each sale` : `${ghs(-d)} lost on each sale`;
}

/** What customers pay with the old "On sale" discount: price less the %, as the shop computes it. */
export function salePrice(price: number | string, pct: number | string): number | null {
    const p = Number(price), d = Number(pct);
    if (!Number.isFinite(p) || !Number.isFinite(d) || d <= 0 || d >= 100) return null;
    return Math.round(p * (1 - d / 100) * 100) / 100;
}

export function slugify(s: string): string {
    return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 120);
}

/** "M / Pink / Coach", or "" for a product's own figure. */
export function optionText(o: { size?: string | null; color?: string | null; brand?: string | null }): string {
    return [o.size, o.color, o.brand].map(x => (x ?? "").trim()).filter(Boolean).join(" / ");
}

// ── Product form ───────────────────────────────────────────────────────────

export type VariantCell = { sku: string; stock: string; cost: string };
export type ProductForm = {
    name: string;
    slug: string;
    sku: string;
    description: string;
    categoryType: string;
    categoryIds: string[];
    imageUrls: string[];
    sizes: string[];
    colors: string[];
    brands: string[];
    trackInventory: boolean;
    trackVariants: boolean;
    stock: string;
    variants: Record<string, VariantCell>;
    price: string;
    compare: string;
    isSale: boolean;
    discount: string;
    cost: string;
    wholesaleOverride: boolean;
    tier1: string;
    tier2: string;
    tier3: string;
    status: ProductStatus;
    preorder: boolean;
    preorderWeeks: string;
    wholesaleOnly: boolean;
    lowStockAt: string;
};

export type ProductDetail = {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    description: string | null;
    category_type: string | null;
    category_ids: string[] | null;
    image_urls: string[] | null;
    available_sizes: string[] | null;
    available_colors: string[] | null;
    available_brands: string[] | null;
    track_inventory: boolean | null;
    track_variant_inventory: boolean | null;
    inventory_count: number | null;
    price_ghs: number | string;
    compare_at_price_ghs: number | string | null;
    is_sale: boolean | null;
    discount_value: number | string | null;
    wholesale_override: boolean | null;
    wholesale_price_tier_1: number | string | null;
    wholesale_price_tier_2: number | string | null;
    wholesale_price_tier_3: number | string | null;
    is_active: boolean | null;
    archived_at: string | null;
    preorder_enabled: boolean | null;
    preorder_estimated_date: string | null;
    is_wholesale_only: boolean | null;
    low_stock_at: number | null;
};
export type VariantRow = { id: string; size: string | null; color: string | null; brand: string | null; sku: string | null; inventory_count: number | null };
/** Costs, only ever loaded for owners and admins. variant_id null = the product's. */
export type CostRow = { variant_id: string | null; cost_ghs: number | string };

export const comboKey = (s: string | null | undefined, c: string | null | undefined, b: string | null | undefined) => `${s ?? ""}||${c ?? ""}||${b ?? ""}`;

export type Combo = { size: string; color: string; brand: string; key: string };

/** Every size × colour × brand the product is offered in (an empty dimension is left out). */
export function combos(f: Pick<ProductForm, "sizes" | "colors" | "brands">): Combo[] {
    const ss = f.sizes.length ? f.sizes : [""];
    const cc = f.colors.length ? f.colors : [""];
    const bb = f.brands.length ? f.brands : [""];
    const out: Combo[] = [];
    for (const s of ss) for (const c of cc) for (const b of bb) out.push({ size: s, color: c, brand: b, key: comboKey(s, c, b) });
    return out;
}

const s = (v: unknown) => (v == null ? "" : String(v));
const money = (v: unknown) => (v == null || v === "" ? "" : String(Number(v)));

export function emptyProductForm(): ProductForm {
    return {
        name: "", slug: "", sku: "", description: "", categoryType: "", categoryIds: [], imageUrls: [],
        sizes: [], colors: [], brands: [], trackInventory: true, trackVariants: false, stock: "0", variants: {},
        price: "", compare: "", isSale: false, discount: "", cost: "",
        wholesaleOverride: false, tier1: "", tier2: "", tier3: "",
        status: "draft", preorder: false, preorderWeeks: "3", wholesaleOnly: false, lowStockAt: "2",
    };
}

/** The panel's form for a saved product. Costs are passed only to owners and admins. */
export function formFromProduct(p: ProductDetail, variants: VariantRow[], costs: CostRow[] | null, now = new Date()): ProductForm {
    const productCost = costs?.find(c => c.variant_id == null);
    const costByVariant = new Map((costs ?? []).filter(c => c.variant_id).map(c => [c.variant_id as string, money(c.cost_ghs)]));
    const cells: Record<string, VariantCell> = {};
    for (const v of variants) {
        const k = comboKey(v.size, v.color, v.brand);
        if (cells[k]) continue; // duplicate rows exist in production; the first one wins, as in the route
        cells[k] = { sku: s(v.sku), stock: String(v.inventory_count ?? 0), cost: costByVariant.get(v.id) ?? "" };
    }
    const tracked = p.track_inventory !== false;
    return {
        name: s(p.name), slug: s(p.slug), sku: s(p.sku), description: s(p.description),
        categoryType: s(p.category_type), categoryIds: [...(p.category_ids ?? [])], imageUrls: [...(p.image_urls ?? [])],
        sizes: [...(p.available_sizes ?? [])], colors: [...(p.available_colors ?? [])], brands: [...(p.available_brands ?? [])],
        trackInventory: tracked, trackVariants: tracked && p.track_variant_inventory === true,
        stock: String(tracked && p.inventory_count !== NOT_TRACKED ? p.inventory_count ?? 0 : 0),
        variants: cells,
        price: money(p.price_ghs), compare: money(p.compare_at_price_ghs),
        isSale: p.is_sale === true, discount: p.is_sale ? money(p.discount_value) : "",
        cost: productCost ? money(productCost.cost_ghs) : "",
        wholesaleOverride: p.wholesale_override === true,
        tier1: money(p.wholesale_price_tier_1), tier2: money(p.wholesale_price_tier_2), tier3: money(p.wholesale_price_tier_3),
        status: statusOf(p as { is_active: boolean | null; archived_at: string | null }),
        preorder: p.preorder_enabled === true,
        preorderWeeks: String(weeksFromDate(p.preorder_estimated_date, now) ?? 3),
        wholesaleOnly: p.is_wholesale_only === true,
        lowStockAt: String(p.low_stock_at ?? 2),
    };
}

export type FormErrors = Partial<Record<"name" | "slug" | "price" | "compare" | "discount" | "cost" | "stock" | "preorderWeeks" | "lowStockAt" | "tiers", string>>;
export type PanelTab = "details" | "stock" | "pricing" | "visibility";
export const ERROR_TAB: Record<keyof FormErrors, PanelTab> = {
    name: "details", slug: "details", price: "pricing", compare: "pricing", discount: "pricing", cost: "pricing", tiers: "pricing",
    stock: "stock", lowStockAt: "stock", preorderWeeks: "visibility",
};

const isWhole = (v: string) => /^\d+$/.test(v.trim());
const isMoney = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());

export function validateProductForm(f: ProductForm): FormErrors {
    const e: FormErrors = {};
    if (!f.name.trim()) e.name = "Give the product a name customers will recognise.";
    if (!slugify(f.slug || f.name)) e.slug = "Add a web address, using letters and numbers.";
    if (!isMoney(f.price) || Number(f.price) <= 0) e.price = "Enter the price customers pay.";
    if (f.compare.trim() && !isMoney(f.compare)) e.compare = "Enter an amount, or leave it empty.";
    if (f.isSale && (!isMoney(f.discount) || Number(f.discount) <= 0 || Number(f.discount) >= 100)) e.discount = "Enter a percentage between 1 and 99.";
    if (f.cost.trim() && !isMoney(f.cost)) e.cost = "Enter an amount, or leave it empty.";
    for (const t of [f.tier1, f.tier2, f.tier3]) if (f.wholesaleOverride && t.trim() && !isMoney(t)) e.tiers = "Enter each wholesale price as an amount, or leave it empty.";
    if (f.trackInventory) {
        if (f.trackVariants) {
            const bad = combos(f).some(c => { const v = f.variants[c.key]; return v && v.stock.trim() !== "" && !isWhole(v.stock); });
            const badCost = combos(f).some(c => { const v = f.variants[c.key]; return v && v.cost.trim() !== "" && !isMoney(v.cost); });
            if (bad) e.stock = "Stock is a whole number, 0 or more.";
            if (badCost) e.cost = "Enter each size's cost as an amount, or leave it empty.";
        } else if (!isWhole(f.stock)) e.stock = "Stock is a whole number, 0 or more.";
    }
    if (!isWhole(f.lowStockAt) || Number(f.lowStockAt) > 1000) e.lowStockAt = "Choose a number from 0 to 1,000.";
    if (f.preorder && (!isWhole(f.preorderWeeks) || Number(f.preorderWeeks) < 1 || Number(f.preorderWeeks) > 52)) e.preorderWeeks = "Choose between 1 and 52 weeks.";
    return e;
}

/** The first tab with an error, in tab order. */
export function firstErrorTab(e: FormErrors): PanelTab | null {
    const order: PanelTab[] = ["details", "stock", "pricing", "visibility"];
    const tabs = new Set((Object.keys(e) as (keyof FormErrors)[]).map(k => ERROR_TAB[k]));
    return order.find(t => tabs.has(t)) ?? null;
}

export type Baseline = { stock: number; variants: Record<string, number> };

export function baselineOf(p: ProductDetail | null, variants: VariantRow[]): Baseline {
    const b: Record<string, number> = {};
    for (const v of variants) { const k = comboKey(v.size, v.color, v.brand); if (!(k in b)) b[k] = v.inventory_count ?? 0; }
    return { stock: Number(p?.inventory_count ?? 0), variants: b };
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/**
 * What the panel posts to /api/admin/products, in the shape the old forms
 * posted (the route is shared), plus the new admin's fields. Stock goes with
 * the numbers the panel loaded (baseline) so the route applies only the
 * difference through the ledger; a sale that lands while the panel is open
 * survives the save. Costs are sent only when the person may see them.
 */
export function productPayload(f: ProductForm, base: Baseline, opts: { id?: string; withCost: boolean; now?: Date }) {
    const variantTracked = f.trackInventory && f.trackVariants;
    const list = combos(f);
    const body: Record<string, unknown> = {
        ...(opts.id ? { id: opts.id } : {}),
        name: f.name.trim(),
        slug: slugify(f.slug || f.name),
        sku: f.sku.trim() || null,
        price_ghs: Number(f.price),
        compare_at_price_ghs: f.compare.trim() ? Number(f.compare) : null,
        is_sale: f.isSale,
        discount_value: f.isSale ? Number(f.discount) || 0 : 0,
        inventory_count: f.trackInventory && !f.trackVariants ? Number(f.stock) || 0 : NOT_TRACKED,
        ...(opts.id ? { inventory_baseline: base.stock } : {}),
        track_inventory: f.trackInventory,
        track_variant_inventory: variantTracked,
        description: f.description,
        category_type: f.categoryType,
        category_ids: f.categoryIds,
        image_urls: f.imageUrls,
        available_sizes: f.sizes,
        available_colors: f.colors,
        available_brands: f.brands,
        wholesale_override: f.wholesaleOverride,
        wholesale_price_tier_1: f.wholesaleOverride ? num(f.tier1) : null,
        wholesale_price_tier_2: f.wholesaleOverride ? num(f.tier2) : null,
        wholesale_price_tier_3: f.wholesaleOverride ? num(f.tier3) : null,
        status: f.status,
        is_active: f.status === "active",
        preorder_enabled: f.preorder,
        preorder_estimated_date: f.preorder ? weeksToDate(Number(f.preorderWeeks) || 1, opts.now) : null,
        is_wholesale_only: f.wholesaleOnly,
        low_stock_at: Number(f.lowStockAt) || 0,
        variants: variantTracked && list.length > 0
            ? list.map(c => ({
                size: c.size || null, color: c.color || null, brand: c.brand || null,
                sku: f.variants[c.key]?.sku.trim() || null,
                inventory_count: Number(f.variants[c.key]?.stock) || 0,
                ...(opts.id ? { baseline: base.variants[c.key] ?? 0 } : {}),
            }))
            : undefined,
    };
    if (opts.withCost) {
        body.costs = {
            product: num(f.cost),
            variants: variantTracked
                ? list.map(c => ({ size: c.size || null, color: c.color || null, brand: c.brand || null, cost: num(f.variants[c.key]?.cost ?? "") }))
                : [],
        };
    }
    return body;
}

/** Which form fields changed, for "N unsaved changes" and the leave guard. */
export function changedCount(a: ProductForm, b: ProductForm): number {
    let n = 0;
    for (const k of Object.keys(a) as (keyof ProductForm)[]) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) n++;
    return n;
}

// ── Inventory › Adjust (BACKEND_GAPS 9) ────────────────────────────────────

export type AdjustReason = "restock" | "stock_count" | "write_off" | "correction";
export const ADJUST_REASONS: AdjustReason[] = ["restock", "stock_count", "write_off", "correction"];

/**
 * The change an adjustment will make, worked out the way fn_stock_adjust does:
 * never more off than is there. `quantity` is what was typed: an amount to add
 * or remove, the number counted, or (for a correction) a signed amount.
 */
export function planAdjust(reason: AdjustReason, current: number, quantity: number): { delta: number; after: number } {
    const now = Math.max(0, current);
    const q = Math.trunc(quantity);
    const delta = reason === "restock" ? Math.max(0, q)
        : reason === "write_off" ? -Math.min(Math.max(0, q), now)
        : reason === "stock_count" ? Math.max(0, q) - now
        : Math.max(q, -now);
    return { delta, after: now + delta };
}

export const ADJUST_LABEL: Record<AdjustReason, string> = {
    restock: "New stock arrived", stock_count: "Stock count", write_off: "Damaged or lost", correction: "Correction",
};

/** An adjust request from the browser, made safe for the server. Null when it can't be used. */
export function cleanAdjust(input: unknown): { product_id: string; variant_id: string | null; reason: AdjustReason; quantity: number; note: string | null; key: string } | null {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pid = String(o.product_id ?? "");
    const vid = o.variant_id == null || o.variant_id === "" ? null : String(o.variant_id);
    const reason = String(o.reason ?? "") as AdjustReason;
    if (!uuid.test(pid) || (vid !== null && !uuid.test(vid)) || !ADJUST_REASONS.includes(reason)) return null;
    const raw = reason === "stock_count" ? o.counted ?? o.quantity : o.quantity;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || Math.abs(quantity) > 100000) return null;
    if (reason !== "correction" && quantity < 0) return null;
    if (reason !== "stock_count" && quantity === 0) return null;
    const key = String(o.idempotency_key ?? "");
    if (!/^[A-Za-z0-9:_-]{8,100}$/.test(key)) return null;
    const note = String(o.note ?? "").trim().slice(0, 300);
    return { product_id: pid, variant_id: vid, reason, quantity, note: note || null, key: `adjust:${key}` };
}

export type StockState = "preorder" | "hidden" | "out" | "low" | "ok";
export const STATE_BADGE: Record<StockState, [string, "info" | "neutral" | "danger" | "warn" | "ok"]> = {
    preorder: ["Pre-order", "info"], hidden: ["Draft", "neutral"], out: ["Sold out", "danger"], low: ["Running low", "warn"], ok: ["In stock", "ok"],
};

const csvCell = (v: unknown) => {
    const t = v == null ? "" : String(v);
    // A leading = + - @ would run as a formula in a spreadsheet.
    const safe = /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Inventory › Export stock: one line per stock figure. */
export function stockCsv(rows: { product_name: string; sku: string | null; size: string | null; color: string | null; brand: string | null; inventory_count: number; low_stock_at: number; state: string }[]): string {
    const head = ["Product", "SKU", "Size", "Colour", "Brand", "In stock", "Warn at", "Status"];
    const lines = rows.map(r => [r.product_name, r.sku, r.size, r.color, r.brand, r.inventory_count, r.low_stock_at, STATE_BADGE[r.state as StockState]?.[0] ?? r.state].map(csvCell).join(","));
    return "﻿" + [head.join(","), ...lines].join("\r\n") + "\r\n";
}

// ── Stock history (BACKEND_GAPS 10) ────────────────────────────────────────

export type HistoryRow = {
    id: string;
    created_at: string;
    reason: string;
    delta: number;
    applied_delta: number | null;
    note: string | null;
    variant_id: string | null;
    size: string | null;
    color: string | null;
    brand: string | null;
    order_id: string | null;
    order_ref: string | null;
    customer_name: string | null;
    actor_name: string | null;
};

/** Every ledger reason in plain words. */
export const REASON_TEXT: Record<string, string> = {
    sale: "Sold",
    pos_sale: "Sold at the POS",
    sale_unresolved_variant: "Sold (size not matched)",
    reversal: "Returned to stock",
    position_sync: "Taken again for an order",
    admin_adjust: "Corrected",
    correction: "Corrected",
    restock: "Restocked",
    stock_count: "Counted",
    write_off: "Written off",
    legacy_decrement: "Sold (older checkout)",
    sync: "Total rebuilt from sizes",
};
export const reasonText = (r: string) => REASON_TEXT[r] ?? "Stock changed";

const ORDER_REASONS = new Set(["sale", "pos_sale", "sale_unresolved_variant", "reversal", "position_sync"]);

/** One readable line: "Sold · Order MT-4830 · Ama Owusu", with the quantity that actually moved. */
export function historyLine(r: HistoryRow): { title: string; sub: string; qty: string; up: boolean } {
    const moved = r.applied_delta ?? r.delta;
    const parts: string[] = [];
    const opt = optionText(r);
    if (opt) parts.push(opt);
    if (r.order_ref || r.order_id) parts.push(`Order ${r.order_ref || String(r.order_id).slice(0, 8)}`);
    const who = ORDER_REASONS.has(r.reason) ? r.customer_name : r.actor_name;
    if (who?.trim()) parts.push(who.trim());
    // Staff notes only; the system's own notes ("paid -> cancelled by …") carry ids.
    if (r.note && !ORDER_REASONS.has(r.reason) && r.reason !== "sync" && !/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(r.note)) parts.push(`“${r.note.trim()}”`);
    if (moved !== r.delta) parts.push(`asked for ${r.delta > 0 ? "+" : "−"}${Math.abs(r.delta)}`);
    return { title: reasonText(r.reason), sub: parts.join(" · "), qty: moved > 0 ? `+${moved}` : moved < 0 ? `−${Math.abs(moved)}` : "0", up: moved > 0 };
}

// ── Gift cards ─────────────────────────────────────────────────────────────

export const GIFT_STATUS: Record<string, [string, "ok" | "neutral" | "warn" | "danger" | "info"]> = {
    active: ["Active", "ok"], redeemed: ["Used up", "neutral"], expired: ["Expired", "warn"],
    cancelled: ["Cancelled", "neutral"], pending_payment: ["Waiting for payment", "info"],
};
export const giftStatus = (s: string) => GIFT_STATUS[s] ?? [s ? s[0].toUpperCase() + s.slice(1) : "—", "neutral"] as [string, "neutral"];
