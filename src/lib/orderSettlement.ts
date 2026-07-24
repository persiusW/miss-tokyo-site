// src/lib/orderSettlement.ts
// Shared settlement helpers. These were private to the Paystack webhook until a
// second settlement entry point appeared (a POS basket covered in full by a gift
// card, which never reaches Paystack), so they live here to keep exactly one
// implementation of each.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import webpush from "web-push";

// ── Admin web push ────────────────────────────────────────────────────────────

function initWebPush() {
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || "mailto:admin@misstokyo.shop";
    if (pub && priv) webpush.setVapidDetails(subj, pub, priv);
}

export async function sendAdminPushNotifications(title: string, body: string, url = "/sales/orders") {
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    initWebPush();

    const { data: subs } = await supabaseAdmin
        .from("admin_push_subscriptions")
        .select("endpoint, p256dh, auth")
        .limit(50);

    if (!subs?.length) return;

    const payload = JSON.stringify({ title, body, url, icon: "/favicon-96x96.png" });

    await Promise.allSettled(
        subs.map(sub =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
            ).catch(err => {
                // Remove stale subscriptions (410 Gone)
                if (err.statusCode === 410) {
                    supabaseAdmin.from("admin_push_subscriptions").delete().eq("endpoint", sub.endpoint);
                }
            }),
        ),
    );
}

// ── Customer account ──────────────────────────────────────────────────────────

/**
 * Ensures a Supabase auth user exists for customerEmail.
 * Returns userId + setupLink (only when a NEW user is created = first-time buyer).
 */
export async function ensureCustomerAccount(
    customerEmail: string,
    fullName?: string | null,
): Promise<{ userId: string; setupLink?: string; isNewUser: boolean }> {
    // O(1) lookup via indexed profiles.email — avoids listUsers() full-table scan
    const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", customerEmail)
        .maybeSingle();

    if (existingProfile) {
        if (fullName) {
            await supabaseAdmin
                .from("profiles")
                .upsert({ id: existingProfile.id, full_name: fullName }, { onConflict: "id" });
        }
        return { userId: existingProfile.id, isNewUser: false };
    }

    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true,
    });

    if (error || !newUser?.user) {
        console.error("[settlement] Failed to create auth user:", error);
        return { userId: "", isNewUser: false };
    }

    const userId = newUser.user.id;
    await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, email: customerEmail, full_name: fullName || null }, { onConflict: "id" });

    let setupLink: string | undefined;
    try {
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: customerEmail,
            options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop"}/account` },
        });
        setupLink = (linkData as any)?.properties?.action_link || undefined;
    } catch {
        // Non-fatal
    }

    return { userId, setupLink, isNewUser: true };
}

// ── Discount redemption ───────────────────────────────────────────────────────

/**
 * Writes the discount ledger for a settled order.
 *
 * Both branches use a conditional DB function so the check and the write happen
 * in one statement: a coupon cannot pass its usage_limit and a gift card cannot
 * be overdrawn, even when two orders settle simultaneously. What neither can
 * undo is the customer already having been quoted the discount — an unfundable
 * redemption is logged loudly for reconciliation.
 */
export async function trackDiscountUsage(
    discountCode: string | undefined,
    discountTag: string | undefined,
    discountAmount: number,
    orderId?: string,
) {
    if (!discountCode) return;
    const code = discountCode.trim().toUpperCase();

    if (discountTag === "coupon" || !discountTag) {
        const { data: coupon } = await supabaseAdmin
            .from("coupons")
            .select("id, used_count")
            .ilike("code", code)
            .maybeSingle();
        if (coupon) {
            const { data: claimed, error: rpcErr } = await supabaseAdmin
                .rpc("fn_claim_coupon_use", { p_coupon_id: coupon.id });

            if (rpcErr) {
                console.error("[settlement] fn_claim_coupon_use failed:", rpcErr.message, { code });
            } else if (claimed === false) {
                console.error("[settlement] coupon over-redeemed: limit already reached at settlement", { code, orderId });
            }
            return;
        }
    }

    if (discountTag === "gift_card" || !discountTag) {
        const { data: card } = await supabaseAdmin
            .from("gift_cards")
            .select("id, remaining_value")
            .ilike("code", code)
            .maybeSingle();
        if (card) {
            const balanceBefore = Number(card.remaining_value);
            const requested = Math.min(balanceBefore, discountAmount > 0 ? discountAmount : balanceBefore);

            const { data: debited, error: redeemErr } = await supabaseAdmin
                .rpc("fn_redeem_gift_card", { p_card_id: card.id, p_amount: requested });

            const amountUsed = Number(debited) || 0;

            if (redeemErr) {
                console.error("[settlement] fn_redeem_gift_card failed:", redeemErr.message, { code });
                return;
            }
            if (amountUsed <= 0) {
                console.error("[settlement] gift card could not fund this order — balance already spent", {
                    code, orderId, requested, balanceBefore,
                });
                return;
            }

            await supabaseAdmin.from("gift_card_redemptions").insert({
                gift_card_id: card.id,
                order_id: orderId || null,
                amount_used: amountUsed,
                balance_before: balanceBefore,
                balance_after: parseFloat(Math.max(0, balanceBefore - amountUsed).toFixed(2)),
                redeemed_by: null,
            });
        }
    }
}
