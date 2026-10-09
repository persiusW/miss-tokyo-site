// What the shop sent a customer: SMS and email, from notification_log.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { err, last9, ok, str, type ToolDef } from "./shared";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";

export const messageTools: ToolDef[] = [
    {
        def: {
            name: "customer_messages",
            description: "The SMS and emails the shop has sent to a phone number or email address (newest first): what kind of message, when, whether it was delivered to the provider, and the text. Logging started on 2026-10-09; older messages are not recorded.",
            input_schema: {
                type: "object",
                properties: {
                    phone: { type: "string" },
                    email: { type: "string" },
                    limit: { type: "integer", minimum: 1, maximum: 20 },
                },
            },
        },
        async run(input) {
            const phone = input?.phone ? last9(input.phone) : null;
            const email = str(input?.email, 160).toLowerCase();
            if (!phone && !email) return err("Give a phone number or an email address.");
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err("That does not look like an email address.");
            const keys = [phone, email].filter(Boolean) as string[];
            const { data, error } = await supabaseAdmin
                .from("notification_log")
                .select("channel, event, subject, body, status, error_code, created_at")
                .in("recipient_key", keys)
                .order("created_at", { ascending: false })
                .limit(Number.isInteger(input?.limit) ? Math.min(Math.max(input.limit, 1), 20) : 10);
            if (error) throw error;
            return ok({
                messages: (data ?? []).map((m: any) => ({
                    channel: m.channel,
                    kind: m.event ?? "message",
                    sent_at: m.created_at,
                    delivered_to_provider: m.status === "sent",
                    ...(m.status === "failed" ? { failure: m.error_code } : {}),
                    subject: m.subject,
                    text: redactText(String(m.body ?? "")).slice(0, 600),
                })),
                note: "Recorded from 2026-10-09 onwards. 'Delivered to provider' means mNotify or Resend accepted it, not that the customer read it.",
            });
        },
    },
];
