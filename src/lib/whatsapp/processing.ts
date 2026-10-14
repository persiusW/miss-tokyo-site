// Whether stored WhatsApp events are processed, and with what. Processing
// needs the whatsapp_enabled switch on AND a parser and handler registered
// for the provider; otherwise every event is stored only, and the sweep and
// the route's after() step do nothing.
//
// Chatbots Africa: the parser verified against real deliveries, with the
// interim handler (a person takes every chat) until the shop assistant
// answers on WhatsApp.
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { createInterimHandler, type HandlerTools } from "./interimHandler";
import { parseChatbotsAfrica } from "./parsers/chatbotsAfrica";
import { FALLBACK_TEXT, type Conversation, type InboundMessage, type InboundParser, type PipelineDeps } from "./pipeline";
import { supabaseInboundStore } from "./pipelineStore";

type Registered = {
    parse: InboundParser;
    makeHandle: (tools: HandlerTools) => (m: InboundMessage, c: Conversation) => Promise<void>;
};

/** Parser and handler per provider. */
export const INBOUND_HANDLERS: Partial<Record<string, Registered>> = {
    chatbots_africa: { parse: raw => parseChatbotsAfrica(raw), makeHandle: createInterimHandler },
};

/** "processing" only with the switch on and a parser registered; otherwise events are stored only. */
export function processingMode(whatsappEnabled: boolean, provider: string) {
    const parserReady = !!INBOUND_HANDLERS[provider];
    return { mode: parserReady && whatsappEnabled ? "processing" as const : "capture" as const, parserReady, switchOn: whatsappEnabled };
}

/** The pipeline for a provider, or null while events are stored only. */
export function pipelineFor(provider: string, whatsappEnabled: boolean, expectedPhoneNumberId: string | null = null): PipelineDeps | null {
    const reg = INBOUND_HANDLERS[provider];
    if (!reg || !whatsappEnabled) return null;
    const sender = createChatbotsAfrica();
    const tools: HandlerTools = {
        send: (to, text) => sender.sendText(to, text, { event: "whatsapp_reply" }),
        handOff: (conversationId, reason) => supabaseInboundStore.handOff(conversationId, reason, new Date()),
    };
    return {
        store: supabaseInboundStore,
        parse: reg.parse,
        handle: reg.makeHandle(tools),
        sendFallback: to => sender.sendText(to, FALLBACK_TEXT, { event: "whatsapp_handoff_fallback" }),
        expectedPhoneNumberId,
    };
}
