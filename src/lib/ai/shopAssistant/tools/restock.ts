// notify_when_back: on WhatsApp, a sold-out piece (optionally a size and
// colour) the customer wants to hear about when it is back in stock. The
// hourly alert run (src/lib/whatsapp/restock) sends the message.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stockFor } from "@/lib/ai/catalogStock";
import { MAX_OPEN_ALERTS, optionWords, pickOption, wantedInStock } from "@/lib/whatsapp/restock";
import { sizeMatches } from "../format";
import { normAttr } from "@/lib/utils/normAttr";
import { PRODUCT_FIELDS } from "./products";
import { err, ok, str, type ShopToolContext, type ToolOutcome } from "./context";

const db = supabaseAdmin as any;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function notifyWhenBack(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    if (ctx.channel !== "whatsapp" || !ctx.waConversationId) return err("That isn't available here.");
    ctx.notes.topic = "a product";
    const productId = str(input?.product_id, 40);
    if (!UUID.test(productId)) return err("Give the product_id from find_products.");
    const { data: p, error } = await db.from("products").select(PRODUCT_FIELDS)
        .eq("id", productId).eq("is_active", true).eq("is_wholesale_only", false).maybeSingle();
    if (error) throw error;
    if (!p) return err("No such product in the shop. Use a product_id from find_products.");

    const size = pickOption(str(input?.size, 40), p.available_sizes, (o, a) => sizeMatches(o, a), "size");
    if ("error" in size) return err(size.error);
    const colour = pickOption(str(input?.colour, 60), p.available_colors, (o, a) => normAttr(o) === normAttr(a), "colour");
    if ("error" in colour) return err(colour.error);

    const stock = (await stockFor([p])).get(p.id);
    if (wantedInStock(stock, size.value, colour.value)) return err("That is in stock now. Offer it to the customer instead.");

    const { count, error: ce } = await db.from("whatsapp_restock_requests").select("id", { count: "exact", head: true })
        .eq("conversation_id", ctx.waConversationId).eq("status", "pending");
    if (ce) throw ce;
    if ((count ?? 0) >= MAX_OPEN_ALERTS) return err(`The customer already has ${MAX_OPEN_ALERTS} back-in-stock alerts waiting. Say so; they can't add more for now.`);

    const { error: ie } = await db.from("whatsapp_restock_requests").insert({
        conversation_id: ctx.waConversationId, product_id: p.id, size: size.value, colour: colour.value,
    });
    if (ie && ie.code !== "23505") throw ie;   // 23505: they already asked for this one
    const opt = optionWords(size.value, colour.value);
    return ok({ saved: `${String(p.name).trim()}${opt ? ` (${opt})` : ""}`, next: "Tell them we'll message them here on WhatsApp when it's back in stock." });
}
