// What every customer tool receives. Tools push buttons and notes; the run
// turns them into the reply's buttons and the WhatsApp summary.
import type { ShopButton, ShopChannel, ShopChat, ShopIdentity } from "../types";
import { talkButton, waSummary } from "../format";
import type { ChoicePlan } from "@/lib/whatsapp/choices";

export type ShopToolContext = {
    chat: ShopChat;
    identity: ShopIdentity;
    channel: ShopChannel;
    buttons: ShopButton[];
    notes: { topic: string | null; orderRef: string | null };
    whatsappNumber: string | null;
    /** WhatsApp: the whatsapp_conversations row this chat runs in. */
    waConversationId?: string | null;
    /** WhatsApp: the tappable question offer_choices recorded; sent after the turn. */
    choices?: ChoicePlan;
};

export type ToolOutcome = { content: string; isError: boolean; endTurn?: string };

export const ok = (data: unknown): ToolOutcome => ({ content: JSON.stringify(data), isError: false });
export const err = (message: string): ToolOutcome => ({ content: message, isError: true });
export const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function pushTalk(ctx: ShopToolContext): void {
    const b = talkButton(ctx.whatsappNumber, waSummary(ctx.notes));
    if (b) ctx.buttons.push(b);
}
