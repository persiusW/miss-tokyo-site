// The shared daily AI spend, from ai_turns. Ghana is on UTC all year, so the
// shop's day is the UTC day.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { USD_TO_GHS } from "@/lib/ai/pricing";

export function startOfTodayUtc(): string {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

/** Today's spend in USD, optionally for one channel, or null when it cannot be read (callers fail closed). */
export async function todaySpendUsd(channel?: "dashboard" | "whatsapp" | "web"): Promise<number | null> {
    // PostgREST stops at 1000 rows a request, so page through the whole day.
    const PAGE = 1000;
    let total = 0;
    for (let from = 0; ; from += PAGE) {
        let q = supabaseAdmin
            .from("ai_turns")
            .select("cost_usd")
            .gte("created_at", startOfTodayUtc())
            .order("id")
            .range(from, from + PAGE - 1);
        if (channel) q = q.eq("channel", channel);
        const { data, error } = await q;
        if (error) {
            console.error("[ai/spend] could not read ai_turns", error);
            return null;
        }
        const rows = data ?? [];
        total += rows.reduce((sum: number, r: any) => sum + (Number(r.cost_usd) || 0), 0);
        if (rows.length < PAGE) return total;
    }
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
