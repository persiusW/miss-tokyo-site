// billing_settings (one row, service role only): the admin's payout rule,
// unit prices, markup and cut-off, and the owner's monthly cap. Server-only.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { numOrNull } from "./money";
import { DEFAULT_SHARE_PCT, SHARE_MODES, type ShareMode, type ShareRule } from "./payoutRules";
import { DEFAULT_VISIBILITY, type Rates, type Visibility } from "./statement";
import { clampCutoff } from "./period";
import { parseCutover, type Cutover } from "./cutover";

export type BillingSettings = {
    payoutSplitLive: boolean;
    shareMode: ShareMode;
    sharePct: number;
    paystackFeePct: number;
    payoutMinGhs: number;
    /** Who Paystack books its fee to on the per-payment split. */
    payoutBearer: "account" | "subaccount";
    cutover: Cutover;
    adminSubaccountCode: string | null;
    adminSubaccountLabel: string | null;
    adminSubaccountSetAt: string | null;
    usdToGhs: number;
    aiRateUnit: "cost" | "reply";
    aiRateGhs: number | null;
    smsRateGhs: number | null;
    waMessageRateGhs: number | null;
    waTemplateRateGhs: number | null;
    markupPct: number;
    cutoffDay: number;
    billingStart: string;
    ownerVisibility: Visibility;
    monthlyCapGhs: number | null;
    monthlyCapSetAt: string | null;
    capAlerts: { period?: string; sent?: number[] };
    updatedAt: string | null;
};

/** What the code does when the row can't be read: today's behaviour, automatic share off. */
export const BILLING_DEFAULTS: BillingSettings = {
    payoutSplitLive: false, shareMode: "pct_of_order_total", sharePct: DEFAULT_SHARE_PCT, paystackFeePct: 1.95, payoutMinGhs: 5, payoutBearer: "account", cutover: {},
    adminSubaccountCode: null, adminSubaccountLabel: null, adminSubaccountSetAt: null,
    usdToGhs: 15.5, aiRateUnit: "cost", aiRateGhs: null, smsRateGhs: null, waMessageRateGhs: null, waTemplateRateGhs: null,
    markupPct: 0, cutoffDay: 28, billingStart: "2026-10-08", ownerVisibility: DEFAULT_VISIBILITY,
    monthlyCapGhs: null, monthlyCapSetAt: null, capAlerts: {}, updatedAt: null,
};

export function parseBillingRow(row: Record<string, unknown> | null | undefined): BillingSettings {
    if (!row) return BILLING_DEFAULTS;
    const n = (k: string, d: number) => numOrNull(row[k]) ?? d;
    const vis = (row.owner_visibility && typeof row.owner_visibility === "object" ? row.owner_visibility : {}) as Record<string, unknown>;
    const mode = SHARE_MODES.includes(row.admin_share_mode as ShareMode) ? (row.admin_share_mode as ShareMode) : "pct_of_order_total";
    return {
        payoutSplitLive: row.payout_split_live === true,
        shareMode: mode,
        sharePct: n("admin_share_pct", DEFAULT_SHARE_PCT),
        paystackFeePct: n("paystack_fee_pct", 1.95),
        payoutMinGhs: n("payout_min_ghs", 5),
        payoutBearer: row.payout_bearer === "subaccount" ? "subaccount" : "account",
        cutover: parseCutover(row.cutover),
        adminSubaccountCode: typeof row.admin_subaccount_code === "string" && /^ACCT_[A-Za-z0-9]+$/.test(row.admin_subaccount_code) ? row.admin_subaccount_code : null,
        adminSubaccountLabel: typeof row.admin_subaccount_label === "string" ? row.admin_subaccount_label : null,
        adminSubaccountSetAt: typeof row.admin_subaccount_set_at === "string" ? row.admin_subaccount_set_at : null,
        usdToGhs: n("usd_to_ghs", 15.5),
        aiRateUnit: row.ai_rate_unit === "reply" ? "reply" : "cost",
        aiRateGhs: numOrNull(row.ai_rate_ghs),
        smsRateGhs: numOrNull(row.sms_rate_ghs),
        waMessageRateGhs: numOrNull(row.wa_message_rate_ghs),
        waTemplateRateGhs: numOrNull(row.wa_template_rate_ghs),
        markupPct: n("markup_pct", 0),
        cutoffDay: clampCutoff(row.cutoff_day),
        billingStart: typeof row.billing_start === "string" ? row.billing_start.slice(0, 10) : "2026-10-08",
        ownerVisibility: Object.fromEntries(Object.entries(DEFAULT_VISIBILITY).map(([k, d]) => [k, typeof vis[k] === "boolean" ? vis[k] : d])) as Visibility,
        monthlyCapGhs: numOrNull(row.monthly_cap_ghs),
        monthlyCapSetAt: typeof row.monthly_cap_set_at === "string" ? row.monthly_cap_set_at : null,
        capAlerts: (row.cap_alerts && typeof row.cap_alerts === "object" ? row.cap_alerts : {}) as BillingSettings["capAlerts"],
        updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
    };
}

const TTL_MS = 30_000;
let cached: { at: number; s: BillingSettings } | null = null;

/** The settings, cached 30 s per instance. A failed read gives the defaults (automatic share off). */
export async function getBillingSettings(opts: { fresh?: boolean } = {}): Promise<BillingSettings> {
    if (!opts.fresh && cached && Date.now() - cached.at < TTL_MS) return cached.s;
    try {
        const { data, error } = await (supabaseAdmin as any).from("billing_settings").select("*").eq("id", "default").maybeSingle();
        if (error) throw error;
        const s = parseBillingRow(data);
        cached = { at: Date.now(), s };
        return s;
    } catch (e) {
        console.error("[billing] could not read billing_settings; using defaults", (e as Error)?.message ?? e);
        return BILLING_DEFAULTS;
    }
}

export function clearBillingSettingsCache() {
    cached = null;
}

export function shareRuleOf(s: BillingSettings): ShareRule {
    return { mode: s.shareMode, pct: s.sharePct, paystackPct: s.paystackFeePct };
}

export function ratesOf(s: BillingSettings): Rates {
    return {
        aiUnit: s.aiRateUnit, aiRate: s.aiRateGhs, usdToGhs: s.usdToGhs, smsRate: s.smsRateGhs,
        waMessageRate: s.waMessageRateGhs, waTemplateRate: s.waTemplateRateGhs, markupPct: s.markupPct,
    };
}

/** Write columns of the row (server code that has checked the caller's role). */
export async function updateBillingSettings(patch: Record<string, unknown>, actor: string | null): Promise<{ ok: boolean }> {
    const { error } = await (supabaseAdmin as any).from("billing_settings")
        .update({ ...patch, updated_at: new Date().toISOString(), updated_by: actor }).eq("id", "default");
    clearBillingSettingsCache();
    if (error) { console.error("[billing] settings update failed", error.message); return { ok: false }; }
    return { ok: true };
}
