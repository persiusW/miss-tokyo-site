// Server-side reads for the Discounts page (admin v2). Service role, so the
// caller must already have checked the role (requireV2Page or an action's
// caller check). Every read is paged or aggregated in SQL: PostgREST stops an
// unpaged select at 1000 rows without saying so.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ilikeExact, PAID_LEGACY_STATUSES } from "@/lib/admin/v2/customers";
import type { AutoRow, CouponRow, Kind, Names, Results } from "@/lib/admin/v2/discounts";

const db = supabaseAdmin as any;
const PAGE = 1000;

export const COUPON_COLUMNS =
    "id, code, discount_type, discount_value, min_order_value, usage_limit, used_count, is_active, starts_at, expires_at, buy_quantity, get_quantity, free_shipping, category_id, single_use_per_customer, created_at";
export const AUTO_COLUMNS =
    "id, title, is_active, discount_type, discount_value, applies_to, target_category_ids, target_product_ids, min_quantity, quantity_scope, min_order_amount, starts_at, ends_at, created_at";

/** Every row of a query, a page at a time. */
async function all<T>(make: () => any): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await make().range(from, from + PAGE - 1);
        if (error) throw error;
        out.push(...((data ?? []) as T[]));
        if (!data || data.length < PAGE) return out;
    }
}

export type Category = { id: string; name: string };
export type ProductPick = { id: string; name: string };

export type DiscountData = {
    coupons: CouponRow[];
    autos: AutoRow[];
    results: Record<string, Results>;
    names: Names;
    /** Category ids of every product an automatic discount targets, for the overlap check. */
    productCategories: Record<string, string[]>;
    categories: Category[];
};

/** fn_discount_results keyed "code:<id>" / "auto:<id>". */
export async function loadResults(): Promise<Record<string, Results>> {
    const rows = await all<{ kind: Kind; discount_id: string; orders: number; sales: number; given: number; shared_orders: number; all_orders: number }>(
        () => db.rpc("fn_discount_results"),
    );
    const out: Record<string, Results> = {};
    for (const r of rows) {
        out[`${r.kind}:${r.discount_id}`] = {
            orders: Number(r.orders) || 0, sales: Number(r.sales) || 0, given: Number(r.given) || 0,
            shared: Number(r.shared_orders) || 0, all: Number(r.all_orders) || 0,
        };
    }
    return out;
}

async function productsByIds(ids: string[]): Promise<{ id: string; name: string; category_ids: string[] | null }[]> {
    const out: { id: string; name: string; category_ids: string[] | null }[] = [];
    for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await db.from("products").select("id, name, category_ids").in("id", ids.slice(i, i + 200));
        if (error) throw error;
        out.push(...(data ?? []));
    }
    return out;
}

export async function loadDiscountData(): Promise<DiscountData> {
    const [coupons, autos, results, categories] = await Promise.all([
        all<CouponRow>(() => db.from("coupons").select(COUPON_COLUMNS).order("created_at", { ascending: false })),
        all<AutoRow>(() => db.from("automatic_discounts").select(AUTO_COLUMNS).order("created_at", { ascending: false })),
        loadResults(),
        // Every category, not only active ones: a discount may still point at
        // one that has since been hidden, and it should show by name.
        all<Category & { is_active: boolean | null }>(() => db.from("categories").select("id, name, is_active").order("name")),
    ]);
    const productIds = [...new Set(autos.flatMap(a => a.target_product_ids ?? []))];
    const products = productIds.length ? await productsByIds(productIds) : [];
    return {
        coupons,
        autos,
        results,
        names: {
            categories: Object.fromEntries(categories.map(c => [c.id, c.name])),
            products: Object.fromEntries(products.map(p => [p.id, p.name])),
        },
        productCategories: Object.fromEntries(products.map(p => [p.id, Array.isArray(p.category_ids) ? p.category_ids : []])),
        // The pickers offer active categories plus any a discount already uses
        categories: categories
            .filter(c => c.is_active !== false
                || coupons.some(k => k.category_id === c.id)
                || autos.some(a => (a.target_category_ids ?? []).includes(c.id)))
            .map(c => ({ id: c.id, name: c.name })),
    };
}

/** Which table an id from a deep link (/discounts/<id>) belongs to. */
export async function kindOf(id: string): Promise<Kind | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const [{ data: c }, { data: a }] = await Promise.all([
        db.from("coupons").select("id").eq("id", id).maybeSingle(),
        db.from("automatic_discounts").select("id").eq("id", id).maybeSingle(),
    ]);
    return c ? "code" : a ? "auto" : null;
}

/** Products for the picker: name search, live products first, 30 at a time. */
export async function searchProducts(q: string): Promise<ProductPick[]> {
    const term = q.trim().slice(0, 80);
    let query = db.from("products").select("id, name").or("is_active.eq.true,is_active.is.null").order("name").limit(30);
    if (term) query = query.ilike("name", `%${ilikeExact(term)}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ProductPick[];
}

export type ResultOrder = { id: string; ref: string; customer: string; total: number; saved: number; at: string; source: string | null };

const PAID_OR = `payment_status.eq.paid,and(payment_status.is.null,status.in.(${PAID_LEGACY_STATUSES.join(",")}))`;

/** The latest paid orders that used a discount, for its Results tab. */
export async function recentOrders(kind: Kind, id: string, limit = 10): Promise<ResultOrder[]> {
    const cols = "id, created_at, total_amount, discount_amount, auto_discount_amount, auto_discount_title, customer_name, customer_email, source";
    let rows: any[] = [];
    if (kind === "code") {
        const { data: c } = await db.from("coupons").select("code").eq("id", id).maybeSingle();
        if (!c) return [];
        const { data, error } = await db.from("orders").select(cols).ilike("discount_code", ilikeExact(String(c.code).trim()))
            .or(PAID_OR).order("created_at", { ascending: false }).limit(limit);
        if (error) throw error;
        rows = data ?? [];
    } else {
        const { data: a } = await db.from("automatic_discounts").select("title").eq("id", id).maybeSingle();
        if (!a) return [];
        const title = String(a.title);
        // Titles are stored comma-joined when several rules applied; match the
        // exact title among them, the way fn_discount_results counts it.
        const { data, error } = await db.from("orders").select(cols).ilike("auto_discount_title", `%${ilikeExact(title)}%`)
            .or(PAID_OR).order("created_at", { ascending: false }).limit(limit * 3);
        if (error) throw error;
        rows = (data ?? []).filter((o: any) => String(o.auto_discount_title ?? "").split(",").map((x: string) => x.trim()).includes(title)).slice(0, limit);
    }
    return rows.map(o => ({
        id: o.id,
        ref: String(o.id).slice(0, 8).toUpperCase(),
        customer: o.customer_name || o.customer_email || "Walk-in customer",
        total: Number(o.total_amount) || 0,
        saved: Number(kind === "code" ? o.discount_amount : o.auto_discount_amount) || 0,
        at: o.created_at,
        source: o.source ?? null,
    }));
}
