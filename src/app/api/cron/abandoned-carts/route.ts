/**
 * The external cron service (cron-job.org) still calls this address:
 * POST /api/cron/abandoned-carts with Authorization: Bearer <CRON_SECRET>.
 * It was a second copy of the hourly reminder; it now runs the same code as
 * /api/cron/abandoned-cart. Point the external cron at that address, then
 * delete this file.
 */
import type { NextRequest } from "next/server";
import { POST as runReminders } from "../abandoned-cart/route";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    return runReminders(req);
}
