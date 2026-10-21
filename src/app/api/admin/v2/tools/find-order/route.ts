// GET /api/admin/v2/tools/find-order?q=<receipt number | Paystack reference>
// Admin Tools › Payments: which order a receipt number or Paystack reference
// belongs to. Admin only, like every Admin Tools endpoint.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { toolsAllowed } from "@/lib/admin/v2/tools";
import { apiError } from "@/lib/errors/apiError";

export async function GET(req: Request) {
    const me = await requireStaff(["admin"]);
    if ("status" in me || !toolsAllowed(me.role)) return apiError("GEN-00", { status: 403, audience: "staff" });
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().replace(/^#/, "");
    if (!/^[A-Za-z0-9_-]{4,100}$/.test(q)) return NextResponse.json({ error: "Enter a receipt number or a Paystack reference." }, { status: 400 }); // calm-text
    const db = supabaseAdmin as any;
    const tries = [
        db.from("orders").select("id").eq("ref", q.toUpperCase()).limit(1),
        db.from("orders").select("id").eq("paystack_reference", q).limit(1),
    ];
    for (const t of tries) {
        const { data, error } = await t;
        if (error) return apiError("GEN-00", { status: 500, audience: "staff", cause: error });
        if (data?.[0]?.id) return NextResponse.json({ id: data[0].id });
    }
    return NextResponse.json({ error: "No order with that receipt number or Paystack reference." }, { status: 404 }); // calm-text
}
