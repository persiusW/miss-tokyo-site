import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

function computeDiff(oldObj: any, newObj: any) {
    if (!oldObj || !newObj) return null;
    const changes: any = {};
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    for (const key of allKeys) {
        // Skip common metadata
        if (["id", "created_at", "updated_at", "slug"].includes(key)) continue;

        const oldVal = oldObj[key];
        const newVal = newObj[key];

        // Deep equal check for arrays/objects (simplified)
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes[key] = { from: oldVal, to: newVal };
        }
    }
    return Object.keys(changes).length > 0 ? changes : null;
}

export async function logActivity({ userId, userRole, actionType, resource, resourceId, oldData, newData, details = {} }: ActivityLogProps) {
    if (userRole === "admin") {
        return; // We only log CRUD tasks for owner and sales_staff
    }

    // Compute diff for UPDATE actions or if both exist
    const diff = (oldData && newData) ? computeDiff(oldData, newData) : null;
    const finalDetails = {
        ...details,
        resource_name: newData?.name || oldData?.name || details?.name || details?.full_name,
        changes: diff
    };

    try {
        await supabaseAdmin.from("activity_logs").insert({
            user_id: userId,
            user_role: userRole,
            action_type: actionType,
            resource,
            resource_id: resourceId,
            details: finalDetails,
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}
