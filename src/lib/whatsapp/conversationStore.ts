// WhatsApp conversations ↔ the shop assistant's chats, the outbound log, and
// the recent history a handoff forwards. Server-only (service role).
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createChat, loadChat, visitorKeyFor } from "@/lib/ai/shopAssistant/store";
import { chatIsStale } from "@/lib/ai/shopAssistant/limits";
import type { ShopChat } from "@/lib/ai/shopAssistant/types";
import type { HistoryLine } from "./handoff";

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

/** Logs a message we sent, so the inbox shows both sides. Never throws. */
export async function logOutbound(conversationId: string, text: string, waMessageId: string | null, type = "text"): Promise<void> {
    const { error } = await db.from("message_log").insert({
        conversation_id: conversationId, direction: "outbound", content: text, wa_message_id: waMessageId, message_type: type,
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

export async function recentHistory(conversationId: string, limit = 10): Promise<HistoryLine[]> {
    const { data, error } = await db.from("message_log").select("direction, content, message_type, created_at")
        .eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return ((data ?? []) as any[]).reverse().map(r => ({ direction: r.direction, content: r.content, type: r.message_type, at: r.created_at }));
}
