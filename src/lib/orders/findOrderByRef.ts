// Server-only order lookup by reference plus email or phone (find_order_by_ref,
// callable by the service role only). Throws on a database error so callers
// never count an outage as a wrong guess.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { TrackQuery } from "@/lib/orders/trackQuery";

export type TrackRow = {
    id: string; created_at: string; total_amount: number | null; status: string;
    items: unknown; customer_name: string | null; shipping_address: unknown; delivery_method: string | null;
};

export async function findOrderByRef(q: TrackQuery): Promise<TrackRow | null> {
    if (!q.ref || (!q.email && !q.phone)) return null;
    const { data, error } = await supabaseAdmin.rpc("find_order_by_ref", {
        p_ref: q.ref,
        p_email: q.email as string,
        p_phone: q.phone as string,
    });
    if (error) throw new Error(`find_order_by_ref: ${error.message}`);
    return (data as TrackRow[] | null)?.[0] ?? null;
}
