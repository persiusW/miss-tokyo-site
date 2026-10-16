// The customer tool registry. Never throws; output is redacted.
import { redactText } from "@/lib/ai/missTokyoAi/scrub";
import { CUSTOMER_TOOL_NAMES, OPTIONAL_TOOL_NAMES } from "../toolDefs";
import { err, pushTalk, type ShopToolContext, type ToolOutcome } from "./context";
import { findProducts } from "./products";
import { shopInfo } from "./info";
import { trackOrder } from "./orders";
import { placeOrder, priceOrder } from "./checkout";
import { offerChoices } from "./choices";
import { notifyWhenBack } from "./restock";
import { startReturn } from "./returns";

export type { ShopToolContext, ToolOutcome } from "./context";

const RUN: Record<(typeof CUSTOMER_TOOL_NAMES)[number] | (typeof OPTIONAL_TOOL_NAMES)[number], (input: any, ctx: ShopToolContext) => Promise<ToolOutcome>> = {
    find_products: findProducts,
    shop_info: shopInfo,
    track_order: trackOrder,
    price_order: priceOrder,
    place_order: placeOrder,
    offer_choices: offerChoices,
    notify_when_back: notifyWhenBack,
    start_return: startReturn,
};

export async function runCustomerTool(name: string, input: unknown, ctx: ShopToolContext): Promise<ToolOutcome> {
    if (!Object.hasOwn(RUN, name)) return err("That isn't available here.");
    try {
        const out = await RUN[name as keyof typeof RUN](input, ctx);
        return { ...out, content: redactText(out.content) };
    } catch (e) {
        console.error(`[shop-assistant] tool ${name} failed`, e instanceof Error ? e.message : e);
        pushTalk(ctx);
        return err("That didn't work. Say sorry, and offer to try again or to talk to us on WhatsApp.");
    }
}
