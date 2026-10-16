// Whether stored WhatsApp events are processed, and with what. Processing
// needs the whatsapp_enabled switch on AND a parser registered for the
// provider; otherwise every event is stored only, and the sweep and the
// route's after() step do nothing.
//
// Chatbots Africa: the parser verified against real deliveries, and Ask Miss
// Tokyo answering text. A chat that goes to a person is forwarded to the team
// (whatsapp_handoff_number, else the shop's WhatsApp number).
import { runShopAssistant } from "@/lib/ai/shopAssistant/run";
import { shopWhatsappNumber, visitorCounts } from "@/lib/ai/shopAssistant/store";
import type { AiSettings } from "@/lib/ai/settings";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { sendSMS } from "@/lib/sms";
import { createWhatsAppHandler } from "./assistantHandler";
import { providerMessage } from "./choices";
import { chatForConversation, latestNotice, loadWaConversation, logOutbound, offeredOptions, quotedMessage, recentHistory, returnNote, setOptOut } from "./conversationStore";
import { forwardToTeam, type HandoffReason } from "./handoff";
import { toModelPhoto } from "./photo";
import { parseChatbotsAfrica } from "./parsers/chatbotsAfrica";
import { FALLBACK_TEXT, type InboundParser, type PipelineDeps } from "./pipeline";
import { supabaseInboundStore } from "./pipelineStore";

/** Parser per provider. */
export const INBOUND_PARSERS: Partial<Record<string, InboundParser>> = {
    chatbots_africa: raw => parseChatbotsAfrica(raw),
};

/** "processing" only with the switch on and a parser registered; otherwise events are stored only. */
export function processingMode(whatsappEnabled: boolean, provider: string) {
    const parserReady = !!INBOUND_PARSERS[provider];
    return { mode: parserReady && whatsappEnabled ? "processing" as const : "capture" as const, parserReady, switchOn: whatsappEnabled };
}

/** Where links in replies and handoffs point: this deployment's own address on a preview. */
export function siteBaseUrl(): string {
    const branch = process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_BRANCH_URL : null;
    return branch ? `https://${branch}` : (process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop").replace(/\/+$/, "");
}

/** The pipeline for a provider, or null while events are stored only. */
export async function pipelineFor(provider: string, settings: AiSettings): Promise<PipelineDeps | null> {
    const parse = INBOUND_PARSERS[provider];
    if (!parse || !settings.whatsappEnabled) return null;
    const sender = createChatbotsAfrica();
    const site = siteBaseUrl();
    const teamNumber = settings.whatsappHandoffNumber ?? await shopWhatsappNumber(settings);

    const forward = (conversationId: string, reason: HandoffReason) => forwardToTeam(conversationId, reason, {
        teamNumber,
        load: async id => {
            const c = await loadWaConversation(id);
            if (!c) return null;
            const note = reason === "return_request" ? await returnNote(id).catch(() => null) : null;
            return { name: c.name, phone: c.phone, history: await recentHistory(id), note };
        },
        sendWhatsApp: (to, text) => sender.sendText(to, text, { event: "whatsapp_handoff_team" }),
        templateId: settings.whatsappHandoffTemplateId,
        sendTemplate: (to, templateId) => sender.sendTemplate(to, { templateId, type: "text" }, { event: "whatsapp_handoff_team" }),
        sendSms: (to, text) => sendSMS({ to, message: text }, { event: "whatsapp_handoff_team" }),
        inboxUrl: id => `${site}/customers/whatsapp?c=${id}`,
    }).then(() => undefined);

    const handOff = async (conversationId: string, reason: HandoffReason) => {
        const moved = await supabaseInboundStore.handOff(conversationId, reason, new Date());
        if (moved) await forward(conversationId, reason);
        return moved;
    };

    const handle = createWhatsAppHandler({
        send: (to, text) => sender.sendText(to, text, { event: "whatsapp_reply" }),
        sendImage: (to, url, caption) => sender.sendImage(to, url, caption, { event: "whatsapp_reply_image" }),
        sendChoices: (to, plan) => {
            const p = providerMessage(plan);
            return p.kind === "buttons"
                ? sender.sendQuickReply(to, p.message, { event: "whatsapp_reply_choices" })
                : sender.sendList(to, p.message, { event: "whatsapp_reply_choices" });
        },
        offered: offeredOptions,
        notice: latestNotice,
        handOff,
        logOutbound,
        chatFor: async c => {
            const conv = await loadWaConversation(c.id);
            if (!conv) throw new Error("conversation not found");
            return { chat: await chatForConversation(conv), customerId: conv.customerId };
        },
        counts: chat => visitorCounts(chat.visitorKey),
        quoted: quotedMessage,
        setOptOut,
        fetchPhoto: async mediaId => {
            const r = await sender.downloadMedia(mediaId);
            if (!r.ok || !r.contentType.startsWith("image/")) return null;
            return toModelPhoto(r.bytes);
        },
        perDay: settings.shop.dailyMessagesPerVisitor,
        run: a => runShopAssistant({
            channel: "whatsapp", identity: { customerId: a.customerId, phone: a.phone }, chat: a.chat, text: a.text,
            settings, whatsappNumber: teamNumber, waConversationId: a.conversationId, image: a.image,
        }),
        siteUrl: site,
    });

    return {
        store: supabaseInboundStore,
        parse,
        handle,
        sendFallback: to => sender.sendText(to, FALLBACK_TEXT, { event: "whatsapp_handoff_fallback" }),
        afterHandOff: id => forward(id, "processing_failed"),
        expectedPhoneNumberId: settings.whatsappPhoneNumberId,
    };
}
