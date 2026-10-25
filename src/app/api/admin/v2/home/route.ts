// Admin v2 Home data. Every staff role sees the same page, so any staff member
// may read it; the role is re-checked here on every call.
//   ?part=needs           "Needs you today", the restored-payment banner, latest orders, team activity
//   ?part=sales&period=   "Sales so far" for today | 7d | 30d, with the comparison
//   ?part=wallet          the WhatsApp wallet when it's running low (live read, may be slow)
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { loadActivity, loadLatest, loadNeeds, loadRestored, loadSales, loadWalletLow } from "@/lib/admin/v2/home";
import { needsRows } from "@/lib/admin/v2/homeNeeds";
import { isPeriod } from "@/lib/admin/v2/homeText";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const auth = await requireStaff();
    if ("status" in auth) return apiError("AUTH-01", { status: auth.status, audience: "staff" });
    const url = new URL(req.url);
    const part = url.searchParams.get("part");
    const now = new Date();
    try {
        if (part === "needs") {
            const [needs, restored, latest, activity] = await Promise.all([
                loadNeeds(auth.role, now), loadRestored(now), loadLatest(), loadActivity(auth.role),
            ]);
            return NextResponse.json({ needs: needsRows(needs, now), restored, latest, activity, at: now.toISOString() });
        }
        if (part === "sales") {
            const period = url.searchParams.get("period");
            return NextResponse.json(await loadSales(isPeriod(period) ? period : "today", now));
        }
        if (part === "wallet") {
            return NextResponse.json({ low: await loadWalletLow() });
        }
        return apiError("GEN-00", { status: 400, audience: "staff", cause: `unknown part ${part}` });
    } catch (cause) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause, context: { route: "admin/v2/home", part } });
    }
}
