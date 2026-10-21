// price_order and place_order: the storefront's own checkout, with a quote
// the customer agreed to, at most 2 unpaid orders per chat, and calm failures.
import { createCheckoutOrder, quoteCheckoutOrder, type CreateCheckoutOrderInput } from "@/lib/checkout/createCheckoutOrder";
import { checkoutCustomerLine } from "@/lib/errors/catalogue";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canOpenAnother, quoteHolds, stampQuote, quoteKey, sameTotal } from "../guards";
import { BUTTON_LABELS, LINES } from "../lines";
import { err, ok, pushTalk, str, type ShopToolContext, type ToolOutcome } from "./context";
import type { CartLine } from "../cartRules";
import { clearCart, loadCart } from "../cartStore";
import { holdLive } from "../holds";

const PAY_CODES = new Set(["gateway", "refused", "payments_unconfigured"]);

function toInput(input: any, ctx: ShopToolContext, cart: CartLine[] | null = null): CreateCheckoutOrderInput {
    const items = cart ?? (Array.isArray(input?.items) ? input.items : []);
    return {
        items: items.map((i: any) => ({
            product_id: str(i?.product_id, 40),
            size: str(i?.size, 40) || null,
            colour: str(i?.colour, 60) || null,
            brand: str(i?.brand, 60) || null,
            quantity: i?.quantity,
        })),
        customer: {
            name: str(input?.customer_name, 120),
            // On WhatsApp the sender's number is the phone unless the customer gave another.
            phone: str(input?.customer_phone, 30) || (ctx.channel === "whatsapp" ? ctx.identity.phone ?? "" : ""),
            email: str(input?.customer_email, 160) || null,
        },
        delivery: {
            method: input?.delivery_method === "pickup" ? "pickup" : "delivery",
            address: str(input?.delivery_address, 500) || null,
            zone: input?.delivery_zone === "accra" || input?.delivery_zone === "outside" ? input.delivery_zone : null,
            region: str(input?.region, 60) || null,
        },
        source: ctx.channel === "whatsapp" ? "whatsapp" : "web_chat",
        discount_code: str(input?.discount_code, 60) || null,
        hold_minutes: 15,
        ...(ctx.chat.saleKey ? { saleKey: ctx.chat.saleKey } : {}),
    };
}

const MAX_LINES = 20;
const tooMany = (input: any) => Array.isArray(input?.items) && input.items.length > MAX_LINES;
const TOO_MANY = "Orders in chat can have at most 20 lines. Ask the customer to place bigger orders on the website.";

const keyOf = (oi: CreateCheckoutOrderInput) => quoteKey({
    items: oi.items, delivery_method: oi.delivery.method, delivery_zone: oi.delivery.zone ?? null, discount_code: oi.discount_code ?? null,
});

/** from_cart: the basket's lines (WhatsApp); null when the order lists its own items. */
async function basketFor(input: any, ctx: ShopToolContext): Promise<CartLine[] | null | "empty"> {
    if (input?.from_cart !== true) return null;
    const lines = await loadCart(ctx.chat.visitorKey);
    return lines.length ? lines : "empty";
}
const EMPTY_BASKET = "The basket is empty. Add the pieces with update_cart first, or list them in items.";

export async function priceOrder(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    ctx.notes.topic = "placing an order";
    if (tooMany(input)) return err(TOO_MANY);
    const cart = await basketFor(input, ctx);
    if (cart === "empty") return err(EMPTY_BASKET);
    const oi = toInput(input, ctx, cart);
    const r = await quoteCheckoutOrder(oi);
    if (!r.success) return err(checkoutCustomerLine(r.code, r.error));
    ctx.chat.lastQuote = stampQuote(ctx.chat.lastQuote, keyOf(oi), r.totals.total, Date.now(), ctx.chat.turns);
    return ok({ totals_ghs: r.totals, out_of_stock: r.outOfStock, next: "Tell the customer the total and ask them to confirm with a clear yes." });
}

/**
 * Open orders still waiting for payment with their stock still held; paid, cancelled and expired ones
 * drop out, and so does one whose hold ran out (its link can't safely be paid, and it mustn't block a new order).
 */
async function stillOpen(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabaseAdmin.from("orders").select("id").in("id", ids).eq("status", "pending").eq("payment_status", "pending");
    if (error) throw error;
    const pending = ids.filter(id => (data ?? []).some(r => r.id === id));
    const held = await Promise.all(pending.map(id => holdLive(id)));
    return pending.filter((_, i) => held[i]);
}

export async function placeOrder(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    ctx.notes.topic = "placing an order";
    if (input?.customer_said_yes !== true) return err("Tell the customer the total from price_order and wait for a clear yes.");
    if (tooMany(input)) return err(TOO_MANY);
    const cart = await basketFor(input, ctx);
    if (cart === "empty") return err(EMPTY_BASKET);
    const oi = toInput(input, ctx, cart);
    const key = keyOf(oi);
    if (!quoteHolds(ctx.chat.lastQuote, key, Date.now(), ctx.chat.turns)) {
        return err("The customer must agree to a total you gave them in an earlier message. If they just said yes to the total you quoted before, call place_order without calling price_order again; if the order changed, quote the new total and wait for their reply.");
    }

    const open = await stillOpen(ctx.chat.openOrders);
    ctx.chat.openOrders = open;
    ctx.chat.payLinks = Object.fromEntries(Object.entries(ctx.chat.payLinks).filter(([id]) => open.includes(id)));
    if (!canOpenAnother(open.length)) {
        const last = open[open.length - 1];
        const link = ctx.chat.payLinks[last];
        if (link) ctx.buttons.push({ kind: "pay_now", label: BUTTON_LABELS.pay, href: link });
        ctx.notes.orderRef = last.slice(0, 8).toUpperCase();
        return ok({ reply_with: LINES.openOrderWaiting });
    }

    // Re-price right before creating: the customer said yes to a number, and
    // that number must still be the price. The final stock check is the order
    // itself: createCheckoutOrder reserves every line in one locked database
    // step, and refuses ("just sold out") when one is no longer there.
    const again = await quoteCheckoutOrder(oi);
    if (!again.success) return err(checkoutCustomerLine(again.code, again.error));
    if (!sameTotal(again.totals.total, ctx.chat.lastQuote!.total)) {
        ctx.chat.lastQuote = { key, total: again.totals.total, at: Date.now(), turn: ctx.chat.turns };
        return ok({ price_changed: true, totals_ghs: again.totals, next: "Tell the customer the total changed to this one and ask them to confirm again." });
    }

    ctx.chat.saleKey ??= crypto.randomUUID();
    const r = await createCheckoutOrder({ ...oi, saleKey: ctx.chat.saleKey });
    if (!r.success) {
        if (PAY_CODES.has(r.code)) { pushTalk(ctx); return ok({ reply_with: LINES.payProblem }); }
        return err(checkoutCustomerLine(r.code, r.error));
    }
    if (r.saleKey) ctx.chat.saleKey = r.saleKey;
    ctx.chat.openOrders = [...ctx.chat.openOrders, r.orderId];
    // Verified for this chat, so track_order can bring the Pay button back without asking for details.
    if (!ctx.chat.verifiedOrders.includes(r.orderId)) ctx.chat.verifiedOrders = [...ctx.chat.verifiedOrders, r.orderId].slice(-20);
    ctx.chat.payLinks = { ...ctx.chat.payLinks, [r.orderId]: r.authorizationUrl };
    ctx.chat.lastQuote = null;
    // The basket became this order.
    if (cart) await clearCart(ctx.chat.visitorKey).catch(e => console.error("[shop-assistant] basket not emptied", e instanceof Error ? e.message : e));
    const ref = r.orderId.slice(0, 8).toUpperCase();
    ctx.notes.orderRef = ref;
    ctx.buttons.push({ kind: "pay_now", label: BUTTON_LABELS.pay, href: r.authorizationUrl });
    return ok({ order_ref: ref, totals_ghs: r.totals, held: LINES.held, next: "Give the order number and total, and say the Pay now button is below. Do not write the link." });
}
