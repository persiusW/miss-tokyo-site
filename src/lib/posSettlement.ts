// src/lib/posSettlement.ts
// The single place a POS session turns into a paid order.
//
// Two callers reach it:
//   1. the Paystack webhook, when the customer pays a link
//   2. /api/pos/send-link, when a gift card covers the basket in full and there
//      is nothing to charge — no Paystack round trip happens at all
//
// Both go through settlePosSession so a gift-card-funded sale is recorded,
// stocked, receipted and notified exactly like a paid one.

import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decrementDirect } from "@/lib/inventory";
import { sendSMS, injectSmsVars } from "@/lib/sms";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { buildShippingAddress } from "@/lib/geo";
import { ensureCustomerAccount, sendAdminPushNotifications, trackDiscountUsage } from "@/lib/orderSettlement";
import { releaseDiscountHolds } from "@/lib/discountValidation";

/** The only windows staff can choose, and the fallback when unset. */
export const POS_HOLD_OPTIONS = [15, 30, 45] as const;
export const DEFAULT_POS_HOLD_MINUTES = 15;

/**
 * How long a POS basket holds stock — and, necessarily, the number the customer
 * is told. One value drives the reservation TTL and the email/SMS copy, so the
 * two can never quote different windows.
 *
 * Anything outside POS_HOLD_OPTIONS is ignored in favour of the default, so a
 * stray DB value cannot leave stock held for an arbitrary stretch.
 */
export async function getPosHoldMinutes(): Promise<number> {
    const { data } = await supabaseAdmin
        .from("store_settings")
        .select("pos_hold_minutes")
        .eq("id", "default")
        .maybeSingle();

    const configured = Number(data?.pos_hold_minutes);
    return (POS_HOLD_OPTIONS as readonly number[]).includes(configured)
        ? configured
        : DEFAULT_POS_HOLD_MINUTES;
}

export type PosSettlementResult =
    | { settled: false; reason: "already_settled" }
    | { settled: true; orderId: string | null; orderRef: string | null };

/**
 * Claims a POS session and settles it: creates the order, releases the stock
 * hold, decrements inventory, redeems the discount, and sends the customer's
 * receipt plus the staff push.
 *
 * The claim is status-gated, so Paystack delivering both invoice.payment and
 * charge.success for one session settles it exactly once — the loser sees zero
 * rows and exits.
 */
export async function settlePosSession(
    posSessionId: string,
    opts: { paystackRef?: string | null; eventMeta?: Record<string, any>; logPrefix?: string } = {},
): Promise<PosSettlementResult> {
    const { paystackRef = null, eventMeta = {}, logPrefix = "[POS settle]" } = opts;

    const { data: posSession } = await supabaseAdmin
        .from("pos_sessions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", posSessionId)
        .neq("status", "paid")
        .neq("status", "cancelled")
        .select("*")
        .maybeSingle();

    if (!posSession) return { settled: false, reason: "already_settled" };

    const items: any[] = Array.isArray(posSession.items) ? posSession.items : [];

    // Staff-selected at the till; older sessions predate the column and were pickup-only
    const deliveryMethod: string = posSession.delivery_method === "delivery" ? "delivery" : "pickup";

    // Server-verified in send-link — the till never supplies a discount amount
    const posDiscountCode: string | null = posSession.discount_code ?? null;
    const posDiscountAmount = Number(posSession.discount_amount) || 0;
    const posDiscountTag: string | undefined = posSession.discount_tag ?? undefined;

    const { data: newOrder } = await supabaseAdmin
        .from("orders")
        .insert({
            customer_email: posSession.customer_email,
            customer_name: posSession.customer_name,
            customer_phone: posSession.customer_phone,
            // Canonical { text, country, region } — every reader looks for `text`
            shipping_address: buildShippingAddress(
                posSession.customer_address,
                posSession.customer_country,
                posSession.customer_region,
            ),
            items: posSession.items,
            total_amount: posSession.total_amount,
            discount_code: posDiscountCode,
            discount_amount: posDiscountAmount,
            status: "paid",
            payment_status: "paid",
            paystack_reference: paystackRef || posSession.paystack_reference,
            delivery_method: deliveryMethod,
            source: "pos",
            notes: posSession.notes,
            customer_id: posSession.contact_id,
        })
        .select("id")
        .single();

    await supabaseAdmin
        .from("pos_sessions")
        .update({ order_id: newOrder?.id ?? null })
        .eq("id", posSessionId);

    // Release the stock hold — the sale below makes it permanent
    await supabaseAdmin
        .from("pos_reservations")
        .delete()
        .eq("pos_session_id", posSessionId);

    if (items.length > 0) {
        const productIds = [...new Set(items.map((i: any) => i.productId).filter(Boolean))];
        const { data: products } = await supabaseAdmin
            .from("products")
            .select("id, inventory_count, track_inventory, track_variant_inventory")
            .in("id", productIds);
        const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

        await Promise.allSettled(items.map(async (item: any) => {
            const product = productMap.get(item.productId);
            if (!product || product.track_inventory === false) return;
            const qty = item.quantity ?? 1;

            if (product.track_variant_inventory && !item.variantId) {
                // send-link resolves this now; a session drafted before that fix
                // could still arrive here. Decrement product level and shout.
                console.error(`${logPrefix} variant unresolved — variant stock NOT decremented`, {
                    posSessionId, productId: item.productId, size: item.size, color: item.color,
                });
            }

            await decrementDirect(
                item.productId,
                product.track_variant_inventory ? (item.variantId ?? null) : null,
                qty,
                "pos settlement",
            );
        }));

        revalidateTag("products", "max");
    }

    if (!newOrder) {
        console.error(`${logPrefix} order insert failed — skipping confirmation`, { posSessionId });
        return { settled: true, orderId: null, orderRef: null };
    }

    // ── Confirmation: same email / SMS / admin push a storefront order gets ────
    const orderRef = newOrder.id.substring(0, 8).toUpperCase();
    const amountGHS = Number(posSession.total_amount) || 0;
    const firstName = (posSession.customer_name || "").split(" ")[0] || "there";

    const [{ data: biz }, { data: pickupSettings }, { data: smsTpl }] = await Promise.all([
        supabaseAdmin.from("business_settings").select("business_name, address, contact").eq("id", "default").maybeSingle(),
        supabaseAdmin.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").maybeSingle(),
        supabaseAdmin.from("communication_templates").select("body_text, greeting").eq("channel", "sms").eq("event_type", "order_confirmed").maybeSingle(),
    ]);

    const bizName = biz?.business_name || "Miss Tokyo";
    const isPickup = deliveryMethod === "pickup" && (pickupSettings?.pickup_enabled ?? true);
    const pickupMeta = isPickup ? {
        isPickup: true,
        pickupInstructions: pickupSettings?.pickup_instructions || "",
        pickupAddress: pickupSettings?.pickup_address || biz?.address || "",
        pickupPhone: pickupSettings?.pickup_contact_phone || biz?.contact || "",
        pickupWait: pickupSettings?.pickup_estimated_wait || "24 hours",
    } : {};

    // Link/create the customer's account so the order shows up under /account
    let setupLink: string | undefined;
    let isFirstTimeBuyer = false;
    if (posSession.customer_email) {
        const account = await ensureCustomerAccount(posSession.customer_email, posSession.customer_name);
        if (account.userId) {
            setupLink = account.setupLink;
            isFirstTimeBuyer = account.isNewUser;
        }
    }

    const smsMessage = (() => {
        const vars: Record<string, string> = {
            order_id: orderRef,
            customer_name: firstName,
            amount: `GH₵ ${amountGHS.toFixed(2)}`,
            rider_name: "",
            rider_phone: "",
        };
        if (smsTpl?.body_text) {
            const greeting = smsTpl.greeting ? injectSmsVars(smsTpl.greeting, vars) + " " : "";
            return greeting + injectSmsVars(smsTpl.body_text, vars);
        }
        return isFirstTimeBuyer
            ? `Hi ${firstName}, your ${bizName} order #${orderRef} is confirmed! Check your email for your receipt and to set up your account. Thank you!`
            : `Hi ${firstName}, your ${bizName} order #${orderRef} is confirmed! Check your email for the full receipt. Thank you!`;
    })();

    const [emailResult, smsResult, pushResult, discountResult] = await Promise.allSettled([
        sendOrderConfirmation({
            customerEmail: posSession.customer_email,
            orderRef,
            amount: amountGHS,
            bizName,
            bizAddress: biz?.address || "",
            items,
            feeAmount: Number(eventMeta?.platform_fee_amount) || undefined,
            feeLabel: eventMeta?.platform_fee_label || undefined,
            setupLink,
            isFirstTimeBuyer,
            discountCode: posDiscountCode || undefined,
            discountAmount: posDiscountAmount > 0 ? posDiscountAmount : undefined,
            ...pickupMeta,
        }),
        posSession.customer_phone
            ? sendSMS({ to: posSession.customer_phone, message: smsMessage })
            : Promise.resolve(),
        sendAdminPushNotifications(
            "New Order Received!",
            `POS order #${orderRef} for GH₵ ${amountGHS.toFixed(2)} from ${posSession.customer_name || posSession.customer_email} has been paid.`,
        ),
        // Redeem the coupon / debit the gift card. Safe unguarded: the
        // status-gated claim above means only one caller reaches this line.
        // Write the ledger, then drop the hold — the value is now spent, not reserved
        trackDiscountUsage(posDiscountCode || undefined, posDiscountTag, posDiscountAmount, newOrder.id)
            .then(() => releaseDiscountHolds({ posSessionId })),
    ]);

    if (emailResult.status === "rejected") console.error(`${logPrefix} sendOrderConfirmation failed:`, emailResult.reason);
    if (smsResult.status === "rejected") {
        console.error(`${logPrefix} sendSMS failed:`, smsResult.reason);
    } else if (!posSession.customer_phone) {
        console.warn(`${logPrefix} no customer phone on session — confirmation SMS skipped`, { posSessionId });
    } else {
        // sendSMS resolves with { ok: false } on an mNotify failure instead of throwing
        const sms = smsResult.value as { ok: boolean; error?: string } | undefined;
        if (sms && !sms.ok) console.error(`${logPrefix} sendSMS not delivered:`, sms.error);
    }
    if (pushResult.status === "rejected") console.error(`${logPrefix} adminPush failed:`, pushResult.reason);
    if (discountResult.status === "rejected") console.error(`${logPrefix} trackDiscountUsage failed:`, discountResult.reason);

    return { settled: true, orderId: newOrder.id, orderRef };
}
