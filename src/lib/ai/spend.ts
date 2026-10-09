// The shared daily AI spend, from ai_turns. Ghana is on UTC all year, so the
// shop's day is the UTC day.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { USD_TO_GHS } from "@/lib/ai/pricing";

export function startOfTodayUtc(): string {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

/** Today's spend in USD, optionally for one channel, or null when it cannot be read (callers fail closed). */
export async function todaySpendUsd(channel?: "dashboard" | "whatsapp"): Promise<number | null> {
    let q = supabaseAdmin
        .from("ai_turns")
        .select("cost_usd")
        .gte("created_at", startOfTodayUtc());
    if (channel) q = q.eq("channel", channel);
    const { data, error } = await q;
    if (error) {
        console.error("[ai/spend] could not read ai_turns", error);
        return null;
    }
    return (data ?? []).reduce((sum: number, r: any) => sum + (Number(r.cost_usd) || 0), 0);
}

/**
 * Whether another call fits under the cap: spent today + this request so far
 * + a worst-case allowance for the next call. Compared at 4 decimal places,
 * and anything non-finite counts as over.
 */
export function withinCap(args: { capGhs: number; spentTodayUsd: number; runningUsd: number; reserveUsd: number }): boolean {
    const projectedGhs = (args.spentTodayUsd + args.runningUsd + args.reserveUsd) * USD_TO_GHS;
    if (!Number.isFinite(projectedGhs) || !Number.isFinite(args.capGhs)) return false;
    return Math.round(projectedGhs * 1e4) <= Math.round(args.capGhs * 1e4);
}
