import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
function getResend() { return new Resend(process.env.RESEND_API_KEY); }

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
 * Creates one if not found, then upserts a profile row.
 * Returns the user ID and a setup link if the account was newly created.
 */
async function ensureCustomerAccount(customerEmail: string, fullName?: string | null): Promise<{ userId: string; setupLink?: string }> {
    // Check if user already exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users?.find(u => u.email === customerEmail);

    if (found) {
        // Upsert profile in case it's missing
        await supabaseAdmin.from("profiles").upsert({ id: found.id, full_name: fullName || null }, { onConflict: "id" });
        return { userId: found.id };
    }

    // Create new auth user (no password — they set it via the recovery link)
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true,
    });

    if (error || !newUser?.user) {
        console.error("[webhook] Failed to create auth user:", error);
        return { userId: "" };
    }

    const userId = newUser.user.id;

    // Create profile
    await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: fullName || null }, { onConflict: "id" });

    // Generate password setup link
    let setupLink: string | undefined;
    try {
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: customerEmail,
        });
        setupLink = (linkData as any)?.properties?.action_link || undefined;
    } catch {
        // Non-fatal — order confirmation still sends without it
    }

    return { userId, setupLink };
}

async function sendOrderConfirmation(
    customerEmail: string,
    orderRef: string,
    amount: number,
    bizName: string,
    bizAddress: string,
    feeAmount?: number,
    feeLabel?: string,
    setupLink?: string,
) {
    if (!process.env.RESEND_API_KEY) return;

    const hasFee = feeAmount && feeAmount > 0;
    const subtotal = hasFee ? amount - feeAmount : amount;

    const feeRow = hasFee ? `
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Subtotal</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right;">GH&#8373; ${subtotal.toFixed(2)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">${feeLabel || "Service Charge"}</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right;">GH&#8373; ${feeAmount.toFixed(2)}</td>
      </tr>` : "";

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
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Order Reference</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">#${orderRef}</td>
      </tr>
      ${feeRow}
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Total Paid</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-weight: 600;">GH&#8373; ${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Status</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; color: #15803d; font-weight: 600;">Confirmed</td>
      </tr>
    </table>
    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      Your piece is now being prepared with care. We will notify you once it has been dispatched. Questions? Reply to this email.
    </p>
    ${setupLink ? `
    <div style="background: #f9f9f9; border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 32px; text-align: center;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #737373; margin: 0 0 12px;">Track Your Order</p>
      <a href="${setupLink}" style="display: inline-block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 28px; font-weight: 600;">
        Set Up Your Password to Track Your Order
      </a>
    </div>` : ""}
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
            console.log("Paystack Charge Success Event Received");
            const data = event.data;
            const metadata = data.metadata || {};
            const { orderId, requestId, productId, fullName, phone, address, deliveryMethod, cartItems, platform_fee_amount, platform_fee_label } = metadata;
            const customerEmail: string = data.customer?.email || "";
            const amountGHS = Number(data.amount) / 100;
            const paystackRef: string = data.reference || "";

            const { data: biz } = await supabaseAdmin
                .from("business_settings")
                .select("business_name, address")
                .eq("id", "default")
                .single();

            const bizName = biz?.business_name || "Miss Tokyo";
            const bizAddress = biz?.address || "";

            if (requestId) {
                await supabaseAdmin
                    .from("custom_requests")
                    .update({ status: "confirmed" })
                    .eq("id", requestId);
            }

            const parsedItems = parseItems(cartItems);

            // Decrement inventory for each cart item
            for (const item of parsedItems) {
                if (!item.productId) continue;
                const { data: product } = await supabaseAdmin
                    .from("products")
                    .select("inventory_count")
                    .eq("id", item.productId)
                    .single();
                if (product && typeof product.inventory_count === "number" && product.inventory_count >= item.quantity) {
                    await supabaseAdmin
                        .from("products")
                        .update({ inventory_count: product.inventory_count - item.quantity })
                        .eq("id", item.productId);
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
            if (customerEmail) {
                const account = await ensureCustomerAccount(customerEmail, fullName);
                if (account.userId) {
                    customerId = account.userId;
                    setupLink = account.setupLink;
                }
            }

            if (orderId) {
                // Order was pre-created at initialization — update it to paid
                const { error } = await supabaseAdmin
                    .from("orders")
                    .update({
                        status: "paid",
                        paystack_reference: paystackRef,
                        customer_name: fullName || null,
                        customer_phone: phone || null,
                        shipping_address: address ? { text: address } : null,
                        delivery_method: deliveryMethod || null,
                        ...(customerId ? { customer_id: customerId } : {}),
                    })
                    .eq("id", orderId);

                if (error) {
                    console.error("Webhook: Failed to update order:", error);
                } else {
                    await sendOrderConfirmation(customerEmail, orderId.substring(0, 8).toUpperCase(), amountGHS, bizName, bizAddress, Number(platform_fee_amount) || undefined, platform_fee_label || undefined, setupLink);
                }
            } else if (customerEmail) {
                // Fallback: create a new order if no pre-created one exists
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
                            shipping_address: address ? { text: address } : null,
                            delivery_method: deliveryMethod || null,
                            total_amount: amountGHS,
                            status: "paid",
                            paystack_reference: paystackRef,
                            items: parsedItems,
                            ...(customerId ? { customer_id: customerId } : {}),
                        }])
                        .select("id")
                        .single();

                    if (error) {
                        console.error("Webhook: Failed to create order:", error);
                    } else if (newOrder) {
                        await sendOrderConfirmation(customerEmail, newOrder.id.substring(0, 8).toUpperCase(), amountGHS, bizName, bizAddress, Number(platform_fee_amount) || undefined, platform_fee_label || undefined, setupLink);
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
