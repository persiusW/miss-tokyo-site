// WhatsApp conversations ↔ the shop assistant's chats, the outbound log, and
// the recent history a handoff forwards. Server-only (service role).
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createChat, loadChat, visitorKeyFor } from "@/lib/ai/shopAssistant/store";
import { chatIsStale } from "@/lib/ai/shopAssistant/limits";
import type { ShopChat } from "@/lib/ai/shopAssistant/types";
import { optionsFrom } from "./choices";
import { unseenNotice } from "./notices";
import { returnSummary } from "./returns";
import type { HistoryLine } from "./handoff";
import { waitingMessages } from "./inbox";
import type { InboundMessage } from "./pipeline";

// The new whatsapp_conversations columns are not in the generated types yet.
const db = supabaseAdmin as any;

export type WaConversation = { id: string; phone: string; name: string | null; shopChatId: string | null; customerId: string | null };

export async function loadWaConversation(id: string): Promise<WaConversation | null> {
    const { data, error } = await db.from("whatsapp_conversations")
        .select("id, wa_phone_number, wa_contact_name, shop_chat_id, customer_id").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, phone: data.wa_phone_number, name: data.wa_contact_name ?? null, shopChatId: data.shop_chat_id ?? null, customerId: data.customer_id ?? null } : null;
}

/** One visitor per WhatsApp number, so the daily limit follows the number across chats. */
export const waVisitorKey = (phone: string) => visitorKeyFor(`wa:${phone}`);

/** The conversation's assistant chat; a fresh one after 4 idle hours, like the website. */
export async function chatForConversation(c: WaConversation): Promise<ShopChat> {
    if (c.shopChatId) {
        const existing = await loadChat(c.shopChatId);
        if (existing && !chatIsStale(existing.lastMessageAt, Date.now())) return existing;
    }
    const chat = await createChat({ id: randomUUID(), visitorKey: waVisitorKey(c.phone), customerId: c.customerId });
    const { error } = await db.from("whatsapp_conversations").update({ shop_chat_id: chat.id }).eq("id", c.id);
    if (error) throw error;
    return chat;
}

/** The customer's messages after our last one (see waitingMessages), as they came in; newestAt from the log. */
export async function waitingInbound(conversationId: string, now: number): Promise<{ messages: InboundMessage[]; newestAt: string | null }> {
    const { data, error } = await db.from("message_log").select("direction, wa_message_id, created_at")
        .eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    const rows = ((data ?? []) as { direction: "inbound" | "outbound"; wa_message_id: string | null; created_at: string }[])
        .reverse().map(r => ({ direction: r.direction, at: r.created_at, id: r.wa_message_id }));
    const out: InboundMessage[] = [];
    const waiting = waitingMessages(rows, now);
    for (const w of waiting) {
        if (!w.id) continue;
        // The full message (photo id, tap, quote) is kept with the stored event.
        const { data: ev, error: evError } = await db.from("inbound_events").select("parsed")
            .contains("parsed", { messages: [{ messageId: w.id }] }).limit(1);
        if (evError) throw evError;
        const m = ((ev ?? [])[0]?.parsed?.messages ?? []).find((x: InboundMessage) => x.messageId === w.id);
        if (m) out.push(m);
    }
    return { messages: out, newestAt: waiting[waiting.length - 1]?.at ?? null };
}

/** Logs a message we sent, so the inbox shows both sides. Never throws. */
export async function logOutbound(conversationId: string, text: string, waMessageId: string | null, type = "text", mediaUrl: string | null = null): Promise<void> {
    const { error } = await db.from("message_log").insert({
        conversation_id: conversationId, direction: "outbound", content: text, wa_message_id: waMessageId, message_type: type, media_url: mediaUrl,
    });
    if (error) console.error("[whatsapp] could not log an outbound message", { code: error.code });
}

/** STOP / START: when the customer turned order updates off, or null when they are on. */
export async function setOptOut(conversationId: string, optedOut: boolean): Promise<void> {
    const { error } = await db.from("whatsapp_conversations")
        .update({ opted_out_at: optedOut ? new Date().toISOString() : null, ...(optedOut ? {} : { opted_in_at: new Date().toISOString(), opt_in_source: "start_reply" }) })
        .eq("id", conversationId);
    if (error) throw error;
}

/** What an earlier message in this conversation said, for a customer's reply to it. Null when unknown. */
export async function quotedMessage(conversationId: string, waMessageId: string): Promise<string | null> {
    const { data, error } = await db.from("message_log").select("content, message_type")
        .eq("conversation_id", conversationId).eq("wa_message_id", waMessageId).limit(1);
    if (error) throw error;
    const row = (data ?? [])[0];
    if (!row) return null;
    const text = String(row.content ?? "").replace(/\s+/g, " ").replace(/"/g, "'").trim().slice(0, 300);
    return text || `[${row.message_type ?? "message"}]`;
}

/** The options we offered on one of our tappable questions in this conversation; [] when it wasn't one. */
export async function offeredOptions(conversationId: string, waMessageId: string): Promise<string[]> {
    const { data, error } = await db.from("message_log").select("content")
        .eq("conversation_id", conversationId).eq("wa_message_id", waMessageId)
        .eq("direction", "outbound").eq("message_type", "interactive").limit(1);
    if (error) throw error;
    return optionsFrom((data ?? [])[0]?.content);
}

/** The order update or reminder the customer is answering, if our last message was one. */
export async function latestNotice(conversationId: string): Promise<string | null> {
    const { data, error } = await db.from("message_log").select("direction, message_type, content")
        .eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(8);
    if (error) throw error;
    return unseenNotice(data ?? []);
}

/** The latest return request in this conversation from the last day, as one line for the team; null when none. */
export async function returnNote(conversationId: string): Promise<string | null> {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { data, error } = await db.from("return_requests").select("order_id, reason, wants, details, created_at")
        .eq("conversation_id", conversationId).gte("created_at", since).order("created_at", { ascending: false }).limit(1);
    if (error) throw error;
    const r = (data ?? [])[0];
    if (!r) return null;
    const { data: o } = await db.from("orders").select("updated_at").eq("id", r.order_id).maybeSingle();
    return returnSummary({ ref: String(r.order_id).slice(0, 8).toUpperCase(), reason: r.reason, wants: r.wants, details: r.details, lastUpdate: o?.updated_at ?? null });
}

export async function recentHistory(conversationId: string, limit = 10): Promise<HistoryLine[]> {
    const { data, error } = await db.from("message_log").select("direction, content, message_type, created_at")
        .eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return ((data ?? []) as any[]).reverse().map(r => ({ direction: r.direction, content: r.content, type: r.message_type, at: r.created_at }));
}
