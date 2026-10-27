// A text to the shop when today's AI spend reaches 80 % and 100 % of the
// daily cap, once each per day (the shop's day is the UTC day). At 100 % the
// shop assistant and WhatsApp replies stop until midnight, so someone should
// know before customers notice. Checked by the 5-minute WhatsApp sweep.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { startOfTodayUtc, todaySpendUsd } from "@/lib/ai/spend";
import { spendAlertText, spendLevel, type SpendLevel } from "@/lib/ai/spendAlertRules";
import { sendSMS } from "@/lib/sms";

/** Sends what is due. Returns the levels sent. Never throws. */
export async function checkSpendAlerts(a: {
    capGhs: number; to: string | null;
    /** Also on WhatsApp (the team_ai_budget template), best effort. */
    alsoWhatsApp?: (level: 80 | 100, spentUsd: number) => Promise<unknown>;
}): Promise<SpendLevel[]> {
    try {
        if (!a.to) return [];
        const spent = await todaySpendUsd();
        if (spent === null) return [];
        const level = spendLevel(spent, a.capGhs);
        const sent: SpendLevel[] = [];
        for (const l of [80, 100] as const) {
            if (level < l) continue;
            const event = `ai_spend_${l}`;
            // Once a day: an alert for this level already logged today (sent or failed) is not repeated.
            const { data, error } = await supabaseAdmin.from("notification_log").select("id")
                .eq("event", event).gte("created_at", startOfTodayUtc()).limit(1);
            if (error || (data ?? []).length > 0) continue;
            await sendSMS({ to: a.to, message: spendAlertText(l, spent, a.capGhs) }, { event });
            await a.alsoWhatsApp?.(l, spent).catch(() => undefined);
            sent.push(l);
        }
        return sent;
    } catch (e) {
        console.error("[ai/spend-alerts] check failed", { err: String(e) });
        return [];
    }
}
