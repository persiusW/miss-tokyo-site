// Metered use for a period, from the shop's own records. Server-only.
//   AI         ai_turns (one row per reply, cost_usd at the model's price)
//   SMS        notification_log channel sms, status sent: units from the body
//   WhatsApp   notification_log channel whatsapp, status sent: every send
//              through Chatbots Africa is logged there (assistant replies,
//              staff replies, photos, alerts, order updates), so message_log
//              would count the same messages twice. A body starting
//              "[template " is a template send.
// Email (Resend) is part of the maintenance fee and never counted.
// PostgREST stops at 1000 rows a request, so every read pages.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { smsUnits } from "./smsUnits";
import { EMPTY_USAGE, type Usage } from "./statement";

const PAGE = 1000;
const db = supabaseAdmin as any;

async function pageAll(build: (from: number, to: number) => any): Promise<any[]> {
    const out: any[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await build(from, from + PAGE - 1);
        if (error) throw error;
        const rows = data ?? [];
        out.push(...rows);
        if (rows.length < PAGE || out.length > 200_000) return out;
    }
}

export function isTemplateBody(body: unknown): boolean {
    return typeof body === "string" && body.startsWith("[template ");
}

/** Use in [fromIso, toIso). Throws on a read failure (callers show a calm state). */
export async function loadUsage(fromIso: string, toIso: string): Promise<Usage> {
    const [turns, sends] = await Promise.all([
        pageAll((a, b) => db.from("ai_turns").select("id, cost_usd").gte("created_at", fromIso).lt("created_at", toIso).order("created_at").order("id").range(a, b)),
        pageAll((a, b) => db.from("notification_log").select("id, channel, body").in("channel", ["sms", "whatsapp"]).eq("status", "sent")
            .gte("created_at", fromIso).lt("created_at", toIso).order("created_at").order("id").range(a, b)),
    ]);
    const u: Usage = { ...EMPTY_USAGE };
    for (const t of turns) { u.aiReplies += 1; u.aiCostUsd += Number(t.cost_usd) || 0; }
    for (const s of sends) {
        if (s.channel === "sms") { u.smsMessages += 1; u.smsUnits += smsUnits(s.body); }
        else if (isTemplateBody(s.body)) u.waTemplates += 1;
        else u.waMessages += 1;
    }
    return u;
}

/** Other lines that belong to a period: recurring ones plus one-offs for that period. */
export async function loadOtherLines(periodStart: string): Promise<{ id: string; description: string; quantity: number; unit: string; unitPrice: number; recurring: boolean }[]> {
    const { data, error } = await db.from("billing_other_lines").select("id, description, quantity, unit, unit_price_ghs, recurring, period_start, active")
        .eq("active", true).order("created_at");
    if (error) throw error;
    return (data ?? []).filter((r: any) => r.recurring || r.period_start === periodStart).map((r: any) => ({
        id: String(r.id), description: String(r.description), quantity: Number(r.quantity) || 0, unit: String(r.unit || "item"),
        unitPrice: Number(r.unit_price_ghs) || 0, recurring: r.recurring === true,
    }));
}
