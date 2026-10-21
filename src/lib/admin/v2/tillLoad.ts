// Server-side reads for the admin v2 Till. Service role (the till's tables are
// staff-only under RLS), so every caller checks the role first, and the scope
// passed in decides whose sales are read: sales staff see only their own, as
// the old POS History had it — enforced here, not in the browser.
//
// Nothing here writes. Sales are made, sent and cancelled only by the existing
// /api/pos/* routes.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseDeliverySettings, type DeliveryFeeSettings } from "@/lib/delivery";
import { getPosHoldMinutes } from "@/lib/posSettlement";
import { pageAll } from "@/lib/ai/insights";
import { buildSearchClause, isMissingColumn, sanitiseTerm } from "@/lib/refSearch";
import {
    SALES_PAGE_SIZE, accraDay, chargedUnitPrice, salesRange, type SalesQuery, type TillCustomer, type TillProduct, type TillVariant,
} from "./till";

const db = supabaseAdmin as any;

export type TillScope = { userId: string; role: "admin" | "owner" | "sales_staff" };
const ownOnly = (s: TillScope) => s.role === "sales_staff";

export type TillSettings = {
    delivery: DeliveryFeeSettings;
    liveStatus: boolean;
    holdMinutes: number;
    feePct: number;
};

/** The settings the till reads, each on its own guarded select like the old till and send-link. */
export async function loadTillSettings(): Promise<TillSettings> {
    const [deliveryRow, liveRow, feeRow, holdMinutes] = await Promise.all([
        db.from("store_settings").select("delivery_fees_enabled, delivery_fee_accra, delivery_fee_outside").eq("id", "default").maybeSingle()
            .then((r: any) => r.data, () => null),
        db.from("store_settings").select("pos_live_payment_status").eq("id", "default").maybeSingle()
            .then((r: any) => r.data, () => null),
        // The same row and column send-link reads for the fee it adds.
        db.from("store_settings").select("platform_fee_percentage").eq("id", "default").maybeSingle()
            .then((r: any) => r.data, () => null),
        getPosHoldMinutes().catch(() => 15),
    ]);
    return {
        delivery: parseDeliverySettings(deliveryRow),
        liveStatus: liveRow?.pos_live_payment_status === true,
        holdMinutes,
        feePct: Number(feeRow?.platform_fee_percentage) || 0,
    };
}

export type TillCategory = { id: string; name: string };

/** Categories that have at least one product on sale, in the shop's order. */
export async function loadTillCategories(): Promise<TillCategory[]> {
    const [{ data: cats }, used] = await Promise.all([
        db.from("categories").select("id, name, sort_order").eq("is_active", true).order("sort_order", { ascending: true }).order("name"),
        pageAll<{ category_ids: string[] | null; category_id: string | null }>(
            (from, to) => db.from("products").select("category_ids, category_id").eq("is_active", true).order("id").range(from, to), 1000, 10),
    ]);
    const inUse = new Set<string>();
    for (const p of used.rows) {
        for (const c of p.category_ids ?? []) inUse.add(c);
        if (p.category_id) inUse.add(p.category_id);
    }
    return (cats ?? []).filter((c: any) => inUse.has(c.id)).map((c: any) => ({ id: c.id, name: c.name }));
}

/** The grid caps results rather than paging; the page says when there are more. */
export const PRODUCT_RESULT_LIMIT = 60;
const uniq = (xs: unknown) => [...new Set((Array.isArray(xs) ? xs : []).filter((x): x is string => typeof x === "string" && x.trim() !== ""))];

export async function searchTillProducts(q: string, categoryId: string | null): Promise<{ products: TillProduct[]; matches: number }> {
    let query = db.from("products")
        .select("id, name, sku, price_ghs, is_sale, discount_value, image_urls, inventory_count, track_inventory, track_variant_inventory, available_sizes, available_colors, available_brands, preorder_enabled, category_ids, category_id", { count: "exact" })
        .eq("is_active", true);
    const term = q.trim().replace(/[%,()]/g, "");
    if (term) query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
    if (categoryId) query = query.or(`category_ids.cs.{${categoryId}},category_id.eq.${categoryId}`);
    const { data, count, error } = await query.order("name").limit(PRODUCT_RESULT_LIMIT);
    if (error) throw error;
    const rows: any[] = data ?? [];

    const simpleIds = rows.filter(p => p.track_inventory !== false && !p.track_variant_inventory).map(p => p.id);
    const variantIds = rows.filter(p => p.track_inventory !== false && p.track_variant_inventory).map(p => p.id);

    const [simple, variants] = await Promise.all([
        simpleIds.length ? db.rpc("fn_available_stock_bulk", { p_product_ids: simpleIds }) : Promise.resolve({ data: [] }),
        variantIds.length
            ? pageAll<any>((from, to) => db.from("product_variants").select("id, product_id, size, color, brand").in("product_id", variantIds).order("id").range(from, to), 1000, 10)
            : Promise.resolve({ rows: [] as any[], truncated: false, error: null }),
    ]);
    const simpleMap = new Map<string, number>((simple.data ?? []).map((a: any) => [a.product_id, Number(a.available) || 0]));

    // Every variant row's free stock in one batched call: the same netting the
    // stock check and the reservation use, so a tile never promises held units.
    const vrows: any[] = variants.rows ?? [];
    const availById = new Map<string, number>();
    for (let i = 0; i < vrows.length; i += 500) {
        const chunk = vrows.slice(i, i + 500);
        const { data: avail } = await db.rpc("fn_available_stock_batch", { p_items: chunk.map(v => ({ product_id: v.product_id, variant_id: v.id })) });
        for (const a of avail ?? []) if (a.variant_id) availById.set(a.variant_id, Number(a.available) || 0);
    }
    const byProduct = new Map<string, TillVariant[]>();
    for (const v of vrows) {
        const list = byProduct.get(v.product_id) ?? [];
        list.push({ size: v.size ?? null, color: v.color ?? null, brand: v.brand ?? null, available: availById.get(v.id) ?? 0 });
        byProduct.set(v.product_id, list);
    }

    const products: TillProduct[] = rows.map(p => {
        const tracked = p.track_inventory !== false;
        const variantTracked = tracked && !!p.track_variant_inventory;
        const vs = byProduct.get(p.id) ?? [];
        const price = chargedUnitPrice(p);
        return {
            id: p.id,
            name: p.name,
            sku: p.sku ?? null,
            price,
            wasPrice: price < Number(p.price_ghs) ? Number(p.price_ghs) : null,
            image: Array.isArray(p.image_urls) ? p.image_urls[0] ?? null : null,
            sizes: uniq(p.available_sizes),
            colors: uniq(p.available_colors),
            brands: uniq(p.available_brands),
            preorder: p.preorder_enabled === true,
            tracked,
            variantTracked,
            available: !tracked ? null : variantTracked ? vs.reduce((s, v) => s + Math.max(0, v.available), 0) : (simpleMap.get(p.id) ?? Number(p.inventory_count) ?? 0),
            variants: vs,
        };
    });
    return { products, matches: count ?? products.length };
}

// ── Customers ───────────────────────────────────────────────────────────────

const identity = (c: { email: string | null; phone: string | null; name: string }) => c.email?.trim() || c.phone?.trim() || c.name;

/** Contacts first, then names from past orders, one row per person — the old till's search. */
export async function searchTillCustomers(raw: string): Promise<TillCustomer[]> {
    const q = raw.trim().replace(/[%,()]/g, "").slice(0, 80);
    if (!q) return [];
    const [contactsRes, ordersRes] = await Promise.all([
        db.from("contacts").select("id, name, email, phone").or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`).limit(6),
        db.from("orders").select("customer_name, customer_email, customer_phone")
            .or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`)
            .order("created_at", { ascending: false }).limit(8),
    ]);
    const seen = new Set<string>();
    const out: TillCustomer[] = [];
    for (const c of contactsRes.data ?? []) {
        const row = { id: c.id, name: c.name ?? "", email: c.email ?? null, phone: c.phone ?? null };
        const k = identity(row);
        if (!seen.has(k)) { seen.add(k); out.push(row); }
    }
    for (const o of ordersRes.data ?? []) {
        const row = { id: null, name: o.customer_name ?? "", email: o.customer_email ?? null, phone: o.customer_phone ?? null };
        const k = identity(row);
        if (!seen.has(k)) { seen.add(k); out.push(row); }
    }
    return out.filter(c => c.name).slice(0, 8);
}

/** The customer a link like /till?customer=<email or phone> names: their contact, else their latest order. */
export async function findTillCustomer(raw: string): Promise<TillCustomer | null> {
    const key = raw.trim().slice(0, 120);
    if (!key) return null;
    const isEmail = key.includes("@");
    const digits = key.replace(/\D/g, "");
    if (!isEmail && digits.length < 9) return null;
    const contact = isEmail
        ? await db.from("contacts").select("id, name, email, phone").ilike("email", key.replace(/[%_]/g, "\\$&")).limit(1).maybeSingle()
        : await db.from("contacts").select("id, name, email, phone").ilike("phone", `%${digits.slice(-9)}`).limit(1).maybeSingle();
    if (contact.data?.name) return { id: contact.data.id, name: contact.data.name, email: contact.data.email ?? null, phone: contact.data.phone ?? null };
    const order = isEmail
        ? await db.from("orders").select("customer_name, customer_email, customer_phone").ilike("customer_email", key.replace(/[%_]/g, "\\$&")).order("created_at", { ascending: false }).limit(1).maybeSingle()
        : await db.from("orders").select("customer_name, customer_email, customer_phone").ilike("customer_phone", `%${digits.slice(-9)}`).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (order.data?.customer_name) return { id: null, name: order.data.customer_name, email: order.data.customer_email ?? null, phone: order.data.customer_phone ?? null };
    return null;
}

// ── One sale ────────────────────────────────────────────────────────────────

export type SaleState = { status: string; expiresAt: string | null; orderId: string | null; orderRef: string | null };

/** A session's state from the database only (no Paystack call): for the hold countdown and receipts. */
export async function loadSaleState(id: string, scope: TillScope): Promise<SaleState | null> {
    const { data } = await db.from("pos_sessions").select("id, status, expires_at, order_id, created_by").eq("id", id).maybeSingle();
    if (!data) return null;
    if (ownOnly(scope) && data.created_by !== scope.userId) return null;
    return {
        status: data.status,
        expiresAt: data.expires_at ?? null,
        orderId: data.order_id ?? null,
        orderRef: data.order_id ? String(data.order_id).slice(0, 8).toUpperCase() : null,
    };
}

/** The order behind this person's latest paid till sale, for "Reprint last receipt". */
export async function loadLastReceipt(scope: TillScope): Promise<string | null> {
    const { data } = await db.from("pos_sessions").select("order_id").eq("status", "paid").eq("created_by", scope.userId)
        .not("order_id", "is", null).order("paid_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    return data?.order_id ?? null;
}

// ── Today's sales ───────────────────────────────────────────────────────────

export type SaleRow = {
    id: string;
    ref: string;
    created_at: string;
    paid_at: string | null;
    expires_at: string | null;
    status: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    customer_address: string | null;
    customer_region: string | null;
    customer_country: string | null;
    delivery_method: string | null;
    delivery_zone: string | null;
    delivery_fee: number;
    discount_code: string | null;
    discount_amount: number;
    total_amount: number;
    items: { name: string; size: string | null; color: string | null; brand: string | null; quantity: number; price: number }[];
    notes: string | null;
    order_id: string | null;
    payment_method: string | null;
    order_payment_method: string | null;
    paystack_reference: boolean;
    staff_id: string | null;
    staff_name: string | null;
};

export type SalesData = { rows: SaleRow[]; total: number; staff: { id: string; name: string }[] };

export async function loadSales(q: SalesQuery, scope: TillScope, now = new Date()): Promise<SalesData> {
    const range = salesRange(q, now);
    const from = (q.page - 1) * SALES_PAGE_SIZE;
    const build = (includeRef: boolean) => {
        let b = db.from("pos_sessions").select(
            "id, created_at, paid_at, expires_at, status, customer_name, customer_email, customer_phone, customer_address, customer_region, customer_country, delivery_method, delivery_zone, delivery_fee, discount_code, discount_amount, total_amount, items, notes, order_id, payment_method, paystack_reference, created_by",
            { count: "exact" },
        );
        if (q.status !== "all") b = b.eq("status", q.status);
        // Sales staff: their own sales, whatever the URL asks for.
        if (ownOnly(scope)) b = b.eq("created_by", scope.userId);
        else if (q.staff) b = b.eq("created_by", q.staff);
        if (range.from) b = b.gte("created_at", range.from);
        if (range.to) b = b.lt("created_at", range.to);
        const term = sanitiseTerm(q.q);
        if (term) b = b.or(buildSearchClause(term, ["customer_name", "customer_email", "customer_phone"], { includeRef }));
        return b.order("created_at", { ascending: false }).range(from, from + SALES_PAGE_SIZE - 1);
    };
    let res = await build(true);
    if (isMissingColumn(res.error, "ref")) res = await build(false);
    if (res.error) {
        // A page past the end (rows cancelled between renders): show nothing, not an error.
        if (res.error.code === "PGRST103") return { rows: [], total: res.count ?? 0, staff: await staffOptions(scope) };
        throw res.error;
    }
    const raw: any[] = res.data ?? [];
    const staffIds = [...new Set(raw.map(r => r.created_by).filter(Boolean))];
    const orderIds = [...new Set(raw.map(r => r.order_id).filter(Boolean))];
    const [profiles, orders, staff] = await Promise.all([
        staffIds.length ? db.from("profiles").select("id, full_name, email").in("id", staffIds) : Promise.resolve({ data: [] }),
        orderIds.length ? db.from("orders").select("id, payment_method").in("id", orderIds) : Promise.resolve({ data: [] }),
        staffOptions(scope),
    ]);
    const names = new Map<string, string>((profiles.data ?? []).map((p: any) => [p.id, p.full_name?.trim() || p.email || ""]));
    const methods = new Map<string, string | null>((orders.data ?? []).map((o: any) => [o.id, o.payment_method ?? null]));
    const rows: SaleRow[] = raw.map(r => ({
        id: r.id,
        ref: String(r.id).slice(0, 8).toUpperCase(),
        created_at: r.created_at,
        paid_at: r.paid_at ?? null,
        expires_at: r.expires_at ?? null,
        status: r.status,
        customer_name: r.customer_name ?? "",
        customer_email: r.customer_email ?? null,
        customer_phone: r.customer_phone ?? null,
        customer_address: r.customer_address ?? null,
        customer_region: r.customer_region ?? null,
        customer_country: r.customer_country ?? null,
        delivery_method: r.delivery_method ?? null,
        delivery_zone: r.delivery_zone ?? null,
        delivery_fee: Number(r.delivery_fee) || 0,
        discount_code: r.discount_code ?? null,
        discount_amount: Number(r.discount_amount) || 0,
        total_amount: Number(r.total_amount) || 0,
        items: (Array.isArray(r.items) ? r.items : []).map((i: any) => ({
            name: String(i?.name ?? ""), size: i?.size ?? null, color: i?.color ?? null, brand: i?.brand ?? null,
            quantity: Number(i?.quantity) || 1, price: Number(i?.price) || 0,
        })),
        notes: r.notes ?? null,
        order_id: r.order_id ?? null,
        payment_method: r.payment_method ?? null,
        order_payment_method: r.order_id ? methods.get(r.order_id) ?? null : null,
        paystack_reference: !!r.paystack_reference,
        staff_id: r.created_by ?? null,
        staff_name: r.created_by ? names.get(r.created_by) || null : null,
    }));
    return { rows, total: res.count ?? rows.length, staff };
}

/** The staff picker (owners and admins only; sales staff see their own sales). */
async function staffOptions(scope: TillScope): Promise<{ id: string; name: string }[]> {
    if (ownOnly(scope)) return [];
    const { data } = await db.from("profiles").select("id, full_name, email").in("role", ["admin", "owner", "sales_staff"]).order("full_name");
    return (data ?? []).map((p: any) => ({ id: p.id, name: p.full_name?.trim() || p.email || "Unnamed" }));
}

export type TodayKpis = {
    cash: number; cashSales: number;
    tillSales: number; tillCount: number;
    waiting: number; nextExpiry: string | null;
};

/**
 * The three figures over Today's sales, for Accra's today:
 *  - Cash to count at close: paid cash orders, as Home and Analytics count it
 *    (sales staff: the cash they took, orders.recorded_by).
 *  - Till sales today: till sessions paid today, however they were paid.
 *  - Pay links waiting: links still inside their hold.
 */
export async function loadTodayKpis(scope: TillScope, now = new Date()): Promise<TodayKpis> {
    const day = accraDay(now);
    const start = `${day}T00:00:00.000Z`;
    const end = new Date(Date.parse(start) + 86_400_000).toISOString();
    const nowIso = now.toISOString();

    const cashQ = (from: number, to: number) => {
        let b = db.from("orders").select("id, total_amount").eq("payment_method", "cash").eq("payment_status", "paid")
            .gte("created_at", start).lt("created_at", end);
        if (ownOnly(scope)) b = b.eq("recorded_by", scope.userId);
        return b.order("id").range(from, to);
    };
    const paidQ = (from: number, to: number) => {
        let b = db.from("pos_sessions").select("id, total_amount").eq("status", "paid").gte("paid_at", start).lt("paid_at", end);
        if (ownOnly(scope)) b = b.eq("created_by", scope.userId);
        return b.order("id").range(from, to);
    };
    let waitingQ = db.from("pos_sessions").select("id, expires_at", { count: "exact" }).eq("status", "pending_payment").gt("expires_at", nowIso);
    if (ownOnly(scope)) waitingQ = waitingQ.eq("created_by", scope.userId);

    const [cash, paid, waiting] = await Promise.all([
        pageAll<{ total_amount: number }>(cashQ, 1000, 20),
        pageAll<{ total_amount: number }>(paidQ, 1000, 20),
        waitingQ.order("expires_at", { ascending: true }).limit(1),
    ]);
    if (cash.error) throw cash.error;
    if (paid.error) throw paid.error;
    if (waiting.error) throw waiting.error;
    const sum = (rows: { total_amount: number }[]) => rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    return {
        cash: sum(cash.rows), cashSales: cash.rows.length,
        tillSales: sum(paid.rows), tillCount: paid.rows.length,
        waiting: waiting.count ?? 0, nextExpiry: waiting.data?.[0]?.expires_at ?? null,
    };
}
