// The final stock check when a customer asks for a pay link: a waiting order's
// link is only good while its stock is still held for it. Holds last 15
// minutes; the job that marks lapsed orders runs every 5, so in between an
// order still looks "waiting" while its stock is free for anyone. Paying then
// could take a piece someone else bought. Server-only.
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** A hold this close to running out is treated as over: paying takes a minute or two. */
export const HOLD_MARGIN_MS = 60_000;

/** True while every reserved line of the order is held for at least HOLD_MARGIN_MS more. False without a hold. */
export async function holdLive(orderId: string, now = Date.now()): Promise<boolean> {
    const { data, error } = await supabaseAdmin.from("online_reservations").select("expires_at").eq("order_id", orderId);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return false;
    const soonest = Math.min(...rows.map(r => Date.parse(r.expires_at)));
    return soonest - now > HOLD_MARGIN_MS;
}

/** What the assistant does when an order's hold is over. */
export const HOLD_OVER_NOTE = "The hold on this order ran out, so its Pay now link was not sent: the pieces may have sold since. Offer to order the same pieces again as a new order: check each with find_products (or the basket), then price_order and place_order.";
