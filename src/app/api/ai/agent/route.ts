// Miss Tokyo AI chat turn. Admin, owner and sales staff only.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runStoreAssistant, validateTranscript } from "@/lib/ai/missTokyoAi/run";
import type { StaffRole } from "@/lib/ai/missTokyoAi/routes";
import { getAiSettings } from "@/lib/ai/settings";
import { seedLine, SEED_WINDOW_MINUTES } from "@/lib/ai/missTokyoAi/seed";
import { checkSeed } from "@/lib/ai/missTokyoAi/seedGate";
import { signSeedLine } from "@/lib/ai/missTokyoAi/seedSign";

export const maxDuration = 120;

const STAFF_ROLES: StaffRole[] = ["admin", "owner", "sales_staff"];

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
        const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        const role = profile?.role as StaffRole | undefined;
        if (!role || !STAFF_ROLES.includes(role)) {
            return NextResponse.json({ error: "You don't have access to Miss Tokyo AI." }, { status: 403 });
        }

        let body: any;
        try { body = await req.json(); } catch { body = null; }
        const transcript = validateTranscript(body?.messages);
        if (!transcript) {
            return NextResponse.json({ error: "Something went wrong with this chat. Please start a new chat." }, { status: 400 });
        }

        // "Ask Miss Tokyo AI" from a payment error toast: honoured on the first
        // turn only, for an aiHelp code and a sale this person may see.
        let seedKeyValue: string | undefined;
        if (body?.seed !== undefined && body?.seed !== null) {
            const settings = await getAiSettings();
            if (!settings.mtai.errorHelp) return NextResponse.json({ error: "This isn't switched on." }, { status: 503 });
            const gate = await checkSeed({ seed: body.seed, transcriptLength: transcript.length, role, userId: user.id }, {
                session: async (id) => (await supabaseAdmin.from("pos_sessions").select("id, ref, created_by").eq("id", id).maybeSingle()).data,
                order: async (id) => (await supabaseAdmin.from("orders").select("id, ref").eq("id", id).maybeSingle()).data,
                saleRows: async (key) => (await supabaseAdmin.from("sale_payment_attempts").select("created_by, pos_session_id").eq("sale_key", key)).data ?? [],
                latestAttemptId: async (seed) => (await supabaseAdmin.from("sale_payment_attempts").select("id")
                    .eq(seed.posSessionId ? "pos_session_id" : seed.orderId ? "order_id" : "sale_key", (seed.posSessionId ?? seed.orderId ?? seed.saleKey) as string)
                    .order("created_at", { ascending: false }).limit(1).maybeSingle()).data?.id ?? null,
                recentAsks: async (key) => (await supabaseAdmin.from("ai_turns").select("id", { count: "exact", head: true })
                    .eq("user_id", user.id).eq("seed_key", key)
                    .gte("created_at", new Date(Date.now() - SEED_WINDOW_MINUTES * 60_000).toISOString())).count ?? 0,
            });
            if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
            const first = transcript[0] as { role: "user"; content: unknown };
            transcript[0] = { role: "user", content: `${signSeedLine(seedLine(gate.seed, gate.label))}\n${typeof first.content === "string" ? first.content : ""}` } as (typeof transcript)[number];
            seedKeyValue = gate.key;
        }

        const result = await runStoreAssistant({ transcript, userId: user.id, role, seedKey: seedKeyValue });
        // calm-text: runStoreAssistant only returns its own CALM messages.
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status }); // calm-text
        return NextResponse.json({ messages: result.messages, reply: result.reply, effects: result.effects });
    } catch (e) {
        console.error("[api/ai/agent]", e);
        return NextResponse.json({ error: "We are updating this feature. Please try again shortly. Sorry for the inconvenience." }, { status: 500 });
    }
}

/** Whether Miss Tokyo AI can answer right now, so the panel can say so before anyone types. */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ available: false, reason: "signed_out" }, { status: 401 });
        const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        if (!profile || !STAFF_ROLES.includes(profile.role as StaffRole)) {
            return NextResponse.json({ available: false, reason: "forbidden" }, { status: 403 });
        }
        const settings = await getAiSettings();
        const features = settings.mtai;
        if (!settings.dashboardAgentEnabled) return NextResponse.json({ available: false, reason: "off", features });
        if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ available: false, reason: "not_set_up", features });
        return NextResponse.json({ available: true, reason: null, features });
    } catch (e) {
        console.error("[api/ai/agent] GET", e);
        return NextResponse.json({ available: false, reason: "error" }, { status: 500 });
    }
}
