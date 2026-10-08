// Staff Store Assistant. Admin, owner and sales staff only.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runStoreAssistant, validateTranscript } from "@/lib/ai/storeAssistant/run";

export const maxDuration = 120;

const STAFF_ROLES = ["admin", "owner", "sales_staff"];

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
        const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        if (!profile || !STAFF_ROLES.includes(profile.role ?? "")) {
            return NextResponse.json({ error: "You don't have access to the Store Assistant." }, { status: 403 });
        }

        let body: any;
        try { body = await req.json(); } catch { body = null; }
        const transcript = validateTranscript(body?.messages);
        if (!transcript) {
            return NextResponse.json({ error: "Something went wrong with this chat. Please start a new chat." }, { status: 400 });
        }

        const result = await runStoreAssistant({ transcript, userId: user.id, role: profile.role! });
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
        return NextResponse.json({ messages: result.messages, reply: result.reply });
    } catch (e) {
        console.error("[api/ai/agent]", e);
        return NextResponse.json({ error: "Something happened. Please try again shortly." }, { status: 500 });
    }
}
