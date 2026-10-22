// Server-only: everything Billing shows, shaped so an owner's page never
// carries a cost price, the markup % or the admin share maths (props are
// sent to the browser). The admin gets the payout extras on top.
import { getBillingSettings } from "@/lib/billing/settings";
import { currentBill, listStatements } from "@/lib/billing/statements";
import { loadDashttpBilling, confirmInvoicePayment, type BillingState } from "@/lib/billing/dashttpState";
import { adminSubaccountCodes, paymentsSummary, settlementsFor, type PaymentsSummary } from "@/lib/billing/paystackReports";
import { periodLabel } from "@/lib/billing/period";
import type { ClientLine } from "@/lib/billing/statement";
import type { Settlement } from "@/lib/paystack/api";
import { loadLedger, type LedgerTotals } from "../tools/data";

type Part<T> = { ok: true; data: T } | { ok: false };
async function part<T>(fn: () => Promise<T>, where: string): Promise<Part<T>> {
    try { return { ok: true, data: await fn() }; } catch (e) {
        console.error(`[billing] ${where}`, String((e as Error)?.message ?? e).slice(0, 200));
        return { ok: false };
    }
}

export type ClientBill = {
    label: string; start: string; end: string; lines: ClientLine[]; totalGhs: number; projectedGhs: number;
    capGhs: number | null; cap: "none" | "ok" | "near" | "reached"; proposal: { capGhs: number; why: string };
};
export type ClientStatement = { id: string; label: string; status: string; totalGhs: number; lines: ClientLine[]; invoiceId: string | null; invoiceNumber: string | null; pdfUrl: string | null; paidAt: string | null };

export type BillingPageData = {
    role: "owner" | "admin";
    dashttp: BillingState;
    bill: Part<ClientBill>;
    statements: Part<ClientStatement[]>;
    paystack: { summary: Part<PaymentsSummary>; settlements: { ok: true; main: Settlement[]; checkedAt: number | null } | { ok: false } };
    admin: null | { ledger: Part<LedgerTotals>; settlements: Settlement[] | null; hasAccount: boolean };
    paid: { invoiceId: string; state: "paid" | "open" | "unknown" } | null;
};

export async function loadBillingPage(role: "owner" | "admin", paidInvoice: string | null): Promise<BillingPageData> {
    const s = await getBillingSettings({ fresh: true });
    const paid = paidInvoice ? { invoiceId: paidInvoice, state: await confirmInvoicePayment(paidInvoice).catch(() => "unknown" as const) } : null;
    const [dashttp, bill, statements] = await Promise.all([
        loadDashttpBilling({ fresh: !!paid }),
        part(async (): Promise<ClientBill> => {
            const b = await currentBill();
            return { label: b.label, start: b.period.start, end: b.period.end, lines: b.client, totalGhs: b.totalGhs, projectedGhs: b.projectedGhs, capGhs: b.capGhs, cap: b.cap, proposal: b.proposal };
        }, "bill"),
        part(async () => (await listStatements(24)).map((st): ClientStatement => ({
            id: st.id, label: periodLabel({ start: st.period_start, end: st.period_end }), status: st.status, totalGhs: st.total_ghs,
            lines: Array.isArray(st.lines) ? st.lines : [], invoiceId: st.dashttp_invoice_id, invoiceNumber: st.dashttp_invoice_number, pdfUrl: st.pdf_url, paidAt: st.paid_at,
        })), "statements"),
    ]);
    const from = bill.ok ? `${bill.data.start}T00:00:00.000Z` : null;
    const to = bill.ok ? new Date(new Date(`${bill.data.end}T00:00:00.000Z`).getTime() + 86_400_000).toISOString() : null;
    const codes = role === "admin" ? await adminSubaccountCodes(s.adminSubaccountCode) : [];
    const [summary, sv, ledger] = await Promise.all([
        from && to ? part(() => paymentsSummary(from, to, s.paystackFeePct), "payments summary") : Promise.resolve({ ok: false as const }),
        settlementsFor(codes),
        role === "admin" ? part(async () => (await loadLedger(1)).totals, "ledger") : Promise.resolve({ ok: false as const }),
    ]);
    return {
        role, dashttp, bill, statements, paid,
        paystack: { summary, settlements: sv.ok ? { ok: true, main: sv.main, checkedAt: sv.checkedAt } : { ok: false } },
        admin: role === "admin" ? { ledger, settlements: sv.ok ? sv.admin : null, hasAccount: !!s.adminSubaccountCode || codes.length > 0 } : null,
    };
}
