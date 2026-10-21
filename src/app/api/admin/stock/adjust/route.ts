// POST /api/admin/stock/adjust (BACKEND_GAPS 9): Products › Inventory › Adjust.
// { product_id, variant_id, reason, quantity | counted, note, idempotency_key }
//   reason   restock | stock_count | write_off | correction
//   quantity units to add or remove (correction may be negative)
//   counted  what was counted on the shelf (stock_count)
// Staff roles as everywhere else stock changes from the admin. The change goes
// through fn_stock_adjust → fn_apply_stock_movement under the idempotency key,
// so a double tap is recorded once and a count can't overwrite a sale.
import { NextRequest, NextResponse, after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { adjustStockFor } from "@/lib/inventory";
import { cleanAdjust } from "@/lib/admin/v2/catalogue";
import { logActivity } from "@/lib/utils/logActivity";

const REFUSED: Record<string, string> = {
    "stock_adjust: product does not track stock": "This product doesn't track stock, so there's nothing to adjust.",
    "stock_adjust: choose a size or colour": "Choose the size or colour to adjust.",
    "stock_adjust: product has no sizes to adjust": "This product has one stock number. Adjust the product itself.",
    "stock_adjust: variant not found": "That size or colour isn't there any more. Refresh and try again.",
    "stock_adjust: product not found": "That product isn't there any more.",
};

export async function POST(req: NextRequest) {
    const auth = await requireStaff();
    if ("status" in auth) {
        return NextResponse.json({ code: "AUTH-01", error: auth.status === 401 ? "Please sign in again." : "Your account can't change stock." }, { status: auth.status });
    }
    let body: unknown;
    try { body = await req.json(); } catch { body = null; }
    const input = cleanAdjust(body);
    if (!input) return NextResponse.json({ error: "Check the reason and the number, then try again." }, { status: 400 });

    try {
        const result = await adjustStockFor({
            productId: input.product_id, variantId: input.variant_id, reason: input.reason,
            quantity: input.quantity, actor: auth.userId, key: input.key, note: input.note,
        });
        if (result.applied) {
            revalidatePath("/catalogue", "layout");
            revalidatePath("/catalog/products", "page");
            revalidatePath("/shop", "page");
            revalidateTag("products", "max");
            after(() => logActivity({
                userId: auth.userId, userRole: auth.role, actionType: "UPDATE", resource: "product", resourceId: input.product_id,
                details: { stock_adjust: input.reason, variant_id: input.variant_id, before: result.before, after: result.after, delta: result.delta, note: input.note },
            }));
        }
        return NextResponse.json({ ok: true, ...result });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        const known = Object.entries(REFUSED).find(([k]) => msg.includes(k));
        if (known) return NextResponse.json({ error: known[1] }, { status: 409 });
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e, context: { where: "stock.adjust" } });
    }
}
