// The till's live view of one link: asks Paystack (at most every 4s per
// attempt — a conditional update on updated_at claims the check), records
// the answer, and never settles anything. The webhook owns settlement.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError } from "@/lib/errors/apiError";
import { failuresForSale, recordResult } from "@/lib/payments/attempts";
import { liveState, statusFromPaystack } from "@/lib/payments/attemptRules";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID.test(id)) return apiError("POS-03", { status: 404, audience: "staff" });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return apiError("AUTH-01", { status: 401, audience: "staff" });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "owner", "sales_staff"].includes(profile.role ?? "")) return apiError("GEN-00", { status: 403, audience: "staff" });

    const { data: session } = await supabaseAdmin.from("pos_sessions")
        .select("id, status, expires_at, created_by, order_id").eq("id", id).maybeSingle();
    if (!session) return apiError("POS-03", { status: 404, audience: "staff" });
    if (profile.role === "sales_staff" && session.created_by !== user.id) return apiError("GEN-00", { status: 403, audience: "staff" });

    const { data: attempt } = await supabaseAdmin.from("sale_payment_attempts")
        .select("id, sale_key, paystack_reference, status, updated_at")
        .eq("pos_session_id", id).not("paystack_reference", "is", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

    let attemptStatus: string | null = attempt?.status ?? null;
    // Claim this check by stamping updated_at first (only rows older than 4s
    // match), so tabs and instances share one Paystack call even when it fails.
    let claimed = false;
    if (attempt?.paystack_reference && session.status === "pending_payment" && process.env.PAYSTACK_SECRET_KEY) {
        const cutoff = new Date(Date.now() - 4000).toISOString();
        const { data: won } = await supabaseAdmin.from("sale_payment_attempts")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", attempt.id).lt("updated_at", cutoff).select("id");
        claimed = (won?.length ?? 0) > 0;
    }
    if (attempt?.paystack_reference && claimed) {
        try {
            const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(attempt.paystack_reference)}`, {
                headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
                signal: AbortSignal.timeout(8000),
            });
            const json = await res.json().catch(() => null);
            if (json?.status && json.data) {
                await recordResult(attempt.paystack_reference, json.data);
                attemptStatus = statusFromPaystack(json.data.status);
            }
        } catch (e) {
            console.error("[pos/payment] verify failed", e);
        }
    }

    const state = liveState({ sessionStatus: session.status, expiresAt: session.expires_at, attemptStatus, now: Date.now() });
    const failures = attempt?.sale_key ? await failuresForSale(attempt.sale_key) : 0;
    const orderRef = state === "paid" && session.order_id ? String(session.order_id).substring(0, 8).toUpperCase() : undefined;
    return NextResponse.json({ state, failures, ...(orderRef ? { orderRef } : {}) }, { headers: { "Cache-Control": "no-store" } });
}
