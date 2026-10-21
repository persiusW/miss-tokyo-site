export const maxDuration = 120;

// Hourly (vercel.json). Freezes every finished features-bill period (the
// day after the cut-off through the cut-off day, Accra time = UTC), sends
// frozen statements to Dashttp with an idempotency key, and warns owners and
// admins at 80% and 100% of the monthly cap. Safe to run any number of times.
import { NextResponse } from "next/server";
import { runBillingCutoff } from "@/lib/billing/statements";
import { withCronRun } from "@/lib/billing/cronRuns";
import { logCause } from "@/lib/errors/apiError";

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const r = await withCronRun("billing-cutoff", () => runBillingCutoff(new Date(), "cron"),
            x => `frozen ${x.frozen.length}, sent ${x.submitted.length}, failed ${x.failed.length}${x.notConnected ? ", Dashttp not connected" : ""}${x.alerts.length ? `, cap alert ${x.alerts.join("/")}` : ""}`);
        return NextResponse.json({ ok: true, ...r });
    } catch (e) {
        logCause("GEN-00", e, { where: "cron.billing-cutoff" });
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
