export const maxDuration = 120;

// Hourly (vercel.json). Copies Paystack settlements to the admin subaccount
// and their transactions into Miss Tokyo's own tables, plus the current
// period's bill, for Dashttp's Command to read. Reads Paystack and writes
// only those tables. Safe to run any number of times.
import { NextResponse } from "next/server";
import { syncPaystackSettlements, syncNote } from "@/lib/billing/settlementSync";
import { withCronRun } from "@/lib/billing/cronRuns";
import { logCause } from "@/lib/errors/apiError";

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const r = await withCronRun("paystack-sync", () => syncPaystackSettlements(new Date()), syncNote);
        return NextResponse.json({ ok: true, ...r });
    } catch (e) {
        logCause("GEN-00", e, { where: "cron.paystack-sync" });
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
