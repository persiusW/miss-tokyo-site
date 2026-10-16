// start_return: on WhatsApp, save a return or exchange request for an order
// verified in this chat, and hand the chat to a person to arrange it.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RETURN_DETAILS_MAX, RETURN_REASONS, RETURN_WANTS, returnable, type ReturnReason, type ReturnWant } from "@/lib/whatsapp/returns";
import { err, ok, pushTalk, str, type ShopToolContext, type ToolOutcome } from "./context";

const db = supabaseAdmin as any;

export async function startReturn(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    if (ctx.channel !== "whatsapp" || !ctx.waConversationId) return err("That isn't available here.");
    ctx.notes.topic = "a return";
    const ref = str(input?.order_ref, 20).replace(/[^0-9a-f]/gi, "").toUpperCase();
    const id = ctx.chat.verifiedOrders.find(o => o.slice(0, 8).toUpperCase() === ref);
    if (!id) return err("Look the order up with track_order first (the order number and the phone or email on it).");
    const reason = RETURN_REASONS.includes(input?.reason) ? input.reason as ReturnReason : null;
    if (!reason) return err(`reason must be one of: ${RETURN_REASONS.join(", ")}`);
    const wants = RETURN_WANTS.includes(input?.wants) ? input.wants as ReturnWant : "unsure";
    const details = str(input?.details, RETURN_DETAILS_MAX) || null;

    const { data: order, error } = await db.from("orders").select("id, status, payment_status").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!order) return err("That order can't be found. Offer to pass them to a person with shop_info topic contact.");
    if (!returnable(order)) {
        return err("Our records don't show this order as paid and delivered yet, so it can't be returned here. Offer to pass them to a person with shop_info topic contact.");
    }

    const { error: ie } = await db.from("return_requests").insert({
        order_id: id, conversation_id: ctx.waConversationId, reason, wants, details,
    });
    if (ie && ie.code !== "23505") throw ie;   // 23505: already asked for this order
    ctx.notes.orderRef = ref;
    ctx.handoff = "return_request";
    pushTalk(ctx);
    return ok({ saved: true, next: "Tell them a member of our team will continue here to arrange it. Don't promise an outcome." });
}
