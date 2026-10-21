// The order views Home counts, as PostgREST filters. Home's "Needs you today"
// numbers must match the Orders views they open, so the Orders list should
// filter with these same functions (/orders?view=to-pack|unpaid|ready).
// "to-pack" is exactly the side-nav Orders count (/api/admin/v2/nav-counts).
// No Supabase import: pass the builder in.

export type OrderView = "to-pack" | "unpaid" | "ready";

/** The PostgREST filter methods these views use. */
interface Filterable {
    eq(column: string, value: unknown): Filterable;
    in(column: string, values: readonly unknown[]): Filterable;
    not(column: string, operator: string, value: unknown): Filterable;
}
// Unconstrained T on purpose: checking a supabase-js builder against an
// interface instantiates its whole generic type and blows the compiler's depth.
const f = (q: unknown) => q as Filterable;

/** Paid, not packed: fulfilment still inbox/processing (or only partly packed), and not closed. */
export function applyToPack<T>(q: T): T {
    return f(q).eq("payment_status", "paid")
        .in("fulfillment_status", ["inbox", "processing", "partial"])
        .not("status", "in", "(cancelled,refunded,fulfilled,delivered)") as T;
}

/** Checkout started, payment not confirmed, and the order wasn't called off. */
export function applyUnpaid<T>(q: T): T {
    return f(q).in("payment_status", ["pending", "processing"])
        .not("status", "in", "(cancelled,refunded,failed)") as T;
}

/** Ready for collection: the old Orders › Pickups tab (status ready_for_pickup). */
export function applyReady<T>(q: T): T {
    return f(q).eq("status", "ready_for_pickup") as T;
}

export const ORDER_VIEW_FILTERS: Record<OrderView, <T>(q: T) => T> = {
    "to-pack": applyToPack,
    unpaid: applyUnpaid,
    ready: applyReady,
};
