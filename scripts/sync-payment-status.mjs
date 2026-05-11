/**
 * One-time backfill: find orders stuck with payment_status="paid" but status="pending"
 * and update status="paid" after verifying against Paystack.
 *
 * Usage:
 *   node scripts/sync-payment-status.mjs
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PAYSTACK_SECRET_KEY
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !PAYSTACK_SECRET) {
    console.error("Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyWithPaystack(reference) {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const json = await res.json();
    return json?.data?.status ?? null; // "success" | "failed" | "abandoned" | "ongoing" | null
}

async function main() {
    // Find ALL orders that are still "pending" in any form with a Paystack reference
    const { data: stuck, error } = await supabase
        .from("orders")
        .select("id, paystack_reference, total_amount, customer_name, created_at, status, payment_status")
        .or("status.eq.pending,payment_status.eq.pending,payment_status.eq.processing")
        .not("paystack_reference", "is", null)
        .neq("paystack_reference", "")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to fetch orders:", error.message);
        process.exit(1);
    }

    if (!stuck || stuck.length === 0) {
        console.log("No stuck orders found. All clear.");
        return;
    }

    console.log(`Found ${stuck.length} stuck order(s). Verifying with Paystack...\n`);

    let fixed = 0;
    let skipped = 0;
    let noRef = 0;

    for (const order of stuck) {
        const shortId = order.id.substring(0, 8).toUpperCase();
        const ref = order.paystack_reference;

        if (!ref) {
            console.log(`  [SKIP] #${shortId} — ${order.customer_name} — no Paystack reference`);
            noRef++;
            continue;
        }

        let paystackStatus = null;
        try {
            paystackStatus = await verifyWithPaystack(ref);
        } catch (e) {
            console.log(`  [ERR]  #${shortId} — ${order.customer_name} — Paystack verify failed: ${e.message}`);
            skipped++;
            continue;
        }

        if (!paystackStatus) {
            console.log(`  [SKIP] #${shortId} — ${order.customer_name} — no Paystack response`);
            skipped++;
            continue;
        }

        let newStatus, newPaymentStatus;
        if (paystackStatus === "success") {
            newStatus = "paid"; newPaymentStatus = "paid";
        } else if (paystackStatus === "failed" || paystackStatus === "abandoned") {
            newStatus = "cancelled"; newPaymentStatus = "cancelled";
        } else {
            // "ongoing" — leave as-is
            console.log(`  [SKIP] #${shortId} — ${order.customer_name} — ongoing (${paystackStatus})`);
            skipped++;
            continue;
        }

        const { error: updateErr } = await supabase
            .from("orders")
            .update({ status: newStatus, payment_status: newPaymentStatus })
            .eq("id", order.id);

        if (updateErr) {
            console.log(`  [ERR]  #${shortId} — ${order.customer_name} — DB update failed: ${updateErr.message}`);
            skipped++;
        } else {
            console.log(`  [FIXED] #${shortId} — ${order.customer_name} — GH₵ ${order.total_amount?.toFixed(2)} → ${newStatus} (was: status=${order.status} payment=${order.payment_status})`);
            fixed++;
        }

        // Be polite to Paystack rate limits
        await new Promise(r => setTimeout(r, 150));
    }

    console.log(`\nDone. Fixed: ${fixed} | Skipped: ${skipped} | No ref: ${noRef}`);
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
