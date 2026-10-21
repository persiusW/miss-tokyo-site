// Dashttp → Miss Tokyo webhook: signature check and what each event changes.
// Pure helpers plus one apply function; the route is a thin wrapper.
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseInvoice, parseReceipt } from "./dashttp";

export const DASHTTP_EVENT_TYPES = [
    "subscription.charge_success", "subscription.charge_failed", "subscription.not_renewing", "subscription.disabled",
    "invoice.created", "invoice.paid", "receipt.created",
] as const;

/** X-Dashttp-Signature: "sha256=<hex HMAC-SHA256(raw body, secret)>", compared in constant time. */
export function verifyDashttpSignature(raw: string, header: string | null, secret: string | undefined): boolean {
    if (!secret || !header) return false;
    const m = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
    if (!m) return false;
    const want = crypto.createHmac("sha256", secret).update(raw, "utf8").digest();
    const got = Buffer.from(m[1], "hex");
    return got.length === want.length && crypto.timingSafeEqual(got, want);
}

export type DashttpEvent = { id: string; type: string; createdAt: string | null; data: Record<string, unknown> };

export function parseEvent(raw: string, headerId: string | null): DashttpEvent | null {
    let j: any;
    try { j = JSON.parse(raw); } catch { return null; }
    const id = typeof j?.id === "string" && j.id ? j.id : headerId;
    if (!id || id.length > 200 || typeof j?.type !== "string") return null;
    return { id, type: j.type, createdAt: typeof j.createdAt === "string" ? j.createdAt : null, data: j.data && typeof j.data === "object" ? j.data : {} };
}

const db = supabaseAdmin as any;

/**
 * Store the event once (by id) and apply it. Returns "duplicate" for an id
 * already stored, so a retried delivery changes nothing.
 */
export async function applyDashttpEvent(ev: DashttpEvent): Promise<"applied" | "duplicate" | "failed"> {
    const ins = await db.from("dashttp_events").insert({ event_id: ev.id, type: ev.type, created_at: ev.createdAt, data: ev.data });
    if (ins.error) return ins.error.code === "23505" ? "duplicate" : "failed";

    const now = new Date().toISOString();
    if (ev.type.startsWith("invoice.")) {
        const inv = parseInvoice((ev.data as any).invoice ?? ev.data);
        if (inv.id) {
            const patch: Record<string, unknown> = { dashttp_status: inv.status, updated_at: now };
            if (inv.number) patch.dashttp_invoice_number = inv.number;
            if (inv.payUrl) patch.pay_url = inv.payUrl;
            if (inv.pdfUrl) patch.pdf_url = inv.pdfUrl;
            if (ev.type === "invoice.paid" || inv.status === "paid") { patch.status = "paid"; patch.paid_at = ev.createdAt ?? now; }
            const byId = await db.from("billing_statements").update(patch).eq("dashttp_invoice_id", inv.id).select("id");
            // An invoice.created can arrive before our submit call has stored the id: match by period.
            if (!byId.error && (byId.data ?? []).length === 0 && inv.periodStart && inv.periodEnd) {
                await db.from("billing_statements").update({ ...patch, dashttp_invoice_id: inv.id }).eq("period_start", inv.periodStart).eq("period_end", inv.periodEnd).is("dashttp_invoice_id", null);
            }
        }
    }
    // Every event marks the cached billing state stale, so the next page view asks Dashttp again.
    const state: Record<string, unknown> = { id: "default", last_event_at: now, updated_at: now, billing_at: null };
    if (ev.type === "receipt.created") {
        const r = parseReceipt((ev.data as any).receipt ?? ev.data);
        if (r.id) {
            const { data } = await db.from("dashttp_state").select("receipts").eq("id", "default").maybeSingle();
            const list = (Array.isArray(data?.receipts) ? data.receipts : []).filter((x: any) => x?.id !== r.id);
            state.receipts = [r, ...list].slice(0, 50);
            state.receipts_at = now;
        }
    }
    const up = await db.from("dashttp_state").upsert(state, { onConflict: "id" });
    if (up.error) console.error("[dashttp webhook] state not updated", { code: up.error.code });
    return "applied";
}
