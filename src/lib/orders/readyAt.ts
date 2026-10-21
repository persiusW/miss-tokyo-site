// orders.ready_at: when an order was last marked ready for collection, so
// Home and the order panel can say how long it has waited. Set only on the
// way IN to ready_for_pickup: sending the pickup notice again, or setting the
// same status twice, keeps the original time.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { READY_STATUS, becomesReady } from "./readyRules";

export { READY_STATUS, becomesReady };

/**
 * Stamps ready_at = now on the orders that are about to become ready and
 * aren't already. Call it just before the status update. Never throws: the
 * status change is what staff asked for, and a missing timestamp only means
 * Home words that row without a number of days.
 */
export async function stampReadyAt(orderIds: string[]): Promise<void> {
    if (!orderIds.length) return;
    try {
        const { error } = await supabaseAdmin
            .from("orders")
            .update({ ready_at: new Date().toISOString() })
            .in("id", orderIds)
            .neq("status", READY_STATUS)
            .neq("fulfillment_status", READY_STATUS);
        if (error) console.error("[orders] ready_at stamp rejected", { code: error.code });
    } catch (e) {
        console.error("[orders] ready_at stamp failed", { err: String(e) });
    }
}
