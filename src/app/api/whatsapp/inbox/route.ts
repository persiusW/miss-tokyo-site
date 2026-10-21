// WhatsApp inbox: conversations with where each stands (needs a person, dealt
// with, assistant, notices only), a count per tab, and the last message.
// ?tab= filters (all | needs | assistant | notices | dealt); ?q= searches names,
// numbers and message text. Chats waiting for a person come first.
// Order staff only (admin, owner, sales staff): chats hold customer numbers.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logCause } from "@/lib/errors/apiError";
import { cleanSearch } from "@/lib/ai/missTokyoAi/tools/shared";
import { inTab, shapeConversation, sortInbox, tabCounts, TABS, type ConversationRow, type InboxTab, type MessageRow } from "@/lib/whatsapp/inbox";
import { composerOn, teachOn } from "@/lib/whatsapp/flags";

const STATS_DAYS = 7;

/** The tiles over the inbox: the last 7 days, and who is waiting now. */
async function inboxStats(convs: ConversationRow[], waiting: number, now: number) {
    const since = new Date(now - STATS_DAYS * 86_400_000).toISOString();
    const chats = convs.filter(c => c.last_inbound_at && c.last_inbound_at >= since).length;
    const [orders, handed] = await Promise.all([
        db.from("orders").select("total_amount").eq("source", "whatsapp").eq("payment_status", "paid").gte("created_at", since).limit(2000),
        db.from("whatsapp_conversation_events").select("conversation_id").eq("kind", "handed_off").gte("created_at", since).limit(2000),
    ]);
    if (orders.error || handed.error) throw orders.error ?? handed.error;
    const paid = (orders.data ?? []) as { total_amount: number | string }[];
    return {
        days: STATS_DAYS, chats, waiting,
        assistantOrders: paid.length,
        assistantSalesGhs: Math.round(paid.reduce((n, o) => n + (Number(o.total_amount) || 0), 0) * 100) / 100,
        handedOver: new Set(((handed.data ?? []) as { conversation_id: string }[]).map(h => h.conversation_id)).size,
    };
}

export const dynamic = "force-dynamic";

const DENIED = { 401: { error: "Please sign in again." }, 403: { error: "Only order staff can see WhatsApp chats." } };
const FAIL = { error: "We couldn't load WhatsApp chats. Please refresh and try again." };
const db = supabaseAdmin as any;
/** Chats shown in one list; counts cover every chat. */
const SHOWN = 100;

export async function GET(req: NextRequest) {
    const auth = await requireStaff(["admin", "owner", "sales_staff"]);
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    const url = new URL(req.url);
    const tabParam = url.searchParams.get("tab") ?? "all";
    const tab: InboxTab = (TABS as readonly string[]).includes(tabParam) ? (tabParam as InboxTab) : "all";
    const q = cleanSearch(url.searchParams.get("q"), 60).toLowerCase();
    try {
        const { data: convs, error } = await db.from("whatsapp_conversations")
            .select("id, wa_phone_number, wa_contact_name, state, handed_off_at, dealt_with_at, last_message_at, last_inbound_at, created_at")
            .order("last_message_at", { ascending: false, nullsFirst: false }).limit(2000);
        if (error) throw error;
        const now = Date.now();
        const all = ((convs ?? []) as ConversationRow[]).map(c => shapeConversation(c, null, now));
        const counts = tabCounts(all);

        let matched = all;
        if (q) {
            // Name or number here; message text in the database.
            const digits = q.replace(/\D/g, "");
            const local = (p: string) => (/^233\d{9}$/.test(p) ? `0${p.slice(3)}` : p);
            const byText = new Set<string>();
            if (q.length >= 2) {
                const { data: hits, error: hitErr } = await db.from("message_log").select("conversation_id")
                    .ilike("content", `%${q}%`).limit(500);
                if (hitErr) throw hitErr;
                for (const h of hits ?? []) byText.add(h.conversation_id);
            }
            matched = all.filter(c => (c.name ?? "").toLowerCase().includes(q) || byText.has(c.id)
                || (digits.length >= 3 && (c.phone.includes(digits) || local(c.phone).includes(digits))));
        }
        const shown = sortInbox(matched.filter(c => inTab(c, tab))).slice(0, SHOWN);

        // Latest message per shown chat: newest first, first one seen wins.
        const last = new Map<string, MessageRow>();
        const ids = shown.map(c => c.id);
        if (ids.length > 0) {
            const { data: msgs, error: mErr } = await db.from("message_log")
                .select("id, conversation_id, direction, content, message_type, created_at")
                .in("conversation_id", ids).order("created_at", { ascending: false }).limit(1000);
            if (mErr) throw mErr;
            for (const m of (msgs ?? []) as MessageRow[]) if (!last.has(m.conversation_id)) last.set(m.conversation_id, m);
        }
        const rows = new Map(((convs ?? []) as ConversationRow[]).map(c => [c.id, c]));
        const stats = await inboxStats(((convs ?? []) as ConversationRow[]), counts.needs, now)
            .catch(e => { logCause("GEN-00", e, { route: "whatsapp/inbox stats" }); return null; });
        return NextResponse.json({
            tab, counts, stats,
            can: { teach: teachOn() && (auth.role === "admin" || auth.role === "owner"), reply: composerOn() },
            conversations: shown.map(c => shapeConversation(rows.get(c.id)!, last.get(c.id) ?? null, now)),
        });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/inbox" });
        return NextResponse.json(FAIL, { status: 500 });
    }
}
