// AI settings and usage. Admin and owner only. Costs are internal figures.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAiAdmin } from "@/lib/ai/requireAdmin";
import { EDITABLE_AI_SETTINGS, getAiSettings, type EditableAiSettingKey } from "@/lib/ai/settings";
import { USD_TO_GHS } from "@/lib/ai/pricing";
import { startOfTodayUtc } from "@/lib/ai/spend";

const DENIED = {
    401: { error: "Please sign in again." },
    403: { error: "Only admins and owners can manage AI settings." },
};

const toGhs = (usd: number) => parseFloat((usd * USD_TO_GHS).toFixed(4));

export async function GET() {
    const auth = await requireAiAdmin();
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });

    try {
        const today = startOfTodayUtc();
        const weekStart = new Date(new Date(today).getTime() - 6 * 86_400_000).toISOString();
        const [settingsRes, recentRes, weekRes, effective] = await Promise.all([
            supabaseAdmin.from("ai_settings").select("key, value, description, updated_at").order("key"),
            supabaseAdmin.from("ai_turns")
                .select("created_at, channel, model, input_tokens, output_tokens, cost_usd")
                .order("created_at", { ascending: false })
                .limit(20),
            supabaseAdmin.from("ai_turns").select("created_at, cost_usd").gte("created_at", weekStart),
            getAiSettings(),
        ]);
        if (settingsRes.error || recentRes.error || weekRes.error) {
            console.error("[api/ai/settings] read failed", settingsRes.error ?? recentRes.error ?? weekRes.error);
            return NextResponse.json({ error: "We couldn't load AI settings. Please refresh and try again." }, { status: 500 });
        }

        // Seven UTC days ending today, zero-filled so the series has no gaps.
        const byDay = new Map<string, number>();
        for (let i = 6; i >= 0; i--) byDay.set(new Date(new Date(today).getTime() - i * 86_400_000).toISOString().slice(0, 10), 0);
        for (const r of weekRes.data ?? []) {
            const day = String(r.created_at).slice(0, 10);
            if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + (Number(r.cost_usd) || 0));
        }
        const todayUsd = byDay.get(today.slice(0, 10)) ?? 0;

        return NextResponse.json({
            settings: settingsRes.data ?? [],
            today: { spend_usd: parseFloat(todayUsd.toFixed(6)), spend_ghs: toGhs(todayUsd), cap_ghs: effective.dailySpendCapGhs },
            recent_turns: (recentRes.data ?? []).map(t => ({ ...t, cost_ghs: toGhs(Number(t.cost_usd) || 0) })),
            history: [...byDay.entries()].map(([date, usd]) => ({ date, cost_usd: parseFloat(usd.toFixed(6)), cost_ghs: toGhs(usd) })),
            usd_to_ghs: USD_TO_GHS,
        });
    } catch (e) {
        console.error("[api/ai/settings] GET", e);
        return NextResponse.json({ error: "We couldn't load AI settings. Please refresh and try again." }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await requireAiAdmin();
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });

    let body: any;
    try { body = await req.json(); } catch { body = null; }
    const key = body?.key as EditableAiSettingKey;
    const value = body?.value;
    if (!key || !(key in EDITABLE_AI_SETTINGS)) {
        return NextResponse.json({ error: "That setting can't be changed here." }, { status: 400 });
    }
    if (!EDITABLE_AI_SETTINGS[key](value)) {
        return NextResponse.json({ error: "That value is out of range." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("ai_settings")
        .update({ value, updated_at: new Date().toISOString(), updated_by: auth.userId })
        .eq("key", key)
        .select("key");
    if (error || !data?.length) {
        console.error("[api/ai/settings] PATCH failed", { key, error });
        return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
