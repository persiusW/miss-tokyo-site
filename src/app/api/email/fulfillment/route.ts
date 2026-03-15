import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

function getResend() { return new Resend(process.env.RESEND_API_KEY); }

export async function POST(req: Request) {
    try {
        const { orderId } = await req.json();
        if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

        const [{ data: order }, { data: biz }] = await Promise.all([
            supabase.from("orders").select("*").eq("id", orderId).single(),
            supabase.from("business_settings").select("*").eq("id", "default").single(),
        ]);

        if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        const bizName = biz?.business_name || "Miss Tokyo";
        const bizEmail = biz?.email || "orders@misstokyo.shop";
        const orderRef = order.id.substring(0, 8).toUpperCase();

        if (!process.env.RESEND_API_KEY) return NextResponse.json({ status: "skipped" });
        await getResend().emails.send({
            from: `${bizName} <${process.env.RESEND_FROM_EMAIL || "no-reply@resend.dev"}>`,
            to: [order.customer_email],
            subject: `Your Order Has Shipped — #${orderRef}`,
            html: `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
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
        <td style="padding: 12px 0; font-size: 13px; text-align: right; font-weight: 600;">GH₵ ${Number(order.total_amount).toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #737373;">Status</td>
        <td style="padding: 12px 0; font-size: 13px; text-align: right; color: #7c3aed; font-weight: 600;">Shipped</td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      We are preparing your piece for delivery. You will receive it soon. If you have any questions, reply to this email or contact us directly.
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${bizName}${biz?.address ? ` · ${biz.address.replace(/\n/g, ", ")}` : ""}
      </p>
    </div>
  </div>
</body>
</html>`,
        });

        return NextResponse.json({ status: "sent" });
    } catch (err) {
        console.error("Fulfillment email error:", err);
        return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }
}
