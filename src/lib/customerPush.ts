import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function initWebPush() {
    const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || "mailto:admin@misstokyo.shop";
    if (pub && priv) webpush.setVapidDetails(subj, pub, priv);
}

/**
 * Send a push notification to a specific customer identified by email or user_id.
 * Silently skips if VAPID keys are not configured or no subscriptions exist.
 */
export async function sendCustomerPush({
    email,
    userId,
    title,
    body,
    url = "/account/orders",
    tag = "order-status",
}: {
    email?: string;
    userId?: string;
    title: string;
    body: string;
    url?: string;
    tag?: string;
}): Promise<void> {
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (!email && !userId) return;

    initWebPush();

    let query = supabaseAdmin
        .from("customer_push_subscriptions")
        .select("endpoint, p256dh, auth")
        .limit(10);

    if (userId) {
        query = query.eq("user_id", userId);
    } else if (email) {
        query = query.eq("email", email);
    }

    const { data: subs } = await query;
    if (!subs?.length) return;

    const payload = JSON.stringify({ title, body, url, tag, icon: "/icons/icon-192.png" });

    await Promise.allSettled(
        subs.map(sub =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
            ).catch((err: any) => {
                if (err.statusCode === 410) {
                    supabaseAdmin.from("customer_push_subscriptions").delete().eq("endpoint", sub.endpoint);
                }
            }),
        ),
    );
}
