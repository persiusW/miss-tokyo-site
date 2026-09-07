export const maxDuration = 60; // 1 minute — safe window for Paystack webhook processing

import { NextResponse } from "next/server";
import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { confirmSale, fallbackDecrementFromItems, decrementDirect } from "@/lib/inventory";
import { isReclaimableCancellation } from "@/lib/reclaimCancelled";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSMSLogged, injectSmsVars } from "@/lib/sms";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { activateAndDeliverGiftCard } from "@/lib/giftCardDelivery";
import { ensureCustomerAccount, sendAdminPushNotifications, trackDiscountUsage } from "@/lib/orderSettlement";
import { releaseDiscountHolds } from "@/lib/discountValidation";
import { settlePosSession } from "@/lib/posSettlement";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";


// ── Helpers ────────────────────────────────────────────────────────────────────

function parseItems(cartItems: unknown): any[] {
    if (!cartItems) return [];
    try {
        return typeof cartItems === "string" ? JSON.parse(cartItems) : (cartItems as any[]);
    } catch {
        return [];
    }
}

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-paystack-signature");

        if (!PAYSTACK_SECRET) {
            console.warn("No Paystack secret configured. Webhook skipped.");
            return NextResponse.json({ status: "skipped" });
        }

        const hash = crypto
            .createHmac("sha512", PAYSTACK_SECRET)
            .update(rawBody)
            .digest("hex");

        if (hash !== signature) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const event = JSON.parse(rawBody);

        // ── POS: invoice.payment handler ──────────────────────────────────
        if (event.event === "invoice.payment") {
            const meta = event.data?.metadata ?? {};

            // Only handle POS payments — ignore standard invoice payments (source='invoice')
            if (meta?.source !== "pos" || !meta?.pos_session_id) {
                return NextResponse.json({ received: true });
            }

            await settlePosSession(meta.pos_session_id, { eventMeta: meta, logPrefix: '[POS webhook]' });
            return NextResponse.json({ received: true });
        }
        // ── END POS handler ────────────────────────────────────────────────

        if (event.event === "charge.success") {
            const data = event.data;
            const paystackRef: string = data.reference || "";
            const metadata = data.metadata || {};

            // ── Gift card purchase: activate + deliver ─────────────────────────
            // Backstop for buyers who never return to /gift-cards/success (e.g.
            // mobile money → closed tab). Activation is claim-based, so this and
            // the success page can both run without double-sending emails.
            if (metadata.type === "gift_card" && metadata.gift_card_id) {
                await activateAndDeliverGiftCard(metadata, Number(data.amount));
                return NextResponse.json({ received: true });
            }

            // ── POS: charge.success from transaction/initialize ────────────────
            if (metadata.source === "pos" && metadata.pos_session_id) {
                await settlePosSession(metadata.pos_session_id, { paystackRef, eventMeta: metadata, logPrefix: '[POS webhook]' });
                return NextResponse.json({ received: true });
            }
            // ── END POS charge.success handler ─────────────────────────────────

            const {
                orderId, requestId, productId, fullName, phone, address, country, region,
                whatsapp, instagram, snapchat, deliveryMethod, cartItems,
                platform_fee_amount, platform_fee_label,
                delivery_fee, delivery_label,
                discount_code, discount_amount, discount_tag,
                auto_discount_ids,
            } = metadata;

            // ── Idempotency Check ─────────────────────────────────────────────
            // Verify if this transaction has already been processed to prevent double inventory/logic
            let isAlreadyProcessed = false;
            let emailAlreadySent = false;
            // True when this order was cancelled by the sync cron and Paystack
            // has now confirmed the payment, so the update below may claim it.
            let claimableFromCancelled = false;
            // Items fetched from DB — avoids relying on cartItems in Paystack metadata
            // (large carts hit Paystack's metadata size limit).
            let orderItemsFromDB: any[] = [];

            if (orderId) {
                const { data: existingOrder } = await supabaseAdmin
                    .from("orders")
                    .select("status, payment_status, paystack_reference, customer_metadata, items")
                    .eq("id", orderId)
                    .single();

                // An order this system cancelled on its own, that Paystack now
                // confirms was paid, is reclaimable.
                //
                // The /30 sync job cancels on an unpaid verdict, and Paystack
                // reports "abandoned" for a payment merely still in progress.
                // When the customer then finishes, charge.success used to match
                // nothing — the money landed against a cancelled order in total
                // silence. Paystack saying the money moved is the authority
                // here; a local guess made minutes earlier is not.
                //
                // Only cancellations the cron stamped are reclaimable. A person
                // cancelling a paid order is a deliberate act, often followed by
                // a refund, and a retried webhook must never quietly undo it.
                const autoCancelled = isReclaimableCancellation(existingOrder);

                if (autoCancelled) {
                    console.warn(
                        `[webhook] Order ${orderId} was auto-cancelled but Paystack confirms payment — reclaiming it.`,
                    );
                }

                // Use payment_status for idempotency — NOT order.status.
                // "processing" means the verify route atomically claimed the order and is
                // currently decrementing stock — treat as already processed.
                // An auto-cancelled order released its stock, so it needs taking again.
                if (existingOrder && !["pending"].includes(existingOrder.payment_status) && !autoCancelled) {
                    console.log(`[webhook] Order ${orderId} already processed (payment_status=${existingOrder.payment_status}). Skipping inventory deductions.`);
                    isAlreadyProcessed = true;
                }
                claimableFromCancelled = autoCancelled;

                if (existingOrder && (existingOrder.customer_metadata as any)?.webhook_email_sent) {
                    emailAlreadySent = true;
                }

                if (existingOrder?.items && Array.isArray(existingOrder.items)) {
                    orderItemsFromDB = existingOrder.items;
                }
            } else if (paystackRef) {
                const { data: existingOrder } = await supabaseAdmin
                    .from("orders")
                    .select("id, customer_metadata")
                    .eq("paystack_reference", paystackRef)
                    .maybeSingle();

                if (existingOrder) {
                    console.log(`[webhook] Reference ${paystackRef} already exists in DB. Skipping inventory deductions but will trigger email.`);
                    isAlreadyProcessed = true;
                }
                
                if (existingOrder && (existingOrder.customer_metadata as any)?.webhook_email_sent) {
                    emailAlreadySent = true;
                }
            }
            // ─────────────────────────────────────────────────────────────────

            console.log("Paystack Charge Success Event Received");
            const customerEmail: string = data.customer?.email || "";
            const amountGHS = Number(data.amount) / 100;
            // paystackRef is already declared above

            const [{ data: biz }, { data: pickupSettings }] = await Promise.all([
                supabaseAdmin.from("business_settings").select("business_name, address, contact").eq("id", "default").single(),
                supabaseAdmin.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").single(),
            ]);

            const bizName = biz?.business_name || "Miss Tokyo";
            const bizAddress = biz?.address || "";
            const isPickupOrder = (deliveryMethod as string | undefined)?.toLowerCase().includes("pickup") ?? false;
            const pickupEnabled = pickupSettings?.pickup_enabled ?? true;
            const pickupMeta = isPickupOrder && pickupEnabled ? {
                isPickup: true,
                pickupInstructions: pickupSettings?.pickup_instructions || "",
                pickupAddress: pickupSettings?.pickup_address || biz?.address || "",
                pickupPhone: pickupSettings?.pickup_contact_phone || biz?.contact || "",
                pickupWait: pickupSettings?.pickup_estimated_wait || "24 hours",
            } : {};

            // Fetch SMS template for order_confirmed (used below for both order paths)
            const { data: smsTpl } = await supabaseAdmin
                .from("communication_templates")
                .select("body_text, greeting")
                .eq("channel", "sms")
                .eq("event_type", "order_confirmed")
                .single();

            function buildOrderSms(orderRef: string, firstName: string, isNew: boolean): string {
                const vars: Record<string, string> = {
                    order_id:      orderRef,
                    customer_name: firstName,
                    amount:        `GH₵ ${amountGHS.toFixed(2)}`,
                    rider_name:    "",
                    rider_phone:   "",
                };
                if (smsTpl?.body_text) {
                    const greeting = smsTpl.greeting ? injectSmsVars(smsTpl.greeting, vars) + " " : "";
                    return greeting + injectSmsVars(smsTpl.body_text, vars);
                }
                // Default fallback
                return isNew
                    ? `Hi ${firstName}, your ${bizName} order #${orderRef} is confirmed! Check your email for your receipt and to set up your account. Thank you!`
                    : `Hi ${firstName}, your ${bizName} order #${orderRef} is confirmed! Check your email for the full receipt. Thank you!`;
            }

            if (requestId) {
                await supabaseAdmin
                    .from("custom_requests")
                    .update({ status: "confirmed" })
                    .eq("id", requestId);
            }

            // Prefer items from the DB order record; fall back to metadata cartItems
            // for backward compat with any in-flight webhooks from the old code.
            const parsedItems = parseItems(cartItems).length > 0
                ? parseItems(cartItems)
                : orderItemsFromDB;

            // Confirm sale: convert reservation → permanent inventory deduction.
            // confirmSale() reads online_reservations, decrements inventory_count,
            // then deletes the reservation. Falls through gracefully for orders
            // created before the reservation system was deployed.
            if (!isAlreadyProcessed) {
                let stockDecremented = false;

                if (orderId) {
                    stockDecremented = await confirmSale(orderId);

                    // Fallback: no reservation row (order predates reservation system or
                    // reservation was never created). Decrement via the inventory lib's
                    // sanctioned fallback path (keeps inventory writes in one place).
                    if (!stockDecremented && orderItemsFromDB.length > 0) {
                        await fallbackDecrementFromItems(orderId, orderItemsFromDB);
                        console.log(`[webhook] fallback stock decrement applied for order ${orderId} (no reservation row)`);
                    }
                } else if (productId) {
                    // Legacy single-product path (no orderId in metadata).
                    // Goes through the inventory lib so the decrement is atomic.
                    const { data: product } = await supabaseAdmin
                        .from("products")
                        .select("track_inventory")
                        .eq("id", productId)
                        .single();
                    if (product?.track_inventory !== false) {
                        await decrementDirect(productId, null, 1, "legacy single-product charge");
                    }
                }

                revalidateTag("products", "max");
            }

            // Auto-create/link customer account
            let customerId: string | undefined;
            let setupLink: string | undefined;
            let isFirstTimeBuyer = false;
            if (customerEmail) {
                const account = await ensureCustomerAccount(customerEmail, fullName);
                if (account.userId) {
                    customerId = account.userId;
                    setupLink = account.setupLink;
                    isFirstTimeBuyer = account.isNewUser;
                }
            }

            // Auto-archive any pay link matching this reference
            if (!isAlreadyProcessed && paystackRef) {
                await supabaseAdmin
                    .from("pay_links")
                    .update({ status: "archived" })
                    .eq("paystack_reference", paystackRef)
                    .eq("status", "active");
            }

            const confirmEmailOpts = {
                customerEmail,
                bizName,
                bizAddress,
                items: parsedItems,
                feeAmount: Number(platform_fee_amount) || undefined,
                feeLabel: platform_fee_label || undefined,
                deliveryFee: Number(delivery_fee) || undefined,
                deliveryLabel: delivery_label || undefined,
                setupLink,
                isFirstTimeBuyer,
                discountCode: discount_code || undefined,
                discountAmount: Number(discount_amount) || undefined,
                ...pickupMeta,
            };

            if (orderId) {
                                const { data: currentOrderData } = await supabaseAdmin.from("orders").select("customer_metadata").eq("id", orderId).single();
                const currentMeta = (currentOrderData?.customer_metadata as object) || {};

                // Idempotency guard: only update if payment still pending
                const { error } = await supabaseAdmin
                    .from("orders")
                    .update({
                        payment_status: "paid",
                        status: "paid",
                        paystack_reference: paystackRef,
                        customer_name: fullName || null,
                        customer_phone: phone || null,
                        shipping_address: address
                            ? { text: address, country: country || null, region: region || null }
                            : null,
                        delivery_method: deliveryMethod || null,
                        discount_code: discount_code || null,
                        discount_amount: Number(discount_amount) || 0,
                        customer_metadata: {
                            ...currentMeta,
                            whatsapp: whatsapp || null,
                            instagram: instagram || null,
                            snapchat: snapchat || null,
                            webhook_email_sent: true,
                            // Leave a trace that this order came back, and drop
                            // the marker so it is not reclaimable a second time.
                            ...(claimableFromCancelled
                                ? { reclaimed_from_auto_cancel_at: new Date().toISOString(), auto_cancelled_at: null }
                                : {}),
                        },
                        ...(customerId ? { customer_id: customerId } : {}),
                    })
                    .eq("id", orderId)
                    .in(
                        "payment_status",
                        // "processing" = verify claimed it but may have stalled.
                        // "cancelled" only when this system cancelled it itself.
                        claimableFromCancelled
                            ? ["pending", "processing", "cancelled"]
                            : ["pending", "processing"],
                    );

                if (error) {
                    console.error("Webhook: Failed to update order:", error);
                } else {
                    const orderRef = orderId.substring(0, 8).toUpperCase();
                    if (!emailAlreadySent) console.log('Webhook triggered email for order:', orderId);
                    
                    // Increment auto discount usage counts (non-fatal)
                    if (!isAlreadyProcessed && Array.isArray(auto_discount_ids) && auto_discount_ids.length > 0) {
                        try {
                            const { data: aRules } = await supabaseAdmin
                                .from("automatic_discounts")
                                .select("id, usage_count")
                                .in("id", auto_discount_ids as string[]);
                            if (aRules?.length) {
                                await Promise.allSettled(
                                    aRules.map(r =>
                                        supabaseAdmin
                                            .from("automatic_discounts")
                                            .update({ usage_count: (r.usage_count || 0) + 1 })
                                            .eq("id", r.id)
                                    )
                                );
                            }
                        } catch (e) {
                            console.warn("[webhook] auto discount usage increment failed:", e);
                        }
                    }

                    const [emailResult, , smsResult, pushResult] = await Promise.allSettled([
                        emailAlreadySent ? Promise.resolve() : sendOrderConfirmation({ ...confirmEmailOpts, orderRef, amount: amountGHS }),
                        isAlreadyProcessed ? Promise.resolve() : trackDiscountUsage(discount_code, discount_tag, Number(discount_amount) || 0, orderId)
                            .then(() => releaseDiscountHolds({ orderId })),
                        (emailAlreadySent || !phone) ? Promise.resolve() : sendSMSLogged("webhook:order-confirmed", {
                            to: phone,
                            message: buildOrderSms(orderRef, fullName?.split(" ")[0] || "there", isFirstTimeBuyer),
                        }),
                        isAlreadyProcessed ? Promise.resolve() : sendAdminPushNotifications(
                            "New Order Received!",
                            `Order #${orderRef} for GH₵ ${amountGHS.toFixed(2)} from ${fullName || customerEmail} has been paid.`,
                        ),
                    ]);
                    if (emailResult.status === "rejected") console.error("[webhook] sendOrderConfirmation failed:", emailResult.reason);
                    if (smsResult.status === "rejected") console.error("[webhook] sendSMS failed:", smsResult.reason);
                    if (pushResult.status === "rejected") console.error("[webhook] adminPush failed:", pushResult.reason);
                }
            } else if (customerEmail) {
                // Fallback: create order if none pre-created
                const { data: existing } = await supabaseAdmin
                    .from("orders")
                    .select("id, customer_metadata")
                    .eq("paystack_reference", paystackRef)
                    .single();

                if (!existing) {
                    const { data: newOrder, error } = await supabaseAdmin
                        .from("orders")
                        .insert([{
                            customer_email: customerEmail,
                            customer_name: fullName || null,
                            customer_phone: phone || null,
                            shipping_address: address
                                ? { text: address, country: country || null, region: region || null }
                                : null,
                            delivery_method: deliveryMethod || null,
                            total_amount: amountGHS,
                            status: "paid",
                            payment_status: "paid",
                            paystack_reference: paystackRef,
                            items: parsedItems,
                            discount_code: discount_code || null,
                            discount_amount: Number(discount_amount) || 0,
                            customer_metadata: {
                                whatsapp: whatsapp || null,
                                instagram: instagram || null,
                                snapchat: snapchat || null,
                                webhook_email_sent: true
                            },
                            ...(customerId ? { customer_id: customerId } : {}),
                        }])
                        .select("id")
                        .single();

                    if (error) {
                        console.error("Webhook: Failed to create order:", error);
                    } else if (newOrder) {
                        const orderRef = newOrder.id.substring(0, 8).toUpperCase();
                        console.log('Webhook triggered email for order:', newOrder.id);
                        const [emailResult, , smsResult, pushResult] = await Promise.allSettled([
                            sendOrderConfirmation({ ...confirmEmailOpts, orderRef, amount: amountGHS }),
                            isAlreadyProcessed ? Promise.resolve() : trackDiscountUsage(discount_code, discount_tag, Number(discount_amount) || 0, newOrder.id)
                                .then(() => releaseDiscountHolds({ orderId: newOrder.id })),
                            (!phone) ? Promise.resolve() : sendSMSLogged("webhook:order-confirmed-fallback", {
                                to: phone,
                                message: buildOrderSms(orderRef, fullName?.split(" ")[0] || "there", isFirstTimeBuyer),
                            }),
                            isAlreadyProcessed ? Promise.resolve() : sendAdminPushNotifications(
                                "New Order Received!",
                                `Order #${orderRef} for GH₵ ${amountGHS.toFixed(2)} from ${fullName || customerEmail} has been paid.`,
                            ),
                        ]);
                        if (emailResult.status === "rejected") console.error("[webhook] sendOrderConfirmation failed:", emailResult.reason);
                        if (smsResult.status === "rejected") console.error("[webhook] sendSMS failed:", smsResult.reason);
                        if (pushResult.status === "rejected") console.error("[webhook] adminPush failed:", pushResult.reason);
                    }
                }
            }
        }

        return NextResponse.json({ status: "success" });
    } catch (err) {
        console.error("Webhook Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
