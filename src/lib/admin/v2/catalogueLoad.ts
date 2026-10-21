// Products (admin v2) data, server only (service role). Lists are paged and
// counted in SQL (fn_admin_product_rows, fn_inventory_rows), never read whole,
// because product_variants is already past PostgREST's 1000-row cap.
//
// Cost per item lives in product_costs and is read here only when the caller
// passes withCost, which the routes and actions set for owners and admins.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
    PAGE_SIZE, type CostRow, type HistoryRow, type InventoryQuery, type ListQuery, type ProductCounts, type ProductDetail,
    type ProductRow, type VariantRow,
} from "./catalogue";

const db = supabaseAdmin as any;

const must = <T extends { error: unknown }>(r: T): T => { if (r.error) throw r.error; return r; };

// ── Products list ──────────────────────────────────────────────────────────

export type ProductListData = {
    rows: ProductRow[];
    total: number;
    counts: ProductCounts;
    /** Product-level cost per row id, owners and admins only. */
    costs: Record<string, number> | null;
    categories: CategoryOption[];
};

export type CategoryOption = { id: string; name: string; slug: string; is_wholesale: boolean; is_active: boolean };

function applyView(q: any, view: ListQuery["view"]) {
    switch (view) {
        case "active": return q.eq("status", "active");
        case "draft": return q.eq("status", "draft");
        case "archived": return q.eq("status", "archived");
        case "low": return q.eq("view_low", true);
        case "out": return q.eq("view_out", true);
        case "nophoto": return q.eq("photos", 0).neq("status", "archived");
        case "preorder": return q.eq("preorder_enabled", true).neq("status", "archived");
        default: return q.neq("status", "archived");
    }
}

export async function loadProductList(query: ListQuery, withCost: boolean): Promise<ProductListData> {
    const from = (query.page - 1) * PAGE_SIZE;
    const p_q = query.q || null;
    const [list, counts, categories] = await Promise.all([
        applyView(db.rpc("fn_admin_product_rows", { p_q }, { count: "exact" }), query.view)
            .order("created_at", { ascending: false }).order("id").range(from, from + PAGE_SIZE - 1),
        db.rpc("fn_admin_product_counts", { p_q }),
        loadCategoryOptions(),
    ]);
    // Past the last page PostgREST answers 416 with no rows; the count call still holds the total.
    if (list.error && list.error.code !== "PGRST103") throw list.error;
    must(counts);
    const rows = (list.data ?? []) as ProductRow[];
    let costs: Record<string, number> | null = null;
    if (withCost && rows.length) {
        const r = must(await db.from("product_costs").select("product_id, cost_ghs").is("variant_id", null).in("product_id", rows.map(x => x.id)));
        costs = Object.fromEntries((r.data ?? []).map((c: any) => [c.product_id, Number(c.cost_ghs)]));
    } else if (withCost) costs = {};
    const c = (counts.data ?? {}) as ProductCounts;
    const total = list.count ?? Number(c[query.view]) ?? 0;
    return { rows, total, counts: c, costs, categories };
}

export async function loadCategoryOptions(): Promise<CategoryOption[]> {
    const r = must(await supabaseAdmin.from("categories").select("id, name, slug, is_wholesale, is_active").order("name"));
    return (r.data ?? []).map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, is_wholesale: c.is_wholesale === true, is_active: c.is_active !== false }));
}

// ── One product, for the panel ─────────────────────────────────────────────

export const PRODUCT_COLUMNS = "id, name, slug, sku, description, category_type, category_ids, image_urls, available_sizes, available_colors, available_brands, track_inventory, track_variant_inventory, inventory_count, price_ghs, compare_at_price_ghs, is_sale, discount_value, wholesale_override, wholesale_price_tier_1, wholesale_price_tier_2, wholesale_price_tier_3, is_active, archived_at, preorder_enabled, preorder_estimated_date, is_wholesale_only, low_stock_at";

export type ProductBundle = { product: ProductDetail; variants: VariantRow[]; costs: CostRow[] | null; waiting: number };

export async function loadProduct(id: string, withCost: boolean): Promise<ProductBundle | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [p, v, c, w] = await Promise.all([
        db.from("products").select(PRODUCT_COLUMNS).eq("id", id).maybeSingle(),
        supabaseAdmin.from("product_variants").select("id, size, color, brand, sku, inventory_count").eq("product_id", id).order("id"),
        withCost ? db.from("product_costs").select("variant_id, cost_ghs").eq("product_id", id) : Promise.resolve({ data: null, error: null }),
        db.from("whatsapp_restock_requests").select("id", { count: "exact", head: true }).eq("product_id", id).eq("status", "pending"),
    ]);
    must(p); must(v); must(c);
    if (!p.data) return null;
    return { product: p.data as ProductDetail, variants: (v.data ?? []) as VariantRow[], costs: withCost ? ((c.data ?? []) as CostRow[]) : null, waiting: w.error ? 0 : w.count ?? 0 };
}

export type StoreOptions = {
    sizes: string[];
    colors: string[];
    brands: string[];
    wholesale: { enabled: boolean; tiers: [number, number][] };
};

export async function loadStoreOptions(): Promise<StoreOptions> {
    const r = must(await supabaseAdmin.from("store_settings")
        .select("global_sizes, global_colors, global_brands, wholesale_enabled, wholesale_tier_1_min, wholesale_tier_1_max, wholesale_tier_2_min, wholesale_tier_2_max, wholesale_tier_3_min, wholesale_tier_3_max")
        .eq("id", "default").maybeSingle());
    const s: any = r.data ?? {};
    // The same fallbacks the old product forms used.
    return {
        sizes: s.global_sizes ?? [], colors: s.global_colors ?? [], brands: s.global_brands ?? [],
        wholesale: {
            enabled: s.wholesale_enabled === true,
            tiers: [[s.wholesale_tier_1_min ?? 3, s.wholesale_tier_1_max ?? 5], [s.wholesale_tier_2_min ?? 8, s.wholesale_tier_2_max ?? 10], [s.wholesale_tier_3_min ?? 12, s.wholesale_tier_3_max ?? 24]],
        },
    };
}

// ── Inventory ──────────────────────────────────────────────────────────────

export type InventoryRow = {
    product_id: string;
    product_name: string;
    product_sku: string | null;
    variant_id: string | null;
    size: string | null;
    color: string | null;
    brand: string | null;
    sku: string | null;
    inventory_count: number;
    low_stock_at: number;
    is_active: boolean;
    preorder_enabled: boolean;
    state: "preorder" | "hidden" | "out" | "low" | "ok";
    thumb: string | null;
};
export type InventorySummary = { items: number; products: number; low: number; out: number };
export type DriftRow = { product_id: string; name: string; is_active: boolean; rollup: number; variant_sum: number };
export type InventoryData = { rows: InventoryRow[]; total: number; summary: InventorySummary; drift: DriftRow[]; waiting: number };

export async function loadInventory(query: InventoryQuery): Promise<InventoryData> {
    const from = (query.page - 1) * PAGE_SIZE;
    let list = db.rpc("fn_inventory_rows", { p_q: query.q || null }, { count: "exact" });
    if (query.view === "low") list = list.eq("state", "low");
    if (query.view === "out") list = list.eq("state", "out");
    const [rows, summary, drift, waiting] = await Promise.all([
        list.order("product_name").order("product_id").order("size", { nullsFirst: true }).order("color", { nullsFirst: true }).order("brand", { nullsFirst: true })
            .range(from, from + PAGE_SIZE - 1),
        db.rpc("fn_inventory_summary"),
        db.rpc("fn_stock_drift").limit(50),
        db.from("whatsapp_restock_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    if (rows.error && rows.error.code !== "PGRST103") throw rows.error;
    must(summary); must(drift);
    const s = (summary.data ?? {}) as InventorySummary;
    const fallback = query.view === "low" ? s.low : query.view === "out" ? s.out : 0;
    return {
        rows: (rows.data ?? []) as InventoryRow[], total: rows.count ?? fallback,
        summary: { items: Number(s.items) || 0, products: Number(s.products) || 0, low: Number(s.low) || 0, out: Number(s.out) || 0 },
        drift: (drift.data ?? []) as DriftRow[],
        waiting: waiting.error ? 0 : waiting.count ?? 0,
    };
}

/** Every stock row for the CSV export, paged past the 1000-row cap. */
export async function allInventoryRows(): Promise<InventoryRow[]> {
    const out: InventoryRow[] = [];
    for (let offset = 0; offset < 50_000; offset += 1000) {
        const r = must(await db.rpc("fn_inventory_rows", { p_q: null })
            .order("product_name").order("product_id").order("size", { nullsFirst: true }).order("color", { nullsFirst: true }).order("brand", { nullsFirst: true })
            .range(offset, offset + 999));
        out.push(...((r.data ?? []) as InventoryRow[]));
        if ((r.data ?? []).length < 1000) break;
    }
    return out;
}

export async function loadHistory(productId: string, variantId: string | null, before: string | null): Promise<HistoryRow[]> {
    const r = must(await db.rpc("fn_stock_history", { p_product_id: productId, p_variant_id: variantId, p_limit: 40, p_before: before }));
    return (r.data ?? []) as HistoryRow[];
}

// ── Categories ─────────────────────────────────────────────────────────────

export type CategoryRow = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    is_featured: boolean;
    is_wholesale: boolean;
    wholesale_tier_1_price: number | null;
    wholesale_tier_2_price: number | null;
    wholesale_tier_3_price: number | null;
    preorder_enabled: boolean;
    preorder_estimated_weeks: number | null;
    sort_order: number | null;
    product_count: number;
    /** Every product that points at it, in the shop or not. Delete waits for 0. */
    linked: number;
};

/** Products that belong to a category: by id, wholesale id, extra ids or primary name (as the count trigger matches). */
export function linkedTo(c: { id: string; name: string }, p: { category_id: string | null; wholesale_category_id: string | null; category_ids: string[] | null; category_type: string | null }): boolean {
    return p.category_id === c.id || p.wholesale_category_id === c.id || (p.category_ids ?? []).includes(c.id)
        || (!!p.category_type && p.category_type.trim().toLowerCase() === c.name.trim().toLowerCase());
}

export async function loadCategories(): Promise<{ rows: CategoryRow[]; wholesale: StoreOptions["wholesale"] }> {
    const [cats, store] = await Promise.all([
        must(await supabaseAdmin.from("categories").select("*").order("sort_order", { ascending: true }).order("name")),
        loadStoreOptions(),
    ]);
    const products: any[] = [];
    for (let offset = 0; offset < 50_000; offset += 1000) {
        const r = must(await supabaseAdmin.from("products").select("category_id, wholesale_category_id, category_ids, category_type").order("id").range(offset, offset + 999));
        products.push(...(r.data ?? []));
        if ((r.data ?? []).length < 1000) break;
    }
    const rows = (cats.data ?? []).map((c: any): CategoryRow => ({
        id: c.id, name: c.name, slug: c.slug, description: c.description, image_url: c.image_url,
        is_active: c.is_active !== false, is_featured: c.is_featured === true, is_wholesale: c.is_wholesale === true,
        wholesale_tier_1_price: c.wholesale_tier_1_price, wholesale_tier_2_price: c.wholesale_tier_2_price, wholesale_tier_3_price: c.wholesale_tier_3_price,
        preorder_enabled: c.preorder_enabled === true, preorder_estimated_weeks: c.preorder_estimated_weeks, sort_order: c.sort_order,
        product_count: Number(c.product_count) || 0,
        linked: products.filter(p => linkedTo(c, p)).length,
    }));
    return { rows, wholesale: store.wholesale };
}

// ── Gift cards ─────────────────────────────────────────────────────────────

export type GiftCardRow = {
    id: string;
    code: string;
    initial_value: number;
    remaining_value: number;
    status: string;
    recipient_email: string | null;
    recipient_name: string | null;
    sender_name: string | null;
    purchased_by_email: string | null;
    message: string | null;
    delivery_mode: string | null;
    sent_at: string | null;
    expires_at: string | null;
    is_active: boolean | null;
    created_at: string;
    order_id: string | null;
};
export type GiftQuery = { status: string; q: string; page: number };
export type GiftStats = { issued: number; totalValue: number; outstanding: number; redeemedMonth: number };

export const GIFT_COLUMNS = "id, code, initial_value, remaining_value, status, recipient_email, recipient_name, sender_name, purchased_by_email, message, delivery_mode, sent_at, expires_at, is_active, created_at, order_id";

export function parseGiftQuery(sp: Record<string, string | string[] | undefined>): GiftQuery {
    const g = (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) ?? ""; };
    const status = g("status");
    return {
        status: ["active", "redeemed", "expired", "cancelled", "pending_payment"].includes(status) ? status : "all",
        q: g("q").trim().slice(0, 80),
        page: Math.max(1, Math.min(1000, Number(g("page")) || 1)),
    };
}

/** The four figures the old Gift Cards page showed, over every card (paged reads). */
export async function giftStats(now = new Date()): Promise<GiftStats> {
    const all: any[] = [];
    for (let offset = 0; offset < 100_000; offset += 1000) {
        const r = must(await supabaseAdmin.from("gift_cards").select("initial_value, remaining_value, status, created_at").order("id").range(offset, offset + 999));
        all.push(...(r.data ?? []));
        if ((r.data ?? []).length < 1000) break;
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
        issued: all.filter(c => c.status === "active" || c.status === "redeemed").length,
        totalValue: all.reduce((s, c) => s + Number(c.initial_value || 0), 0),
        outstanding: all.filter(c => c.status === "active").reduce((s, c) => s + Number(c.remaining_value || 0), 0),
        // Same reading as the old page: cards used up that were issued this month.
        redeemedMonth: all.filter(c => c.status === "redeemed" && new Date(c.created_at) >= monthStart).length,
    };
}

export async function loadGiftCards(q: GiftQuery): Promise<{ rows: GiftCardRow[]; total: number; stats: GiftStats }> {
    const from = (q.page - 1) * PAGE_SIZE;
    let list = supabaseAdmin.from("gift_cards").select(GIFT_COLUMNS, { count: "exact" });
    if (q.status !== "all") list = list.eq("status", q.status);
    const term = q.q.replace(/[%,()*\\]/g, "").trim();
    if (term) list = list.or(`code.ilike.%${term}%,recipient_email.ilike.%${term}%,purchased_by_email.ilike.%${term}%,recipient_name.ilike.%${term}%`);
    const [r, stats] = await Promise.all([list.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1), giftStats()]);
    if (r.error && r.error.code !== "PGRST103") throw r.error;
    return { rows: (r.data ?? []) as unknown as GiftCardRow[], total: r.count ?? 0, stats };
}
