import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { sendSMS, injectSmsVars } from "@/lib/sms";
import { Resend } from "resend";

function getResend() { return new Resend(process.env.RESEND_API_KEY); }

export async function POST(req: NextRequest) {
    try {
        const serverClient = await createClient();
        const { data: { user } } = await serverClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { data: caller } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        if (!caller || !["admin", "owner", "sales_staff"].includes(caller.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { orderId, type } = await req.json();
        if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

        const [{ data: order }, { data: biz }] = await Promise.all([
            supabaseAdmin.from("orders").select("*").eq("id", orderId).single(),
            supabaseAdmin.from("business_settings").select("*").eq("id", "default").single(),
        ]);

        if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        const bizName = biz?.business_name || "Miss Tokyo";
        const bizAddress = biz?.address || "";
        const orderRef = order.id.substring(0, 8).toUpperCase();
        const customerName = order.customer_name || "valued customer";
        const firstName = customerName.split(" ")[0];
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

        const isPickup = type === "ready_for_pickup" || order.delivery_method === "pickup";

        // Fetch the relevant SMS template
        const smsEventType = isPickup ? "order_fulfilled" : "order_shipped";
        const { data: smsTpl } = await supabaseAdmin
            .from("communication_templates")
            .select("body_text, greeting")
            .eq("channel", "sms")
            .eq("event_type", smsEventType)
            .single();

        function buildFulfillmentSms(riderName = "", riderPhone = ""): string {
            const vars: Record<string, string> = {
                order_id:      orderRef,
                customer_name: firstName,
                amount:        `GH₵ ${Number(order.total_amount || 0).toFixed(2)}`,
                rider_name:    riderName,
                rider_phone:   riderPhone,
            };
            if (smsTpl?.body_text) {
                const greeting = smsTpl.greeting ? injectSmsVars(smsTpl.greeting, vars) + " " : "";
                return greeting + injectSmsVars(smsTpl.body_text, vars);
            }
            // Default fallback
            return isPickup
                ? `${bizName}: Hi ${firstName}, your order #${orderRef} is ready for pickup! Please visit our atelier to collect it. Thank you!`
                : `${bizName}: Hi ${firstName}, your order #${orderRef} has been dispatched and is on its way to you. Thank you!`;
        }

        if (!process.env.RESEND_API_KEY) return NextResponse.json({ status: "skipped" });

        if (isPickup) {
            // ── Ready for Pickup email ─────────────────────────────────────────
            await getResend().emails.send({
                from: `${bizName} <${process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop"}>`,
                to: [order.customer_email],
                subject: `Your order #${orderRef} is ready for pickup!`,
                html: `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Ready for Collection</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      Hello ${customerName}, your order is ready to collect.
    </h2>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Order Number</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">#${orderRef}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Amount</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-weight: 600;">GH&#8373; ${Number(order.total_amount).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Status</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; color: #d97706; font-weight: 600;">Ready for Pickup</td>
      </tr>
    </table>

    ${bizAddress ? `
    <div style="background: #f9f9f9; border: 1px solid #e5e5e5; padding: 20px; margin-bottom: 32px;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373; margin: 0 0 8px;">Pickup Address</p>
      <p style="font-size: 14px; color: #171717; margin: 0; line-height: 1.6;">${bizAddress.replace(/\n/g, "<br>")}</p>
    </div>` : ""}

    <a href="${baseUrl}/account/orders" style="display: block; border: 1px solid #e5e5e5; padding: 14px; text-align: center; text-decoration: none; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 32px;">
      View Order Status →
    </a>

    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      Please bring a valid ID and your order reference number. If you have any questions, reply to this email.
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

            // SMS for pickup
            if (order.customer_phone) {
                await sendSMS({ to: order.customer_phone, message: buildFulfillmentSms() });
            }
        } else {
            // ── Shipped email ──────────────────────────────────────────────────
            await getResend().emails.send({
                from: `${bizName} <${process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop"}>`,
                to: [order.customer_email],
                subject: `Your Order Has Shipped — #${orderRef}`,
                html: `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 20px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Order Dispatched</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      Your order is on its way.
    </h2>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Order Number</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">#${orderRef}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Amount</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-weight: 600;">GH&#8373; ${Number(order.total_amount).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Status</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; color: #7c3aed; font-weight: 600;">Shipped</td>
      </tr>
    </table>

    <a href="${baseUrl}/account/orders" style="display: block; border: 1px solid #e5e5e5; padding: 14px; text-align: center; text-decoration: none; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 32px;">
      View Order Status →
    </a>

    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      We are preparing your piece for delivery. You will receive it soon. If you have any questions, reply to this email or contact us directly.
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

            // SMS for shipped — fetch rider info if order has one assigned
            if (order.customer_phone) {
                let riderName = "";
                let riderPhone = "";
                if (order.rider_id) {
                    const { data: rider } = await supabaseAdmin
                        .from("riders")
                        .select("full_name, phone_number")
                        .eq("id", order.rider_id)
                        .single();
                    riderName  = rider?.full_name    || "";
                    riderPhone = rider?.phone_number || "";
                }
                await sendSMS({ to: order.customer_phone, message: buildFulfillmentSms(riderName, riderPhone) });
            }
        }

        return NextResponse.json({ status: "sent" });
    } catch (err) {
        console.error("Fulfillment email error:", err);
        return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }
}
