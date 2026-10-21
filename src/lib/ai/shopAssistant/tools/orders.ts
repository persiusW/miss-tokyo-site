// track_order: the same check as /track, a per-chat lockout, and nothing
// beyond the order's own items and states.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanTrackQuery } from "@/lib/orders/trackQuery";
import { findOrderByRef } from "@/lib/orders/findOrderByRef";
import { last9 } from "@/lib/phoneTail";
import { publicOrder, repayButton, type OrderRow } from "../format";
import { trackLocked } from "../guards";
import { LINES } from "../lines";
import { ok, pushTalk, type ShopToolContext, type ToolOutcome } from "./context";

const FIELDS = "id, created_at, total_amount, status, payment_status, items, delivery_method";

async function rowById(id: string): Promise<OrderRow | null> {
    const { data, error } = await supabaseAdmin.from("orders").select(FIELDS).eq("id", id).maybeSingle();
    if (error) throw error;
    return data as OrderRow | null;
}

function remember(ctx: ShopToolContext, id: string) {
    if (!ctx.chat.verifiedOrders.includes(id)) ctx.chat.verifiedOrders = [...ctx.chat.verifiedOrders, id].slice(-20);
    ctx.notes.orderRef = id.slice(0, 8).toUpperCase();
}

/** An order this chat placed and that still waits for payment brings its Pay now button back. */
function offerPay(ctx: ShopToolContext, row: OrderRow) {
    const b = repayButton(ctx.chat, row);
    if (b) ctx.buttons.push(b);
}

export async function trackOrder(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    ctx.notes.topic = "my order";
    if (input?.my_orders === true) {
        // On WhatsApp the sender's own number is the proof (as for track_order): their orders are the ones with that phone.
        const tail = ctx.channel === "whatsapp" ? last9(ctx.identity.phone) : null;
        if (!ctx.identity.customerId && !tail) return ok({ note: "The customer isn't signed in. Ask for the order number and the email or phone used on it." });
        const base = supabaseAdmin.from("orders").select(FIELDS);
        const { data, error } = await (ctx.identity.customerId ? base.eq("customer_id", ctx.identity.customerId) : base.ilike("customer_phone", `%${tail}`))
            .order("created_at", { ascending: false }).limit(5);
        if (error) throw error;
        for (const r of data ?? []) { remember(ctx, r.id); offerPay(ctx, r as OrderRow); }
        return ok({ orders: (data ?? []).map(r => publicOrder(r as OrderRow)) });
    }

    const q = cleanTrackQuery({ ref: input?.order_ref, email: input?.email, phone: input?.phone });
    if (!q.ref) return ok({ note: "Ask for the 8-character order number from the confirmation email or SMS." });

    const known = ctx.chat.verifiedOrders.find(id => id.slice(0, 8).toUpperCase() === q.ref);
    if (known) {
        const row = await rowById(known);
        if (row) { remember(ctx, row.id); offerPay(ctx, row); return ok({ order: publicOrder(row) }); }
    }

    if (trackLocked(ctx.chat.wrongTries)) { pushTalk(ctx); return ok({ reply_with: LINES.trackLocked }); }
    // On WhatsApp the sender's own number counts as the phone on the order.
    const phone = q.phone ?? (ctx.channel === "whatsapp" ? ctx.identity.phone ?? null : null);
    if (!q.email && !phone) return ok({ note: "Ask for the email or phone number used on the order." });

    const hit = await findOrderByRef({ ...q, phone });
    if (!hit) {
        ctx.chat.wrongTries += 1;
        if (trackLocked(ctx.chat.wrongTries)) { pushTalk(ctx); return ok({ reply_with: LINES.trackLocked }); }
        return ok({ reply_with: LINES.wrongDetails });
    }
    const row = await rowById(hit.id);
    if (!row) return ok({ reply_with: LINES.wrongDetails });
    remember(ctx, row.id);
    offerPay(ctx, row);
    return ok({ order: publicOrder(row) });
}
