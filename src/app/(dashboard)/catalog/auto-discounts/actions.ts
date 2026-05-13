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

export async function saveAutoDiscount(
    payload: Record<string, unknown>,
    editingId: string | null
) {
    const caller = await getCallerOrFail();
    if (!caller) return { error: "Unauthorized" };

    const { data, error } = editingId
        ? await supabaseAdmin.from("automatic_discounts").update(payload).eq("id", editingId).select().single()
        : await supabaseAdmin.from("automatic_discounts").insert([payload]).select().single();
    if (error) return { error: error.message };

    await logActivity({
        userId: caller.userId,
        userRole: caller.userRole,
        actionType: editingId ? "UPDATE_AUTO_DISCOUNT" : "CREATE_AUTO_DISCOUNT",
        resource: "auto_discount",
        resourceId: (data as any).id,
        details: { title: payload.title, discount_type: payload.discount_type, discount_value: payload.discount_value },
    });
    return { success: true, data };
}

export async function toggleAutoDiscount(id: string, currentIsActive: boolean, title: string) {
    const caller = await getCallerOrFail();
    if (!caller) return { error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from("automatic_discounts")
        .update({ is_active: !currentIsActive })
        .eq("id", id);
    if (error) return { error: error.message };

    await logActivity({
        userId: caller.userId,
        userRole: caller.userRole,
        actionType: "TOGGLE_AUTO_DISCOUNT",
        resource: "auto_discount",
        resourceId: id,
        details: { title, is_active: !currentIsActive },
    });
    return { success: true };
}

export async function deleteAutoDiscount(id: string, title: string) {
    const caller = await getCallerOrFail();
    if (!caller) return { error: "Unauthorized" };

    const { error } = await supabaseAdmin
        .from("automatic_discounts")
        .delete()
        .eq("id", id);
    if (error) return { error: error.message };

    await logActivity({
        userId: caller.userId,
        userRole: caller.userRole,
        actionType: "DELETE_AUTO_DISCOUNT",
        resource: "auto_discount",
        resourceId: id,
        details: { title },
    });
    return { success: true };
}
