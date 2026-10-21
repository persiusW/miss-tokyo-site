// Every 5 minutes (vercel.json). Chatbots Africa never retries a callback, so
// this is the retry: stored WhatsApp events that failed are processed again
// while under 20 hours old, up to the attempt cap; older ones are given up.
// Does nothing while events are stored only (no parser yet, or
// whatsapp_enabled off). Then keeps copies of customer files not copied yet,
// and hands chats a person has held for 24 hours back to the assistant.
// First, whatever WhatsApp is doing: a text when today's AI spend reaches 80 %
// or 100 % of the daily cap (once each a day), and once an hour a look at the
// Chatbots Africa wallet (a text once a day while it is low).
import { NextResponse } from "next/server";
import { getAiSettings } from "@/lib/ai/settings";
import { apiError } from "@/lib/errors/apiError";
import { archiveMissing } from "@/lib/whatsapp/media";
import { autoResume } from "@/lib/whatsapp/teamWatch";
import { checkSpendAlerts } from "@/lib/ai/spendAlerts";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { checkWallet } from "@/lib/whatsapp/walletAlert";
import { isWalletCheckMinute } from "@/lib/whatsapp/walletAlertRules";
import { shopWhatsappNumber } from "@/lib/ai/shopAssistant/store";
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
        const alertTo = settings.alertNumber ?? settings.whatsappHandoffNumber ?? await shopWhatsappNumber(settings).catch(() => null);
        const spendAlerts = await checkSpendAlerts({ capGhs: settings.dailySpendCapGhs, to: alertTo });
        const wallet = settings.whatsappEnabled && isWalletCheckMinute(new Date())
            ? await checkWallet({ thresholdGhs: settings.walletAlertGhs, to: alertTo, balance: () => createChatbotsAfrica().balance() })
            : "skipped";
        const pipeline = await pipelineFor(PROVIDER, settings);
        if (!pipeline) return NextResponse.json({ ok: true, mode: "capture", spendAlerts, wallet });
        const result = await sweepInbound(pipeline, { limit: 25, budgetMs: 45_000 });
        if (result.gave_up || result.expired) console.warn("[cron/whatsapp-inbound-sweep] gave up on events", result);
        const mediaKept = await archiveMissing(pipeline.fetchMedia, { limit: 5, now: Date.now() })
            .catch(e => { console.error("[cron/whatsapp-inbound-sweep] media copies failed", { err: String(e) }); return 0; });
        const resumed = await autoResume()
            .catch(e => { console.error("[cron/whatsapp-inbound-sweep] auto-resume failed", { err: String(e) }); return 0; });
        return NextResponse.json({ ok: true, mode: "processing", ...result, mediaKept, resumed, spendAlerts, wallet });
    } catch (e) {
        console.error("[cron/whatsapp-inbound-sweep]", e);
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e });
    }
}
