"use server";

import { createClient } from "@/lib/supabaseServer";
import { logActivity } from "@/lib/utils/logActivity";
import { revalidatePath } from "next/cache";

export async function updateOrderStatus(orderId: string, newStatus: string, details?: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    
    if (!profile) return { success: false, error: "Profile not found" };

    let updateData: any = { status: newStatus };
    if (newStatus === "packed") {
        updateData.packed_by = user.id;
    }

    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
    
    if (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: error.message };
    }

    // LOG ACTIVITY
    await logActivity({
        userId: user.id,
        userRole: profile.role,
        actionType: "UPDATE_STATUS",
        resource: "order",
        resourceId: orderId,
        details: { status: newStatus, ...details }
    });

    revalidatePath(`/sales/orders/${orderId}`, "page");
    revalidatePath("/sales/orders", "page");

    return { success: true };
}
