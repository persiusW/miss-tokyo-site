// price_order and place_order: the storefront's own checkout, with a quote
// the customer agreed to, at most 2 unpaid orders per chat, and calm failures.
import { createCheckoutOrder, quoteCheckoutOrder, type CreateCheckoutOrderInput } from "@/lib/checkout/createCheckoutOrder";
import { checkoutCustomerLine } from "@/lib/errors/catalogue";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canOpenAnother, quoteHolds, quoteKey, sameTotal } from "../guards";
import { BUTTON_LABELS, LINES } from "../lines";
import { err, ok, pushTalk, str, type ShopToolContext, type ToolOutcome } from "./context";

const PAY_CODES = new Set(["gateway", "refused", "payments_unconfigured"]);

function toInput(input: any, ctx: ShopToolContext): CreateCheckoutOrderInput {
    const items = Array.isArray(input?.items) ? input.items : [];
    return {
        items: items.map((i: any) => ({
            product_id: str(i?.product_id, 40),
            size: str(i?.size, 40) || null,
            colour: str(i?.colour, 60) || null,
            brand: str(i?.brand, 60) || null,
            quantity: i?.quantity,
        })),
        customer: { name: str(input?.customer_name, 120), phone: str(input?.customer_phone, 30), email: str(input?.customer_email, 160) || null },
        delivery: {
            method: input?.delivery_method === "pickup" ? "pickup" : "delivery",
            address: str(input?.delivery_address, 500) || null,
            zone: input?.delivery_zone === "accra" || input?.delivery_zone === "outside" ? input.delivery_zone : null,
            region: str(input?.region, 60) || null,
        },
        source: "web_chat",
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

export async function priceOrder(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    ctx.notes.topic = "placing an order";
    if (tooMany(input)) return err(TOO_MANY);
    const oi = toInput(input, ctx);
    const r = await quoteCheckoutOrder(oi);
    if (!r.success) return err(checkoutCustomerLine(r.code, r.error));
    ctx.chat.lastQuote = { key: keyOf(oi), total: r.totals.total, at: Date.now(), turn: ctx.chat.turns };
    return ok({ totals_ghs: r.totals, out_of_stock: r.outOfStock, next: "Tell the customer the total and ask them to confirm with a clear yes." });
}

/** Open orders still waiting for payment; paid, cancelled and expired ones drop out. */
async function stillOpen(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabaseAdmin.from("orders").select("id").in("id", ids).eq("status", "pending").eq("payment_status", "pending");
    if (error) throw error;
    const open = new Set((data ?? []).map(r => r.id as string));
    return ids.filter(id => open.has(id));
}

export async function placeOrder(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    ctx.notes.topic = "placing an order";
    if (input?.customer_said_yes !== true) return err("Tell the customer the total from price_order and wait for a clear yes.");
    if (tooMany(input)) return err(TOO_MANY);
    const oi = toInput(input, ctx);
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
    // that number must still be the price.
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
    ctx.chat.payLinks = { ...ctx.chat.payLinks, [r.orderId]: r.authorizationUrl };
    ctx.chat.lastQuote = null;
    const ref = r.orderId.slice(0, 8).toUpperCase();
    ctx.notes.orderRef = ref;
    ctx.buttons.push({ kind: "pay_now", label: BUTTON_LABELS.pay, href: r.authorizationUrl });
    return ok({ order_ref: ref, totals_ghs: r.totals, held: LINES.held, next: "Give the order number and total, and say the Pay now button is below. Do not write the link." });
}
