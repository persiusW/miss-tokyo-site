// GET /api/admin/stock/export: Products › Inventory › Export stock. Every
// stock figure (each size and colour, or the product's own) as CSV, read in
// pages past the 1000-row cap. Staff only; no costs in it.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { allInventoryRows } from "@/lib/admin/v2/catalogueLoad";
import { stockCsv } from "@/lib/admin/v2/catalogue";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireStaff();
    if ("status" in auth) return NextResponse.json({ code: "AUTH-01", error: "Please sign in again." }, { status: auth.status });
    try {
        const rows = await allInventoryRows();
        const day = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Accra" });
        return new NextResponse(stockCsv(rows), {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="miss-tokyo-stock-${day}.csv"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (e) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e, context: { where: "stock.export" } });
    }
}
