import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
function getResend() { return new Resend(process.env.RESEND_API_KEY); }

async function sendOrderConfirmation(
    customerEmail: string,
    orderRef: string,
    amount: number,
    bizName: string,
    bizAddress: string,
) {
    if (!process.env.RESEND_API_KEY) return;
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
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Amount Paid</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-weight: 600;">GH₵ ${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Status</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; color: #15803d; font-weight: 600;">Confirmed</td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      Your piece is now being prepared with care. We will notify you once it has been dispatched. Questions? Reply to this email.
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
            const metadata = data.metadata || {};
            const { productId, requestId } = metadata;
            const customerEmail: string = data.customer?.email || "";
            const amountGHS = Number(data.amount) / 100;
            const paystackRef: string = data.reference || "";

            // Fetch business settings for email
            const { data: biz } = await supabase
                .from("business_settings")
                .select("business_name, address")
                .eq("id", "default")
                .single();

            const bizName = biz?.business_name || "Badu Atelier";
            const bizAddress = biz?.address || "";

            if (requestId) {
                await supabase
                    .from("custom_requests")
                    .update({ status: "confirmed" })
                    .eq("id", requestId);
            }

            if (productId) {
                const { data: product } = await supabase
                    .from("products")
                    .select("inventory_count")
                    .eq("id", productId)
                    .single();

                if (product && typeof product.inventory_count === "number" && product.inventory_count > 0) {
                    await supabase
                        .from("products")
                        .update({ inventory_count: product.inventory_count - 1 })
                        .eq("id", productId);
                }

                if (metadata.orderId) {
                    await supabase
                        .from("orders")
                        .update({ status: "paid" })
                        .eq("id", metadata.orderId);
                }
            }

            // Create order record if none exists and we have a customer email
            if (customerEmail && !metadata.orderId) {
                const { data: newOrder } = await supabase
                    .from("orders")
                    .insert([{
                        customer_email: customerEmail,
                        total_amount: amountGHS,
                        status: "paid",
                        paystack_reference: paystackRef,
                    }])
                    .select("id")
                    .single();

                if (newOrder) {
                    await sendOrderConfirmation(
                        customerEmail,
                        newOrder.id.substring(0, 8).toUpperCase(),
                        amountGHS,
                        bizName,
                        bizAddress,
                    );
                }
            } else if (customerEmail && metadata.orderId) {
                await sendOrderConfirmation(
                    customerEmail,
                    metadata.orderId.substring(0, 8).toUpperCase(),
                    amountGHS,
                    bizName,
                    bizAddress,
                );
            }
        }

        return NextResponse.json({ status: "success" });
    } catch (err) {
        console.error("Webhook Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
