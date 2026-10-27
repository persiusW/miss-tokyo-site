// The hourly wallet check: a text once a day while the Chatbots Africa wallet
// is below the alert level. Logged in notification_log, which is also the
// once-a-day check. Never throws.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { startOfTodayUtc } from "@/lib/ai/spend";
import type { BalanceResult } from "@/lib/messaging/provider";
import { sendSMS } from "@/lib/sms";
import { walletAlertText, walletIsLow } from "./walletAlertRules";

const EVENT = "wa_wallet_low";

export async function checkWallet(a: {
    thresholdGhs: number; to: string | null; balance: () => Promise<BalanceResult>;
    /** Also on WhatsApp (the team_wallet_low template), best effort. */
    alsoWhatsApp?: (balance: number, thresholdGhs: number) => Promise<unknown>;
}): Promise<"sent" | "ok" | "skipped"> {
    try {
        if (!a.to || !(a.thresholdGhs > 0)) return "skipped";
        const r = await a.balance();
        if (!r.ok || !walletIsLow(r.balance, a.thresholdGhs)) return r.ok ? "ok" : "skipped";
        const { data, error } = await supabaseAdmin.from("notification_log").select("id")
            .eq("event", EVENT).gte("created_at", startOfTodayUtc()).limit(1);
        if (error || (data ?? []).length > 0) return "skipped";
        await sendSMS({ to: a.to, message: walletAlertText(r.balance!, a.thresholdGhs) }, { event: EVENT });
        await a.alsoWhatsApp?.(r.balance!, a.thresholdGhs).catch(() => undefined);
        return "sent";
    } catch (e) {
        console.error("[whatsapp] wallet check failed", { err: String(e) });
        return "skipped";
    }
}
