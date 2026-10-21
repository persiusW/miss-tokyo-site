// One file in a WhatsApp chat, for the inbox: a redirect to a short-lived
// signed link (customer files in our private bucket) or to the public link
// (product photos we sent). A customer file not copied yet is copied now.
// Order staff only.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logCause } from "@/lib/errors/apiError";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { mediaState, type MessageRow } from "@/lib/whatsapp/inbox";
import { archiveInboundMedia, inboundFor, mediaEnabled, mediaLink } from "@/lib/whatsapp/media";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GONE = { error: "This file isn't available any more." };
const db = supabaseAdmin as any;

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
    const auth = await requireStaff(["admin", "owner", "sales_staff"]);
    if ("status" in auth) return NextResponse.json({ error: "Please sign in again." }, { status: auth.status });
    const { id, messageId } = await params;
    if (!mediaEnabled() || !UUID.test(id) || !UUID.test(messageId)) return NextResponse.json(GONE, { status: 404 });
    try {
        const { data: row, error } = await db.from("message_log")
            .select("direction, message_type, media_url, wa_message_id").eq("id", messageId).eq("conversation_id", id).maybeSingle();
        if (error) throw error;
        const state = row ? mediaState(row as MessageRow) : null;
        if (!row || !state || state === "missing") return NextResponse.json(GONE, { status: 404 });

        let stored: string | null = row.media_url ?? null;
        if (state === "fetch") {
            const m = row.wa_message_id ? await inboundFor(row.wa_message_id) : null;
            stored = m ? await archiveInboundMedia(id, m, mediaId => createChatbotsAfrica().downloadMedia(mediaId)) : null;
        }
        const link = stored ? await mediaLink(stored) : null;
        if (!link) return NextResponse.json(GONE, { status: 404 });
        const res = NextResponse.redirect(link, 302);
        res.headers.set("Cache-Control", "private, no-store");
        return res;
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/inbox/[id]/media" });
        return NextResponse.json(GONE, { status: 404 });
    }
}
