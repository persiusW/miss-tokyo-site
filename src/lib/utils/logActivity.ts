import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface ActivityLogProps {
    userId: string;
    userRole: string;
    actionType: string;
    resource: string;
    resourceId?: string;
    details?: any;
}

export async function logActivity({ userId, userRole, actionType, resource, resourceId, details }: ActivityLogProps) {
    if (userRole === "admin") {
        return; // We only log CRUD tasks for owner and sales_staff
    }

    try {
        await supabaseAdmin.from("activity_logs").insert({
            user_id: userId,
            user_role: userRole,
            action_type: actionType,
            resource,
            resource_id: resourceId,
            details,
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}
