// The live side of back-in-stock alerts: requests, products, live stock, the
// customer's conversation and the provider. Server-only.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stockFor } from "@/lib/ai/catalogStock";
import type { AiSettings } from "@/lib/ai/settings";
import { PRODUCT_FIELDS } from "@/lib/ai/shopAssistant/tools/products";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { logOutbound } from "./conversationStore";
import { RESTOCK_KEEP_DAYS, type RestockDeps, type RestockRequest } from "./restock";

// whatsapp_restock_requests is not in the generated Supabase types until the migration is applied.
const db = supabaseAdmin as any;
const BATCH = 200;

export function liveRestockDeps(settings: AiSettings, siteUrl: string): RestockDeps {
    const sender = createChatbotsAfrica();
    return {
        expireOld: async () => {
            const cutoff = new Date(Date.now() - RESTOCK_KEEP_DAYS * 86_400_000).toISOString();
            const { data, error } = await db.from("whatsapp_restock_requests").update({ status: "expired" })
                .eq("status", "pending").lt("created_at", cutoff).select("id");
            if (error) throw error;
            return (data ?? []).length;
        },
        pending: async () => {
            const { data: reqs, error } = await db.from("whatsapp_restock_requests")
                .select("id, conversation_id, product_id, size, colour").eq("status", "pending")
                .order("created_at", { ascending: true }).limit(BATCH);
            if (error) throw error;
            if (!reqs?.length) return [];
            const productIds = [...new Set(reqs.map((r: any) => r.product_id))];
            const convIds = [...new Set(reqs.map((r: any) => r.conversation_id))];
            const [{ data: products, error: pe }, { data: convs, error: ce }] = await Promise.all([
                db.from("products").select(`${PRODUCT_FIELDS}, is_active, is_wholesale_only`).in("id", productIds),
                db.from("whatsapp_conversations").select("id, wa_phone_number, wa_contact_name, opted_out_at, last_inbound_at").in("id", convIds),
            ]);
            if (pe) throw pe;
            if (ce) throw ce;
            const stock = await stockFor(products ?? []);
            const productById = new Map((products ?? []).map((p: any) => [p.id, p]));
            const convById = new Map((convs ?? []).map((c: any) => [c.id, c]));
            return reqs.flatMap((r: any): RestockRequest[] => {
                const p: any = productById.get(r.product_id), c: any = convById.get(r.conversation_id);
                if (!p || !c?.wa_phone_number) return [];
                return [{
                    id: r.id, conversationId: r.conversation_id, productId: r.product_id, size: r.size, colour: r.colour,
                    product: { name: p.name, slug: p.slug, active: p.is_active === true && p.is_wholesale_only !== true },
                    stock: stock.get(p.id),
                    conversation: { phone: c.wa_phone_number, name: c.wa_contact_name ?? null, optedOut: !!c.opted_out_at, lastInboundAt: c.last_inbound_at ?? null },
                }];
            });
        },
        claim: async id => {
            const { data, error } = await db.from("whatsapp_restock_requests").update({ status: "notified", notified_at: new Date().toISOString() })
                .eq("id", id).eq("status", "pending").select("id");
            if (error) throw error;
            return (data ?? []).length === 1;
        },
        release: async id => {
            const { error } = await db.from("whatsapp_restock_requests").update({ status: "pending", notified_at: null }).eq("id", id).eq("status", "notified");
            if (error) throw error;
        },
        sendText: (to, text) => sender.sendText(to, text, { event: "whatsapp_restock_alert" }),
        sendTemplate: (to, templateId, placeholders) => sender.sendTemplate(to, { templateId, type: "text", placeholders }, { event: "whatsapp_restock_alert" }),
        logOutbound,
        templateId: settings.whatsappTemplateIds.back_in_stock ?? null,
        siteUrl,
    };
}
