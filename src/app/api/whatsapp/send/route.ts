// Manual WhatsApp send for admins. Owners/admins only: unauthenticated, this
// would let anyone message any number from the shop's line.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendWhatsApp } from "@/lib/whatsapp/send";

const MESSAGES: Record<string, { status: number; error: string }> = {
    not_configured: { status: 503, error: "WhatsApp is not set up yet." },
    invalid: { status: 400, error: "Check the number and message, then try again." },
    rejected: { status: 502, error: "WhatsApp did not accept that message. Please try again later." },
    network: { status: 502, error: "We could not reach WhatsApp. Please try again shortly." },
};

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "owner"].includes(profile.role ?? "")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: any;
    try { body = await req.json(); } catch { body = {}; }
    const { to, type, text, imageUrl, caption } = body ?? {};

    const result = type === "image"
        ? await sendWhatsApp({ to, type: "image", imageUrl, caption })
        : await sendWhatsApp({ to, type: "text", text });

    if (!result.ok) {
        const m = MESSAGES[result.code] ?? MESSAGES.network;
        return NextResponse.json({ error: m.error }, { status: m.status });
    }
    return NextResponse.json({ ok: true, messageId: result.messageId });
}
