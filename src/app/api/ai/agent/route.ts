// Miss Tokyo AI chat turn. Admin, owner and sales staff only.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runStoreAssistant, validateTranscript } from "@/lib/ai/missTokyoAi/run";
import type { StaffRole } from "@/lib/ai/missTokyoAi/routes";
import { getAiSettings } from "@/lib/ai/settings";
import { parseSeed, seedKey, seedLine, SEED_WINDOW_MINUTES } from "@/lib/ai/missTokyoAi/seed";

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
            const seed = parseSeed(body.seed);
            if (!seed || transcript.length !== 1) {
                return NextResponse.json({ error: "Something went wrong with this chat. Please start a new chat." }, { status: 400 });
            }
            let label = "this sale";
            if (seed.posSessionId) {
                const { data: s } = await supabaseAdmin.from("pos_sessions").select("id, ref, created_by").eq("id", seed.posSessionId).maybeSingle();
                if (!s) return NextResponse.json({ error: "That sale wasn't found." }, { status: 404 });
                if (role === "sales_staff" && s.created_by !== user.id) return NextResponse.json({ error: "That sale belongs to someone else." }, { status: 403 });
                label = `till sale #${s.ref ?? String(s.id).slice(0, 8).toUpperCase()}`;
            } else if (seed.orderId) {
                const { data: o } = await supabaseAdmin.from("orders").select("id, ref").eq("id", seed.orderId).maybeSingle();
                if (!o) return NextResponse.json({ error: "That order wasn't found." }, { status: 404 });
                label = `order #${o.ref ?? String(o.id).slice(0, 8).toUpperCase()}`;
            }
            const key = seedKey(seed);
            const since = new Date(Date.now() - SEED_WINDOW_MINUTES * 60_000).toISOString();
            const { count } = await supabaseAdmin.from("ai_turns").select("id", { count: "exact", head: true })
                .eq("user_id", user.id).eq("seed_key", key).gte("created_at", since);
            if ((count ?? 0) > 0) {
                return NextResponse.json({ error: "You asked about this a moment ago. Please check the chat above." }, { status: 429 });
            }
            const first = transcript[0] as { role: "user"; content: unknown };
            transcript[0] = { role: "user", content: `${seedLine(seed, label)}\n${typeof first.content === "string" ? first.content : ""}` } as (typeof transcript)[number];
            seedKeyValue = key;
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
