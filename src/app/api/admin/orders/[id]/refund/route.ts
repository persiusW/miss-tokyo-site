// POST /api/admin/orders/[id]/refund { mode, amount?, items?, restock, reason, notify, recordOnly?, cancel?, idempotencyKey }
// Owners and admins only, checked here. The work is in lib/orders/refunds.ts.
import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { refundOrder, type RefundBody } from "@/lib/orders/refunds";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
    const auth = await requireStaff(["admin", "owner"]);
    if ("status" in auth) {
        return NextResponse.json({ error: auth.status === 401 ? "Please sign in again." : "Only an owner or admin can refund an order." }, { status: auth.status });
    }
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "That order isn't there any more. Please refresh." }, { status: 404 });
    const body = (await req.json().catch(() => null)) as RefundBody | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Please refresh and try again." }, { status: 400 });
    try {
        const r = await refundOrder(id, {
            mode: body.mode, amount: body.amount, items: Array.isArray(body.items) ? body.items : null,
            restock: body.restock === true, reason: typeof body.reason === "string" ? body.reason : null,
            notify: body.notify === true, recordOnly: body.recordOnly === true, cancel: body.cancel === true,
            idempotencyKey: String(body.idempotencyKey ?? ""),
        }, auth);
        if (r.ok) return NextResponse.json(r);
        if (r.code) return apiError(r.code, { status: r.status, audience: "staff", context: { route: "admin/orders/[id]/refund" } });
        return NextResponse.json({ error: r.error }, { status: r.status });
    } catch (e) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e, context: { route: "admin/orders/[id]/refund" } });
    }
}
