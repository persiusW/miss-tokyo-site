/**
 * One-off audit: has the store ever cancelled an order the customer actually paid for?
 *
 * /api/cron/sync-payment-status cancels any pending order Paystack reports as
 * "failed" or "abandoned", with no minimum age. Paystack calls a transaction
 * "abandoned" while the customer is still on the payment page, so a slow mobile
 * money payment could be cancelled mid-flight. If that customer then completed
 * the payment, charge.success would not match the order any more (the webhook
 * only updates payment_status pending/processing), so the money would land
 * against an order still reading cancelled.
 *
 * This asks Paystack about every non-paid order that has a reference and reports
 * the ones Paystack says were paid. Read-only — it changes nothing.
 *
 *   node scripts/audit-paystack-payments.mjs [--all] [--json out.json] [--csv out.csv] [--concurrency N]
 *
 * By default only non-paid orders are checked. --all re-verifies paid ones too.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── env ───────────────────────────────────────────────────────────────────────
// Read straight from .env.local rather than requiring a dotenv dependency.
function loadEnv(file) {
    let raw = "";
    try {
        raw = readFileSync(file, "utf8");
    } catch {
        return;
    }
    for (const line of raw.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const value = m[2].replace(/^["']|["']$/g, "");
        if (!process.env[m[1]]) process.env[m[1]] = value;
    }
}
loadEnv(".env.local");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

for (const [name, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, PAYSTACK_SECRET_KEY: PAYSTACK_SECRET })) {
    if (!value) {
        console.error(`Missing ${name}. Set it in .env.local and re-run.`);
        process.exit(1);
    }
}

const checkAll = process.argv.includes("--all");
const jsonFlag = process.argv.indexOf("--json");
const jsonOut = jsonFlag !== -1 ? process.argv[jsonFlag + 1] : null;
const csvFlag = process.argv.indexOf("--csv");
const csvOut = csvFlag !== -1 ? process.argv[csvFlag + 1] : null;
const concFlag = process.argv.indexOf("--concurrency");
// Paystack throttles a burst of verifies hard enough that a wide pool comes back
// with connection errors rather than 429s, which reads as "unknown" and quietly
// shrinks the audit. Small pool, and every failure is retried.
const CONCURRENCY = concFlag !== -1 ? Number(process.argv[concFlag + 1]) : 3;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// ── fetch orders ──────────────────────────────────────────────────────────────
// PostgREST caps a response at 1000 rows, so page explicitly.
async function fetchOrders() {
    const out = [];
    const PAGE = 500;
    for (let from = 0; ; from += PAGE) {
        let q = supabase
            .from("orders")
            .select("id, ref, customer_email, customer_name, customer_phone, total_amount, status, payment_status, fulfillment_status, paystack_reference, created_at, updated_at, customer_metadata, items")
            .not("paystack_reference", "is", null)
            .neq("paystack_reference", "")
            .neq("paystack_reference", "dummy-ref")
            .order("created_at", { ascending: false })
            .range(from, from + PAGE - 1);

        if (!checkAll) q = q.neq("payment_status", "paid");

        const { data, error } = await q;
        if (error) throw new Error(error.message);
        out.push(...data);
        if (data.length < PAGE) break;
    }
    return out;
}

// ── Paystack ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function verify(reference) {
    for (let attempt = 0; attempt < 6; attempt++) {
        if (attempt > 0) await sleep(500 * 2 ** attempt);
        try {
            const res = await fetch(
                `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
                { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } },
            );
            if (res.status === 429 || res.status >= 500) continue;
            const json = await res.json();
            if (!json.status || !json.data) return { status: "unknown", amount: null, paidAt: null };
            return {
                status: json.data.status,
                amount: json.data.amount != null ? json.data.amount / 100 : null,
                paidAt: json.data.paid_at || null,
                channel: json.data.channel || null,
            };
        } catch (e) {
            if (attempt === 5) return { status: "error", amount: null, paidAt: null, error: String(e) };
        }
    }
    return { status: "error", amount: null, paidAt: null };
}

/** Small pool so a few hundred references do not trip Paystack's rate limit. */
async function mapPool(items, size, fn) {
    const out = new Array(items.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(size, items.length) }, async () => {
            while (true) {
                const i = next++;
                if (i >= items.length) return;
                out[i] = await fn(items[i], i);
            }
        }),
    );
    return out;
}


// ── CSV ───────────────────────────────────────────────────────────────────────
/** Addresses that belong to the business rather than to a customer. */
const INTERNAL = /persiuswilder|persiusaddo|test@|testmen|persiustools|dashttpltd|misstokyo440/i;

/**
 * What fixing this order actually involves. An order whose goods already went
 * out needs its books corrected and nothing else — telling someone their
 * cancelled order is confirmed, days after they received it, is worse than
 * saying nothing.
 */
function remedyFor(order) {
    const shipped = ["delivered", "fulfilled"];
    const inFlight = ["packed", "shipped", "ready_for_pickup"];
    if (shipped.includes(order.fulfillment_status) || shipped.includes(order.status)) {
        return "books only - goods already delivered, do not email";
    }
    if (inFlight.includes(order.fulfillment_status) || inFlight.includes(order.status)) {
        return "in flight - finish dispatch";
    }
    return "unfulfilled - customer paid and received nothing";
}

function csvCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(entries) {
    const header = [
        "ref", "order_id", "customer_name", "customer_email", "customer_phone",
        "store_total_ghs", "paystack_amount_ghs", "amount_matches",
        "paystack_status", "paid_at", "channel", "paystack_reference",
        "order_status", "payment_status", "fulfillment_status",
        "created_at", "last_updated_at", "seconds_before_cancel",
        "remedy", "account_type", "items",
    ];
    const lines = [header.join(",")];

    for (const { order, ps } of entries) {
        const storeTotal = Number(order.total_amount ?? 0);
        const psAmount = ps.amount ?? null;
        lines.push([
            order.ref,
            order.id,
            order.customer_name,
            order.customer_email,
            order.customer_phone,
            storeTotal.toFixed(2),
            psAmount === null ? "" : psAmount.toFixed(2),
            // Paystack collects the delivery fee too, so a difference here is
            // expected; a large one is not, and is worth an eye.
            psAmount === null ? "" : (Math.abs(psAmount - storeTotal) < 0.01 ? "exact" : `differs by ${(psAmount - storeTotal).toFixed(2)}`),
            ps.status,
            ps.paidAt ?? "",
            ps.channel ?? "",
            order.paystack_reference,
            order.status,
            order.payment_status,
            order.fulfillment_status,
            order.created_at,
            order.updated_at,
            Math.round((new Date(order.updated_at) - new Date(order.created_at)) / 1000),
            remedyFor(order),
            INTERNAL.test(order.customer_email || "") ? "internal/test" : "customer",
            (Array.isArray(order.items) ? order.items : [])
                .map(i => `${i.quantity ?? 1}x ${i.name}${i.size ? ` (${i.size})` : ""}`)
                .join("; "),
        ].map(csvCell).join(","));
    }
    return lines.join("\n") + "\n";
}

// ── run ───────────────────────────────────────────────────────────────────────
const orders = await fetchOrders();
console.log(`Checking ${orders.length} order(s) against Paystack${checkAll ? " (including paid)" : ""}…\n`);

let done = 0;
const rows = await mapPool(orders, CONCURRENCY, async (order) => {
    const ps = await verify(order.paystack_reference);
    done++;
    if (done % 50 === 0) process.stderr.write(`  …${done}/${orders.length}\n`);
    return { order, ps };
});

const paidButNot = rows.filter(r => r.ps.status === "success" && r.order.payment_status !== "paid");
const byStatus = {};
for (const r of rows) byStatus[r.ps.status] = (byStatus[r.ps.status] || 0) + 1;

console.log("Paystack verdicts:");
for (const [k, v] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(k).padEnd(12)} ${v}`);
}

console.log(`\n=== PAID AT PAYSTACK BUT NOT PAID IN THE STORE: ${paidButNot.length} ===`);
if (paidButNot.length) {
    let total = 0;
    for (const { order, ps } of paidButNot.sort((a, b) => a.order.created_at.localeCompare(b.order.created_at))) {
        const secs = Math.round((new Date(order.updated_at) - new Date(order.created_at)) / 1000);
        total += Number(ps.amount ?? order.total_amount ?? 0);
        console.log(
            `  ${order.ref}  ${String(order.payment_status).padEnd(10)} ` +
            `GHS ${String(ps.amount ?? order.total_amount).padEnd(9)} ` +
            `paid_at=${ps.paidAt ?? "?"}  via=${ps.channel ?? "?"}  ` +
            `killed_after=${secs}s  ${order.customer_email ?? ""}`,
        );
    }
    console.log(`\n  Total exposed: GHS ${total.toFixed(2)}`);
} else {
    console.log("  none — no order was cancelled on a payment Paystack accepted.");
}

const unresolved = rows.filter(r => r.ps.status === "error");
if (unresolved.length) {
    console.log(`\n!! ${unresolved.length} reference(s) could not be verified — the audit is incomplete.`);
    console.log("   Re-run; only a clean pass with zero errors proves the figure above.");
}

if (csvOut) {
    const { writeFileSync } = await import("node:fs");
    const sorted = [...paidButNot].sort((a, b) => Number(b.ps.amount ?? 0) - Number(a.ps.amount ?? 0));
    writeFileSync(csvOut, toCsv(sorted));
    console.log(`\nCSV written to ${csvOut} (${sorted.length} row(s))`);
}

if (jsonOut) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(jsonOut, JSON.stringify({
        checked: rows.length,
        byStatus,
        paidButNot,
        all: rows.map(({ order, ps }) => ({
            ref: order.ref,
            id: order.id,
            payment_status: order.payment_status,
            status: order.status,
            total_amount: order.total_amount,
            customer_email: order.customer_email,
            created_at: order.created_at,
            updated_at: order.updated_at,
            paystack: ps,
        })),
    }, null, 2));
    console.log(`\nFull result written to ${jsonOut}`);
}
