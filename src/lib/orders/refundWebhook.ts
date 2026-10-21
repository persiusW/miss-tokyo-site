// Paystack refund.processed / refund.pending / refund.failed: settle the
// refunds row the admin created. Server only. Never throws.
//
// Matched by Paystack's refund id first; a refund whose first answer never
// arrived (no id stored) is matched by the order's transaction reference and
// the amount. A failed refund stops counting: orders.refunded_total is summed
// again from the rows. The order's status is not moved back automatically
// (staff may already have told the customer); the order panel shows the
// failure and the Timeline says what happened.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { refundEventOf } from "./paystackRefund";
import { refundedSoFar, type RefundRow } from "./refundMath";

export async function handleRefundEvent(event: unknown): Promise<boolean> {
    const e = refundEventOf(event);
    if (!e) return false;
    try {
        let row: { id: string; order_id: string; status: string } | null = null;
        if (e.refundRef) {
            const r = await supabaseAdmin.from("refunds").select("id, order_id, status").eq("paystack_refund_ref", e.refundRef).maybeSingle();
            row = r.data ?? null;
        }
        if (!row && e.reference) {
            const { data: order } = await supabaseAdmin.from("orders").select("id").eq("paystack_reference", e.reference).maybeSingle();
            if (order) {
                let q = supabaseAdmin.from("refunds").select("id, order_id, status, amount_ghs")
                    .eq("order_id", order.id).eq("method", "paystack").in("status", ["pending", "failed"])
                    .order("created_at", { ascending: false }).limit(5);
                if (e.refundRef) q = q.is("paystack_refund_ref", null);
                const { data } = await q;
                row = (data ?? []).find(x => e.amountGhs == null || Math.abs(Number(x.amount_ghs) - e.amountGhs) < 0.005) ?? null;
            }
        }
        if (!row) {
            console.warn("[refund webhook] no matching refund", { status: e.status, hasRef: !!e.refundRef });
            return true;
        }
        // Forward only: processed is final, and a late "pending" never reopens it.
        if (row.status === "processed" || (e.status === "pending" && row.status !== "pending")) return true;
        const { error } = await supabaseAdmin.from("refunds").update({
            status: e.status,
            ...(e.refundRef ? { paystack_refund_ref: e.refundRef } : {}),
            ...(e.status === "failed" ? { failure: "Paystack reported the refund failed" } : {}),
            updated_at: new Date().toISOString(),
        }).eq("id", row.id);
        if (error) { console.error("[refund webhook] update failed", { code: error.code }); return true; }

        const { data: rows } = await supabaseAdmin.from("refunds").select("amount_ghs, status").eq("order_id", row.order_id);
        await supabaseAdmin.from("orders").update({ refunded_total: refundedSoFar((rows ?? []) as RefundRow[]) }).eq("id", row.order_id);
    } catch (err) {
        console.error("[refund webhook] failed", { err: String(err).slice(0, 200) });
    }
    return true;
}
