"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/utils/logActivity";

async function getCallerOrFail() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (!profile || !["owner", "sales_staff"].includes(profile.role)) return null;
    return { userId: user.id, userRole: profile.role };
}

export async function createCoupon(payload: Record<string, unknown>) {
    const caller = await getCallerOrFail();
    if (!caller) return { error: "Unauthorized" };

    const { data, error } = await supabaseAdmin
        .from("coupons")
        .insert([payload])
        .select()
        .single();
    if (error) return { error: error.message };

    await logActivity({
        userId: caller.userId,
        userRole: caller.userRole,
        actionType: "CREATE_DISCOUNT",
        resource: "discount",
        resourceId: data.id,
        details: { code: payload.code, discount_type: payload.discount_type, discount_value: payload.discount_value },
    });
    return { success: true, data };
}

export async function toggleCoupon(id: string, currentIsActive: boolean, code: string) {
    const caller = await getCallerOrFail();
    if (!caller) return { error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from("coupons")
        .update({ is_active: !currentIsActive })
        .eq("id", id);
    if (error) return { error: error.message };

    await logActivity({
        userId: caller.userId,
        userRole: caller.userRole,
        actionType: "TOGGLE_DISCOUNT",
        resource: "discount",
        resourceId: id,
        details: { code, is_active: !currentIsActive },
    });
    return { success: true };
}

export async function deleteCoupon(id: string, code: string) {
    const caller = await getCallerOrFail();
    if (!caller) return { error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from("coupons")
        .delete()
        .eq("id", id);
    if (error) return { error: error.message };

    await logActivity({
        userId: caller.userId,
        userRole: caller.userRole,
        actionType: "DELETE_DISCOUNT",
        resource: "discount",
        resourceId: id,
        details: { code },
    });
    return { success: true };
}
