// When a WhatsApp chat goes to a person: forward who it is, why, and the
// recent messages to the team's handoff number (the shop's main WhatsApp line
// unless whatsapp_handoff_number says otherwise), with a link to the chat in
// the inbox and a wa.me link to reply from the main phone.
//
// The WhatsApp forward is best effort: WhatsApp only delivers a free-form
// message to the team's number inside its 24-hour window (or as an approved
// template), and a refusal there arrives later, not on the send. So a short
// SMS goes as well, every time, and the inbox always has the full chat.
import type { MessagingResult } from "@/lib/messaging/provider";

export type HandoffReason = "customer_asked" | "unsupported_message" | "awaiting_assistant" | "processing_failed" | "daily_limit" | "assistant_failed";

const WHY: Record<HandoffReason, string> = {
    customer_asked: "asked for a person",
    unsupported_message: "sent a photo, voice note or file the assistant can't read",
    awaiting_assistant: "messaged while the assistant is not answering",
    processing_failed: "sent a message the system could not handle",
    daily_limit: "reached today's chat limit with the assistant",
    assistant_failed: "hit a problem with the assistant",
};

export type HistoryLine = { direction: "inbound" | "outbound"; content: string | null; type: string | null; at: string };

const MAX_HISTORY = 10;
const MAX_LINE = 300;

/** "0553898704" style for people; 233… stays in links. */
export function localNumber(intl: string): string {
    return /^233\d{9}$/.test(intl) ? `0${intl.slice(3)}` : `+${intl}`;
}

function clock(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" });
}

export function buildHandoffMessages(a: {
    name: string | null; phone: string; reason: HandoffReason; history: HistoryLine[]; inboxUrl: string;
}): { whatsapp: string; sms: string } {
    const who = a.name ? `${a.name} (${localNumber(a.phone)})` : localNumber(a.phone);
    const lines = a.history.slice(-MAX_HISTORY).map(h => {
        const speaker = h.direction === "inbound" ? "Customer" : "Assistant";
        const said = h.content?.trim() ? h.content.trim().replace(/\s+/g, " ").slice(0, MAX_LINE) : `[${h.type ?? "message"}]`;
        return `${clock(h.at)} ${speaker}: ${said}`.trim();
    });
    const whatsapp = [
        `Miss Tokyo WhatsApp: ${who} ${WHY[a.reason]}.`,
        lines.length ? `Recent messages:\n${lines.join("\n")}` : "",
        `Reply to them: https://wa.me/${a.phone}`,
        `Full chat: ${a.inboxUrl}`,
    ].filter(Boolean).join("\n\n").slice(0, 4000);
    const sms = `Miss Tokyo WhatsApp: ${who} ${WHY[a.reason]}. Reply: wa.me/${a.phone} Chat: ${a.inboxUrl}`.slice(0, 320);
    return { whatsapp, sms };
}

export type ForwardDeps = {
    teamNumber: string | null;
    load: (conversationId: string) => Promise<{ name: string | null; phone: string; history: HistoryLine[] } | null>;
    sendWhatsApp: (to: string, text: string) => Promise<MessagingResult>;
    sendSms: (to: string, text: string) => Promise<{ ok: boolean }>;
    inboxUrl: (conversationId: string) => string;
};

/** Never throws: a handoff must not fail because the forward did. */
export async function forwardToTeam(conversationId: string, reason: HandoffReason, deps: ForwardDeps): Promise<{ whatsapp: boolean; sms: boolean }> {
    try {
        if (!deps.teamNumber) return { whatsapp: false, sms: false };
        const c = await deps.load(conversationId);
        if (!c) return { whatsapp: false, sms: false };
        const msg = buildHandoffMessages({ ...c, reason, inboxUrl: deps.inboxUrl(conversationId) });
        const [wa, sms] = await Promise.all([
            deps.sendWhatsApp(deps.teamNumber, msg.whatsapp).catch(() => ({ ok: false }) as MessagingResult),
            deps.sendSms(deps.teamNumber, msg.sms).catch(() => ({ ok: false })),
        ]);
        return { whatsapp: wa.ok, sms: sms.ok };
    } catch (e) {
        console.error("[whatsapp] handoff forward failed", { err: String(e) });
        return { whatsapp: false, sms: false };
    }
}
