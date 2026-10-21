"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/utils/logActivity";
import { logCause } from "@/lib/errors/apiError";

async function getCallerOrFail() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    // Owners, admins and sales staff manage codes. Admins were left out of
    // this list, so they got "Unauthorized" on every code action.
    if (!profile || !["admin", "owner", "sales_staff"].includes(profile.role)) return null;
    return { userId: user.id, userRole: profile.role };
}

const TYPES = ["fixed", "percentage", "free_shipping", "sale_price", "buy_x_get_y"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const numOrNull = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * The columns the page's form fills, and nothing else. This runs on the
 * service role, so the browser's object used to reach the table as it was.
 * Both category columns are kept equal: category_id is what both admin pages
 * write, target_category_id an older column the checkout also reads.
 */
function couponRow(p: Record<string, unknown>) {
    const type = String(p.discount_type ?? "");
    const category = typeof p.category_id === "string" && UUID.test(p.category_id) ? p.category_id : null;
    return {
        code: String(p.code ?? "").trim().toUpperCase().slice(0, 40),
        discount_type: TYPES.includes(type) ? type : "",
        is_active: true,
        used_count: 0,
        discount_value: numOrNull(p.discount_value) ?? 0,
        min_order_value: numOrNull(p.min_order_value),
        usage_limit: numOrNull(p.usage_limit),
        expires_at: typeof p.expires_at === "string" && p.expires_at ? p.expires_at : null,
        free_shipping: type === "free_shipping",
        buy_quantity: type === "buy_x_get_y" ? numOrNull(p.buy_quantity) : null,
        get_quantity: type === "buy_x_get_y" ? numOrNull(p.get_quantity) : null,
        category_id: type === "free_shipping" ? null : category,
        target_category_id: type === "free_shipping" ? null : category,
    };
}

export async function createCoupon(payload: Record<string, unknown>) {
    const caller = await getCallerOrFail();
    if (!caller) return { error: "Please sign in again to create discounts." };

    const row = couponRow(payload ?? {});
    if (!row.code || !row.discount_type) return { error: "Enter a code and pick a discount type." };

    const { data, error } = await supabaseAdmin
        .from("coupons")
        .insert([row])
        .select()
        .single();
    if (error) {
        logCause("GEN-00", error, { where: "catalog.discounts.create" });
        return { error: error.code === "23505" ? "That code is already in use. Pick a different one." : "We couldn't create that discount. Nothing was saved. Please try again." };
    }

    after(() => logActivity({
        userId: caller.userId,
        userRole: caller.userRole,
        actionType: "CREATE_DISCOUNT",
        resource: "discount",
        resourceId: data.id,
        details: { code: row.code, discount_type: row.discount_type, discount_value: row.discount_value },
    }));
    return { success: true, data };
}

export async function toggleCoupon(id: string, currentIsActive: boolean, code: string) {
    const caller = await getCallerOrFail();
    if (!caller) return { error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from("coupons")
        .update({ is_active: !currentIsActive })
        .eq("id", id);
    if (error) {
        logCause("GEN-00", error, { where: "catalog.discounts.toggle" });
        return { error: "We couldn't change that discount. Please try again." };
    }

    after(() => logActivity({
        userId: caller.userId,
        userRole: caller.userRole,
        actionType: "TOGGLE_DISCOUNT",
        resource: "discount",
        resourceId: id,
        details: { code, is_active: !currentIsActive },
    }));
    return { success: true };
}

export async function deleteCoupon(id: string, code: string) {
    const caller = await getCallerOrFail();
    if (!caller) return { error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from("coupons")
        .delete()
        .eq("id", id);
    if (error) {
        logCause("GEN-00", error, { where: "catalog.discounts.delete" });
        return { error: "We couldn't delete that discount. Please try again." };
    }

    after(() => logActivity({
        userId: caller.userId,
        userRole: caller.userRole,
        actionType: "DELETE_DISCOUNT",
        resource: "discount",
        resourceId: id,
        details: { code },
    }));
    return { success: true };
}
