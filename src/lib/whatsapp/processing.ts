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
import { chatForConversation, latestNotice, loadWaConversation, logOutbound, offeredOptions, quotedMessage, recentHistory, returnNote, setOptOut, waitingInbound } from "./conversationStore";
import { forwardToTeam, localNumber, whyText, type HandoffReason } from "./handoff";
import { logConversationEvent } from "./events";
import { claimReferral, claimTeamAlert } from "./teamWatch";
import { factsFor } from "./customerFacts";
import { sendAdminPushNotifications } from "@/lib/orderSettlement";
import { canAnswerWaiting } from "./inbox";
import { archiveInboundMedia, type Download } from "./media";
import { toModelPhoto } from "./photo";
import type { MediaResult } from "@/lib/messaging/provider";
import { photosBefore, textFollows, type PairingDeps } from "./photoPairing";
import { parseChatbotsAfrica } from "./parsers/chatbotsAfrica";
import { FALLBACK_TEXT, type Conversation, type InboundMessage, type InboundParser, type PipelineDeps } from "./pipeline";
import { supabaseInboundStore } from "./pipelineStore";

type WaitingAnswerer = (waiting: InboundMessage[], c: Conversation) => Promise<void>;

/**
 * Staff handed a chat back and asked the assistant to reply to what came in meanwhile.
 * wasWithPerson false: the chat was the assistant's, so only messages it missed (not ones it is
 * answering now) count. "off": processing is off; "nothing": no message is waiting.
 */
export async function answerWaitingMessages(
    conversationId: string, provider: string, settings: AiSettings, wasWithPerson: boolean,
): Promise<"answered" | "nothing" | "off"> {
    const pipeline = await pipelineFor(provider, settings);
    if (!pipeline) return "off";
    const now = Date.now();
    const { messages, newestAt } = await waitingInbound(conversationId, now);
    const due = newestAt ? canAnswerWaiting(wasWithPerson ? "person" : "assistant", [{ at: newestAt }], now) : false;
    if (messages.length === 0 || !due) return "nothing";
    await pipeline.answerWaiting(messages, { id: conversationId, handedOffAt: null });
    return "answered";
}

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
export async function pipelineFor(
    provider: string, settings: AiSettings,
): Promise<(PipelineDeps & { answerWaiting: WaitingAnswerer; fetchMedia: Download }) | null> {
    const parse = INBOUND_PARSERS[provider];
    if (!parse || !settings.whatsappEnabled) return null;
    const sender = createChatbotsAfrica();
    // One download per file per event: the photo the assistant reads is the one the inbox keeps.
    const fetched = new Map<string, Promise<MediaResult>>();
    const download = (mediaId: string) => {
        if (!fetched.has(mediaId)) fetched.set(mediaId, sender.downloadMedia(mediaId));
        return fetched.get(mediaId)!;
    };
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
    }).then(async () => {
        // Staff with notifications on hear about it on their phone or laptop too. Best effort.
        const c = await loadWaConversation(conversationId).catch(() => null);
        const who = c?.name ?? (c ? localNumber(c.phone) : "A customer");
        await sendAdminPushNotifications(
            reason === "wrote_again" ? "WhatsApp: wrote again" : "WhatsApp: needs a person",
            `${who} ${whyText(reason)}.`, `/customers/whatsapp?c=${conversationId}`,
        ).catch(e => console.error("[whatsapp] push not sent", { err: String(e) }));
    });

    const handOff = async (conversationId: string, reason: HandoffReason) => {
        const moved = await supabaseInboundStore.handOff(conversationId, reason, new Date());
        if (moved) await forward(conversationId, reason);
        return moved;
    };

    const pairing: PairingDeps = { eventsBetween: (from, to, phone) => supabaseInboundStore.eventsBetween(provider, from, to, phone), parse };

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
            const r = await download(mediaId);
            if (!r.ok || !r.contentType.startsWith("image/")) return null;
            return toModelPhoto(r.bytes);
        },
        textFollows: (m, at) => textFollows(m, at, pairing),
        photosBefore: (m, at) => photosBefore(m, at, pairing),
        perDay: settings.shop.dailyMessagesPerVisitor,
        teamNumber,
        // The team has the chat and the customer wrote again: alert them, at most once an hour.
        withTeam: async c => {
            if (!(await claimTeamAlert(c.id))) return;
            await logConversationEvent(c.id, "re_alerted");
            await forward(c.id, "wrote_again");
        },
        referToTeam: id => claimReferral(id),
        run: async a => runShopAssistant({
            channel: "whatsapp", identity: { customerId: a.customerId, phone: a.phone }, chat: a.chat, text: a.text,
            settings, whatsappNumber: teamNumber, waConversationId: a.conversationId, images: a.images, withTeam: a.withTeam,
            facts: await factsFor(a.conversationId, a.phone),
        }),
        siteUrl: site,
    });

    return {
        store: supabaseInboundStore,
        parse,
        handle,
        // WHATSAPP_AGENT_DURING_HANDOFF=off: the bot stays silent while a person has the chat.
        quietWhileWithTeam: (process.env.WHATSAPP_AGENT_DURING_HANDOFF ?? "").trim().toLowerCase() === "off",
        answerWaiting: handle.answerWaiting,
        // The copy is the last use of the file in this event; its bytes are let go after it.
        afterLog: async (conversationId, m) => {
            try { await archiveInboundMedia(conversationId, m, download); } finally { if (m.mediaId) fetched.delete(m.mediaId); }
        },
        fetchMedia: mediaId => sender.downloadMedia(mediaId),
        sendFallback: to => sender.sendText(to, FALLBACK_TEXT, { event: "whatsapp_handoff_fallback" }),
        afterHandOff: id => forward(id, "processing_failed"),
        expectedPhoneNumberId: settings.whatsappPhoneNumberId,
    };
}
