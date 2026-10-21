// In-repo stand-in for the Dashttp client API, for local work and tests
// while the real API is being built. Used only when DASHTTP_MOCK=1 and never
// on Vercel (dashttp.ts). Every page that shows it says "test data". The
// figures are fixture values, not Miss Tokyo's plan.

type Inv = Record<string, unknown>;
const state: { invoices: Inv[]; seq: number } = { invoices: [], seq: 1 };

const PLAN = {
    name: "Test plan (fixture)", amount: 100, currency: "GHS", interval: "monthly", status: "active",
    nextPaymentDate: "2026-11-01", autoRenew: true, paymentMethod: { type: "card", label: "Test card •••• 4081" },
};
const RECEIPTS = [
    { id: "rcpt_test_1", number: "TEST-R-0001", paidAt: "2026-10-01T09:00:00.000Z", amountGhs: 100, description: "Test plan · October (fixture)", channel: "card", pdfUrl: null },
];

export function resetMockDashttp() {
    state.invoices = [];
    state.seq = 1;
}

/** The reply the real API would give, or null for a refusal. */
export function mockDashttp(method: string, path: string, body: unknown): unknown {
    const p = path.split("?")[0];
    if (method === "GET" && p === "/billing") {
        return { client: { id: "client_test", name: "Miss Tokyo (test)" }, plan: PLAN, openInvoices: state.invoices.filter(i => i.status === "open"), recentReceipts: RECEIPTS };
    }
    if (method === "POST" && p === "/billing/manage-link") {
        return { url: "https://paystack.com/pay/test-manage-subscription", expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() };
    }
    if (method === "POST" && p === "/usage-invoices") {
        const b = (body ?? {}) as Record<string, unknown>;
        const existing = state.invoices.find(i => i.periodStart === b.periodStart && i.periodEnd === b.periodEnd);
        if (existing) return existing; // idempotent, like the real one
        const inv = {
            id: `uinv_test_${state.seq}`, number: `TEST-U-${String(state.seq).padStart(4, "0")}`, periodStart: b.periodStart, periodEnd: b.periodEnd,
            issuedAt: new Date().toISOString(), dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
            amountGhs: b.totalGhs, status: "open", lines: b.lines ?? [], payUrl: null, pdfUrl: null,
        };
        state.seq += 1;
        state.invoices.push(inv);
        return inv;
    }
    if (method === "GET" && p === "/usage-invoices") return state.invoices;
    const one = /^\/usage-invoices\/([^/]+)(\/pay)?$/.exec(p);
    if (one) {
        const inv = state.invoices.find(i => i.id === decodeURIComponent(one[1]));
        if (!inv) return null;
        if (method === "POST" && one[2]) {
            const cb = String((body as Record<string, unknown>)?.callbackUrl ?? "");
            return { authorizationUrl: `${cb}${cb.includes("?") ? "&" : "?"}mock_pay=${encodeURIComponent(String(inv.id))}`, reference: `test_ref_${inv.id}` };
        }
        if (method === "GET") return inv;
    }
    if (method === "GET" && p === "/receipts") return RECEIPTS;
    return null;
}
