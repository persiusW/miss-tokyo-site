"use server";

// Admin Tools actions. Server actions are public endpoints running on the
// service role, so EVERY action starts with toolsAdmin(): the admin role
// only (owners and sales staff are refused here, whatever the page shows).
// Paystack's and the database's own messages go to the log, never back.
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logActivity } from "@/lib/utils/logActivity";
import { logCause } from "@/lib/errors/apiError";
import { clearV2FlagCache } from "@/lib/admin/v2/flags";
import { toolsAllowed } from "@/lib/admin/v2/tools";
import { getBillingSettings, updateBillingSettings } from "@/lib/billing/settings";
import { SHARE_MODES, type ShareMode } from "@/lib/billing/payoutRules";
import { clearMonthlyCapCache, runBillingCutoff, type CutoffResult } from "@/lib/billing/statements";
import { clampCutoff } from "@/lib/billing/period";
import { DEFAULT_VISIBILITY } from "@/lib/billing/statement";
import { createSubaccount, fetchSubaccount, getSplit, listGhanaBanks, maskAccount, resolveAccount, setSplitActive, updateSubaccount, verifyTransactionRaw, type Bank } from "@/lib/paystack/api";
import { canRetireSplits, cutoverJson, cutoverStage, sharesOf, splitMatches, type CutoverCheck } from "@/lib/billing/cutover";
import { toP } from "@/lib/billing/money";
import { cachedPs, forgetPs, TEN_MIN } from "@/lib/paystack/cache";
import { verifyReference } from "@/lib/paystackReconcile";
import { normaliseWaNumber } from "@/lib/ai/shopAssistant/settingsRules";
import { STATUS_TEMPLATE_EVENTS, templateIdValue } from "@/lib/ai/templateSettings";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { sendSMS } from "@/lib/sms";
import { SWITCHES, type SwitchKey } from "./switchList";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const DENIED = { ok: false as const, error: "Only the admin can use Admin tools." };
const FAILED = "That didn't go through. Nothing was changed. Please try again.";
const db = supabaseAdmin as any;

async function toolsAdmin(): Promise<{ userId: string; role: "admin" } | null> {
    const me = await requireStaff(["admin"]);
    if ("status" in me || !toolsAllowed(me.role)) return null;
    return { userId: me.userId, role: "admin" };
}

function log(me: { userId: string }, tab: string, action: string, details: Record<string, unknown> = {}) {
    after(() => logActivity({ userId: me.userId, userRole: "admin", actionType: "UPDATE", resource: "admin_tools", resourceId: tab, details: { action, ...details } }));
}

const num = (v: unknown, min: number, max: number): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

async function settingsSave(payload: Record<string, unknown>, actor: string): Promise<boolean> {
    const { error } = await supabaseAdmin.rpc("fn_settings_save", { p_payload: payload, p_actor: actor });
    if (error) { logCause("GEN-00", error, { where: "tools.settingsSave", keys: Object.keys(payload) }); return false; }
    return true;
}

// ── Payouts ─────────────────────────────────────────────────────────────

export async function listPayoutBanks(): Promise<R<{ mobileMoney: Bank[]; banks: Bank[] }>> {
    if (!(await toolsAdmin())) return DENIED;
    const r = await cachedPs("banks:gh", TEN_MIN, () => listGhanaBanks());
    if (!r.ok) return { ok: false, error: "We couldn't load the list of banks and Mobile money networks from Paystack. Please try again." };
    return { ok: true, ...r.data };
}

const ACCOUNT_RE = /^[0-9]{6,20}$/;

/** Ask Paystack whose account this is, before anything is pointed at it. Read-only. */
export async function checkPayoutAccount(input: { bankCode: string; accountNumber: string }): Promise<R<{ accountName: string }>> {
    if (!(await toolsAdmin())) return DENIED;
    const acct = String(input?.accountNumber ?? "").replace(/\s+/g, "");
    const bank = String(input?.bankCode ?? "").trim();
    if (!ACCOUNT_RE.test(acct) || !/^[A-Za-z0-9-]{2,20}$/.test(bank)) return { ok: false, error: "Enter the account or Mobile money number (digits only) and pick its bank or network." };
    const r = await resolveAccount(acct, bank);
    if (!r.ok) return { ok: false, error: r.reason === "unavailable" ? "Paystack didn't answer. Please try again in a moment." : "Paystack couldn't find that account. Check the number and the bank or network." };
    return { ok: true, accountName: r.data.accountName };
}

/**
 * Add or replace the admin payout account: checks the account with Paystack
 * again (the name on screen is never trusted), then creates the subaccount
 * or repoints the stored one, and stores its code. Only the admin, no
 * second step (owner decision).
 */
export async function savePayoutAccount(input: { bankCode: string; bankName: string; accountNumber: string; businessName: string }): Promise<R<{ label: string }>> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const acct = String(input?.accountNumber ?? "").replace(/\s+/g, "");
    const bank = String(input?.bankCode ?? "").trim();
    const business = String(input?.businessName ?? "").trim().slice(0, 80);
    if (!ACCOUNT_RE.test(acct) || !/^[A-Za-z0-9-]{2,20}$/.test(bank) || business.length < 2) return { ok: false, error: "Check the account first, and give the account a name of at least two letters." };
    const who = await resolveAccount(acct, bank);
    if (!who.ok) return { ok: false, error: "Paystack couldn't confirm that account, so nothing was changed." };
    const s = await getBillingSettings({ fresh: true });
    const res = s.adminSubaccountCode
        ? await updateSubaccount(s.adminSubaccountCode, { businessName: business, bankCode: bank, accountNumber: acct })
        : await createSubaccount({ businessName: business, bankCode: bank, accountNumber: acct });
    if (!res.ok || !/^ACCT_[A-Za-z0-9]+$/.test(res.data.code || s.adminSubaccountCode || "")) {
        return { ok: false, error: "Paystack didn't accept that payout account. Nothing was changed." };
    }
    const code = res.data.code || s.adminSubaccountCode!;
    const label = `${String(input?.bankName ?? "").slice(0, 60) || "Bank"} ${maskAccount(acct)} · ${who.data.accountName}`.slice(0, 160);
    const saved = await updateBillingSettings({ admin_subaccount_code: code, admin_subaccount_label: label, admin_subaccount_set_at: new Date().toISOString(), admin_subaccount_set_by: me.userId }, me.userId);
    if (!saved.ok) return { ok: false, error: "Paystack saved the account but we couldn't store it here. Please try again." };
    forgetPs("subaccount:");
    log(me, "payouts", s.adminSubaccountCode ? "replace_payout_account" : "add_payout_account", { label });
    revalidatePath("/tools");
    return { ok: true, label };
}

/** Use the subaccount the site's existing split already pays as the admin payout account. No Paystack write. */
export async function adoptSplitSubaccount(code: string): Promise<R<{ label: string }>> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const env = process.env.PAYSTACK_SPLIT_CODE;
    if (!env || !/^ACCT_[A-Za-z0-9]+$/.test(String(code))) return { ok: false, error: FAILED };
    const split = await getSplit(env);
    const share = split.ok ? split.data.shares.find(x => x.subaccountCode === code) : null;
    if (!share) return { ok: false, error: "That account isn't in the site's split any more. Refresh and try again." };
    const sub = await fetchSubaccount(code);
    const label = `${(sub.ok ? sub.data.bank : share.bank) || "Bank"} ${sub.ok ? sub.data.account : share.account} · ${(sub.ok ? sub.data.accountName : share.accountName) || share.businessName}`.slice(0, 160);
    const saved = await updateBillingSettings({ admin_subaccount_code: code, admin_subaccount_label: label, admin_subaccount_set_at: new Date().toISOString(), admin_subaccount_set_by: me.userId }, me.userId);
    if (!saved.ok) return { ok: false, error: FAILED };
    log(me, "payouts", "adopt_split_subaccount", { label });
    revalidatePath("/tools");
    return { ok: true, label };
}

/**
 * Cutover step 1 ("Use the dashboard for payouts") and the way back ("Go back
 * to the Paystack split"). Turning it on starts a new first-payment check.
 */
export async function setPayoutSplitLive(on: boolean): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const s = await getBillingSettings({ fresh: true });
    if (on && !s.adminSubaccountCode) return { ok: false, error: "Add the admin payout account first." };
    const c = s.cutover;
    const next = on ? { ...c, liveAt: new Date().toISOString(), check: null } : { ...c, liveAt: null };
    const r = await updateBillingSettings({ payout_split_live: on === true, cutover: cutoverJson(next) }, me.userId);
    if (!r.ok) return { ok: false, error: FAILED };
    log(me, "payouts", on ? "cutover_dashboard_on" : "cutover_back_to_paystack_split");
    revalidatePath("/tools");
    return { ok: true };
}

export async function savePayoutBearer(bearer: string): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    if (bearer !== "account" && bearer !== "subaccount") return { ok: false, error: FAILED };
    const r = await updateBillingSettings({ payout_bearer: bearer }, me.userId);
    if (!r.ok) return { ok: false, error: FAILED };
    log(me, "payouts", "payout_bearer", { bearer });
    revalidatePath("/tools");
    return { ok: true };
}

/**
 * Cutover step 2: the first payment since the dashboard took over, as
 * Paystack actually split it, next to what the dashboard planned. Read-only
 * against Paystack; the result is stored so step 3 can unlock.
 */
export async function checkFirstPayment(): Promise<R<{ check: CutoverCheck | null; waiting: boolean }>> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const s = await getBillingSettings({ fresh: true });
    if (!s.payoutSplitLive || !s.cutover.liveAt || !s.adminSubaccountCode) return { ok: false, error: "Use the dashboard for payouts first (step 1)." };
    const { data, error } = await db.from("admin_payout_ledger").select("reference, amount_ghs, paid_at, rule")
        .eq("kind", "charge").gte("paid_at", s.cutover.liveAt).order("paid_at").limit(50);
    if (error) { logCause("GEN-00", error, { where: "tools.checkFirstPayment" }); return { ok: false, error: FAILED }; }
    const first = (data ?? []).find((r: any) => r?.rule?.planned === "requested");
    if (!first) return { ok: true, check: null, waiting: true };
    const tx = await verifyTransactionRaw(first.reference);
    if (!tx.ok) return { ok: false, error: "Paystack didn't answer. Nothing was changed. Try again in a moment." };
    const meta = (tx.data.metadata && typeof tx.data.metadata === "object" ? tx.data.metadata : {}) as Record<string, any>;
    const plannedTakeP = toP(Number(meta?.admin_payout?.take) || 0);
    const requestedP = Number(tx.data.requested_amount ?? tx.data.amount) || 0;
    const chargedP = Number(tx.data.amount);
    const actual = sharesOf(tx.data, s.adminSubaccountCode);
    const m = splitMatches({ requestedP, chargedP: Number.isFinite(chargedP) ? chargedP : null, plannedTakeP, shares: actual });
    const check: CutoverCheck = { reference: first.reference, ok: m.ok, checkedAt: new Date().toISOString(), expected: m.expected, actual, customerPaidFee: m.customerPaidFee };
    await updateBillingSettings({ cutover: cutoverJson({ ...s.cutover, check }) }, me.userId);
    log(me, "payouts", "cutover_check", { reference: first.reference, ok: m.ok });
    revalidatePath("/tools");
    return { ok: true, check, waiting: false };
}

/**
 * Cutover step 3 and its undo: turn a Paystack split group off (or back on).
 * Off only after the first-payment check is green. Never deletes a split.
 */
export async function setOldSplitActive(code: string, active: boolean): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    if (!/^SPL_[A-Za-z0-9]+$/.test(String(code)) || typeof active !== "boolean") return { ok: false, error: FAILED };
    const s = await getBillingSettings({ fresh: true });
    const stage = cutoverStage({ live: s.payoutSplitLive, hasAccount: !!s.adminSubaccountCode, cutover: s.cutover, envSplitCode: process.env.PAYSTACK_SPLIT_CODE ?? null });
    if (!active && !canRetireSplits(stage)) return { ok: false, error: "Check the first payment first (step 2). The old split can only be turned off once the dashboard's split is proven." };
    const split = await getSplit(code);
    if (!split.ok || !split.data.id) return { ok: false, error: "Paystack didn't answer. Nothing was changed." };
    const r = await setSplitActive(split.data.id, active);
    if (!r.ok) return { ok: false, error: "Paystack didn't accept that change. Nothing was changed." };
    const retired = { ...(s.cutover.retired ?? {}) };
    if (active) delete retired[code]; else retired[code] = new Date().toISOString();
    await updateBillingSettings({ cutover: cutoverJson({ ...s.cutover, retired }) }, me.userId);
    forgetPs("split");
    log(me, "payouts", active ? "split_back_on" : "split_turned_off", { code });
    revalidatePath("/tools");
    return { ok: true };
}

export async function saveShareRule(input: { mode: string; pct: string; minGhs: string }): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    if (!SHARE_MODES.includes(input?.mode as ShareMode)) return { ok: false, error: "Pick how the admin share is worked out." };
    const pct = num(input.pct, 0, 20);
    const min = num(input.minGhs, 0, 1000);
    if ((input.mode === "pct_of_order_total" || input.mode === "custom_pct") && pct === null) return { ok: false, error: "Enter a percentage from 0 to 20." };
    if (min === null) return { ok: false, error: "Enter the smallest payment that carries a split, in cedis (0 to 1,000)." };
    const patch: Record<string, unknown> = { admin_share_mode: input.mode, payout_min_ghs: min };
    if (pct !== null) patch.admin_share_pct = pct;
    const r = await updateBillingSettings(patch, me.userId);
    if (!r.ok) return { ok: false, error: FAILED };
    log(me, "payouts", "share_rule", patch);
    revalidatePath("/tools");
    return { ok: true };
}

/** A payment made to the admin outside Paystack (a transfer, cash). Reduces what is owed. */
export async function recordManualPayout(input: { amount: string; note: string }): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const amount = num(input?.amount, 0.01, 1_000_000);
    const note = String(input?.note ?? "").trim().slice(0, 300);
    if (amount === null) return { ok: false, error: "Enter the amount paid, in cedis." };
    if (note.length < 3) return { ok: false, error: "Say how it was paid, so the record makes sense later." };
    const { error } = await db.from("admin_payout_ledger").insert({
        reference: `manual:${crypto.randomUUID()}`, kind: "manual", source: "other", amount_ghs: amount, fee_ghs: 0,
        share_due_ghs: 0, taken_ghs: amount, outcome: "manual_payment", note, created_by: me.userId, paid_at: new Date().toISOString(),
    });
    if (error) { logCause("GEN-00", error, { where: "tools.manualPayout" }); return { ok: false, error: FAILED }; }
    log(me, "payouts", "manual_payout", { amount });
    revalidatePath("/tools");
    return { ok: true };
}

// ── Fees ────────────────────────────────────────────────────────────────

export async function saveFees(input: { feePct: string; label: string; showLine: boolean; paystackPct: string }): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const fee = num(input?.feePct, 0, 20);
    const ps = num(input?.paystackPct, 0, 20);
    const label = String(input?.label ?? "").trim();
    if (fee === null) return { ok: false, error: "Processing fee: enter a percentage from 0 to 20." };
    if (ps === null) return { ok: false, error: "Paystack fee: enter a percentage from 0 to 20." };
    if (label.length < 2 || label.length > 60 || /^[.\s\d%]+$/.test(label)) return { ok: false, error: "Give the fee a name customers understand, like “Processing fee” (2 to 60 characters)." };
    if (!(await settingsSave({ store: { platform_fee_percentage: fee, platform_fee_label: label, show_fee_at_checkout: input.showLine === true } }, me.userId))) return { ok: false, error: FAILED };
    const b = await updateBillingSettings({ paystack_fee_pct: ps }, me.userId);
    if (!b.ok) return { ok: false, error: "The processing fee was saved, but the Paystack % wasn't. Please try again." };
    log(me, "fees", "fees", { platform_fee_percentage: fee, platform_fee_label: label, show_fee_at_checkout: input.showLine === true, paystack_fee_pct: ps });
    revalidatePath("/tools");
    return { ok: true };
}

// ── Rates and markup ────────────────────────────────────────────────────

export async function saveRates(input: Record<string, string>): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const rate = (k: string) => (input?.[k] === "" ? null : num(input?.[k], 0, 100_000));
    const bad = (k: string) => input?.[k] !== "" && input?.[k] != null && num(input[k], 0, 100_000) === null;
    for (const k of ["ai_rate_ghs", "sms_rate_ghs", "wa_message_rate_ghs", "wa_template_rate_ghs"]) if (bad(k)) return { ok: false, error: "Prices are cedis per unit, 0 or more. Leave one blank if it isn't priced yet." };
    const markup = num(input?.markup_pct, 0, 500);
    const fx = num(input?.usd_to_ghs, 0.01, 1000);
    const cutoff = clampCutoff(input?.cutoff_day);
    if (markup === null) return { ok: false, error: "Markup: a percentage from 0 to 500." };
    if (fx === null) return { ok: false, error: "Dollar rate: how many cedis one US dollar costs." };
    if (String(cutoff) !== String(input?.cutoff_day)) return { ok: false, error: "The cut-off day is a day of the month from 1 to 28." };
    const patch = {
        ai_rate_unit: input?.ai_rate_unit === "reply" ? "reply" : "cost",
        ai_rate_ghs: rate("ai_rate_ghs"), sms_rate_ghs: rate("sms_rate_ghs"), wa_message_rate_ghs: rate("wa_message_rate_ghs"), wa_template_rate_ghs: rate("wa_template_rate_ghs"),
        markup_pct: markup, usd_to_ghs: fx, cutoff_day: cutoff,
    };
    const r = await updateBillingSettings(patch, me.userId);
    if (!r.ok) return { ok: false, error: FAILED };
    // ONE markup: the old AI cost markup follows it, so nothing shows two figures.
    await settingsSave({ ai: [{ key: "admin_cost_markup_pct", value: markup }] }, me.userId);
    clearMonthlyCapCache();
    log(me, "rates", "rates", patch);
    revalidatePath("/tools", "layout");
    revalidatePath("/billing");
    return { ok: true };
}

export async function saveVisibility(input: Record<string, boolean>): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const v = Object.fromEntries(Object.keys(DEFAULT_VISIBILITY).map(k => [k, input?.[k] === true]));
    const r = await updateBillingSettings({ owner_visibility: v }, me.userId);
    if (!r.ok) return { ok: false, error: FAILED };
    log(me, "rates", "owner_visibility", v);
    revalidatePath("/billing");
    return { ok: true };
}

export async function addOtherLine(input: { description: string; quantity: string; unit: string; unitPrice: string; recurring: boolean; periodStart: string }): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const description = String(input?.description ?? "").trim();
    const qty = num(input?.quantity, 0, 1_000_000);
    const price = num(input?.unitPrice, 0, 1_000_000);
    const unit = String(input?.unit ?? "").trim() || "item";
    if (description.length < 2 || description.length > 120) return { ok: false, error: "Describe the service in 2 to 120 characters." };
    if (qty === null || price === null) return { ok: false, error: "Enter a quantity and a price per unit, 0 or more." };
    if (!input.recurring && !/^\d{4}-\d{2}-\d{2}$/.test(String(input?.periodStart ?? ""))) return { ok: false, error: FAILED };
    const { error } = await db.from("billing_other_lines").insert({
        description, quantity: qty, unit: unit.slice(0, 30), unit_price_ghs: price, recurring: input.recurring === true,
        period_start: input.recurring ? null : input.periodStart, created_by: me.userId,
    });
    if (error) { logCause("GEN-00", error, { where: "tools.addOtherLine" }); return { ok: false, error: FAILED }; }
    clearMonthlyCapCache();
    log(me, "rates", "add_other_line", { description, qty, price, recurring: input.recurring === true });
    revalidatePath("/tools/rates");
    return { ok: true };
}

export async function removeOtherLine(id: string): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false, error: FAILED };
    const { error } = await db.from("billing_other_lines").update({ active: false }).eq("id", id);
    if (error) return { ok: false, error: FAILED };
    clearMonthlyCapCache();
    log(me, "rates", "remove_other_line", { id });
    revalidatePath("/tools/rates");
    return { ok: true };
}

/** Freeze finished periods and send them to Dashttp now, instead of waiting for the hourly job. */
export async function submitStatementsNow(): Promise<R<{ result: CutoffResult }>> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    try {
        const result = await runBillingCutoff(new Date(), `admin:${me.userId}`);
        log(me, "rates", "submit_statements", { frozen: result.frozen.length, submitted: result.submitted.length, failed: result.failed.length });
        revalidatePath("/tools/rates");
        revalidatePath("/billing");
        return { ok: true, result };
    } catch (e) {
        logCause("GEN-00", e, { where: "tools.submitNow" });
        return { ok: false, error: FAILED };
    }
}

// ── Agents ──────────────────────────────────────────────────────────────

export async function saveAgentLimits(input: Record<string, string | boolean>): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const cap = num(input?.daily_spend_cap_ghs, 0, 10_000);
    const dash = num(input?.dashboard_cap_share_pct, 0, 100);
    const shop = num(input?.shop_assistant_cap_share_pct, 0, 100);
    const perUser = num(input?.dashboard_daily_messages_per_user, 0, 1000);
    const perVisitor = num(input?.shop_assistant_daily_messages_per_visitor, 1, 200);
    if ([cap, dash, shop, perUser, perVisitor].some(x => x === null) || [dash, shop, perUser, perVisitor].some(x => !Number.isInteger(x))) {
        return { ok: false, error: "Check the limits: an amount for the daily limit and whole numbers for the rest." };
    }
    const ai = [
        { key: "daily_spend_cap_ghs", value: cap }, { key: "dashboard_cap_share_pct", value: dash },
        { key: "shop_assistant_cap_share_pct", value: shop }, { key: "dashboard_daily_messages_per_user", value: perUser },
        { key: "shop_assistant_daily_messages_per_visitor", value: perVisitor },
        { key: "mtai_send_to_admin_enabled", value: input?.mtai_send_to_admin_enabled === true },
    ];
    if (!(await settingsSave({ ai }, me.userId))) return { ok: false, error: FAILED };
    log(me, "agents", "agent_limits", Object.fromEntries(ai.map(a => [a.key, a.value])));
    revalidatePath("/tools/agents");
    return { ok: true };
}

// ── WhatsApp ────────────────────────────────────────────────────────────

export async function saveWhatsAppSetup(input: { alertNumber: string; walletBelow: string; handoffTemplate: string; restockTemplate: string; status: Record<string, string> }): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const n = String(input?.alertNumber ?? "").trim();
    const number = n === "" ? "" : normaliseWaNumber(n);
    if (number === null) return { ok: false, error: "Enter a Ghana phone number for alerts, or leave it blank." };
    const below = num(input?.walletBelow, 0, 100_000);
    if (below === null) return { ok: false, error: "Wallet alert: an amount in cedis, or 0 to turn it off." };
    const ids = [String(input?.handoffTemplate ?? "").trim(), String(input?.restockTemplate ?? "").trim()];
    const status = Object.fromEntries(STATUS_TEMPLATE_EVENTS.map(e => [e, String(input?.status?.[e] ?? "").trim()]));
    if (![...ids, ...Object.values(status)].every(templateIdValue)) return { ok: false, error: "A template id is the number shown in Chatbots Africa's Message Templates." };
    const ai = [
        { key: "whatsapp_wallet_alert_number", value: number }, { key: "whatsapp_wallet_alert_ghs", value: below },
        { key: "whatsapp_handoff_template_id", value: ids[0] }, { key: "whatsapp_restock_template_id", value: ids[1] },
        { key: "whatsapp_status_template_ids", value: status },
    ];
    if (!(await settingsSave({ ai }, me.userId))) return { ok: false, error: FAILED };
    log(me, "whatsapp", "whatsapp_setup", { keys: ai.map(a => a.key) });
    revalidatePath("/tools/whatsapp");
    return { ok: true };
}

/** A real message from the shop's WhatsApp line. WhatsApp only delivers free text inside the 24-hour window. */
export async function sendTestWhatsApp(input: { to: string; text: string }): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const to = normaliseWaNumber(input?.to);
    const text = String(input?.text ?? "").trim();
    if (!to) return { ok: false, error: "Enter a Ghana WhatsApp number." };
    if (text.length < 2 || text.length > 500) return { ok: false, error: "Write a short message (up to 500 characters)." };
    const r = await createChatbotsAfrica().sendText(to, text, { event: "admin_test_send" });
    log(me, "whatsapp", "test_send", { ok: r.ok });
    if (!r.ok) return { ok: false, error: "WhatsApp didn't take that message. If that number hasn't messaged the shop in the last 24 hours, WhatsApp won't deliver free text to it." };
    return { ok: true };
}

// ── Payments ────────────────────────────────────────────────────────────

export type SweepRow = { orderId: string; ref: string; paymentStatus: string; status: string; total: number; createdAt: string; paystack: string; charged: number | null };

/**
 * Ask Paystack about every cancelled or unpaid order that reached the payment
 * page in the last N days, and list the ones Paystack says were paid.
 * Read-only: putting one right is the order's own Verify (from the list).
 */
export async function sweepPayments(days: number): Promise<R<{ checked: number; unresolved: number; paid: SweepRow[]; capped: boolean }>> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const d = Math.min(30, Math.max(1, Math.trunc(Number(days)) || 7));
    const since = new Date(Date.now() - d * 86_400_000).toISOString();
    const { data, error } = await db.from("orders").select("id, ref, payment_status, status, total_amount, created_at, paystack_reference")
        .in("payment_status", ["cancelled", "pending"]).not("paystack_reference", "is", null).neq("paystack_reference", "dummy-ref")
        .gte("created_at", since).order("created_at", { ascending: false }).limit(81);
    if (error) { logCause("GEN-00", error, { where: "tools.sweep" }); return { ok: false, error: FAILED }; }
    const rows = (data ?? []).filter((o: any) => !String(o.paystack_reference).startsWith("http"));
    const capped = rows.length > 80;
    const list = rows.slice(0, 80);
    const paid: SweepRow[] = [];
    let unresolved = 0;
    for (let i = 0; i < list.length; i += 3) {
        const batch = list.slice(i, i + 3);
        const verdicts = await Promise.all(batch.map((o: any) => verifyReference(o.paystack_reference)));
        batch.forEach((o: any, j: number) => {
            const v = verdicts[j];
            if (!v) { unresolved += 1; return; }
            if (v.status === "success") paid.push({ orderId: o.id, ref: o.ref ?? String(o.id).slice(0, 8).toUpperCase(), paymentStatus: o.payment_status, status: o.status, total: Number(o.total_amount) || 0, createdAt: o.created_at, paystack: v.status, charged: v.amount });
        });
    }
    log(me, "payments", "sweep", { days: d, checked: list.length, paid: paid.length, unresolved });
    return { ok: true, checked: list.length, unresolved, paid, capped };
}

// ── Messages ────────────────────────────────────────────────────────────

/** Send a failed SMS again: only within 7 days, and only if nothing for the same number and event went out since. */
export async function resendSms(id: string): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false, error: FAILED };
    const { data: row } = await db.from("notification_log").select("id, channel, status, recipient, recipient_key, event, body, order_id, created_at").eq("id", id).maybeSingle();
    if (!row || row.channel !== "sms" || row.status !== "failed" || !row.body || !row.recipient) return { ok: false, error: "Only a failed SMS can be sent again." };
    if (Date.now() - new Date(row.created_at).getTime() > 7 * 86_400_000) return { ok: false, error: "That SMS is more than 7 days old. Send a fresh one from the order instead." };
    let q = db.from("notification_log").select("id", { count: "exact", head: true }).eq("channel", "sms").eq("status", "sent").eq("recipient_key", row.recipient_key).gt("created_at", row.created_at);
    q = row.event ? q.eq("event", row.event) : q.is("event", null);
    const { count } = await q;
    if ((count ?? 0) > 0) return { ok: false, error: "That number already got this message after the failure, so it wasn't sent again." };
    const r = await sendSMS({ to: row.recipient, message: row.body }, { event: row.event ?? "admin_resend", orderId: row.order_id ?? null });
    log(me, "messages", "resend_sms", { id, ok: r.ok });
    revalidatePath("/tools/messages");
    return r.ok ? { ok: true } : { ok: false, error: "The SMS provider didn't take it again. Check the number and the SMS credit." };
}

// ── Switches ────────────────────────────────────────────────────────────

export async function setSwitch(key: SwitchKey, on: boolean): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    const def = SWITCHES.find(s => s.key === key);
    if (!def || typeof on !== "boolean") return { ok: false, error: FAILED };
    if (def.store === "billing") return setPayoutSplitLive(on);
    const col = def.key.slice(def.key.indexOf(".") + 1);
    const ok = def.store === "store" ? await settingsSave({ store: { [col]: on } }, me.userId) : await settingsSave({ ai: [{ key: col, value: on }] }, me.userId);
    if (!ok) return { ok: false, error: FAILED };
    if (col.startsWith("admin_v2")) clearV2FlagCache();
    log(me, "switches", "switch", { key, on });
    revalidatePath("/tools/switches");
    return { ok: true };
}

// ── Devices ─────────────────────────────────────────────────────────────

export async function removeDevice(id: string): Promise<R> {
    const me = await toolsAdmin();
    if (!me) return DENIED;
    if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false, error: FAILED };
    const { error } = await db.from("admin_push_subscriptions").delete().eq("id", id);
    if (error) return { ok: false, error: FAILED };
    log(me, "devices", "remove_device", { id });
    revalidatePath("/tools/devices");
    return { ok: true };
}
