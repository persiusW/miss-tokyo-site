// Hourly (vercel.json): back-in-stock alerts on WhatsApp for pieces customers
// asked the assistant about. Does nothing unless whatsapp_enabled and
// whatsapp_restock_alerts_enabled are both on.
import { NextResponse } from "next/server";
import { getAiSettings } from "@/lib/ai/settings";
import { apiError } from "@/lib/errors/apiError";
import { siteBaseUrl } from "@/lib/whatsapp/processing";
import { runRestockAlerts } from "@/lib/whatsapp/restock";
import { liveRestockDeps } from "@/lib/whatsapp/restockLive";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
    if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const settings = await getAiSettings();
        if (!settings.whatsappEnabled || !settings.whatsappRestockAlerts) return NextResponse.json({ ok: true, mode: "off" });
        const counts = await runRestockAlerts(liveRestockDeps(settings, siteBaseUrl()));
        if (counts.failed) console.warn("[cron/whatsapp-restock-alerts] some alerts failed", counts);
        return NextResponse.json({ ok: true, ...counts });
    } catch (e) {
        console.error("[cron/whatsapp-restock-alerts]", e);
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e });
    }
}
