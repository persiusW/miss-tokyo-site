// update_cart (WhatsApp): the customer's basket across messages. A piece is
// checked with the checkout's own quote before it goes in (the exact option
// exists and is in stock), so the basket never holds what checkout would
// refuse. Every change answers with the basket and its items total.
import { quoteCheckoutOrder, type CreateCheckoutOrderInput } from "@/lib/checkout/createCheckoutOrder";
import { checkoutCustomerLine } from "@/lib/errors/catalogue";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { addLine, lineLabel, setQuantity, type CartLine } from "../cartRules";
import { clearCart, loadCart, saveCart } from "../cartStore";
import { err, ok, str, type ShopToolContext, type ToolOutcome } from "./context";
import { pickOption } from "@/lib/whatsapp/restock";
import { normAttr } from "@/lib/utils/normAttr";
import { sizeMatches } from "../format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A quote of these lines alone, for checking and for the items total (pickup, so no delivery is added). */
function quoteInput(lines: Pick<CartLine, "product_id" | "size" | "colour" | "brand" | "quantity">[], ctx: ShopToolContext): CreateCheckoutOrderInput {
    return {
        items: lines.map(l => ({ product_id: l.product_id, size: l.size, colour: l.colour, brand: l.brand, quantity: l.quantity })),
        customer: { name: "Basket check", phone: ctx.identity.phone || "0200000000" },
        delivery: { method: "pickup" },
        source: ctx.channel === "whatsapp" ? "whatsapp" : "web_chat",
        ...(ctx.chat.saleKey ? { saleKey: ctx.chat.saleKey } : {}),
    };
}

async function shown(lines: CartLine[], ctx: ShopToolContext) {
    if (lines.length === 0) return { basket: [], items_total_ghs: 0 };
    const q = await quoteCheckoutOrder(quoteInput(lines, ctx));
    return {
        basket: lines.map(lineLabel),
        items_total_ghs: q.success ? q.totals.subtotal : null,
        ...(q.success && q.outOfStock.length ? { now_sold_out: q.outOfStock } : {}),
    };
}

export async function updateCart(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    ctx.notes.topic = "placing an order";
    const key = ctx.chat.visitorKey;
    const action = str(input?.action, 20);
    const lines = await loadCart(key);
    const next = "Read the basket back in one short line. When they are ready, collect their details and run price_order with from_cart true.";

    if (action === "show") return ok({ ...(await shown(lines, ctx)), next });
    if (action === "clear") { await clearCart(key); return ok({ basket: [], next: "Say the basket is empty now." }); }

    const productId = str(input?.product_id, 40);
    if (!UUID.test(productId)) return err("Give the product_id from find_products.");
    const opts = { size: str(input?.size, 40) || null, colour: str(input?.colour, 60) || null, brand: str(input?.brand, 60) || null };

    if (action === "add") {
        const quantity = Number.isInteger(input?.quantity) && input.quantity > 0 ? Math.min(20, input.quantity) : 1;
        const { data: p, error } = await supabaseAdmin.from("products")
            .select("name, sku, available_sizes, available_colors, is_active, is_published").eq("id", productId).maybeSingle();
        if (error) throw error;
        if (!p || !p.is_active || !p.is_published) return err("That product isn't available.");
        // The exact option, as the shop names it: the checkout's quote alone lets an unknown size through.
        const sizes = (p.available_sizes ?? []) as string[];
        const colours = (p.available_colors ?? []) as string[];
        if (!opts.size && sizes.length > 1) return err(`Ask which size: ${sizes.join(", ")}.`);
        if (!opts.colour && colours.length > 1) return err(`Ask which colour: ${colours.join(", ")}.`);
        const size = pickOption(opts.size ?? "", sizes, (o, a) => sizeMatches(o, a), "size");
        if ("error" in size) return err(size.error);
        const colour = pickOption(opts.colour ?? "", colours, (o, a) => normAttr(o) === normAttr(a), "colour");
        if ("error" in colour) return err(colour.error);
        const exact = { size: size.value ?? (sizes.length === 1 ? sizes[0] : null), colour: colour.value ?? (colours.length === 1 ? colours[0] : null), brand: opts.brand };
        // The checkout decides the rest: in stock in that option, at its price.
        const check = await quoteCheckoutOrder(quoteInput([{ product_id: productId, ...exact, quantity }], ctx));
        if (!check.success) return err(checkoutCustomerLine(check.code, check.error));
        if (check.outOfStock.length) return err(`That option is sold out (${check.outOfStock.join(", ")}). Say so and offer what find_products showed in stock.`);
        const added = addLine(lines, { product_id: productId, name: String(p.name ?? "").trim(), sku: p.sku?.trim() || null, ...exact, quantity });
        if (!added.ok) return err(added.error);
        await saveCart(key, added.lines);
        return ok({ ...(await shown(added.lines, ctx)), next });
    }

    if (action === "remove" || action === "set_quantity") {
        const qty = action === "remove" ? 0 : Number.isInteger(input?.quantity) ? input.quantity : -1;
        if (qty < 0) return err("Give the new quantity (0 removes it).");
        const changed = setQuantity(lines, { product_id: productId, ...opts }, qty);
        if (!changed.ok) return err(changed.error);
        await saveCart(key, changed.lines);
        return ok({ ...(await shown(changed.lines, ctx)), next });
    }
    return err("Use action add, remove, set_quantity, show or clear.");
}
