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

    // Map incoming type to standard event types
    let eventType = type;
    if (type === "ready_for_pickup") eventType = "order_fulfilled"; // Uses fulfillment template for pickup ready
    if (type === "shipped") eventType = "order_shipped";

    const [{ data: emailTpl }, { data: smsTpl }] = await Promise.all([
      supabaseAdmin.from("communication_templates").select("subject, greeting, body_text").eq("channel", "email").eq("event_type", eventType).single(),
      supabaseAdmin.from("communication_templates").select("greeting, body_text").eq("channel", "sms").eq("event_type", eventType).single(),
    ]);

    const vars: Record<string, string> = {
      "{order_id}": orderRef,
      "{customer_name}": firstName,
      "{amount}": `GH₵ ${Number(order.total_amount || 0).toFixed(2)}`,
      "{rider_name}": "",
      "{rider_phone}": "",
    };

    // Fetch rider info if assigned
    if (order.rider_id || order.assigned_rider_id) {
      const { data: rider } = await supabaseAdmin
        .from("riders")
        .select("full_name, phone_number")
        .eq("id", order.rider_id || order.assigned_rider_id)
        .single();
      if (rider) {
        vars["{rider_name}"] = rider.full_name;
        vars["{rider_phone}"] = rider.phone_number;
      }
    }

    const inject = (text: string) => {
      if (!text) return "";
      return Object.entries(vars).reduce((str, [k, v]) => str.replaceAll(k, v), text);
    };

    const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop";

    // ── Email ─────────────────────────────────────────────────────────────
    if (order.customer_email) {
      const subject = inject(emailTpl?.subject || (type === "ready_for_pickup" ? `Your order #${orderRef} is ready for pickup!` : type === "fulfilled" ? `Your package has arrived! 🎁 — #${orderRef}` : type === "cancelled" ? `Order Cancelled — #${orderRef}` : `Order Update — #${orderRef}`));
      const greeting = inject(emailTpl?.greeting || "Hello " + firstName + ",");
      const body = inject(emailTpl?.body_text || "");

      // Use the standard HTML layout
      const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">${type === "fulfilled" ? "Order Delivered" : "Order Update"}</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      ${greeting}
    </h2>

    <p style="font-size: 14px; color: #525252; line-height: 1.8; margin: 0 0 32px; white-space: pre-wrap;">
      ${body || (type === "ready_for_pickup" ? "Your order is ready to collect. Please visit our atelier." : type === "shipped" ? "Your order is on its way." : type === "fulfilled" ? "Your package has arrived 🎁 Thanks for your purchase! Tag us or share your look—we’d love to see!”" : type === "cancelled" ? `We are sorry to inform you that your order #${orderRef} has been cancelled. Please contact us if you have any questions.` : "Your order status has been updated.")}
    </p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Order Number</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">#${orderRef}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Amount</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-weight: 600;">GH&#8373; ${Number(order.total_amount).toFixed(2)}</td>
      </tr>
    </table>

    <a href="${baseUrl}/account/orders" style="display: block; border: 1px solid #e5e5e5; padding: 14px; text-align: center; text-decoration: none; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 32px;">
      View Order Status →
    </a>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${bizName}${bizAddress ? ` · ${bizAddress.replace(/\n/g, ", ")}` : ""}
      </p>
    </div>
  </div>
</body>
</html>`;

      await getResend().emails.send({
        from: `${bizName} <${fromEmail}>`,
        to: [order.customer_email],
        subject: subject,
        html: html,
      });
    }

    // ── SMS ───────────────────────────────────────────────────────────────
    if (order.customer_phone) {
      const smsGreet = inject(smsTpl?.greeting || "");
      const smsBody = inject(smsTpl?.body_text || "");
      const message = smsGreet ? `${smsGreet} ${smsBody}` : smsBody || buildFallbackSms(type, orderRef, firstName, bizName);

      if (message) {
        await sendSMS({ to: order.customer_phone, message });
      }
    }

    return NextResponse.json({ status: "sent" });
  } catch (err) {
    console.error("Fulfillment email error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

function buildFallbackSms(type: string, orderRef: string, firstName: string, bizName: string): string {
  if (type === "ready_for_pickup") {
    return `${bizName}: Hi ${firstName}, your order #${orderRef} is ready for pickup! Please visit our atelier to collect it. Thank you!`;
  }
  if (type === "shipped") {
    return `${bizName}: Hi ${firstName}, your order #${orderRef} has been dispatched and is on its way to you. Thank you!`;
  }
  if (type === "fulfilled") {
    return `${bizName}: Hi ${firstName}, your order #${orderRef} has been delivered.🎁 Thanks for your purchase! Tag us or share your look—we’d love to see! Thank you for shopping with ${bizName}.`;
  }
  if (type === "cancelled") {
    return `${bizName}: Hi ${firstName}, we're sorry to inform you that your order #${orderRef} has been cancelled. Please contact us if you have any questions.`;
  }
  return "";
}
