/**
 * Automated abandoned cart reminder: runs every hour via Vercel Cron (GET).
 * Every scheduled job runs on Vercel Cron (vercel.json); the external
 * cron-job.org copy (/api/cron/abandoned-carts) is gone. Finds pending orders
 * with no payment, created 24-48 hours ago, that have not had a reminder, and
 * sends one email each. The work is in lib/orders/abandonedCarts.ts.
 *
 * Secured by CRON_SECRET env var (set in Vercel project settings).
 */

import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/errors/apiError";
import { runAbandonedReminders } from "@/lib/orders/abandonedCarts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(req: NextRequest): boolean {
    // Fail closed if the secret is missing.
    const authHeader = req.headers.get("authorization");
    return !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

/** Vercel Cron: { sent, errors? }, as before. */
export async function GET(req: NextRequest) {
    if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const r = await runAbandonedReminders();
    if ("error" in r) return apiError("GEN-00", { status: 500, audience: "staff", cause: r.error, context: { route: "cron/abandoned-cart" } });
    if (r.message) return NextResponse.json({ sent: 0, message: r.message });
    return NextResponse.json({ sent: r.sent, errors: r.failed.length ? r.failed : undefined });
}
