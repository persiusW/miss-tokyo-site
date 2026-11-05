// The WhatsApp inbox figures for a period: ?p=all|month|30d|60d|90d|custom, and
// from=&to= (YYYY-MM-DD) for custom. Anything unusable reads as this month.
// Chats are counted from the messages themselves, not from each chat's latest
// message, so a period in the past still counts the people who wrote then.
// Separate from the chat list, which reloads every 20 seconds. Order staff only.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { parsePeriod, periodRange } from "@/lib/admin/v2/inboxPeriod";
import { readAllPages, summariseStats } from "@/lib/whatsapp/inboxStats";

export const dynamic = "force-dynamic";

const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
    const auth = await requireStaff(["admin", "owner", "sales_staff"]);
    if ("status" in auth) return apiError("AUTH-01", { status: auth.status, audience: "staff" });
    const url = new URL(req.url);
    const { from, to } = periodRange(parsePeriod(url.searchParams.get("p"), url.searchParams.get("from"), url.searchParams.get("to")), new Date());
    const within = (query: any) => (from ? query.gte("created_at", from.toISOString()) : query).lt("created_at", to.toISOString());
    try {
        const [inbound, orders, handed] = await Promise.all([
            readAllPages<{ conversation_id: string }>((a, b) => within(db.from("message_log").select("conversation_id").eq("direction", "inbound")).order("id").range(a, b)),
            readAllPages<{ total_amount: number | string }>((a, b) => within(db.from("orders").select("total_amount").eq("source", "whatsapp").eq("payment_status", "paid")).order("id").range(a, b)),
            readAllPages<{ conversation_id: string }>((a, b) => within(db.from("whatsapp_conversation_events").select("conversation_id").eq("kind", "handed_off")).order("id").range(a, b)),
        ]);
        return NextResponse.json(summariseStats(inbound, orders, handed));
    } catch (e) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e, context: { route: "whatsapp/inbox/stats" } });
    }
}
