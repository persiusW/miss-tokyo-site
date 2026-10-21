// The features bill, live and frozen. Server-only.
//   currentBill()       this period so far: usage → priced lines → client lines
//   runBillingCutoff()  freeze every finished period, send frozen ones to
//                       Dashttp, warn about the monthly cap (cron + "Submit now")
//   aiPausedByMonthlyCap()  the assistants' check before answering
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { getBillingSettings, ratesOf, updateBillingSettings, type BillingSettings } from "./settings";
import { closedPeriods, periodFor, periodLabel, periodProgress, type Period } from "./period";
import { capState, clientLines, priceLines, projectTotal, proposeCap, statementKey, totalOf, type ClientLine, type PricedLine, type Usage } from "./statement";
import { loadOtherLines, loadUsage } from "./usageLoad";
import { dashttpMode, submitUsageInvoice } from "./dashttp";

const db = supabaseAdmin as any;

export type Bill = {
    period: Period;
    label: string;
    usage: Usage;
    /** Admin only: every line with its cost and base. */
    priced: PricedLine[];
    /** What the owner sees. */
    client: ClientLine[];
    totalGhs: number;
    projectedGhs: number;
    proposal: { capGhs: number; why: string };
    capGhs: number | null;
    cap: ReturnType<typeof capState>;
    unpriced: string[];
};

export async function billFor(period: Period, s: BillingSettings, now = new Date()): Promise<Bill> {
    const [usage, other] = await Promise.all([loadUsage(period.fromIso, period.toIso), loadOtherLines(period.start)]);
    const priced = priceLines(usage, ratesOf(s), other);
    const client = clientLines(priced, s.ownerVisibility, s.markupPct);
    const totalGhs = totalOf(priced);
    const { days, elapsed } = periodProgress(period, now);
    const running = now.getTime() < new Date(period.toIso).getTime();
    const projectedGhs = running ? projectTotal(totalGhs, elapsed, days) : totalGhs;
    return {
        period, label: periodLabel(period), usage, priced, client, totalGhs, projectedGhs,
        proposal: proposeCap(projectedGhs), capGhs: s.monthlyCapGhs, cap: capState(totalGhs, s.monthlyCapGhs),
        unpriced: priced.filter(l => !l.priced && l.quantity > 0).map(l => l.description),
    };
}

export async function currentBill(now = new Date()): Promise<Bill> {
    const s = await getBillingSettings({ fresh: true });
    return billFor(periodFor(now, s.cutoffDay, s.billingStart), s, now);
}

export type StatementRow = {
    id: string; period_start: string; period_end: string; status: string; lines: ClientLine[]; internal: Record<string, unknown>;
    total_ghs: number; frozen_at: string; dashttp_invoice_id: string | null; dashttp_invoice_number: string | null; dashttp_status: string | null;
    pay_url: string | null; pdf_url: string | null; submitted_at: string | null; submit_attempts: number; last_error: string | null; paid_at: string | null;
};

export async function listStatements(limit = 24): Promise<StatementRow[]> {
    const { data, error } = await db.from("billing_statements").select("*").order("period_start", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ ...r, total_ghs: Number(r.total_ghs) || 0 }));
}

/** Freeze one finished period: quantities, prices, markup and total, as they are now. Idempotent. */
export async function freezeStatement(period: Period, s: BillingSettings, by: string, clientId: string): Promise<"frozen" | "exists"> {
    const bill = await billFor(period, s, new Date(period.toIso));
    const row = {
        period_start: period.start, period_end: period.end, status: "frozen",
        lines: bill.client, total_ghs: bill.totalGhs, frozen_by: by,
        idempotency_key: statementKey(clientId, period.start, period.end),
        internal: { usage: bill.usage, rates: ratesOf(s), markupPct: s.markupPct, priced: bill.priced, visibility: s.ownerVisibility },
    };
    const { data, error } = await db.from("billing_statements").upsert(row, { onConflict: "period_start", ignoreDuplicates: true }).select("id");
    if (error) throw error;
    return (data ?? []).length ? "frozen" : "exists";
}

/** Send one frozen statement to Dashttp. A GH₵ 0 statement is closed without an invoice. */
export async function submitStatement(st: StatementRow, clientId: string): Promise<"submitted" | "skipped" | "not_connected" | "failed"> {
    const now = new Date().toISOString();
    // The local test fixture never writes invoice ids into the real statements table.
    if (dashttpMode() === "mock") return "not_connected";
    if (!(st.total_ghs > 0)) {
        await db.from("billing_statements").update({ status: "void", last_error: null, updated_at: now }).eq("id", st.id);
        return "skipped";
    }
    const r = await submitUsageInvoice({ periodStart: st.period_start, periodEnd: st.period_end, lines: st.lines, totalGhs: st.total_ghs }, statementKey(clientId, st.period_start, st.period_end));
    if (!r.ok) {
        if (r.reason === "not_connected") return "not_connected";
        await db.from("billing_statements").update({ status: "submit_failed", submit_attempts: (st.submit_attempts ?? 0) + 1, last_error: r.reason, updated_at: now }).eq("id", st.id);
        return "failed";
    }
    await db.from("billing_statements").update({
        status: r.data.status === "paid" ? "paid" : "submitted", dashttp_invoice_id: r.data.id || null, dashttp_invoice_number: r.data.number || null,
        dashttp_status: r.data.status, pay_url: r.data.payUrl ?? null, pdf_url: r.data.pdfUrl ?? null,
        submitted_at: now, submit_attempts: (st.submit_attempts ?? 0) + 1, last_error: null, updated_at: now,
    }).eq("id", st.id);
    return "submitted";
}

async function clientIdOf(): Promise<string> {
    // The Dashttp client id when we have it (from the cached billing reply), else a stable local name.
    const { data } = await db.from("dashttp_state").select("billing").eq("id", "default").maybeSingle();
    return String(data?.billing?.client?.id || "misstokyo");
}

async function staffEmails(): Promise<string[]> {
    const { data } = await supabaseAdmin.from("profiles").select("email").in("role", ["owner", "admin"]);
    return [...new Set((data ?? []).map((r: any) => String(r.email || "").trim()).filter(e => /@/.test(e)))];
}

/** Warn owners and admins once per period at 80% and at 100% of the monthly cap. */
export async function capAlerts(bill: Bill, s: BillingSettings): Promise<number[]> {
    if (bill.cap !== "near" && bill.cap !== "reached") return [];
    const sent = s.capAlerts.period === bill.period.start ? [...(s.capAlerts.sent ?? [])] : [];
    const level = bill.cap === "reached" ? 100 : 80;
    if (sent.includes(level)) return [];
    const to = await staffEmails();
    if (!to.length) return [];
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.misstokyo.shop").replace(/\/+$/, "");
    const subject = level === 100 ? "Monthly cap reached: the AI assistants are paused" : "Monthly cap: 80% used";
    const text = level === 100
        ? `This period's features bill (${bill.label}) has reached the monthly cap of GH₵ ${bill.capGhs?.toFixed(2)}. The shop assistant, the WhatsApp assistant and Miss Tokyo AI have stopped answering and hand chats to the team until the next period or until the cap is raised. Order messages to customers keep going. Billing: ${site}/billing`
        : `This period's features bill (${bill.label}) is at GH₵ ${bill.totalGhs.toFixed(2)}, 80% of the monthly cap of GH₵ ${bill.capGhs?.toFixed(2)}. At the cap the AI assistants pause; order messages keep going. Billing: ${site}/billing`;
    const r = await sendEmail({ to, subject, text, html: `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` }, { event: `billing_cap_${level}` });
    if (!r.ok) return [];
    await updateBillingSettings({ cap_alerts: { period: bill.period.start, sent: [...sent, level] } }, null);
    return [level];
}

export type CutoffResult = { frozen: string[]; submitted: string[]; failed: string[]; notConnected: boolean; alerts: number[] };

/** Freeze every finished period, send what is frozen to Dashttp, check the cap. */
export async function runBillingCutoff(now = new Date(), by = "cron"): Promise<CutoffResult> {
    const s = await getBillingSettings({ fresh: true });
    const clientId = await clientIdOf();
    const out: CutoffResult = { frozen: [], submitted: [], failed: [], notConnected: dashttpMode() === "off", alerts: [] };
    for (const p of closedPeriods(now, s.cutoffDay, s.billingStart)) {
        if ((await freezeStatement(p, s, by, clientId)) === "frozen") out.frozen.push(p.start);
    }
    const pending = (await listStatements(60)).filter(st => st.status === "frozen" || (st.status === "submit_failed" && st.submit_attempts < 24));
    for (const st of pending) {
        const r = await submitStatement(st, clientId);
        if (r === "submitted") out.submitted.push(st.period_start);
        else if (r === "failed") out.failed.push(st.period_start);
        else if (r === "not_connected") { out.notConnected = true; break; }
    }
    try { out.alerts = await capAlerts(await billFor(periodFor(now, s.cutoffDay, s.billingStart), s, now), s); } catch (e) {
        console.error("[billing] cap check failed", String((e as Error)?.message ?? e).slice(0, 200));
    }
    return out;
}

// ── The monthly cap, as the assistants see it ───────────────────────────

const PAUSE_TTL_MS = 5 * 60_000;
let pauseCache: { at: number; paused: boolean } | null = null;

/**
 * True once this period's bill has reached the owner's monthly cap. Cached
 * five minutes per instance. A failed read counts as not paused: the daily
 * AI limit still applies, and a database blip must not silence the shop.
 */
export async function aiPausedByMonthlyCap(): Promise<boolean> {
    if (pauseCache && Date.now() - pauseCache.at < PAUSE_TTL_MS) return pauseCache.paused;
    let paused = false;
    try {
        const s = await getBillingSettings();
        if (s.monthlyCapGhs != null && s.monthlyCapGhs > 0) {
            const now = new Date();
            const bill = await billFor(periodFor(now, s.cutoffDay, s.billingStart), s, now);
            paused = bill.cap === "reached";
        }
    } catch (e) {
        console.error("[billing] monthly cap check failed; not pausing", String((e as Error)?.message ?? e).slice(0, 200));
    }
    pauseCache = { at: Date.now(), paused };
    return paused;
}

export function clearMonthlyCapCache() {
    pauseCache = null;
}
