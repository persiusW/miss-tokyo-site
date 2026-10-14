// Whether stored WhatsApp events are processed, and with what. Processing
// needs the whatsapp_enabled switch on AND a parser and handler registered
// for the provider. None is registered yet: the Chatbots Africa parser is
// written against a real captured payload, so until then every event is
// stored only, and the sweep and the route's after() step do nothing.
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { FALLBACK_TEXT, type InboundMessage, type Conversation, type InboundParser, type PipelineDeps } from "./pipeline";
import { supabaseInboundStore } from "./pipelineStore";

type Registered = { parse: InboundParser; handle: (m: InboundMessage, c: Conversation) => Promise<void> };

/** Parser and handler per provider. Empty on purpose until a real payload is captured. */
export const INBOUND_HANDLERS: Partial<Record<string, Registered>> = {};

/** "processing" only with the switch on and a parser registered; otherwise events are stored only. */
export function processingMode(whatsappEnabled: boolean, provider: string) {
    const parserReady = !!INBOUND_HANDLERS[provider];
    return { mode: parserReady && whatsappEnabled ? "processing" as const : "capture" as const, parserReady, switchOn: whatsappEnabled };
}

/** The pipeline for a provider, or null while events are stored only. */
export function pipelineFor(provider: string, whatsappEnabled: boolean): PipelineDeps | null {
    const reg = INBOUND_HANDLERS[provider];
    if (!reg || !whatsappEnabled) return null;
    const sender = createChatbotsAfrica();
    return {
        store: supabaseInboundStore,
        parse: reg.parse,
        handle: reg.handle,
        sendFallback: to => sender.sendText(to, FALLBACK_TEXT, { event: "whatsapp_handoff_fallback" }),
    };
}
