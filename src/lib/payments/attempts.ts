// Records each Paystack attempt. Best-effort: a failure here is logged and
// never stops a payment.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";
import { countFailures, OUTAGE_WINDOW_MINUTES, resultPatch } from "@/lib/payments/attemptRules";

type Channel = "pos" | "online" | "pay_link" | "invoice" | "ai";
const log = (what: string, e: unknown) => console.error(`[attempts] ${what} failed:`, e);

export async function recordStart(a: { saleKey: string; channel: Channel; reference: string | null; amount?: number | null; orderId?: string | null; posSessionId?: string | null; userId?: string | null }) {
    try {
        const { error } = await supabaseAdmin.from("sale_payment_attempts").insert({
            sale_key: a.saleKey, channel: a.channel, paystack_reference: a.reference, amount_ghs: a.amount ?? null,
            order_id: a.orderId ?? null, pos_session_id: a.posSessionId ?? null, created_by: a.userId ?? null, status: "started",
        });
        if (error) log("recordStart", error);
    } catch (e) { log("recordStart", e); }
}

export async function recordError(a: { saleKey: string; channel: Channel; code: "PAY-01" | "PAY-02"; message?: unknown; orderId?: string | null; posSessionId?: string | null; userId?: string | null }) {
    try {
        const { error } = await supabaseAdmin.from("sale_payment_attempts").insert({
            sale_key: a.saleKey, channel: a.channel, status: "error", error_code: a.code,
            gateway_message: a.message == null ? null : redactText(String(a.message)).slice(0, 200),
            order_id: a.orderId ?? null, pos_session_id: a.posSessionId ?? null, created_by: a.userId ?? null,
        });
        if (error) log("recordError", error);
    } catch (e) { log("recordError", e); }
}

/** Updates the attempt for this reference from Paystack's answer. No row → nothing to do. */
export async function recordResult(reference: string | null | undefined, tx: { status?: unknown; log?: { errors?: unknown } | null }) {
    if (!reference) return;
    try {
        const { error } = await supabaseAdmin.from("sale_payment_attempts")
            .update({ ...resultPatch(tx), updated_at: new Date().toISOString() })
            .eq("paystack_reference", reference);
        if (error) log("recordResult", error);
    } catch (e) { log("recordResult", e); }
}

export async function failuresForSale(saleKey: string): Promise<number> {
    const { data, error } = await supabaseAdmin.from("sale_payment_attempts")
        .select("status, paystack_errors, error_code").eq("sale_key", saleKey);
    if (error) { log("failuresForSale", error); return 0; }
    return countFailures(data ?? []);
}

export async function outageErrors(): Promise<number> {
    const since = new Date(Date.now() - OUTAGE_WINDOW_MINUTES * 60_000).toISOString();
    const { count, error } = await supabaseAdmin.from("sale_payment_attempts")
        .select("id", { count: "exact", head: true }).eq("error_code", "PAY-01").gte("created_at", since);
    if (error) { log("outageErrors", error); return 0; }
    return count ?? 0;
}
