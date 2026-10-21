"use server";

// Discounts server actions (admin v2). Server actions are public endpoints
// that run on the service role, so each one checks the caller's role itself,
// with the same role lists as the old pages' actions:
//   codes      admin, owner and sales staff (catalog/discounts/actions.ts;
//              admins were added in October 2026 at the owner's request)
//   automatic  admin, owner and sales staff (catalog/auto-discounts/actions.ts)
// Every change is logged with the old pages' action types (plus
// UPDATE_DISCOUNT, since codes can now be edited). The browser then calls
// /api/admin/revalidate-discounts, as the old pages did.
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/utils/logActivity";
import { logCause } from "@/lib/errors/apiError";
import { ilikeExact } from "@/lib/admin/v2/customers";
import { autoPayload, cleanForm, couponPayload, validateForm, type FormErrors, type Kind } from "@/lib/admin/v2/discounts";
import { AUTO_COLUMNS, COUPON_COLUMNS, recentOrders, searchProducts, type ProductPick, type ResultOrder } from "@/lib/admin/v2/discountsLoad";

type Role = "admin" | "owner" | "sales_staff";
type Me = { userId: string; role: Role };
type Fail = { ok: false; error: string; fields?: FormErrors };

const db = supabaseAdmin as any;
const STAFF: Role[] = ["admin", "owner", "sales_staff"];
const ROLES: Record<Kind, Role[]> = { code: ["admin", "owner", "sales_staff"], auto: ["admin", "owner", "sales_staff"] };
const SIGNED_OUT: Fail = { ok: false, error: "Please sign in again to change discounts." };
const FAILED = "We couldn't save that just now. Nothing was changed. Please try again.";
const GONE = "That discount isn't there any more. Please refresh.";

async function caller(): Promise<Me | null> {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role as Role | undefined;
    if (!role || !STAFF.includes(role)) return null;
    return { userId: user.id, role };
}

async function allowed(kind: Kind): Promise<Me | Fail> {
    const me = await caller();
    if (!me) return SIGNED_OUT;
    if (!ROLES[kind].includes(me.role)) return SIGNED_OUT;
    return me;
}
const isFail = (x: Me | Fail): x is Fail => "ok" in x;

const refresh = () => revalidatePath("/discounts", "layout");
const isUuid = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);

/** Is this code already taken by another code or by a gift card (which a code would shadow at checkout)? */
async function codeTaken(code: string, exceptId: string | null): Promise<boolean> {
    const pattern = ilikeExact(code);
    const [{ data: coupons }, { data: cards }] = await Promise.all([
        db.from("coupons").select("id").ilike("code", pattern).limit(2),
        db.from("gift_cards").select("id").ilike("code", pattern).limit(1),
    ]);
    return (coupons ?? []).some((c: { id: string }) => c.id !== exceptId) || (cards ?? []).length > 0;
}

/** Create or change a discount code. */
export async function saveCode(id: string | null, input: unknown): Promise<{ ok: true; id: string } | Fail> {
    const me = await allowed("code");
    if (isFail(me)) return me;
    if (id !== null && !isUuid(id)) return { ok: false, error: GONE };
    const form = cleanForm(input, "code");
    try {
        const before = id ? (await db.from("coupons").select(COUPON_COLUMNS).eq("id", id).maybeSingle()).data : null;
        if (id && !before) return { ok: false, error: GONE };
        const renamed = !before || before.code.toUpperCase() !== form.code;
        const fields = validateForm(form, renamed);
        if (Object.keys(fields).length) return { ok: false, error: "Check the highlighted fields.", fields };
        // Results are matched by the code on each order, so a used code keeps its name
        if (before && renamed && Number(before.used_count) > 0) {
            return { ok: false, error: "This code has been used, so it can't be renamed. Create a new code instead.", fields: { code: "Used codes keep their name so their results stay linked." } };
        }
        if (renamed && await codeTaken(form.code, id)) {
            return { ok: false, error: "That code is already in use.", fields: { code: "Another code or a gift card already uses this. Pick a different one." } };
        }
        const payload = couponPayload(form);
        const { data, error } = id
            ? await db.from("coupons").update(payload).eq("id", id).select(COUPON_COLUMNS).single()
            : await db.from("coupons").insert([{ ...payload, is_active: form.isActive, used_count: 0 }]).select(COUPON_COLUMNS).single();
        if (error) throw error;
        after(() => logActivity({
            userId: me.userId, userRole: me.role,
            actionType: id ? "UPDATE_DISCOUNT" : "CREATE_DISCOUNT",
            resource: "discount", resourceId: data.id,
            oldData: before ?? undefined, newData: id ? data : undefined,
            details: { code: data.code, discount_type: data.discount_type, discount_value: data.discount_value },
        }));
        refresh();
        return { ok: true, id: data.id };
    } catch (e) {
        logCause("GEN-00", e, { where: "discounts.saveCode" });
        return { ok: false, error: FAILED };
    }
}

/** Create or change an automatic discount. */
export async function saveAuto(id: string | null, input: unknown): Promise<{ ok: true; id: string } | Fail> {
    const me = await allowed("auto");
    if (isFail(me)) return me;
    if (id !== null && !isUuid(id)) return { ok: false, error: GONE };
    const form = cleanForm(input, "auto");
    const fields = validateForm(form);
    if (Object.keys(fields).length) return { ok: false, error: "Check the highlighted fields.", fields };
    try {
        const before = id ? (await db.from("automatic_discounts").select(AUTO_COLUMNS).eq("id", id).maybeSingle()).data : null;
        if (id && !before) return { ok: false, error: GONE };
        const payload = autoPayload(form);
        const { data, error } = id
            ? await db.from("automatic_discounts").update(payload).eq("id", id).select(AUTO_COLUMNS).single()
            : await db.from("automatic_discounts").insert([{ ...payload, is_active: form.isActive }]).select(AUTO_COLUMNS).single();
        if (error) throw error;
        after(() => logActivity({
            userId: me.userId, userRole: me.role,
            actionType: id ? "UPDATE_AUTO_DISCOUNT" : "CREATE_AUTO_DISCOUNT",
            resource: "auto_discount", resourceId: data.id,
            oldData: before ?? undefined, newData: id ? data : undefined,
            details: { title: data.title, discount_type: data.discount_type, discount_value: data.discount_value },
        }));
        refresh();
        return { ok: true, id: data.id };
    } catch (e) {
        logCause("GEN-00", e, { where: "discounts.saveAuto" });
        return { ok: false, error: FAILED };
    }
}

/** Switch a discount on or off. */
export async function setDiscountActive(kind: Kind, id: string, active: boolean): Promise<{ ok: true } | Fail> {
    const me = await allowed(kind);
    if (isFail(me)) return me;
    if (!isUuid(id) || (kind !== "code" && kind !== "auto")) return { ok: false, error: GONE };
    const table = kind === "code" ? "coupons" : "automatic_discounts";
    try {
        const { data, error } = await db.from(table).update({ is_active: active === true }).eq("id", id).select(kind === "code" ? "code" : "title").maybeSingle();
        if (error) throw error;
        if (!data) return { ok: false, error: GONE };
        after(() => logActivity({
            userId: me.userId, userRole: me.role,
            actionType: kind === "code" ? "TOGGLE_DISCOUNT" : "TOGGLE_AUTO_DISCOUNT",
            resource: kind === "code" ? "discount" : "auto_discount", resourceId: id,
            details: kind === "code" ? { code: data.code, is_active: active === true } : { title: data.title, is_active: active === true },
        }));
        refresh();
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "discounts.setActive" });
        return { ok: false, error: FAILED };
    }
}

/** Delete a discount. Orders that used it keep the code or title written on them. */
export async function deleteDiscount(kind: Kind, id: string): Promise<{ ok: true } | Fail> {
    const me = await allowed(kind);
    if (isFail(me)) return me;
    if (!isUuid(id) || (kind !== "code" && kind !== "auto")) return { ok: false, error: GONE };
    const table = kind === "code" ? "coupons" : "automatic_discounts";
    try {
        const { data, error } = await db.from(table).delete().eq("id", id).select(kind === "code" ? "code" : "title").maybeSingle();
        if (error) throw error;
        if (!data) return { ok: false, error: GONE };
        after(() => logActivity({
            userId: me.userId, userRole: me.role,
            actionType: kind === "code" ? "DELETE_DISCOUNT" : "DELETE_AUTO_DISCOUNT",
            resource: kind === "code" ? "discount" : "auto_discount", resourceId: id,
            details: kind === "code" ? { code: data.code } : { title: data.title },
        }));
        refresh();
        return { ok: true };
    } catch (e) {
        logCause("GEN-00", e, { where: "discounts.delete" });
        return { ok: false, error: "We couldn't delete that just now. Nothing was changed. Please try again." };
    }
}

/** The Results tab's latest orders. Any staff member can see them. */
export async function getRecentOrders(kind: Kind, id: string): Promise<{ ok: true; orders: ResultOrder[] } | Fail> {
    const me = await caller();
    if (!me) return SIGNED_OUT;
    if (!isUuid(id) || (kind !== "code" && kind !== "auto")) return { ok: false, error: GONE };
    try {
        return { ok: true, orders: await recentOrders(kind, id) };
    } catch (e) {
        logCause("GEN-00", e, { where: "discounts.recentOrders" });
        return { ok: false, error: "We couldn't load the orders. Please try again." };
    }
}

/** Products for the Applies to picker. */
export async function findProducts(q: string): Promise<{ ok: true; products: ProductPick[] } | Fail> {
    const me = await caller();
    if (!me) return SIGNED_OUT;
    try {
        return { ok: true, products: await searchProducts(typeof q === "string" ? q : "") };
    } catch (e) {
        logCause("GEN-00", e, { where: "discounts.findProducts" });
        return { ok: false, error: "We couldn't search products just now. Please try again." };
    }
}
