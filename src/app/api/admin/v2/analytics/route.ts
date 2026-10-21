// Admin v2 Analytics data. Every staff role could open the old Analytics,
// Payments and Riders pages, so any staff member may read this; the role is
// re-checked on every call.
//   ?part=overview&range=&from=&to=&cmp=          KPIs, chart, top products, channels
//   ?part=report&report=<key>&…&page=&all=1       one report (all=1: every row, for CSV)
//     report=discounts&discount=code:X|auto:Title the orders behind one discount
//     report=riders&rider=<id>                    one rider's orders
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { parseQuery } from "@/lib/admin/v2/analytics";
import { loadOverview, loadReport } from "@/lib/admin/v2/analyticsLoad";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const auth = await requireStaff();
    if ("status" in auth) return apiError("AUTH-01", { status: auth.status, audience: "staff" });
    const url = new URL(req.url);
    const part = url.searchParams.get("part");
    const q = parseQuery(url.searchParams);
    const now = new Date();
    try {
        if (part === "overview") return NextResponse.json(await loadOverview(q, now));
        if (part === "report" && q.report) {
            const discount = url.searchParams.get("discount");
            const data = await loadReport(q.report, q, now, {
                page: Number(url.searchParams.get("page")) || 1,
                all: url.searchParams.get("all") === "1",
                discount: discount && /^(code|auto):.{1,200}$/.test(discount) ? discount : null,
            });
            return NextResponse.json(data);
        }
        return apiError("GEN-00", { status: 400, audience: "staff", cause: `unknown part ${part}` });
    } catch (cause) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause, context: { route: "admin/v2/analytics", part, report: q.report } });
    }
}
