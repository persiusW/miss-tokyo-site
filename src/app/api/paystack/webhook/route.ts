import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSMS, injectSmsVars } from "@/lib/sms";
import { Resend } from "resend";
import webpush from "web-push";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
function getResend() { return new Resend(process.env.RESEND_API_KEY); }

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
        .select("endpoint, p256dh, auth");

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
        });
        setupLink = (linkData as any)?.properties?.action_link || undefined;
    } catch {
        // Non-fatal
    }

    return { userId, setupLink, isNewUser: true };
}

async function trackDiscountUsage(
    discountCode: string | undefined,
    discountAmount: unknown,
    discountTag: string | undefined,
) {
    if (!discountCode) return;
    const code = discountCode.trim().toUpperCase();

    if (discountTag === "coupon" || !discountTag) {
        const { data: coupon } = await supabaseAdmin
            .from("coupons")
            .select("id, used_count")
            .ilike("code", code)
            .single();
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
            .single();
        if (card) {
            const newBalance = Math.max(0, Number(card.remaining_value) - Number(discountAmount));
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

// ── Receipt HTML builders ──────────────────────────────────────────────────────

function buildLineItemsHtml(items: any[]): string {
    if (!items.length) return "";
    const rows = items
        .map(item => {
            const unitPrice = Number(item.price || 0);
            const qty = Number(item.quantity || 1);
            const lineTotal = unitPrice * qty;
            const variant = [item.size, item.color, item.stitching].filter(Boolean).join(" · ");
            return `
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 13px; color: #171717;">
          ${item.name || "Item"}
          ${variant ? `<div style="font-size: 11px; color: #737373; margin-top: 2px;">${variant} × ${qty}</div>` : `<div style="font-size: 11px; color: #737373; margin-top: 2px;">× ${qty}</div>`}
        </td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${lineTotal.toFixed(2)}</td>
      </tr>`;
        })
        .join("");

    return `
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373; margin: 20px 0 6px;">Items Ordered</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      ${rows}
    </table>`;
}

// ── Send order confirmation email ──────────────────────────────────────────────

async function sendOrderConfirmation(opts: {
    customerEmail: string;
    orderRef: string;
    amount: number;
    bizName: string;
    bizAddress: string;
    items?: any[];
    feeAmount?: number;
    feeLabel?: string;
    setupLink?: string;
    isFirstTimeBuyer?: boolean;
    discountCode?: string;
    discountAmount?: number;
    isPickup?: boolean;
    pickupInstructions?: string;
    pickupAddress?: string;
    pickupPhone?: string;
    pickupWait?: string;
}) {
    if (!process.env.RESEND_API_KEY) return;

    const {
        customerEmail, orderRef, amount, bizName, bizAddress,
        items = [], feeAmount, feeLabel, setupLink, isFirstTimeBuyer,
        discountCode, discountAmount,
        isPickup, pickupInstructions, pickupAddress, pickupPhone, pickupWait,
    } = opts;

    const hasDiscount = discountAmount && discountAmount > 0;
    const hasFee = feeAmount && feeAmount > 0;
    const subtotal = hasFee ? amount - feeAmount! : amount;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

    const discountRow = hasDiscount ? `
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${(amount + discountAmount!).toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Discount${discountCode ? ` (${discountCode})` : ""}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right; color: #16a34a;">-GH&#8373; ${discountAmount!.toFixed(2)}</td>
      </tr>` : "";

    const feeRow = hasFee ? `
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${subtotal.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">${feeLabel || "Service Charge"}</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right;">GH&#8373; ${feeAmount!.toFixed(2)}</td>
      </tr>` : "";

    // First-time buyer prominent CTA block
    const firstTimeBuyerBlock = isFirstTimeBuyer && setupLink ? `
    <div style="background: #171717; padding: 28px; margin-bottom: 32px; text-align: center;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #a3a3a3; margin: 0 0 8px;">Welcome to Miss Tokyo</p>
      <p style="font-size: 14px; color: white; margin: 0 0 6px; line-height: 1.6; font-weight: 600;">
        You're now part of the atelier.
      </p>
      <p style="font-size: 13px; color: #d4d4d4; margin: 0 0 20px; line-height: 1.6;">
        Set up your account to track this order and manage future purchases.
      </p>
      <a href="${setupLink}" style="display: inline-block; background: white; color: #171717; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 32px; font-weight: 700;">
        Set Up My Account →
      </a>
    </div>` : setupLink ? `
    <div style="background: #f9f9f9; border: 1px solid #e5e5e5; padding: 20px; margin-bottom: 32px; text-align: center;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #737373; margin: 0 0 12px;">Track Your Order</p>
      <a href="${setupLink}" style="display: inline-block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 28px; font-weight: 600;">
        Set Up Your Password to Track Your Order
      </a>
    </div>` : "";

    const pickupBlock = isPickup && pickupInstructions ? `
    <div style="background: #F7F2EC; padding: 20px; margin-bottom: 28px; border: 1px solid #E8E4DE;">
      <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 12px; color: #171717;">
        📦 Your Pickup Instructions
      </p>
      <p style="font-size: 13px; color: #404040; line-height: 1.7; margin: 0 0 16px; white-space: pre-line;">${pickupInstructions}</p>
      <div style="border-top: 1px solid #DDD8D1; padding-top: 12px; font-size: 12px; color: #525252; line-height: 2;">
        ${pickupAddress ? `<div>📍 ${pickupAddress}</div>` : ""}
        ${pickupPhone ? `<div>📞 ${pickupPhone}</div>` : ""}
        ${pickupWait ? `<div>⏱ Ready in: ${pickupWait}</div>` : ""}
      </div>
    </div>` : "";

    const viewOrderBtn = `
    <a href="${baseUrl}/account/orders" style="display: block; border: 1px solid #e5e5e5; padding: 14px; text-align: center; text-decoration: none; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 32px;">
      View Order Status →
    </a>`;

    await getResend().emails.send({
        from: `${bizName} <${process.env.RESEND_FROM_EMAIL || "no-reply@resend.dev"}>`,
        to: [customerEmail],
        subject: `Order Confirmed — #${orderRef}`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Order Confirmed</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      Thank you. Your order has been received.
    </h2>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Order Reference</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">#${orderRef}</td>
      </tr>
    </table>

    ${buildLineItemsHtml(items)}

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      ${discountRow}
      ${feeRow}
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373; font-weight: 700;">Total Paid</td>
        <td style="padding: 12px 0; font-size: 15px; text-align: right; font-weight: 700;">GH&#8373; ${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Status</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; color: #15803d; font-weight: 600;">Confirmed</td>
      </tr>
    </table>

    ${pickupBlock}
    ${firstTimeBuyerBlock}
    ${viewOrderBtn}

    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      ${isPickup ? "Your order is being prepared for pickup. We will notify you when it is ready for collection. Questions? Reply to this email." : "Your piece is now being prepared with care. We will notify you once it has been dispatched. Questions? Reply to this email."}
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${bizName}${bizAddress ? ` · ${bizAddress.replace(/\n/g, ", ")}` : ""}
      </p>
    </div>
  </div>
</body>
</html>`,
    });
}

// ── Webhook handler ────────────────────────────────────────────────────────────

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

        if (event.event === "charge.success") {
            const data = event.data;
            const paystackRef: string = data.reference || "";
            const metadata = data.metadata || {};
            const {
                orderId, requestId, productId, fullName, phone, address, country, region,
                whatsapp, instagram, snapchat, deliveryMethod, cartItems,
                platform_fee_amount, platform_fee_label,
                discount_code, discount_amount, discount_tag,
            } = metadata;

            // ── Idempotency Check ─────────────────────────────────────────────
            // Verify if this transaction has already been processed to prevent double inventory/logic
            if (orderId) {
                const { data: existingOrder } = await supabaseAdmin
                    .from("orders")
                    .select("status, paystack_reference")
                    .eq("id", orderId)
                    .single();
                
                if (existingOrder && (existingOrder.status === "paid" || existingOrder.status === "confirmed" || existingOrder.paystack_reference === paystackRef)) {
                    console.log(`[webhook] Order ${orderId} already processed. Skipping.`);
                    return NextResponse.json({ status: "already_processed" });
                }
            } else if (paystackRef) {
                const { data: existingOrder } = await supabaseAdmin
                    .from("orders")
                    .select("id")
                    .eq("paystack_reference", paystackRef)
                    .maybeSingle();

                if (existingOrder) {
                    console.log(`[webhook] Reference ${paystackRef} already exists. Skipping.`);
                    return NextResponse.json({ status: "already_processed" });
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

            const parsedItems = parseItems(cartItems);

            // Decrement inventory — batch fetch then concurrent updates
            if (parsedItems.length > 0) {
                const productIds = [...new Set(parsedItems.map(i => i.productId).filter(Boolean))];
                const { data: products } = await supabaseAdmin
                    .from("products")
                    .select("id, inventory_count")
                    .in("id", productIds);

                if (products) {
                    const stockMap = new Map(products.map(p => [p.id, p.inventory_count as number]));
                    await Promise.allSettled(
                        parsedItems
                            .filter(item => item.productId && stockMap.has(item.productId))
                            .map(item => {
                                const stock = stockMap.get(item.productId) ?? 0;
                                if (typeof stock === "number" && stock >= item.quantity) {
                                    return supabaseAdmin
                                        .from("products")
                                        .update({ inventory_count: stock - item.quantity })
                                        .eq("id", item.productId);
                                }
                                return Promise.resolve();
                            })
                    );
                }
            }

            // Legacy single-product flow
            if (!parsedItems.length && productId) {
                const { data: product } = await supabaseAdmin
                    .from("products")
                    .select("inventory_count")
                    .eq("id", productId)
                    .single();
                if (product && product.inventory_count > 0) {
                    await supabaseAdmin
                        .from("products")
                        .update({ inventory_count: product.inventory_count - 1 })
                        .eq("id", productId);
                }
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
            if (paystackRef) {
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
                const { error } = await supabaseAdmin
                    .from("orders")
                    .update({
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
                            whatsapp: whatsapp || null,
                            instagram: instagram || null,
                            snapchat: snapchat || null,
                        },
                        ...(customerId ? { customer_id: customerId } : {}),
                    })
                    .eq("id", orderId);

                if (error) {
                    console.error("Webhook: Failed to update order:", error);
                } else {
                    const orderRef = orderId.substring(0, 8).toUpperCase();
                    await Promise.allSettled([
                        sendOrderConfirmation({ ...confirmEmailOpts, orderRef, amount: amountGHS }),
                        trackDiscountUsage(discount_code, discount_amount, discount_tag),
                        phone ? sendSMS({
                            to: phone,
                            message: buildOrderSms(orderRef, fullName?.split(" ")[0] || "there", isFirstTimeBuyer),
                        }) : Promise.resolve(),
                        sendAdminPushNotifications(
                            "New Order Received!",
                            `Order #${orderRef} for GH₵ ${amountGHS.toFixed(2)} from ${fullName || customerEmail} has been paid.`,
                        ),
                    ]);
                }
            } else if (customerEmail) {
                // Fallback: create order if none pre-created
                const { data: existing } = await supabaseAdmin
                    .from("orders")
                    .select("id")
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
                            paystack_reference: paystackRef,
                            items: parsedItems,
                            discount_code: discount_code || null,
                            discount_amount: Number(discount_amount) || 0,
                            customer_metadata: {
                                whatsapp: whatsapp || null,
                                instagram: instagram || null,
                                snapchat: snapchat || null,
                            },
                            ...(customerId ? { customer_id: customerId } : {}),
                        }])
                        .select("id")
                        .single();

                    if (error) {
                        console.error("Webhook: Failed to create order:", error);
                    } else if (newOrder) {
                        const orderRef = newOrder.id.substring(0, 8).toUpperCase();
                        await Promise.allSettled([
                            sendOrderConfirmation({ ...confirmEmailOpts, orderRef, amount: amountGHS }),
                            trackDiscountUsage(discount_code, discount_amount, discount_tag),
                            phone ? sendSMS({
                                to: phone,
                                message: buildOrderSms(orderRef, fullName?.split(" ")[0] || "there", isFirstTimeBuyer),
                            }) : Promise.resolve(),
                            sendAdminPushNotifications(
                                "New Order Received!",
                                `Order #${orderRef} for GH₵ ${amountGHS.toFixed(2)} from ${fullName || customerEmail} has been paid.`,
                            ),
                        ]);
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
