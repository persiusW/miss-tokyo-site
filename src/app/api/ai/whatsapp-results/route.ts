// What WhatsApp brings in over the last 7 and 30 days, for AI Settings. Admin and owner only.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAiAdmin } from "@/lib/ai/requireAdmin";
import { pageAll } from "@/lib/ai/insights";
import { logCause } from "@/lib/errors/apiError";
import { summariseResults, type NudgedRow } from "@/lib/whatsapp/results";

export const dynamic = "force-dynamic";

const DENIED = { 401: { error: "Please sign in again." }, 403: { error: "Only admins and owners can see WhatsApp results." } };
const FAIL = { error: "We couldn't load WhatsApp results. Please refresh and try again." };

// ai_turns.conversation_id and orders.wa_nudged_at are not in the generated types.
const db = supabaseAdmin as any;

export async function GET() {
    const auth = await requireAiAdmin();
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const now = Date.now();
        const month = new Date(now - 30 * 86_400_000).toISOString();
        const week = new Date(now - 7 * 86_400_000).toISOString();
        const [turns, orders, sends, nudgedRes] = await Promise.all([
            pageAll<any>((f, t) => db.from("ai_turns").select("conversation_id, cost_usd, created_at").eq("channel", "whatsapp").gte("created_at", month).order("created_at").order("id").range(f, t), 1000, 20),
            pageAll<any>((f, t) => db.from("orders").select("payment_status, total_amount, created_at").eq("source", "whatsapp").gte("created_at", month).order("created_at").order("id").range(f, t), 1000, 20),
            pageAll<any>((f, t) => db.from("notification_log").select("event, created_at").eq("channel", "whatsapp").eq("status", "sent")
                .in("event", ["whatsapp_unpaid_nudge", "whatsapp_restock_alert"]).gte("created_at", month).order("created_at").order("id").range(f, t), 1000, 20),
            db.from("orders").select("payment_status, total_amount, wa_nudged_at").not("wa_nudged_at", "is", null).gte("wa_nudged_at", month).limit(1000),
        ]);
        const failed = turns.error ?? orders.error ?? sends.error;
        if (failed) { logCause("GEN-00", failed, { route: "ai/whatsapp-results" }); return NextResponse.json(FAIL, { status: 500 }); }
        // Before the reminder's migration is applied, wa_nudged_at doesn't exist: no recoveries yet, not an error.
        const nudged: NudgedRow[] = nudgedRes.error ? [] : nudgedRes.data ?? [];
        const rows = { turns: turns.rows, orders: orders.rows, nudged, sends: sends.rows };
        return NextResponse.json({
            week: summariseResults(week, rows), month: summariseResults(month, rows),
            truncated: turns.truncated || orders.truncated || sends.truncated,
        });
    } catch (e) {
        logCause("GEN-00", e, { route: "ai/whatsapp-results" });
        return NextResponse.json(FAIL, { status: 500 });
    }
}
