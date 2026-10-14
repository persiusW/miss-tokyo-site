// One shop chat's words, masked. Admin and owner only.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAiAdmin } from "@/lib/ai/requireAdmin";
import { conversationText } from "@/lib/ai/shopAssistant/adminView";
import { logCause } from "@/lib/errors/apiError";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAiAdmin();
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "Please sign in again." : "Only admins and owners can see shop chats." }, { status: auth.status });
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "That chat wasn't found." }, { status: 404 });
    try {
        // shop_chats is not in the generated types until the migration is applied.
        const { data, error } = await (supabaseAdmin as any).from("shop_chats").select("transcript").eq("id", id).maybeSingle();
        if (error) throw error;
        if (!data) return NextResponse.json({ error: "That chat wasn't found." }, { status: 404 });
        return NextResponse.json({ lines: conversationText(data.transcript) });
    } catch (e) {
        logCause("GEN-00", e, { route: "ai/shop-chats/[id]" });
        return NextResponse.json({ error: "We couldn't load that chat. Please try again." }, { status: 500 });
    }
}
