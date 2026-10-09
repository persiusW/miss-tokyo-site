// Miss Tokyo AI chat turn. Admin, owner and sales staff only.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runStoreAssistant, validateTranscript } from "@/lib/ai/missTokyoAi/run";
import type { StaffRole } from "@/lib/ai/missTokyoAi/routes";
import { getAiSettings } from "@/lib/ai/settings";

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

        const result = await runStoreAssistant({ transcript, userId: user.id, role });
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
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
