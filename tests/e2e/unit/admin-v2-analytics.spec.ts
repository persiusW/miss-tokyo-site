import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
    analyticsRange, bucketLabel, channelTable, cmpText, csvCell, csvName, customerFigures, datesText, deltas, discountOrderLines,
    discountTable, fillSeries, figures, hourTable, kpiCtx, methodName, minusYear, noneText, overviewCsv, parseQuery, paymentMethodTable,
    productTable, querySearch, reportSlug, returningCtx, returningRate, riderOrdersTable, sectionsCsv, tableCsv, weekdayTable,
    writeoffReason, writeoffTable, DEFAULT_QUERY, type AnalyticsQuery,
} from "../../../src/lib/admin/v2/analytics";

// Admin v2 Analytics: range maths (Accra time), compare ranges including the
// same period last year, the returning-customer share, report tables and CSV.
// Pure: no database. The SQL is checked as text at the end.

const ROOT = path.resolve(__dirname, "../../..");
const at = (s: string) => new Date(s);
const iso = (d: Date) => d.toISOString();
const Q = (p: Partial<AnalyticsQuery>): AnalyticsQuery => ({ ...DEFAULT_QUERY, ...p });

// ── Ranges ───────────────────────────────────────────────────────────────────
test("presets run from Accra midnight to now and compare with the stretch straight before", () => {
    const now = at("2026-10-21T14:30:00Z");
    const t = analyticsRange(Q({ range: "today" }), now);
    expect([iso(t.from), iso(t.to), iso(t.cmpFrom), iso(t.cmpTo)]).toEqual([
        "2026-10-21T00:00:00.000Z", "2026-10-21T14:30:00.000Z", "2026-10-20T00:00:00.000Z", "2026-10-20T14:30:00.000Z",
    ]);
    expect(t.step).toBe(3_600_000);
    expect(t.buckets).toBe(15);
    const w = analyticsRange(Q({ range: "7d" }), now);
    expect(iso(w.from)).toBe("2026-10-15T00:00:00.000Z");
    expect(iso(w.cmpFrom)).toBe("2026-10-08T00:00:00.000Z");
    expect(iso(w.cmpTo)).toBe("2026-10-14T14:30:00.000Z");
    expect(w.buckets).toBe(7);
    const q = analyticsRange(Q({ range: "90d" }), now);
    expect(iso(q.from)).toBe("2026-07-24T00:00:00.000Z");
    expect(q.days).toBe(90);
    expect(q.buckets).toBe(90);
    for (const r of [t, w, q]) expect(r.to.getTime() - r.from.getTime()).toBe(r.cmpTo.getTime() - r.cmpFrom.getTime());
});

test("a custom range covers both days whole, or stops at now when it ends today", () => {
    const now = at("2026-10-21T10:00:00Z");
    const past = analyticsRange(Q({ range: "custom", from: "2026-10-01", to: "2026-10-10" }), now);
    expect(iso(past.from)).toBe("2026-10-01T00:00:00.000Z");
    expect(iso(past.to)).toBe("2026-10-11T00:00:00.000Z");
    expect(past.days).toBe(10);
    expect(iso(past.cmpFrom)).toBe("2026-09-21T00:00:00.000Z");
    expect(iso(past.cmpTo)).toBe("2026-10-01T00:00:00.000Z");
    const open = analyticsRange(Q({ range: "custom", from: "2026-10-20", to: "2026-10-21" }), now);
    expect(iso(open.to)).toBe("2026-10-21T10:00:00.000Z");
    expect(open.days).toBe(2);
    const oneDay = analyticsRange(Q({ range: "custom", from: "2026-10-05", to: "2026-10-05" }), now);
    expect(oneDay.step).toBe(3_600_000);
    expect(oneDay.buckets).toBe(24);
    // No dates yet: the last 30 days, as the old page started its custom range.
    const blank = analyticsRange(Q({ range: "custom" }), now);
    expect(iso(blank.from)).toBe("2026-09-22T00:00:00.000Z");
    expect(blank.days).toBe(30);
});

test("same period last year moves both ends back one calendar year", () => {
    const now = at("2026-10-21T14:30:00Z");
    const r = analyticsRange(Q({ range: "7d", cmp: "year" }), now);
    expect(iso(r.cmpFrom)).toBe("2025-10-15T00:00:00.000Z");
    expect(iso(r.cmpTo)).toBe("2025-10-21T14:30:00.000Z");
    expect(iso(minusYear(at("2028-02-29T08:00:00Z")))).toBe("2027-02-28T08:00:00.000Z");
    expect(iso(minusYear(at("2027-03-01T00:00:00Z")))).toBe("2026-03-01T00:00:00.000Z");
});

// ── URL ──────────────────────────────────────────────────────────────────────
test("the URL keeps range, compare and the open report, and drops anything unknown", () => {
    const q = parseQuery({ range: "custom", from: "2026-10-10", to: "2026-10-01", cmp: "year", report: "riders", rider: "0a1b2c3d-1111-2222-3333-444455556666", scope: "all" });
    expect(q).toEqual({ range: "custom", from: "2026-10-01", to: "2026-10-10", cmp: "year", report: "riders", rider: "0a1b2c3d-1111-2222-3333-444455556666", scope: "all" });
    expect(querySearch(q)).toBe("?range=custom&from=2026-10-01&to=2026-10-10&cmp=year&report=riders&rider=0a1b2c3d-1111-2222-3333-444455556666&scope=all");
    expect(parseQuery({ range: "1y", report: "traffic", from: "2026-02-30" })).toEqual(DEFAULT_QUERY);
    // A rider or all-time only belongs to the reports that have them.
    expect(parseQuery({ report: "product", rider: "0a1b2c3d-1111", scope: "all" })).toMatchObject({ rider: null, scope: "range" });
    expect(querySearch(DEFAULT_QUERY)).toBe("");
    expect(querySearch(DEFAULT_QUERY, { report: "payments" })).toBe("?report=payments");
    expect(parseQuery(new URLSearchParams("range=30d&report=payments"))).toMatchObject({ range: "30d", report: "payments" });
});

// ── Labels ───────────────────────────────────────────────────────────────────
test("the dates line reads like a person wrote it", () => {
    expect(datesText(at("2026-10-15T00:00:00Z"), at("2026-10-21T14:00:00Z"))).toBe("15–21 Oct 2026");
    expect(datesText(at("2026-09-28T00:00:00Z"), at("2026-10-05T00:00:00Z"))).toBe("28 Sep – 4 Oct 2026");
    expect(datesText(at("2025-12-28T00:00:00Z"), at("2026-01-04T00:00:00Z"))).toBe("28 Dec 2025 – 3 Jan 2026");
    expect(datesText(at("2026-10-21T00:00:00Z"), at("2026-10-21T09:00:00Z"))).toBe("21 Oct 2026");
    expect(bucketLabel({ from: at("2026-10-21T00:00:00Z"), step: 3_600_000 }, 9)).toBe("09:00");
    expect(bucketLabel({ from: at("2026-10-15T00:00:00Z"), step: 86_400_000 }, 2)).toBe("17 Oct");
});

test("each KPI says what it is compared with, or that there was nothing to compare", () => {
    expect(cmpText(Q({ range: "today" }), 1)).toBe("vs same time yesterday");
    expect(cmpText(Q({ range: "7d" }), 7)).toBe("vs previous 7 days");
    expect(cmpText(Q({ range: "custom" }), 1)).toBe("vs the day before");
    expect(cmpText(Q({ range: "30d", cmp: "year" }), 30)).toBe("vs same period last year");
    expect(noneText(Q({ range: "90d" }), 90)).toBe("none in the previous 90 days");
    expect(kpiCtx(Q({ range: "7d", cmp: "year" }), 7, null, 0)).toBe("none in the same period last year");
    expect(kpiCtx(Q({ range: "7d" }), 7, 12, 100)).toBe("vs previous 7 days");
});

// ── Returning customers (gap 2) ──────────────────────────────────────────────
test("returning customers is the share of orders with an email whose customer had paid before", () => {
    const cur = figures({ sales: 1000, orders: 10, aov: 100, items: 12, known_orders: 8, returning_orders: 3, customers: 6 })!;
    const prev = figures({ sales: 800, orders: 8, aov: 100, items: 9, known_orders: 4, returning_orders: 2, customers: 3 })!;
    expect(returningRate(cur)).toBe(38);
    expect(returningRate({ known_orders: 0, returning_orders: 0 })).toBeNull();
    // Sales and orders move in percent; the share moves in percentage points.
    expect(deltas(cur, prev)).toEqual({ sales: 25, orders: 25, aov: 0, returning: -12 });
    expect(deltas(cur, null)).toEqual({ sales: null, orders: null, aov: null, returning: null });
    expect(returningCtx(cur)).toBe("of 8 orders with a customer email");
    expect(returningCtx({ known_orders: 0 })).toBe("no orders with a customer email yet");
    // An older reply without the new keys still reads as zero, never as made up.
    expect(figures({ sales: 5, orders: 1 })).toMatchObject({ known_orders: 0, returning_orders: 0, customers: 0 });
});

test("the chart has a value for every bucket, zero where nothing sold", () => {
    expect(fillSeries([{ i: 0, sales: 10, orders: 1 }, { i: 3, sales: 5, orders: 2 }, { i: 9, sales: 1 }], 5)).toEqual([10, 0, 0, 5, 0]);
    expect(fillSeries([{ i: 3, sales: 5, orders: 2 }], 4, "orders")).toEqual([0, 0, 0, 2]);
    expect(fillSeries(null, 2)).toEqual([0, 0]);
});

// ── Report tables ────────────────────────────────────────────────────────────
test("report tables keep the old columns, with totals", () => {
    const p = productTable([{ name: "Satin Slip Dress", units: 3, sales: 900 }, { name: "", units: 1, sales: 50.5 }]);
    expect(p.rows).toEqual([["Satin Slip Dress", 3, 900], ["Unknown", 1, 50.5]]);
    expect(p.foot).toEqual(["Total", 4, 950.5]);
    const c = channelTable([{ channel: "pos", orders: 3, sales: 300, placed: 4 }, { channel: "pay_link", orders: 1, sales: 100, placed: 1 }, { channel: "storefront", orders: 0, sales: 0, placed: 2 }]);
    expect(c.rows.map(r => r[0])).toEqual(["Till", "Pay link", "Online shop"]);
    expect(c.rows.map(r => r[2])).toEqual([75, 25, 0]);
    const d = discountTable([{ label: "MISST100", type: "code", uses: 2, given: 200, sales: 500 }, { label: "2 for 150", type: "auto", uses: 1, given: 10, sales: 140 }]);
    expect(d.rows.map(r => r[1])).toEqual(["Code", "Automatic"]);
    expect(d.foot).toEqual(["Total", null, 3, 210, 640]);
    expect(paymentMethodTable([{ method: "paystack", payments: 2, amount: 20 }, { method: "cash", payments: 1, amount: 5 }]).rows.map(r => r[0]))
        .toEqual(["Paystack (card or Mobile money)", "Cash"]);
    expect(methodName(null)).toBe("Other");
    expect(hourTable([{ h: 9, n: 2, sales: 40 }]).rows[9]).toEqual(["09:00", 2, 40]);
    expect(hourTable([]).rows).toHaveLength(24);
    expect(weekdayTable([{ wd: 7, n: 1, sales: 9 }]).rows[6]).toEqual(["Sun", 1, 9]);
});

test("the write-off report says plainly why each item came off", () => {
    expect(writeoffReason("write_off")).toBe("Written off (damaged or lost)");
    expect(writeoffReason("admin_adjust")).toBe("Taken off by hand");
    const t = writeoffTable([{ at: "2026-10-01T10:00:00Z", reason: "admin_adjust", qty: 2, product: "Satin Slip Dress", size: "M", color: "Black", note: null, by: "Ama" }]);
    expect(t.rows[0]).toEqual(["2026-10-01T10:00:00Z", "Satin Slip Dress", "M / Black", 2, "Taken off by hand", "—", "Ama"]);
    expect(t.foot?.[3]).toBe(2);
});

test("an order with a code and an automatic discount is listed under each", () => {
    const lines = discountOrderLines([
        { id: "o1", ref: "ab12", customer_name: "Ama", total_amount: 100, discount_code: "misst100", discount_amount: 20, auto_discount_title: "2 for 150", auto_discount_amount: 5, created_at: "2026-10-01T10:00:00Z" },
        { id: "o2", ref: null, customer_email: "k@x.com", total_amount: 50, discount_code: null, auto_discount_title: "2 for 150", auto_discount_amount: 3, created_at: "2026-10-02T10:00:00Z" },
    ]);
    expect(lines.map(l => [l.label, l.type, l.given])).toEqual([["MISST100", "code", 20], ["2 for 150", "auto", 5], ["2 for 150", "auto", 3]]);
    expect(lines[2].customer).toBe("k@x.com");
});

test("customer figures leave out orders with no email instead of counting them as one customer", () => {
    expect(customerFigures({ unique: 4, repeat: 1, sales: 1000 })).toEqual({ unique: 4, repeat: 1, repeatRate: 25, avgPerCustomer: 250 });
    expect(customerFigures({})).toEqual({ unique: 0, repeat: 0, repeatRate: null, avgPerCustomer: null });
});

test("rider orders show the order number and the address the old page showed", () => {
    const t = riderOrdersTable([{ id: "0a1b2c3d-xxxx", ref: null, customer_name: "Ama", shipping_address: { text: "East Legon" }, total_amount: 10, status: "shipped", created_at: "2026-10-01T00:00:00Z" }]);
    expect(t.rows[0].slice(0, 4)).toEqual(["0A1B2C3D", "Ama", "—", "East Legon"]);
    expect(t.rows[0][5]).toBe("On the way");
});

// ── CSV ──────────────────────────────────────────────────────────────────────
test("CSV cells are quoted when needed and never run as formulas", () => {
    expect(csvCell("Satin, slip")).toBe('"Satin, slip"');
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+233 20")).toBe("'+233 20");
    expect(csvCell("@x")).toBe("'@x");
    expect(csvCell("-x")).toBe("'-x");
    expect(csvCell("-5")).toBe("-5");
    expect(csvCell(12.5, "money")).toBe("12.50");
    expect(csvCell(-3)).toBe("-3");
    expect(csvCell(null)).toBe("");
    expect(csvCell("2026-10-01T10:05:00Z", "date")).toBe("2026-10-01 10:05");
    expect(csvCell("2026-10-01", "date")).toBe("2026-10-01");
});

test("a report exports as a table with headers, money in cedis and the total last", () => {
    const csv = tableCsv(productTable([{ name: "Slides, tan", units: 2, sales: 300 }]));
    expect(csv).toBe('Product,Units,Sales (GH₵)\n"Slides, tan",2,300.00\nTotal,2,300.00');
    expect(sectionsCsv([{ title: "A", table: { cols: [{ h: "x", kind: "int" }], rows: [[1]] } }, { title: "B", table: { cols: [{ h: "y", kind: "text" }], rows: [["z"]] } }]))
        .toBe("A\nx\n1\n\nB\ny\nz");
    expect(csvName(reportSlug("variant"), at("2026-10-15T00:00:00Z"), at("2026-10-22T00:00:00Z"))).toBe("sales-by-size-and-colour_2026-10-15_2026-10-21.csv");
    const cur = figures({ sales: 100, orders: 2, items: 3, aov: 50, known_orders: 2, returning_orders: 1 })!;
    const o = overviewCsv({ cur, prev: null, labels: ["15 Oct"], cmpLabels: ["8 Oct"], sales: [100], orders: [2], prevSales: null, prevOrders: null });
    expect(o.split("\n").slice(0, 3)).toEqual(["Summary", "Figure,This period,Compared period", "Sales (GH₵),100.00,"]);
    expect(o).toContain("15 Oct,100.00,2,8 Oct,,");
});

// ── SQL ──────────────────────────────────────────────────────────────────────
test("the SQL keeps the paid rule of customer_spend and is service-role only", () => {
    const read = (f: string) => fs.readFileSync(path.join(ROOT, "supabase/migrations", f), "utf8");
    const summary = read("20261022080000_sales_summary_returning.sql");
    const reports = read("20261022081000_analytics_reports.sql");
    const spend = read("20261022060000_customer_spend.sql");
    const legacy = "('paid', 'processing', 'fulfilled', 'delivered', 'packed', 'ready_for_pickup', 'shipped')";
    expect(spend).toContain(legacy);
    for (const sql of [summary, reports]) {
        expect(sql).toContain("payment_status = 'paid'");
        expect(sql).toContain(legacy);
        expect(sql).toMatch(/revoke execute on function public\.\w+\([^)]*\) from public, anon, authenticated;/);
        expect(sql).not.toMatch(/security definer/i);
        expect(sql).not.toMatch(/\bdrop\b/i);
    }
    // Home's keys stay; the new ones are added beside them.
    for (const k of ["sales", "orders", "items", "aov", "cash", "cash_orders", "known_orders", "returning_orders", "customers"]) expect(summary).toContain(`'${k}'`);
    // Every report kind the server asks for exists in the function.
    const load = fs.readFileSync(path.join(ROOT, "src/lib/admin/v2/analyticsLoad.ts"), "utf8");
    const kinds = [...load.matchAll(/report\("([a-z_]+)"/g)].map(m => m[1]);
    expect(kinds.length).toBeGreaterThan(8);
    for (const k of kinds) expect(reports, k).toMatch(new RegExp(`p_kind (=|in \\()[^\\n]*'${k}'`));
    // The write-off report reads write_off as soon as Products adds it.
    expect(reports).toContain("m.reason in ('write_off', 'admin_adjust', 'correction')");
    // The newsletter count reads the table sign-ups are written to.
    expect(reports).toContain("public.newsletter_subscribers");
    expect(reports).not.toContain("newsletter_subs ");
});
