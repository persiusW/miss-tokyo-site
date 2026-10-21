"use server";

// Products (admin v2) server actions. Server actions are public endpoints that
// run on the service role, so each one re-reads the caller's role, with the
// same lists the old pages had:
//   products, categories, gift cards   admin, owner and sales staff (the old
//              pages wrote through RLS policies that admit all three:
//              safe_admin_all_products and is_admin())
//   cost per item                      owner and admin only, never sales staff
//   delete a product for good          owner and admin (the new admin keeps
//              it behind the ⋯ menu; everyone else archives)
// Saving a product and adjusting stock go through /api/admin/products and
// /api/admin/stock/adjust, which check the same way. Nothing here moves stock
// except "Stop tracking stock", which writes the 9999 "not tracked" flag the
// old bulk Untrack wrote (not a count, so not a ledger movement).
import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/utils/logActivity";
import { logCause } from "@/lib/errors/apiError";
import { slugify, weeksToDate, type HistoryRow } from "@/lib/admin/v2/catalogue";
import { loadHistory, loadProduct, loadStoreOptions, loadCategoryOptions, GIFT_COLUMNS, type ProductBundle, type StoreOptions, type CategoryOption, type GiftCardRow } from "@/lib/admin/v2/catalogueLoad";

type Role = "admin" | "owner" | "sales_staff";
type Me = { userId: string; role: Role };
type Fail = { ok: false; error: string };

const db = supabaseAdmin as any;
const STAFF: Role[] = ["admin", "owner", "sales_staff"];
const FULL: Role[] = ["owner", "admin"];
const SIGNED_OUT: Fail = { ok: false, error: "Please sign in again to change products." };
const FAILED: Fail = { ok: false, error: "We couldn't save that just now. Nothing was changed. Please try again." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 500) : []);

async function caller(roles: Role[] = STAFF): Promise<Me | Fail> {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return SIGNED_OUT;
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role as Role | undefined;
    if (!role || !STAFF.includes(role)) return SIGNED_OUT;
    if (!roles.includes(role)) return { ok: false, error: "Only owners and admins can do that. Ask the owner if it needs doing." };
    return { userId: user.id, role };
}
const isFail = (x: Me | Fail): x is Fail => "ok" in x;

function refresh() {
    revalidatePath("/catalogue", "layout");
    revalidatePath("/catalog/products", "page");
    revalidatePath("/shop", "page");
    revalidatePath("/", "page");
    revalidateTag("products", "max");
}

const log = (me: Me, actionType: "CREATE" | "UPDATE" | "DELETE", resource: string, resourceId: string | undefined, extra: { oldData?: unknown; newData?: unknown; details?: Record<string, unknown> }) =>
    after(() => logActivity({ userId: me.userId, userRole: me.role, actionType, resource, resourceId, ...extra }));

// ── Reading ────────────────────────────────────────────────────────────────

export type PanelData = { bundle: ProductBundle | null; store: StoreOptions; categories: CategoryOption[]; canCost: boolean; canDelete: boolean };

/** Everything the product panel needs. Costs only for owners and admins. */
export async function productPanelData(id: string | null): Promise<{ ok: true; data: PanelData } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    const canCost = FULL.includes(me.role);
    try {
        const [bundle, store, categories] = await Promise.all([id ? loadProduct(id, canCost) : Promise.resolve(null), loadStoreOptions(), loadCategoryOptions()]);
        if (id && !bundle) return { ok: false, error: "That product isn't there any more. It may have been deleted." };
        return { ok: true, data: { bundle, store, categories, canCost, canDelete: canCost } };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.panel" });
        return { ok: false, error: "We couldn't open that product just now. Please try again." };
    }
}

export async function stockHistory(productId: string, variantId: string | null, before: string | null): Promise<{ ok: true; rows: HistoryRow[] } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    if (!UUID.test(productId) || (variantId && !UUID.test(variantId)) || (before && Number.isNaN(Date.parse(before)))) return { ok: false, error: "That stock history isn't available." };
    try {
        return { ok: true, rows: await loadHistory(productId, variantId, before) };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.history" });
        return { ok: false, error: "We couldn't load the stock history just now. Please try again." };
    }
}

// ── Products: list and bulk actions ────────────────────────────────────────

type StatusSnap = { id: string; is_active: boolean | null; archived_at: string | null };

/** Active, Draft or Archived for many products at once. Returns the old states so the toast can undo it. */
export async function setProductStatus(productIds: string[], status: "active" | "draft" | "archived"): Promise<{ ok: true; before: StatusSnap[] } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    const list = ids(productIds);
    if (!list.length || !["active", "draft", "archived"].includes(status)) return FAILED;
    try {
        const { data: before, error: readErr } = await db.from("products").select("id, is_active, archived_at, name").in("id", list);
        if (readErr) throw readErr;
        const now = new Date().toISOString();
        const patch = { is_active: status === "active", archived_at: status === "archived" ? now : null };
        const { error } = await db.from("products").update(patch).in("id", list);
        if (error) throw error;
        refresh();
        for (const p of before ?? []) log(me, "UPDATE", "product", p.id, { oldData: { is_active: p.is_active, archived_at: p.archived_at, name: p.name }, newData: { ...patch, name: p.name } });
        return { ok: true, before: (before ?? []).map((p: any) => ({ id: p.id, is_active: p.is_active, archived_at: p.archived_at })) };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.status" });
        return FAILED;
    }
}

/** Undo for setProductStatus: puts each product's two columns back. */
export async function restoreProductStatus(snaps: StatusSnap[]): Promise<{ ok: true } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    const list = (Array.isArray(snaps) ? snaps : []).filter(s => s && UUID.test(String(s.id))).slice(0, 500);
    try {
        for (const s of list) {
            const archived = typeof s.archived_at === "string" && !Number.isNaN(Date.parse(s.archived_at)) ? s.archived_at : null;
            const { error } = await db.from("products").update({ is_active: s.is_active === true, archived_at: archived }).eq("id", s.id);
            if (error) throw error;
        }
        refresh();
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.status-undo" });
        return FAILED;
    }
}

/**
 * Put products into a wholesale category. "add" keeps their other categories;
 * "replace" is what the old bulk Wholesale button did (the category becomes
 * the only one in category_ids and category_id).
 */
export async function assignWholesale(productIds: string[], categoryId: string, mode: "add" | "replace"): Promise<{ ok: true; count: number } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    const list = ids(productIds);
    if (!list.length || !UUID.test(categoryId)) return FAILED;
    try {
        const { data: cat } = await db.from("categories").select("id, name, is_wholesale").eq("id", categoryId).maybeSingle();
        if (!cat?.is_wholesale) return { ok: false, error: "Choose a wholesale category. Switch on Wholesale for a category first." };
        if (mode === "replace") {
            const { error } = await db.from("products").update({ category_id: categoryId, category_ids: [categoryId] }).in("id", list);
            if (error) throw error;
        } else {
            const { data: rows, error: readErr } = await db.from("products").select("id, category_ids").in("id", list);
            if (readErr) throw readErr;
            for (const p of rows ?? []) {
                const cur: string[] = p.category_ids ?? [];
                if (cur.includes(categoryId)) continue;
                const { error } = await db.from("products").update({ category_ids: [...cur, categoryId] }).eq("id", p.id);
                if (error) throw error;
            }
        }
        refresh();
        log(me, "UPDATE", "product", undefined, { details: { bulk: "assign_wholesale", category: cat.name, mode, count: list.length } });
        return { ok: true, count: list.length };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.wholesale" });
        return FAILED;
    }
}

/** Pre-orders on or off for many products, with the ships-in weeks (the old inline Pre-Order control). */
export async function setPreorder(productIds: string[], enabled: boolean, weeks: number): Promise<{ ok: true } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    const list = ids(productIds);
    const w = Math.trunc(Number(weeks));
    if (!list.length || (enabled && !(w >= 1 && w <= 52))) return FAILED;
    try {
        const patch = { preorder_enabled: enabled === true, preorder_estimated_date: enabled ? weeksToDate(w) : null };
        const { error } = await db.from("products").update(patch).in("id", list);
        if (error) throw error;
        refresh();
        log(me, "UPDATE", "product", list.length === 1 ? list[0] : undefined, { details: { bulk: "preorder", ...patch, count: list.length } });
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.preorder" });
        return FAILED;
    }
}

/** The old bulk Untrack: stock isn't counted any more and the product is always available. */
export async function stopTracking(productIds: string[]): Promise<{ ok: true } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    const list = ids(productIds);
    if (!list.length) return FAILED;
    try {
        const { error } = await db.from("products").update({ track_inventory: false, inventory_count: 9999 }).in("id", list);
        if (error) throw error;
        refresh();
        log(me, "UPDATE", "product", undefined, { details: { bulk: "untrack", count: list.length } });
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.untrack" });
        return FAILED;
    }
}

const price = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Math.round(Number(v) * 100) / 100;
    return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? n : NaN;
};

/** Edit prices: price and was price for several products. */
export async function updatePrices(rows: { id: string; price: string; compare: string }[]): Promise<{ ok: true; count: number } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    const list = (Array.isArray(rows) ? rows : []).filter(r => r && UUID.test(String(r.id))).slice(0, 200);
    const clean = list.map(r => ({ id: r.id, price: price(r.price), compare: price(r.compare) }));
    if (clean.some(r => r.price == null || Number.isNaN(r.price) || (r.price as number) <= 0 || Number.isNaN(r.compare))) {
        return { ok: false, error: "Each price must be an amount above zero. Was price can be empty." };
    }
    try {
        const { data: before } = await db.from("products").select("id, name, price_ghs, compare_at_price_ghs").in("id", clean.map(r => r.id));
        for (const r of clean) {
            const { error } = await db.from("products").update({ price_ghs: r.price, compare_at_price_ghs: r.compare }).eq("id", r.id);
            if (error) throw error;
            const old = (before ?? []).find((b: any) => b.id === r.id);
            log(me, "UPDATE", "product", r.id, { oldData: old ? { name: old.name, price_ghs: old.price_ghs, compare_at_price_ghs: old.compare_at_price_ghs } : undefined, newData: { name: old?.name, price_ghs: r.price, compare_at_price_ghs: r.compare } });
        }
        refresh();
        return { ok: true, count: clean.length };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.prices" });
        return FAILED;
    }
}

/** Delete a product for good (owners and admins). Its stock history stays in the ledger. */
export async function deleteProduct(id: string): Promise<{ ok: true } | Fail> {
    const me = await caller(FULL);
    if (isFail(me)) return me;
    if (!UUID.test(id)) return FAILED;
    try {
        const { data: old } = await db.from("products").select("id, name, slug, sku").eq("id", id).maybeSingle();
        if (!old) return { ok: false, error: "That product isn't there any more." };
        const { error } = await db.from("products").delete().eq("id", id);
        if (error) {
            // A checkout or till sale holding it (reservation rows) blocks the delete.
            if (error.code === "23503") return { ok: false, error: "A checkout or till sale is holding this product right now. Archive it instead, or try again in a few minutes." };
            throw error;
        }
        refresh();
        log(me, "DELETE", "product", id, { oldData: old });
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.delete" });
        return FAILED;
    }
}

// ── Categories ─────────────────────────────────────────────────────────────

export type CategoryInput = {
    name: string; slug: string; description: string; image_url: string | null;
    is_active: boolean; is_featured: boolean; is_wholesale: boolean;
    tier1: string; tier2: string; tier3: string;
    preorder_enabled: boolean; preorder_weeks: string; sort_order: string;
};

const MAX_FEATURED = 3;
const str = (v: unknown, max: number) => (typeof v === "string" ? v : v == null ? "" : String(v)).trim().slice(0, max);

function cleanCategory(input: unknown): { ok: true; row: Record<string, unknown> } | Fail {
    const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const name = str(o.name, 80);
    const slug = slugify(str(o.slug, 120) || name);
    if (!name) return { ok: false, error: "Give the category a name." };
    if (!slug) return { ok: false, error: "Add a web address, using letters and numbers." };
    const wholesale = o.is_wholesale === true;
    const pre = o.preorder_enabled === true;
    const weeks = Math.trunc(Number(o.preorder_weeks));
    if (pre && !(weeks >= 1 && weeks <= 52)) return { ok: false, error: "Choose between 1 and 52 weeks for pre-orders." };
    const tiers = [o.tier1, o.tier2, o.tier3].map(price);
    if (wholesale && tiers.some(t => Number.isNaN(t))) return { ok: false, error: "Enter each wholesale price as an amount, or leave it empty." };
    const sort = Math.trunc(Number(o.sort_order));
    const image = typeof o.image_url === "string" && /^https:\/\//.test(o.image_url) ? o.image_url.slice(0, 1000) : null;
    return {
        ok: true,
        row: {
            name, slug, description: str(o.description, 2000) || null, image_url: image,
            is_active: o.is_active !== false, is_featured: o.is_featured === true, is_wholesale: wholesale,
            wholesale_tier_1_price: wholesale ? tiers[0] : null, wholesale_tier_2_price: wholesale ? tiers[1] : null, wholesale_tier_3_price: wholesale ? tiers[2] : null,
            preorder_enabled: pre, preorder_estimated_weeks: pre ? weeks : 0,
            sort_order: Number.isFinite(sort) ? Math.max(-10000, Math.min(10000, sort)) : 0,
        },
    };
}

async function featuredCount(exceptId: string | null): Promise<number> {
    let q = db.from("categories").select("id", { count: "exact", head: true }).eq("is_featured", true);
    if (exceptId) q = q.neq("id", exceptId);
    const { count } = await q;
    return count ?? 0;
}

/** Create or change a category. Turning pre-orders on or off applies to its products, as the old page did. */
export async function saveCategory(id: string | null, input: unknown): Promise<{ ok: true; id: string; preorderApplied: number | null } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    if (id !== null && !UUID.test(id)) return FAILED;
    const c = cleanCategory(input);
    if (!c.ok) return c;
    try {
        const old = id ? (await db.from("categories").select("*").eq("id", id).maybeSingle()).data : null;
        if (id && !old) return { ok: false, error: "That category isn't there any more. Please refresh." };
        if (c.row.is_featured && !old?.is_featured && (await featuredCount(id)) >= MAX_FEATURED) {
            return { ok: false, error: `Only ${MAX_FEATURED} categories can be on the home page. Take one off first.` };
        }
        const { data: saved, error } = id
            ? await db.from("categories").update(c.row).eq("id", id).select("id").single()
            : await db.from("categories").insert([c.row]).select("id").single();
        if (error) {
            if (error.code === "23505") return { ok: false, error: "Another category already uses that web address. Change it and save again." };
            throw error;
        }
        // The old page set pre-order on every product in the category whenever it
        // saved an existing category. Kept, but only when the setting changed.
        let preorderApplied: number | null = null;
        if (old && (old.preorder_enabled !== c.row.preorder_enabled || (c.row.preorder_enabled && old.preorder_estimated_weeks !== c.row.preorder_estimated_weeks))) {
            const { data: matched } = await db.from("products").select("id").or(`category_type.eq.${old.slug},category_ids.cs.{${old.id}}`);
            const list = (matched ?? []).map((p: any) => p.id);
            if (list.length) {
                const weeks = Number(c.row.preorder_estimated_weeks) || 0;
                const { error: pe } = await db.from("products").update({
                    preorder_enabled: c.row.preorder_enabled, preorder_estimated_date: c.row.preorder_enabled && weeks > 0 ? weeksToDate(weeks) : null,
                }).in("id", list);
                if (pe) throw pe;
                preorderApplied = list.length;
            }
        }
        revalidatePath("/catalogue", "layout");
        revalidatePath("/catalog/categories");
        log(me, id ? "UPDATE" : "CREATE", "category", saved.id, { oldData: old ?? undefined, newData: c.row });
        if (preorderApplied) refresh();
        return { ok: true, id: saved.id, preorderApplied };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.category-save" });
        return FAILED;
    }
}

/** The list's switches: Show on the home page, and Show in the shop. */
export async function setCategoryFlag(id: string, flag: "is_featured" | "is_active", on: boolean): Promise<{ ok: true } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    if (!UUID.test(id) || !["is_featured", "is_active"].includes(flag)) return FAILED;
    try {
        if (flag === "is_featured" && on && (await featuredCount(id)) >= MAX_FEATURED) {
            return { ok: false, error: `Only ${MAX_FEATURED} categories can be on the home page. Take one off first.` };
        }
        const { data: old } = await db.from("categories").select("id, name, is_featured, is_active").eq("id", id).maybeSingle();
        if (!old) return { ok: false, error: "That category isn't there any more. Please refresh." };
        const { error } = await db.from("categories").update({ [flag]: on === true }).eq("id", id);
        if (error) throw error;
        revalidatePath("/catalogue", "layout");
        revalidatePath("/catalog/categories");
        revalidatePath("/", "page");
        log(me, "UPDATE", "category", id, { oldData: old, newData: { ...old, [flag]: on === true } });
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.category-flag" });
        return FAILED;
    }
}

/** Delete a category that no product points at. */
export async function deleteCategory(id: string): Promise<{ ok: true } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    if (!UUID.test(id)) return FAILED;
    try {
        const { data: old } = await db.from("categories").select("*").eq("id", id).maybeSingle();
        if (!old) return { ok: false, error: "That category isn't there any more." };
        const { count } = await db.from("products").select("id", { count: "exact", head: true })
            .or(`category_id.eq.${id},wholesale_category_id.eq.${id},category_ids.cs.{${id}},category_type.ilike."${old.name.replace(/[,()%*\\"]/g, "")}"`);
        if ((count ?? 0) > 0) return { ok: false, error: `Move its ${count === 1 ? "product" : `${count} products`} to another category first.` };
        const { error } = await db.from("categories").delete().eq("id", id);
        if (error) {
            if (error.code === "23503") return { ok: false, error: "A discount or product still points at this category. Change it first, then delete." };
            throw error;
        }
        revalidatePath("/catalogue", "layout");
        revalidatePath("/catalog/categories");
        log(me, "DELETE", "category", id, { oldData: old });
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.category-delete" });
        return FAILED;
    }
}

/** The old "Duplicate as Wholesale": a wholesale copy that its products join. */
export async function duplicateAsWholesale(id: string): Promise<{ ok: true; id: string; count: number } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    if (!UUID.test(id)) return FAILED;
    try {
        const { data: cat } = await db.from("categories").select("*").eq("id", id).maybeSingle();
        if (!cat) return { ok: false, error: "That category isn't there any more." };
        if (cat.is_wholesale) return { ok: false, error: "This is already a wholesale category." };
        const row = { name: `${cat.name} Wholesale`, slug: `${cat.slug}-wholesale`, description: cat.description, image_url: cat.image_url, is_active: true, is_wholesale: true };
        const { data: created, error } = await db.from("categories").insert([row]).select("id").single();
        if (error) {
            if (error.code === "23505") return { ok: false, error: "A wholesale copy of this category already exists." };
            throw error;
        }
        const { data: matched } = await db.from("products").select("id, category_ids").eq("category_type", cat.slug);
        for (const p of matched ?? []) {
            const cur: string[] = p.category_ids ?? [];
            if (cur.includes(created.id)) continue;
            const { error: ue } = await db.from("products").update({ category_ids: [...cur, created.id] }).eq("id", p.id);
            if (ue) throw ue;
        }
        revalidatePath("/catalogue", "layout");
        revalidatePath("/catalog/categories");
        log(me, "CREATE", "category", created.id, { newData: row, details: { duplicated_from: cat.name, products: (matched ?? []).length } });
        return { ok: true, id: created.id, count: (matched ?? []).length };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.category-duplicate" });
        return FAILED;
    }
}

// ── Gift cards ─────────────────────────────────────────────────────────────

export type Redemption = { id: string; amount_used: number; balance_before: number; balance_after: number; redeemed_at: string };

export async function giftCardDetail(id: string): Promise<{ ok: true; card: GiftCardRow; redemptions: Redemption[] } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    if (!UUID.test(id)) return FAILED;
    try {
        const [c, r] = await Promise.all([
            db.from("gift_cards").select(GIFT_COLUMNS).eq("id", id).maybeSingle(),
            db.from("gift_card_redemptions").select("id, amount_used, balance_before, balance_after, redeemed_at").eq("gift_card_id", id).order("redeemed_at", { ascending: false }).limit(200),
        ]);
        if (c.error) throw c.error;
        if (!c.data) return { ok: false, error: "That gift card isn't there any more." };
        return { ok: true, card: c.data as GiftCardRow, redemptions: (r.data ?? []) as Redemption[] };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.giftcard" });
        return { ok: false, error: "We couldn't load that gift card just now. Please try again." };
    }
}

/** Cancel a gift card: the code stops working. No money moves. */
export async function cancelGiftCard(id: string): Promise<{ ok: true } | Fail> {
    const me = await caller();
    if (isFail(me)) return me;
    if (!UUID.test(id)) return FAILED;
    try {
        const { data: old } = await db.from("gift_cards").select("id, code, status, remaining_value").eq("id", id).maybeSingle();
        if (!old) return { ok: false, error: "That gift card isn't there any more." };
        if (old.status === "cancelled") return { ok: true };
        const { error } = await db.from("gift_cards").update({ status: "cancelled", is_active: false }).eq("id", id);
        if (error) throw error;
        revalidatePath("/catalogue", "layout");
        revalidatePath("/catalog/gift-cards");
        log(me, "UPDATE", "gift_card", id, { oldData: { name: old.code, status: old.status }, newData: { name: old.code, status: "cancelled" } });
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.giftcard-cancel" });
        return FAILED;
    }
}
