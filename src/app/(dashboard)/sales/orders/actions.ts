"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/utils/logActivity";
import { revalidatePath } from "next/cache";

// Keep status and fulfillment_status in sync so tab filtering is always consistent.
// OrdersClient filters by `status`; order detail page updates `fulfillment_status`.
// Without this sync, changing fulfillment from the detail page leaves `status = "paid"` → order reappears in Inbox.
const FULFILLMENT_TO_STATUS: Record<string, string> = {
    inbox:             "paid",
    processing:        "processing",
    packed:            "packed",
    shipped:           "shipped",
    ready_for_pickup:  "ready_for_pickup",
    delivered:         "delivered",
};

const STATUS_TO_FULFILLMENT: Record<string, string> = {
    paid:             "inbox",
    processing:       "processing",
    packed:           "packed",
    shipped:          "shipped",
    ready_for_pickup: "ready_for_pickup",
    fulfilled:        "delivered",
    delivered:        "delivered",
};

export async function updateOrderStatus(orderId: string, newStatus: string, extraData?: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile) return { success: false, error: "Profile not found" };

    // Fetch old record for diffing and info
    const { data: oldData } = await supabaseAdmin.from("orders").select("*, riders(full_name)").eq("id", orderId).single();
    if (!oldData) return { success: false, error: "Order not found" };

    const syncedFulfillment = STATUS_TO_FULFILLMENT[newStatus];
    const PAYMENT_STATUSES = ["pending", "paid", "refunded", "cancelled"];
    const updateData: any = {
        status: newStatus,
        ...(PAYMENT_STATUSES.includes(newStatus) ? { payment_status: newStatus } : {}),
        ...(syncedFulfillment ? { fulfillment_status: syncedFulfillment } : {}),
        ...extraData,
    };
    if (newStatus === "packed" && !oldData.packed_by) {
        updateData.packed_by = user.id;
    }

    // Determine Action Label
    let actionType = "UPDATE_STATUS";
    if (newStatus === "packed") actionType = "PACKED_ORDER";
    else if (newStatus === "shipped") actionType = "DISPATCHED_ORDER";
    else if (newStatus === "delivered") actionType = "DELIVERED_ORDER";
    
    // If rider_id changed
    if (updateData.assigned_rider_id && updateData.assigned_rider_id !== oldData.assigned_rider_id) {
        actionType = "ASSIGNED_RIDER";
    }

    const { error } = await supabaseAdmin.from("orders").update(updateData).eq("id", orderId);
    if (error) {
        console.error("Failed to update order:", error);
        return { success: false, error: error.message };
    }

    // Fetch rider name if assigned
    let riderName = oldData.riders?.full_name;
    if (updateData.assigned_rider_id && updateData.assigned_rider_id !== oldData.assigned_rider_id) {
        const { data: rider } = await supabase.from("riders").select("full_name").eq("id", updateData.assigned_rider_id).single();
        riderName = rider?.full_name;
    }

    // LOG ACTIVITY
    await logActivity({
        userId: user.id,
        userRole: profile.role,
        actionType,
        resource: "order",
        resourceId: orderId,
        oldData,
        newData: updateData,
        details: { 
            order_number: orderId.slice(0, 8),
            resource_name: `Order #${orderId.slice(0, 8)}`,
            rider_name: riderName,
            previous_status: oldData.status,
            new_status: newStatus,
            ...extraData
        }
    });

    revalidatePath(`/sales/orders/${orderId}`, "page");
    revalidatePath("/sales/orders", "page");

    return { success: true };
}

export async function updateFulfillmentStatus(orderId: string, fulfillment_status: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Sync the legacy `status` column so Inbox/Packed/Shipped tabs remain accurate.
    const syncedStatus = FULFILLMENT_TO_STATUS[fulfillment_status];
    const { error } = await supabaseAdmin
        .from("orders")
        .update({
            fulfillment_status,
            ...(syncedStatus ? { status: syncedStatus } : {}),
        })
        .eq("id", orderId);

    if (error) {
        console.error("Failed to update fulfillment status:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/sales/orders/${orderId}`, "page");
    revalidatePath("/sales/orders", "page");

    return { success: true };
}
