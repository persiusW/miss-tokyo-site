import { test, expect } from "@playwright/test";
import { canRetireSplits, cutoverJson, cutoverStage, parseCutover, sharesOf, splitMatches } from "../../../src/lib/billing/cutover";
import { setSplitActive, getSplit, createSubaccount, updateSubaccount, resolveAccount } from "../../../src/lib/paystack/api";

// The cutover from the hand-made Paystack split to the dashboard's split.
// No Paystack write runs here: every call goes to a fake fetch.

const ENV = "SPL_1SuC2NjD2J";
const base = { hasAccount: true, envSplitCode: ENV };

test("stages: account, switch, first-payment check, then the old split can go", () => {
    expect(cutoverStage({ ...base, hasAccount: false, live: false, cutover: {} })).toBe("no_account");
    expect(cutoverStage({ ...base, live: false, cutover: {} })).toBe("ready");
    const live = { liveAt: "2026-10-25T10:00:00Z" };
    expect(cutoverStage({ ...base, live: true, cutover: live })).toBe("awaiting_payment");
    // A check from before the switch was last turned on doesn't count.
    const stale = { ...live, check: { reference: "r", ok: true, checkedAt: "2026-10-24T09:00:00Z", expected: { subP: 344, mainP: 13406 }, actual: { paystackP: 274, mainP: 13406, subP: 344 }, customerPaidFee: true } };
    expect(cutoverStage({ ...base, live: true, cutover: stale })).toBe("awaiting_payment");
    const good = { ...stale, check: { ...stale.check, checkedAt: "2026-10-25T11:00:00Z" } };
    expect(cutoverStage({ ...base, live: true, cutover: good })).toBe("checked");
    expect(cutoverStage({ ...base, live: true, cutover: { ...good, check: { ...good.check, ok: false } } })).toBe("check_failed");
    expect(cutoverStage({ ...base, live: true, cutover: { ...good, retired: { [ENV]: "2026-10-25T12:00:00Z" } } })).toBe("retired");
    expect(canRetireSplits("checked")).toBe(true);
    expect(canRetireSplits("retired")).toBe(true);
    for (const s of ["no_account", "ready", "awaiting_payment", "check_failed"] as const) expect(canRetireSplits(s)).toBe(false);
});

test("the stored cutover round-trips and ignores junk", () => {
    const c = parseCutover(cutoverJson({ liveAt: "2026-10-25T10:00:00Z", check: null, retired: { [ENV]: "2026-10-26T00:00:00Z" } }));
    expect(c).toEqual({ liveAt: "2026-10-25T10:00:00Z", check: null, retired: { [ENV]: "2026-10-26T00:00:00Z" } });
    expect(parseCutover({ retired: { "not a split": "x", SPL_ok: 3 } })).toEqual({ liveAt: null, check: null, retired: {} });
    expect(parseCutover(null)).toEqual({ liveAt: null, check: null, retired: {} });
});

test("the first payment matches only to the pesewa", () => {
    // Order 3512F7BD under the dashboard's split: asked 137.50, customer paid 140.24.
    const shares = { paystackP: 274, mainP: 13406, subP: 344 };
    expect(splitMatches({ requestedP: 13750, chargedP: 14024, plannedTakeP: 344, shares })).toEqual({ ok: true, expected: { subP: 344, mainP: 13406 }, customerPaidFee: true });
    expect(splitMatches({ requestedP: 13750, chargedP: 14024, plannedTakeP: 344, shares: { ...shares, subP: 343 } }).ok).toBe(false);
    expect(splitMatches({ requestedP: 13750, chargedP: 14024, plannedTakeP: 344, shares: { ...shares, mainP: 13132 } }).ok).toBe(false);
    // Shop bears the fee (charged = asked): main keeps the rest less Paystack's fee.
    expect(splitMatches({ requestedP: 13750, chargedP: 13750, plannedTakeP: 344, shares: { paystackP: 268, mainP: 13138, subP: 344 } }).ok).toBe(true);
    // Nothing planned is never green.
    expect(splitMatches({ requestedP: 13750, chargedP: 14024, plannedTakeP: 0, shares: { paystackP: 274, mainP: 13750, subP: 0 } }).ok).toBe(false);
});

test("Paystack's figures read from either split shape", () => {
    expect(sharesOf({ fees_split: JSON.stringify({ paystack: 274, integration: 13406, subaccount: 344 }) }, "ACCT_a")).toEqual({ paystackP: 274, mainP: 13406, subP: 344 });
    expect(sharesOf({ split: { shares: { paystack: 274, integration: 13406, subaccounts: [{ subaccount_code: "ACCT_a", amount: 344 }] } } }, "ACCT_a")).toEqual({ paystackP: 274, mainP: 13406, subP: 344 });
    expect(sharesOf({ fees: 274 }, "ACCT_a")).toEqual({ paystackP: 274, mainP: null, subP: null });
});

function fakeFetch(reply: unknown) {
    const sent: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
        sent.push({ url, init });
        return new Response(JSON.stringify({ status: true, message: "ok", data: reply }), { status: 200 });
    }) as unknown as typeof fetch;
    return { sent, deps: { fetchImpl, secret: "sk_test_fake" } };
}

test("turning a split off or back on is one PUT with only the active flag, by id, never a delete", async () => {
    const f = fakeFetch({ id: 123456, split_code: ENV, name: "Admin", type: "percentage", bearer_type: "subaccount", active: false, subaccounts: [] });
    const r = await setSplitActive("123456", false, f.deps);
    expect(r.ok && r.data.active).toBe(false);
    expect(f.sent[0].url).toBe("https://api.paystack.co/split/123456");
    expect(f.sent[0].init.method).toBe("PUT");
    expect(JSON.parse(String(f.sent[0].init.body))).toEqual({ active: false });
    expect((f.sent[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_fake");
    const back = fakeFetch({ id: 123456, split_code: ENV, active: true, subaccounts: [] });
    await setSplitActive("123456", true, back.deps);
    expect(JSON.parse(String(back.sent[0].init.body))).toEqual({ active: true });
});

test("the split as read from Paystack, account numbers masked", async () => {
    const f = fakeFetch({ id: 9, split_code: ENV, name: "Admin 2.5", type: "percentage", bearer_type: "subaccount", active: true,
        subaccounts: [{ share: 2.5, subaccount: { subaccount_code: "ACCT_x", business_name: "PERSIUS NII-ADDO ADDO", settlement_bank: "Stanbic Bank", account_number: "9040001234567", account_name: "P N A" } }] });
    const r = await getSplit(ENV, f.deps);
    expect(r.ok && r.data).toMatchObject({ id: "9", code: ENV, active: true, bearerType: "subaccount", shares: [{ subaccountCode: "ACCT_x", share: 2.5, account: "•••• 4567", bank: "Stanbic Bank" }] });
    expect(JSON.stringify(r)).not.toContain("9040001234567");
});

test("subaccount bodies: percentage_charge 0 on create, only the account fields on update; resolve is a GET", async () => {
    const c = fakeFetch({ subaccount_code: "ACCT_new", business_name: "Admin", settlement_bank: "MTN", account_number: "0241234567" });
    const made = await createSubaccount({ businessName: "Admin", bankCode: "MTN", accountNumber: "0241234567" }, c.deps);
    expect(made.ok && made.data.code).toBe("ACCT_new");
    expect(JSON.parse(String(c.sent[0].init.body))).toMatchObject({ business_name: "Admin", settlement_bank: "MTN", account_number: "0241234567", percentage_charge: 0 });
    const u = fakeFetch({ subaccount_code: "ACCT_new" });
    await updateSubaccount("ACCT_new", { businessName: "Admin", bankCode: "MTN", accountNumber: "0559876543" }, u.deps);
    expect(u.sent[0].init.method).toBe("PUT");
    expect(JSON.parse(String(u.sent[0].init.body))).toEqual({ business_name: "Admin", settlement_bank: "MTN", account_number: "0559876543" });
    const rs = fakeFetch({ account_number: "0241234567", account_name: "TEST NAME" });
    const who = await resolveAccount("0241234567", "MTN", rs.deps);
    expect(who.ok && who.data.accountName).toBe("TEST NAME");
    expect(rs.sent[0].init.method).toBe("GET");
});

test("no Paystack key: a calm result, nothing sent", async () => {
    let called = 0;
    const r = await setSplitActive("1", false, { secret: null, fetchImpl: (async () => { called += 1; return new Response("{}"); }) as unknown as typeof fetch });
    expect(r).toEqual({ ok: false, reason: "not_configured" });
    expect(called).toBe(0);
});
