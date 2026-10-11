// shop_chats reads and writes (service role). Saves are optimistic: a save
// only lands on the turn it started from, so two tabs can't mix transcripts.
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { startOfTodayUtc } from "@/lib/ai/spend";
import type { AiSettings } from "@/lib/ai/settings";
import { normaliseWaNumber } from "./settingsRules";
import type { ShopChat } from "./types";

// shop_chats is not in the generated Supabase types until the migration is applied.
const db = supabaseAdmin as any;

export function visitorKeyFor(chatId: string): string {
    return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "mt-shop")
        .update(`shop-visitor:${chatId}`).digest("hex").slice(0, 32);
}

const fromRow = (r: any): ShopChat => ({
    id: r.id, visitorKey: r.visitor_key, customerId: r.customer_id ?? null,
    transcript: Array.isArray(r.transcript) ? r.transcript : [],
    verifiedOrders: r.verified_orders ?? [], openOrders: r.open_orders ?? [],
    payLinks: r.pay_links && typeof r.pay_links === "object" ? r.pay_links : {},
    saleKey: r.sale_key ?? null, wrongTries: r.wrong_tries ?? 0, lastQuote: r.last_quote ?? null, turns: r.turns ?? 0,
    ...(r.last_message_at ? { lastMessageAt: String(r.last_message_at) } : {}),
});

export async function loadChat(id: string): Promise<ShopChat | null> {
    const { data, error } = await db.from("shop_chats").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data) : null;
}

export async function createChat(a: { id: string; visitorKey: string; customerId: string | null }): Promise<ShopChat> {
    const { data, error } = await db.from("shop_chats")
        .insert({ id: a.id, visitor_key: a.visitorKey, customer_id: a.customerId }).select("*").single();
    if (error) throw error;
    return fromRow(data);
}

export async function saveChat(chat: ShopChat, expectedTurns: number, keepTranscript: boolean): Promise<boolean> {
    const turns = expectedTurns + 1;
    // .eq("turns", expectedTurns) is the conflict check: a save only lands on the turn it started from.
    const { data, error } = await db.from("shop_chats").update({
        ...(keepTranscript ? { transcript: chat.transcript } : {}),
        customer_id: chat.customerId,
        verified_orders: chat.verifiedOrders, open_orders: chat.openOrders, pay_links: chat.payLinks,
        sale_key: chat.saleKey, wrong_tries: chat.wrongTries, last_quote: chat.lastQuote,
        turns, last_message_at: new Date().toISOString(),
    }).eq("id", chat.id).eq("turns", expectedTurns).select("id");
    if (error) throw error;
    return (data ?? []).length === 1;
}

/** Saves only the order state (no transcript; turns bumped so a later save conflicts and merges); lands only if the chat is still on `expectedTurns`. */
export async function saveStateOnly(chat: ShopChat, expectedTurns: number): Promise<boolean> {
    const { data, error } = await db.from("shop_chats").update({
        customer_id: chat.customerId,
        verified_orders: chat.verifiedOrders, open_orders: chat.openOrders, pay_links: chat.payLinks,
        sale_key: chat.saleKey, wrong_tries: chat.wrongTries, last_quote: chat.lastQuote,
        turns: expectedTurns + 1,
    }).eq("id", chat.id).eq("turns", expectedTurns).select("id");
    if (error) throw error;
    return (data ?? []).length === 1;
}

/** Messages this visitor sent in the last minute and today, across all their chats. Null = can't tell (fail closed). */
export async function visitorCounts(visitorKey: string): Promise<{ lastMinute: number; today: number } | null> {
    const { data: chats, error } = await db.from("shop_chats").select("id")
        .eq("visitor_key", visitorKey).gte("last_message_at", startOfTodayUtc()).limit(200);
    if (error) return null;
    const ids = ((chats ?? []) as { id: string }[]).map(c => c.id);
    if (ids.length === 0) return { lastMinute: 0, today: 0 };
    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const [m, d] = await Promise.all([
        db.from("ai_turns").select("id", { count: "exact", head: true }).in("shop_chat_id", ids).gte("created_at", minuteAgo),
        db.from("ai_turns").select("id", { count: "exact", head: true }).in("shop_chat_id", ids).gte("created_at", startOfTodayUtc()),
    ]);
    if (m.error || d.error) return null;
    return { lastMinute: m.count ?? 0, today: d.count ?? 0 };
}

export async function shopWhatsappNumber(settings: AiSettings): Promise<string | null> {
    if (settings.shop.whatsappNumber) return settings.shop.whatsappNumber;
    const { data } = await supabaseAdmin.from("site_settings").select("store_phone").eq("id", "singleton").maybeSingle();
    return normaliseWaNumber(data?.store_phone);
}
