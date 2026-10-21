"use server";

// Billing actions: owners and admins. Server actions are public endpoints,
// so each checks the role itself. Dashttp's own messages go to the log.
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logActivity } from "@/lib/utils/logActivity";
import { dashttpMode, getManageLink, payUsageInvoice, safePaystackUrl } from "@/lib/billing/dashttp";
import { updateBillingSettings } from "@/lib/billing/settings";
import { clearMonthlyCapCache } from "@/lib/billing/statements";
import { settlementDetail } from "@/lib/billing/paystackReports";
import type { SettlementTx } from "@/lib/paystack/api";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const DENIED = { ok: false as const, error: "Only owners and admins can use Billing." };
const NOT_CONNECTED = "Billing isn't connected to Dashttp yet, so nothing was changed.";
const UNAVAILABLE = "Dashttp didn't answer. Nothing was changed. Please try again in a moment.";

async function billingStaff() {
    const me = await requireStaff(["admin", "owner"]);
    return "status" in me ? null : me;
}

function siteUrl(): string {
    return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.misstokyo.shop").replace(/\/+$/, "");
}

/** Paystack's hosted page for the plan: update the card, or turn off auto-renew. */
export async function openManageLink(): Promise<R<{ url: string }>> {
    const me = await billingStaff();
    if (!me) return DENIED;
    const r = await getManageLink();
    if (!r.ok) return { ok: false, error: r.reason === "not_connected" ? NOT_CONNECTED : UNAVAILABLE };
    const url = safePaystackUrl(r.data.url);
    if (!url) return { ok: false, error: UNAVAILABLE };
    after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "billing", resourceId: "plan", details: { action: "open_manage_link" } }));
    return { ok: true, url };
}

/** Pay a features invoice: Dashttp starts a Paystack payment on its own account and sends the client back here. */
export async function payInvoice(invoiceId: string): Promise<R<{ url: string }>> {
    const me = await billingStaff();
    if (!me) return DENIED;
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(String(invoiceId))) return { ok: false, error: UNAVAILABLE };
    const callback = `${siteUrl()}/billing?paid=${encodeURIComponent(invoiceId)}`;
    const r = await payUsageInvoice(invoiceId, callback);
    if (!r.ok) return { ok: false, error: r.reason === "not_connected" ? NOT_CONNECTED : UNAVAILABLE };
    // The local fixture "pays" at once and returns our own callback; live, only Paystack pages are opened.
    const url = dashttpMode() === "mock" && r.data.authorizationUrl.startsWith(callback) ? r.data.authorizationUrl.replace(siteUrl(), "") : safePaystackUrl(r.data.authorizationUrl);
    if (!url) return { ok: false, error: UNAVAILABLE };
    after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "billing", resourceId: invoiceId, details: { action: "pay_invoice" } }));
    return { ok: true, url };
}

/** The owner's monthly cap on the features bill. Null removes it. */
export async function setMonthlyCap(amount: string | null): Promise<R> {
    const me = await billingStaff();
    if (!me) return DENIED;
    let cap: number | null = null;
    if (amount !== null && amount !== "") {
        const n = Number(amount);
        if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return { ok: false, error: "Enter a cap in cedis, more than 0." };
        cap = Math.round(n * 100) / 100;
    }
    const r = await updateBillingSettings({ monthly_cap_ghs: cap, monthly_cap_set_at: new Date().toISOString(), monthly_cap_set_by: me.userId }, me.userId);
    if (!r.ok) return { ok: false, error: "We couldn't save the cap. Nothing was changed. Please try again." };
    clearMonthlyCapCache();
    after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "billing", resourceId: "cap", details: { action: "monthly_cap", cap } }));
    revalidatePath("/billing");
    return { ok: true };
}

/** The payments inside one Paystack settlement. Admin may open the admin account's own. */
export async function settlementPayments(id: string, admin: boolean): Promise<R<{ rows: SettlementTx[] }>> {
    const me = await billingStaff();
    if (!me) return DENIED;
    if (!/^[0-9A-Za-z_-]{1,40}$/.test(String(id))) return { ok: false, error: UNAVAILABLE };
    if (admin && me.role !== "admin") return DENIED;
    const r = await settlementDetail(id, null);
    if (!r.ok) return { ok: false, error: "Paystack didn't answer. Please try again in a moment." };
    return { ok: true, rows: r.data };
}
