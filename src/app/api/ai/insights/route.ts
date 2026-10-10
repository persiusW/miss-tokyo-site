// The three read-only cards on AI Settings: failed sends, errors by code, and
// AI usage per staff member. Admin and owner only. No provider text, no full
// phone numbers or addresses, no technical causes.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAiAdmin } from "@/lib/ai/requireAdmin";
import { countBy, failureReason, maskRecipient, summariseUsage } from "@/lib/ai/insights";
import { USD_TO_GHS } from "@/lib/ai/pricing";
import { apiError } from "@/lib/errors/apiError";
import { errorText } from "@/lib/errors/catalogue";

const DENIED = {
    401: { error: "Please sign in again." },
    403: { error: "Only admins and owners can see AI insights." },
};

const DAY = 86_400_000;

export async function GET() {
    const auth = await requireAiAdmin();
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });

    try {
        const now = Date.now();
        const weekAgo = new Date(now - 7 * DAY).toISOString();
        const monthAgo = new Date(now - 30 * DAY).toISOString();
        const [sendsRes, errorsRes, turnsRes, switchRes] = await Promise.all([
            supabaseAdmin.from("notification_log").select("channel, event, recipient, error_code, created_at")
                .eq("status", "failed").gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(1000),
            supabaseAdmin.from("app_error_events").select("code, place, audience, created_at")
                .gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(5000),
            supabaseAdmin.from("ai_turns").select("user_id, cost_usd, created_at")
                .gte("created_at", monthAgo).not("user_id", "is", null).limit(20000),
            supabaseAdmin.from("ai_settings").select("value").eq("key", "mtai_error_log_enabled").maybeSingle(),
        ]);
        const failed = sendsRes.error ?? errorsRes.error ?? turnsRes.error ?? switchRes.error;
        if (failed) return apiError("GEN-00", { status: 500, audience: "staff", cause: failed, context: { route: "ai/insights" } });

        const sends = sendsRes.data ?? [];
        const errors = errorsRes.data ?? [];
        const turns = turnsRes.data ?? [];

        const userIds = [...new Set(turns.map(t => t.user_id as string))];
        const names = new Map<string, string>();
        if (userIds.length) {
            const { data: people } = await supabaseAdmin.from("profiles").select("id, full_name, first_name, last_name").in("id", userIds);
            for (const p of people ?? []) {
                const name = (p.full_name ?? "").trim() || [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
                if (name) names.set(p.id, name);
            }
        }

        return NextResponse.json({
            failed_sends: {
                total: sends.length,
                by_kind: countBy(sends, s => `${s.channel}|${s.event}`).map(({ key, count }) => {
                    const [channel, event] = key.split("|");
                    return { channel, event, count };
                }),
                recent: sends.slice(0, 20).map(s => ({
                    at: s.created_at,
                    channel: s.channel,
                    event: s.event,
                    to: maskRecipient(s.channel, s.recipient),
                    reason: failureReason(s.channel, s.error_code),
                })),
            },
            errors: {
                enabled: switchRes.data?.value === true,
                total: errors.length,
                by_code: countBy(errors, e => e.code).map(({ key, count }) => ({ code: key, label: errorText(key, "staff"), count })),
                recent: errors.slice(0, 50).map(e => ({ at: e.created_at, code: e.code, place: e.place, audience: e.audience })),
            },
            usage: {
                week: summariseUsage(turns.filter(t => t.created_at >= weekAgo), names, USD_TO_GHS),
                month: summariseUsage(turns, names, USD_TO_GHS),
            },
        });
    } catch (e) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e, context: { route: "ai/insights" } });
    }
}
