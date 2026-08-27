import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeDiff } from "@/lib/utils/activityDiff";

interface ActivityLogProps {
    userId: string;
    userRole: string;
    actionType: string;
    resource: string;
    resourceId?: string;
    oldData?: any;
    newData?: any;
    details?: any; // any extra info
}

/** Roles whose actions are worth recording. Everything staff-facing. */
const LOGGED_ROLES = ["owner", "admin", "sales_staff"];

export async function logActivity({ userId, userRole, actionType, resource, resourceId, oldData, newData, details = {} }: ActivityLogProps) {
    if (!LOGGED_ROLES.includes(userRole)) {
        return;
    }

    // Compute diff for UPDATE actions or if both exist
    const diff = (oldData && newData) ? computeDiff(oldData, newData) : null;
    const computedName = newData?.name || oldData?.name || details?.name || details?.full_name;
    const finalDetails = {
        ...details,
        ...(computedName && !details?.resource_name ? { resource_name: computedName } : {}),
        changes: diff
    };

    try {
        const { error } = await supabaseAdmin.from("activity_logs").insert({
            user_id: userId,
            user_role: userRole,
            action_type: actionType,
            resource,
            resource_id: resourceId,
            details: finalDetails,
        });

        // PostgREST reports a rejected insert in the response, not by throwing.
        // Discarding it is how the action_type CHECK constraint silently emptied
        // the audit trail for orders, invites and discounts for months. An audit
        // trail that fails quietly is worse than none, because it looks fine.
        if (error) {
            console.error(
                `[activity-log] insert rejected for ${actionType} on ${resource}:`,
                error.message,
            );
        }
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}
