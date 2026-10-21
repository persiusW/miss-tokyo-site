// Every 5 minutes (vercel.json). Chatbots Africa never retries a callback, so
// this is the retry: stored WhatsApp events that failed are processed again
// while under 20 hours old, up to the attempt cap; older ones are given up.
// Does nothing while events are stored only (no parser yet, or
// whatsapp_enabled off). Then keeps copies of customer files not copied yet.
import { NextResponse } from "next/server";
import { getAiSettings } from "@/lib/ai/settings";
import { apiError } from "@/lib/errors/apiError";
import { archiveMissing } from "@/lib/whatsapp/media";
import { sweepInbound } from "@/lib/whatsapp/pipeline";
import { pipelineFor } from "@/lib/whatsapp/processing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROVIDER = "chatbots_africa";

export async function GET(req: Request) {
    if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const settings = await getAiSettings();
        const pipeline = await pipelineFor(PROVIDER, settings);
        if (!pipeline) return NextResponse.json({ ok: true, mode: "capture" });
        const result = await sweepInbound(pipeline, { limit: 25, budgetMs: 45_000 });
        if (result.gave_up || result.expired) console.warn("[cron/whatsapp-inbound-sweep] gave up on events", result);
        const mediaKept = await archiveMissing(pipeline.fetchMedia, { limit: 5, now: Date.now() })
            .catch(e => { console.error("[cron/whatsapp-inbound-sweep] media copies failed", { err: String(e) }); return 0; });
        return NextResponse.json({ ok: true, mode: "processing", ...result, mediaKept });
    } catch (e) {
        console.error("[cron/whatsapp-inbound-sweep]", e);
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e });
    }
}
