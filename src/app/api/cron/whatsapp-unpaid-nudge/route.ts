// Every 10 minutes (vercel.json): one WhatsApp reminder for orders placed in
// a WhatsApp chat and still unpaid 30 to 60 minutes later. Does nothing unless
// whatsapp_enabled and whatsapp_unpaid_nudge_enabled are both on.
import { NextResponse } from "next/server";
import { getAiSettings } from "@/lib/ai/settings";
import { apiError } from "@/lib/errors/apiError";
import { runUnpaidNudges } from "@/lib/whatsapp/unpaidNudge";
import { liveNudgeDeps } from "@/lib/whatsapp/unpaidNudgeLive";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
    if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const settings = await getAiSettings();
        if (!settings.whatsappEnabled || !settings.whatsappUnpaidNudge) return NextResponse.json({ ok: true, mode: "off" });
        const counts = await runUnpaidNudges(liveNudgeDeps(settings.whatsappTemplateIds.order_not_paid ?? null));
        if (counts.failed) console.warn("[cron/whatsapp-unpaid-nudge] some reminders failed", counts);
        return NextResponse.json({ ok: true, ...counts });
    } catch (e) {
        console.error("[cron/whatsapp-unpaid-nudge]", e);
        return apiError("GEN-00", { status: 500, audience: "staff", cause: e });
    }
}
