// One WhatsApp notice to a customer, by the rule every notice follows: inside
// the 24-hour window the full free text; outside it the first template (with
// variables) that has an approved id and every value it needs; failing that
// the old variable-free template; failing that nothing (the SMS or email still
// goes). Never to a customer who replied STOP. Logged as a notice, in the
// words the customer saw, so staff and the assistant know what was said.
// Pure: everything live is injected.
import { toDestination } from "@/lib/messaging/chatbotsAfrica";
import type { MessagingResult } from "@/lib/messaging/provider";
import { REPLY_WINDOW_MS } from "./pipeline";
import { NOTICE_TYPE } from "./notices";
import { fillTemplate, type FilledTemplate, type TemplateKey } from "./templates";

export type TemplateChoice = { key: TemplateKey; values: readonly unknown[] };

export type NoticeConversation = { id: string; optedOut: boolean; lastInboundAt: string | null };

export type NoticeDeps = {
    /** The approved id for a template key, or null. */
    templateIdFor: (key: TemplateKey) => number | null;
    /** The customer's conversation, opened if they have none so the notice shows in the inbox. */
    conversationFor: (phone: string) => Promise<NoticeConversation>;
    sendText: (to: string, text: string) => Promise<MessagingResult>;
    sendTemplate: (to: string, templateId: number, placeholders?: string[]) => Promise<MessagingResult>;
    logOutbound: (conversationId: string, text: string, waMessageId: string | null, type?: string) => Promise<void>;
    now?: () => number;
};

export type Notice = {
    phone: string | null | undefined;
    /** The full message for inside the window; null = a template only. */
    freeText: string | null;
    /** Tried in order. */
    templates: readonly TemplateChoice[];
    /** The variable-free template for this event, and its words. */
    legacy?: { templateId: number | null; text: string } | null;
    /** Added to the log of a variable-free template, which can't name the order (e.g. "[order 4A8FF381]"). */
    tag?: string | null;
};

export type NoticeOutcome = "no_phone" | "opted_out" | "no_template" | "sent_text" | "sent_template" | "failed";

/** The first choice with an approved id and complete values. */
export function pickTemplate(
    choices: readonly TemplateChoice[], idFor: (key: TemplateKey) => number | null,
): { key: TemplateKey; templateId: number; filled: FilledTemplate } | null {
    for (const c of choices) {
        const templateId = idFor(c.key);
        if (!templateId) continue;
        const filled = fillTemplate(c.key, c.values);
        if (filled) return { key: c.key, templateId, filled };
    }
    return null;
}

export function inWindow(lastInboundAt: string | null, now: number): boolean {
    return !!lastInboundAt && now - Date.parse(lastInboundAt) < REPLY_WINDOW_MS;
}

/** Never throws. */
export async function sendNotice(n: Notice, deps: NoticeDeps): Promise<NoticeOutcome> {
    try {
        const to = toDestination(n.phone ?? "");
        if (!to) return "no_phone";
        const conv = await deps.conversationFor(to);
        if (conv.optedOut) return "opted_out";
        const now = deps.now?.() ?? Date.now();
        let r: MessagingResult;
        let text: string;
        let outcome: NoticeOutcome;
        const picked = pickTemplate(n.templates, deps.templateIdFor);
        if (n.freeText && inWindow(conv.lastInboundAt, now)) {
            text = n.freeText;
            r = await deps.sendText(to, text);
            outcome = "sent_text";
        } else if (picked) {
            text = picked.filled.text;
            r = await deps.sendTemplate(to, picked.templateId, picked.filled.placeholders);
            outcome = "sent_template";
        } else if (n.legacy?.templateId) {
            text = n.tag ? `${n.legacy.text}\n${n.tag}` : n.legacy.text;
            r = await deps.sendTemplate(to, n.legacy.templateId);
            outcome = "sent_template";
        } else {
            return "no_template";
        }
        if (!r.ok) return "failed";
        await deps.logOutbound(conv.id, text, r.messageId, NOTICE_TYPE);
        return outcome;
    } catch (e) {
        console.error("[whatsapp] notice failed", { err: String(e) });
        return "failed";
    }
}

export type TeamSendDeps = {
    templateIdFor: (key: TemplateKey) => number | null;
    sendTemplate: (to: string, templateId: number, placeholders: string[]) => Promise<MessagingResult>;
};

/**
 * A template to the shop's own people (staff, riders, someone invited): they
 * may never have written to the shop, so it is always a template, and it is
 * not logged in the customer inbox. Returns how many numbers it reached.
 * Never throws.
 */
export async function sendTeamTemplate(numbers: readonly (string | null | undefined)[], choice: TemplateChoice, deps: TeamSendDeps): Promise<number> {
    try {
        const templateId = deps.templateIdFor(choice.key);
        const filled = templateId ? fillTemplate(choice.key, choice.values) : null;
        if (!templateId || !filled) return 0;
        const to = [...new Set(numbers.map(p => toDestination(p ?? "")).filter((p): p is string => !!p))];
        const sent = await Promise.all(to.map(p => deps.sendTemplate(p, templateId, filled.placeholders).catch(() => ({ ok: false }) as MessagingResult)));
        return sent.filter(r => r.ok).length;
    } catch (e) {
        console.error("[whatsapp] team template failed", { key: choice.key, err: String(e) });
        return 0;
    }
}
