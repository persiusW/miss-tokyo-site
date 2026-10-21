// Pure: when an order counts as newly ready for collection. Kept apart from
// readyAt.ts so unit tests don't load a Supabase client.

export const READY_STATUS = "ready_for_pickup";

type Statusish = { status?: string | null; fulfillment_status?: string | null } | null | undefined;

/** True when this change moves the order into ready_for_pickup from anything else. */
export function becomesReady(prev: Statusish, next: { status?: string | null; fulfillment_status?: string | null }): boolean {
    const goingReady = next.status === READY_STATUS || next.fulfillment_status === READY_STATUS;
    if (!goingReady) return false;
    if (!prev) return true;
    return prev.status !== READY_STATUS && prev.fulfillment_status !== READY_STATUS;
}
