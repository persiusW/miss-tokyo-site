// WhatsApp inbound health for AI Settings. Admin and owner only.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAiAdmin } from "@/lib/ai/requireAdmin";
import { getAiSettings } from "@/lib/ai/settings";
import { logCause } from "@/lib/errors/apiError";
import { inboundHealth, type InboundCounts } from "@/lib/whatsapp/health";
import { processingMode } from "@/lib/whatsapp/processing";

export const dynamic = "force-dynamic";

const PROVIDER = "chatbots_africa";
const DENIED = { 401: { error: "Please sign in again." }, 403: { error: "Only admins and owners can see WhatsApp health." } };
const FAIL = { error: "We couldn't load WhatsApp health. Please refresh and try again." };

// inbound_events is not in the generated types until the migration is applied.
const db = supabaseAdmin as any;

export async function GET() {
    const auth = await requireAiAdmin();
    if ("status" in auth) return NextResponse.json(DENIED[auth.status], { status: auth.status });
    try {
        const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const count = (q: any) => q.then((r: any) => { if (r.error) throw r.error; return r.count ?? 0; });
        const head = () => db.from("inbound_events").select("id", { count: "exact", head: true }).eq("provider", PROVIDER);
        const [settings, last, oldest, waiting, retrying, gaveUp7d, oversized7d] = await Promise.all([
            getAiSettings(),
            db.from("inbound_events").select("received_at").eq("provider", PROVIDER).order("received_at", { ascending: false }).limit(1),
            db.from("inbound_events").select("received_at").eq("provider", PROVIDER).is("processed_at", null).is("gave_up_at", null).order("received_at").limit(1),
            count(head().is("processed_at", null).is("gave_up_at", null)),
            count(head().is("processed_at", null).is("gave_up_at", null).gt("attempts", 0)),
            count(head().gte("gave_up_at", weekAgo)),
            count(head().gte("received_at", weekAgo).like("error", "body over%")),
        ]);
        if (last.error || oldest.error) throw last.error ?? oldest.error;
        const { mode, parserReady, switchOn } = processingMode(settings.whatsappEnabled, PROVIDER);
        const counts: InboundCounts = {
            mode, parserReady, switchOn,
            lastReceivedAt: last.data?.[0]?.received_at ?? null,
            waiting, oldestWaitingAt: oldest.data?.[0]?.received_at ?? null,
            retrying, gaveUp7d, oversized7d,
        };
        return NextResponse.json({ ...counts, health: inboundHealth(counts, new Date()) });
    } catch (e) {
        logCause("GEN-00", e, { route: "ai/whatsapp-health" });
        return NextResponse.json(FAIL, { status: 500 });
    }
}
