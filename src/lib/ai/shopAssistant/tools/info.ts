// shop_info: the pages' own text, plus live delivery fees and contact details.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { parseDeliverySettings } from "@/lib/delivery";
import { SHOP_INFO_TOPICS, shopInfoText, type ShopInfoTopic } from "@/content/shopInfo";
import { err, ok, pushTalk, type ShopToolContext, type ToolOutcome } from "./context";

export async function shopInfo(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    const topic = input?.topic as ShopInfoTopic;
    if (!SHOP_INFO_TOPICS.includes(topic)) return err(`topic must be one of: ${SHOP_INFO_TOPICS.join(", ")}`);
    ctx.notes.topic ??= topic === "faq" ? "a question" : topic;
    const lines = [shopInfoText(topic)];

    if (topic === "delivery") {
        const { data } = await supabaseAdmin.from("store_settings")
            .select("delivery_fees_enabled, delivery_fee_accra, delivery_fee_outside").eq("id", "default").maybeSingle();
        const fees = parseDeliverySettings(data);
        lines.push(fees.enabled
            ? `Delivery fee: GH₵ ${fees.accra} within Greater Accra, GH₵ ${fees.outside} elsewhere in Ghana. Pickup is free.`
            : "The delivery fee is shown at checkout.");
    }
    if (topic === "contact" || topic === "hours") {
        const { data: s } = await supabaseAdmin.from("site_settings")
            .select("store_email, store_phone, store_address, hours_weekday, hours_saturday, hours_sunday, hours_note")
            .eq("id", "singleton").maybeSingle();
        if (topic === "hours") {
            lines.push([s?.hours_weekday || "Monday – Friday · 9:00 AM – 6:00 PM", s?.hours_saturday || "Saturday · 10:00 AM – 5:00 PM",
                s?.hours_sunday || "Sunday · Closed", s?.hours_note || "Online orders accepted 24/7"].join("\n"));
        } else {
            lines.push([s?.store_phone && `Phone: ${s.store_phone}`, s?.store_email && `Email: ${s.store_email}`, s?.store_address && `Shop: ${s.store_address}`].filter(Boolean).join("\n"));
        }
        if (topic === "contact") pushTalk(ctx);
    }
    return ok({ topic, text: lines.filter(Boolean).join("\n") });
}
