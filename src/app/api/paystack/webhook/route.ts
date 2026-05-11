export const maxDuration = 60; // 1 minute — safe window for Paystack webhook processing

import { NextResponse } from "next/server";
import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { confirmSale } from "@/lib/inventory";
import { normAttr } from "@/lib/utils/normAttr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSMS, injectSmsVars } from "@/lib/sms";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import webpush from "web-push";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";


// ── Web Push ───────────────────────────────────────────────────────────────────

function initWebPush() {
    const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || "mailto:admin@misstokyo.shop";
    if (pub && priv) webpush.setVapidDetails(subj, pub, priv);
}

async function sendAdminPushNotifications(title: string, body: string, url = "/sales/orders") {
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseItems(cartItems: unknown): any[] {
    if (!cartItems) return [];
    try {
        return typeof cartItems === "string" ? JSON.parse(cartItems) : (cartItems as any[]);
    } catch {
        return [];
    }
}

/**
 * Ensures a Supabase auth user exists for customerEmail.
 * Returns userId + setupLink (only when a NEW user is created = first-time buyer).
 */
async function ensureCustomerAccount(
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
        console.error("[webhook] Failed to create auth user:", error);
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

async function trackDiscountUsage(
    discountCode: string | undefined,
    discountTag: string | undefined,
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
            await supabaseAdmin
                .from("coupons")
                .update({ used_count: (coupon.used_count || 0) + 1 })
                .eq("id", coupon.id);
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
            // Use the server-validated redemption record — do not trust metadata discount_amount
            const { data: redemption } = await supabaseAdmin
                .from("gift_card_redemptions")
                .select("amount_used")
                .eq("gift_card_id", card.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            const validatedAmount = redemption
                ? Number(redemption.amount_used)
                : Number(card.remaining_value); // fallback: full remaining balance

            const newBalance = Math.max(0, Number(card.remaining_value) - validatedAmount);
            await supabaseAdmin
                .from("gift_cards")
                .update({
                    remaining_value: newBalance,
                    ...(newBalance === 0 ? { is_active: false } : {}),
                })
                .eq("id", card.id);
        }
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

            const posSessionId: string = meta.pos_session_id;

            // Fetch session (idempotency: skip if already paid)
            const { data: posSession } = await supabaseAdmin
                .from("pos_sessions")
                .select("*")
                .eq("id", posSessionId)
                .single();

            if (!posSession || posSession.status === "paid") {
                return NextResponse.json({ received: true });
            }

            const items: any[] = Array.isArray(posSession.items) ? posSession.items : [];

            // Create the real order
            const { data: newOrder } = await supabaseAdmin
                .from("orders")
                .insert({
                    customer_email: posSession.customer_email,
                    customer_name: posSession.customer_name,
                    customer_phone: posSession.customer_phone,
                    shipping_address: posSession.customer_address
                        ? { address: posSession.customer_address }
                        : null,
                    items: posSession.items,
                    total_amount: posSession.total_amount,
                    discount_amount: 0,
                    status: "paid",
                    payment_status: "paid",
                    paystack_reference: posSession.paystack_reference,
                    delivery_method: "pickup",
                    source: "pos",
                    notes: posSession.notes,
                    customer_id: posSession.contact_id,
                })
                .select("id")
                .single();

            // Update session
            await supabaseAdmin
                .from("pos_sessions")
                .update({
                    status: "paid",
                    paid_at: new Date().toISOString(),
                    order_id: newOrder?.id ?? null,
                })
                .eq("id", posSessionId);

            // Release inventory reservations
            await supabaseAdmin
                .from("pos_reservations")
                .delete()
                .eq("pos_session_id", posSessionId);

            // Decrement inventory from pos_session.items (not Paystack metadata)
            // POS items carry variantId as a UUID directly — do NOT use size/color key lookup
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
                    if (product.track_variant_inventory && item.variantId) {
                        // Deduct variant stock
                        const { data: variant } = await supabaseAdmin
                            .from("product_variants")
                            .select("inventory_count")
                            .eq("id", item.variantId)
                            .single();
                        if (variant && typeof variant.inventory_count === "number") {
                            await supabaseAdmin
                                .from("product_variants")
                                .update({ inventory_count: Math.max(0, variant.inventory_count - qty) })
                                .eq("id", item.variantId);
                        }
                        // Also deduct product-level stock
                        if (typeof product.inventory_count === "number") {
                            await supabaseAdmin
                                .from("products")
                                .update({ inventory_count: Math.max(0, product.inventory_count - qty) })
                                .eq("id", item.productId);
                        }
                    } else if (!product.track_variant_inventory && typeof product.inventory_count === "number") {
                        await supabaseAdmin
                            .from("products")
                            .update({ inventory_count: Math.max(0, product.inventory_count - qty) })
                            .eq("id", item.productId);
                    } else {
                        console.warn("[POS webhook] inventory skip: track_variant_inventory=true but variantId missing", { productId: item.productId });
                    }
                }));
            }

            return NextResponse.json({ received: true });
        }
        // ── END POS handler ────────────────────────────────────────────────

        if (event.event === "charge.success") {
            const data = event.data;
            const paystackRef: string = data.reference || "";
            const metadata = data.metadata || {};

            // ── POS: charge.success from transaction/initialize ────────────────
            if (metadata.source === "pos" && metadata.pos_session_id) {
                const posSessionId: string = metadata.pos_session_id;

                const { data: posSession } = await supabaseAdmin
                    .from("pos_sessions")
                    .select("*")
                    .eq("id", posSessionId)
                    .single();

                if (!posSession || posSession.status === "paid") {
                    return NextResponse.json({ received: true });
                }

                const items: any[] = Array.isArray(posSession.items) ? posSession.items : [];

                const { data: newOrder } = await supabaseAdmin
                    .from("orders")
                    .insert({
                        customer_email: posSession.customer_email,
                        customer_name: posSession.customer_name,
                        customer_phone: posSession.customer_phone,
                        shipping_address: posSession.customer_address ? { address: posSession.customer_address } : null,
                        items: posSession.items,
                        total_amount: posSession.total_amount,
                        discount_amount: 0,
                        status: "paid",
                        payment_status: "paid",
                        paystack_reference: paystackRef,
                        delivery_method: "pickup",
                        source: "pos",
                        notes: posSession.notes,
                        customer_id: posSession.contact_id,
                    })
                    .select("id")
                    .single();

                await supabaseAdmin
                    .from("pos_sessions")
                    .update({ status: "paid", paid_at: new Date().toISOString(), order_id: newOrder?.id ?? null })
                    .eq("id", posSessionId);

                await supabaseAdmin.from("pos_reservations").delete().eq("pos_session_id", posSessionId);

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
                        if (product.track_variant_inventory && item.variantId) {
                            // Deduct variant stock
                            const { data: variant } = await supabaseAdmin
                                .from("product_variants").select("inventory_count").eq("id", item.variantId).single();
                            if (variant && typeof variant.inventory_count === "number") {
                                await supabaseAdmin.from("product_variants")
                                    .update({ inventory_count: Math.max(0, variant.inventory_count - qty) })
                                    .eq("id", item.variantId);
                            }
                            // Also deduct product-level stock
                            if (typeof product.inventory_count === "number") {
                                await supabaseAdmin.from("products")
                                    .update({ inventory_count: Math.max(0, product.inventory_count - qty) })
                                    .eq("id", item.productId);
                            }
                        } else if (!product.track_variant_inventory && typeof product.inventory_count === "number") {
                            await supabaseAdmin.from("products")
                                .update({ inventory_count: Math.max(0, product.inventory_count - qty) })
                                .eq("id", item.productId);
                        }
                    }));
                }

                return NextResponse.json({ received: true });
            }
            // ── END POS charge.success handler ─────────────────────────────────

            const {
                orderId, requestId, productId, fullName, phone, address, country, region,
                whatsapp, instagram, snapchat, deliveryMethod, cartItems,
                platform_fee_amount, platform_fee_label,
                discount_code, discount_amount, discount_tag,
                auto_discount_ids,
            } = metadata;

            // ── Idempotency Check ─────────────────────────────────────────────
            // Verify if this transaction has already been processed to prevent double inventory/logic
            let isAlreadyProcessed = false;
            let emailAlreadySent = false;
            // Items fetched from DB — avoids relying on cartItems in Paystack metadata
            // (large carts hit Paystack's metadata size limit).
            let orderItemsFromDB: any[] = [];

            if (orderId) {
                const { data: existingOrder } = await supabaseAdmin
                    .from("orders")
                    .select("status, payment_status, paystack_reference, customer_metadata, items")
                    .eq("id", orderId)
                    .single();

                // Use payment_status for idempotency — NOT order.status.
                // The verify page previously set order.status before the webhook fired,
                // causing isAlreadyProcessed=true and stock was never decremented.
                if (existingOrder && existingOrder.payment_status !== "pending") {
                    console.log(`[webhook] Order ${orderId} already processed (payment_status=${existingOrder.payment_status}). Skipping inventory deductions.`);
                    isAlreadyProcessed = true;
                }

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
                    // reservation was never created). Decrement directly from stored items.
                    if (!stockDecremented && orderItemsFromDB.length > 0) {
                        const pIds = [...new Set(orderItemsFromDB.map((i: any) => i.productId).filter(Boolean))];
                        const { data: fbProducts } = await supabaseAdmin
                            .from("products")
                            .select("id, inventory_count, track_inventory, track_variant_inventory")
                            .in("id", pIds);
                        const fbProductMap = new Map((fbProducts ?? []).map((p: any) => [p.id, p]));

                        // Resolve current variant IDs by (size, color, stitching) for tracked products
                        const variantTrackedPIds = new Set<string>(
                            (fbProducts ?? []).filter((p: any) => p.track_variant_inventory).map((p: any) => p.id as string)
                        );
                        const variantIdLookup: Record<string, string> = {};
                        if (variantTrackedPIds.size > 0) {
                            const { data: fbVariants } = await supabaseAdmin
                                .from("product_variants")
                                .select("id, product_id, size, color, stitching, inventory_count")
                                .in("product_id", [...variantTrackedPIds]);
                            for (const v of fbVariants ?? []) {
                                const k = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.stitching)}`;
                                variantIdLookup[k] = v.id;
                            }
                        }

                        await Promise.allSettled(orderItemsFromDB.map(async (item: any) => {
                            const product = fbProductMap.get(item.productId);
                            if (!product || product.track_inventory === false) return;
                            const qty = item.quantity ?? 1;

                            if (product.track_variant_inventory) {
                                const lookupKey = `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.stitching)}`;
                                const resolvedVariantId = variantIdLookup[lookupKey] ?? item.variantId ?? null;
                                if (resolvedVariantId) {
                                    const { data: variant } = await supabaseAdmin
                                        .from("product_variants")
                                        .select("inventory_count")
                                        .eq("id", resolvedVariantId)
                                        .single();
                                    if (variant) {
                                        await supabaseAdmin.from("product_variants")
                                            .update({ inventory_count: Math.max(0, (variant.inventory_count ?? 0) - qty) })
                                            .eq("id", resolvedVariantId);
                                    }
                                }
                                // Decrement product-level too
                                await supabaseAdmin.from("products")
                                    .update({ inventory_count: Math.max(0, (product.inventory_count ?? 0) - qty) })
                                    .eq("id", item.productId);
                            } else {
                                await supabaseAdmin.from("products")
                                    .update({ inventory_count: Math.max(0, (product.inventory_count ?? 0) - qty) })
                                    .eq("id", item.productId);
                            }
                        }));
                        console.log(`[webhook] fallback stock decrement applied for order ${orderId} (no reservation row)`);
                    }
                } else if (productId) {
                    // Legacy single-product path (no orderId in metadata)
                    const { data: product } = await supabaseAdmin
                        .from("products")
                        .select("inventory_count, track_inventory")
                        .eq("id", productId)
                        .single();
                    if (product?.track_inventory !== false) {
                        await supabaseAdmin
                            .from("products")
                            .update({ inventory_count: Math.max(0, (product?.inventory_count ?? 0) - 1) })
                            .eq("id", productId);
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
                setupLink,
                isFirstTimeBuyer,
                discountCode: discount_code || undefined,
                discountAmount: Number(discount_amount) || undefined,
                ...pickupMeta,
            };

            if (orderId) {
                                const { data: currentOrderData } = await supabaseAdmin.from("orders").select("customer_metadata").eq("id", orderId).single();
                const currentMeta = (currentOrderData?.customer_metadata as object) || {};

                // Only set payment_status — never overwrite fulfillment_status or status
                // Idempotency guard: only update payment_status if still pending
                const { error } = await supabaseAdmin
                    .from("orders")
                    .update({
                        payment_status: "paid",
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
                            webhook_email_sent: true
                        },
                        ...(customerId ? { customer_id: customerId } : {}),
                    })
                    .eq("id", orderId)
                    .in("payment_status", ["pending"]); // idempotency: only update if still pending

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
                        isAlreadyProcessed ? Promise.resolve() : trackDiscountUsage(discount_code, discount_tag),
                        (emailAlreadySent || !phone) ? Promise.resolve() : sendSMS({
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
                            isAlreadyProcessed ? Promise.resolve() : trackDiscountUsage(discount_code, discount_tag),
                            (!phone) ? Promise.resolve() : sendSMS({
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
