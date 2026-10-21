// What the team says out loud about an order. The DB values don't change;
// only the labels do (README › Orders › Status language).
import { Badge, type Tone } from "./primitives";

export type PayKey = "paid" | "unpaid" | "refunded" | "partly_refunded" | "failed" | "void";
export type FulKey = "unfulfilled" | "packed" | "shipped" | "ready" | "delivered" | "collected" | "partly" | "cancelled";

export const PAY: Record<PayKey, [string, Tone]> = {
    paid: ["Paid", "ok"],
    unpaid: ["Waiting for payment", "warn"],
    refunded: ["Refunded", "neutral"],
    partly_refunded: ["Partly refunded", "neutral"],
    failed: ["Payment failed", "danger"],
    // payment_status 'cancelled': the order was called off before anyone paid.
    void: ["Not paid", "neutral"],
};

export const FUL: Record<FulKey, [string, Tone]> = {
    unfulfilled: ["Waiting to pack", "warn"],
    packed: ["Packed", "info"],
    shipped: ["Out for delivery", "info"],
    ready: ["Ready for collection", "info"],
    delivered: ["Delivered", "ok"],
    collected: ["Collected", "ok"],
    partly: ["Partly sent", "warn"],
    cancelled: ["Cancelled", "neutral"],
};

type OrderStatusish = { payment_status?: string | null; status?: string | null; fulfillment_status?: string | null; delivery_method?: string | null };

/** orders.payment_status → badge key. Live values: paid, pending, cancelled, refunded
 *  (+ partly_refunded and failed once refunds land). */
export function payKey(o: OrderStatusish): PayKey {
    const p = (o.payment_status || "").toLowerCase();
    if (p === "paid") return "paid";
    if (p === "refunded") return "refunded";
    if (p === "partly_refunded") return "partly_refunded";
    if (p === "failed") return "failed";
    if (p === "cancelled") return "void";
    if (p) return "unpaid";
    const s = (o.status || "").toLowerCase();
    if (s === "refunded") return "refunded";
    if (s === "cancelled") return "void";
    return ["paid", "processing", "packed", "shipped", "ready_for_pickup", "delivered", "fulfilled"].includes(s) ? "paid" : "unpaid";
}

/** status + fulfillment_status → badge key. Live fulfillment values: inbox, processing,
 *  packed, shipped, ready_for_pickup, delivered; status 'fulfilled' means finished. */
export function fulKey(o: OrderStatusish): FulKey {
    const s = (o.status || "").toLowerCase();
    const f = (o.fulfillment_status || "").toLowerCase();
    const pickup = (o.delivery_method || "").toLowerCase().includes("pick");
    if (s === "cancelled" || f === "cancelled") return "cancelled";
    if (s === "refunded" && (f === "" || f === "inbox" || f === "processing")) return "cancelled";
    if (s === "fulfilled" || s === "delivered" || f === "delivered") return pickup ? "collected" : "delivered";
    if (f === "partial") return "partly";
    if (f === "shipped" || s === "shipped") return "shipped";
    if (f === "ready_for_pickup" || s === "ready_for_pickup") return "ready";
    if (f === "packed" || s === "packed") return "packed";
    return "unfulfilled";
}

export function PayBadge({ s }: { s: PayKey }) {
    const [l, t] = PAY[s];
    return <Badge tone={t}>{l}</Badge>;
}

export function FulBadge({ s, pickup }: { s: FulKey; pickup?: boolean }) {
    const [l, t] = s === "delivered" && pickup ? FUL.collected : FUL[s];
    return <Badge tone={t}>{l}</Badge>;
}
