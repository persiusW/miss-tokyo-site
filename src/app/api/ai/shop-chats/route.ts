// Ask Miss Tokyo usage and recent chats for AI Settings. Admin and owner only.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAiAdmin } from "@/lib/ai/requireAdmin";
import { pageAll } from "@/lib/ai/insights";
import { USD_TO_GHS } from "@/lib/ai/pricing";
import { startOfTodayUtc } from "@/lib/ai/spend";
import { firstQuestion } from "@/lib/ai/shopAssistant/adminView";
import { logCause } from "@/lib/errors/apiError";

const DENIED = { 401: { error: "Please sign in again." }, 403: { error: "Only admins and owners can see shop chats." } };
const FAIL = { error: "We couldn't load shop chats. Please refresh and try again." };

type Usage = { chats: number; messages: number; cost_ghs: number; orders: number; paid_orders: number };

// shop_chats and ai_turns.shop_chat_id are not in the generated types until the migration is applied.
const db = supabaseAdmin as any;

export async function GET() {
    const auth = await requireAiAdmin();
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const today = startOfTodayUtc();
        const weekStart = new Date(new Date(today).getTime() - 6 * 86_400_000).toISOString();
        const [turns, orders, recent] = await Promise.all([
            pageAll<any>((f, t) => db.from("ai_turns").select("shop_chat_id, cost_usd, created_at").eq("channel", "web").gte("created_at", weekStart).order("created_at").order("id").range(f, t), 1000, 20),
            pageAll<any>((f, t) => supabaseAdmin.from("orders").select("id, payment_status, created_at").eq("source", "web_chat").gte("created_at", weekStart).order("created_at").order("id").range(f, t), 1000, 20),
            db.from("shop_chats").select("id, transcript, turns, open_orders, verified_orders, last_message_at").order("last_message_at", { ascending: false }).limit(30),
        ]);
        if (turns.error || orders.error || recent.error) {
            logCause("GEN-00", turns.error ?? orders.error ?? recent.error, { route: "ai/shop-chats" });
            return NextResponse.json(FAIL, { status: 500 });
        }
        const sum = (since: string): Usage => {
            const t = turns.rows.filter(r => r.created_at >= since);
            const o = orders.rows.filter(r => r.created_at >= since);
            return {
                chats: new Set(t.map(r => r.shop_chat_id).filter(Boolean)).size,
                messages: t.length,
                cost_ghs: parseFloat((t.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0) * USD_TO_GHS).toFixed(2)),
                orders: o.length,
                paid_orders: o.filter(r => r.payment_status === "paid").length,
            };
        };
        const chats = (recent.data ?? []).map((c: any) => ({
            id: c.id,
            first_question: firstQuestion(c.transcript),
            turns: c.turns,
            order_refs: [...new Set([...(c.open_orders ?? []), ...(c.verified_orders ?? [])])].map((id: any) => String(id).slice(0, 8).toUpperCase()),
            last_message_at: c.last_message_at,
        }));
        return NextResponse.json({ usage: { today: sum(today), week: sum(weekStart) }, chats, truncated: turns.truncated || orders.truncated });
    } catch (e) {
        logCause("GEN-00", e, { route: "ai/shop-chats" });
        return NextResponse.json(FAIL, { status: 500 });
    }
}
