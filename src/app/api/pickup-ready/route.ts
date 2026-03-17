import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSMS } from "@/lib/sms";

/**
 * POST /api/pickup-ready
 * Marks orders as 'ready_for_pickup' and sends the customer a pickup notification
 * email with store address, contact number, and business hours.
 * Does NOT assign a rider — pickup orders are fulfilled manually when client arrives.
 */
export async function POST(req: NextRequest) {
    try {
        const { orderIds } = await req.json();

        if (!orderIds?.length) {
            return NextResponse.json({ error: "orderIds is required." }, { status: 400 });
        }

        // ── Fetch orders ──────────────────────────────────────────────────────
        const { data: orders, error: ordersError } = await supabaseAdmin
            .from("orders")
            .select("id, customer_name, customer_email, customer_phone, total_amount")
            .in("id", orderIds);

        if (ordersError || !orders) {
            return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
        }

        // ── Update status to ready_for_pickup ─────────────────────────────────
        const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({ status: "ready_for_pickup" })
            .in("id", orderIds);

        if (updateError) {
            return NextResponse.json({ error: "Failed to update orders." }, { status: 500 });
        }

        // ── Fetch business settings ───────────────────────────────────────────
        const { data: biz } = await supabaseAdmin
            .from("business_settings")
            .select("business_name, email, contact, address, business_hours")
            .eq("id", "default")
            .single();

        const bizName = biz?.business_name || "Miss Tokyo";
        const bizAddress = biz?.address || "";
        const bizContact = biz?.contact || "";
        const bizHours = biz?.business_hours || "Mon – Sat, 10am – 6pm";

        // ── Send pickup-ready emails ───────────────────────────────────────────
        if (process.env.RESEND_API_KEY) {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            const fromEmail = biz?.email || "orders@misstokyo.shop";

            const emailPromises = orders
                .filter(o => !!o.customer_email)
                .map(order => {
                    const ref = order.id.substring(0, 8).toUpperCase();

                    return resend.emails.send({
                        from: `${bizName} <${fromEmail}>`,
                        to: order.customer_email!,
                        subject: `Your order #${ref} is ready for pickup!`,
                        html: `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 20px; letter-spacing: .15em; text-transform: uppercase; margin: 0 0 6px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; margin: 0 0 36px;">Ready for Collection</p>

    <p style="font-size: 14px; color: #171717; margin: 0 0 24px;">
      Hello ${order.customer_name || "valued customer"}, your order <strong>#${ref}</strong> is packed and waiting for you at our store.
    </p>

    <div style="background: #171717; color: #fff; padding: 24px; margin-bottom: 28px;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: .2em; color: #a3a3a3; margin: 0 0 16px;">Pickup Details</p>
      ${bizAddress ? `
      <div style="margin-bottom: 12px;">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: .15em; color: #737373; margin: 0 0 4px;">Store Address</p>
        <p style="font-size: 14px; font-weight: 600; margin: 0;">${bizAddress.replace(/\n/g, ", ")}</p>
      </div>` : ""}
      ${bizContact ? `
      <div style="margin-bottom: 12px;">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: .15em; color: #737373; margin: 0 0 4px;">Contact Number</p>
        <p style="font-size: 14px; font-weight: 600; margin: 0;">📞 ${bizContact}</p>
      </div>` : ""}
      <div>
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: .15em; color: #737373; margin: 0 0 4px;">Store Hours</p>
        <p style="font-size: 14px; font-weight: 600; margin: 0;">🕐 ${bizHours}</p>
      </div>
    </div>

    <p style="font-size: 12px; color: #737373; margin: 0 0 24px; line-height: 1.7;">
      Please bring this email or your order number when you arrive. Orders not collected within 7 days may be released.
    </p>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: .15em; color: #737373;">Order Number</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right; font-family: monospace; font-weight: 600;">#${ref}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: .15em; color: #737373;">Amount Paid</td>
        <td style="padding: 10px 0; font-size: 13px; text-align: right; font-weight: 600;">GH₵ ${Number(order.total_amount ?? 0).toFixed(2)}</td>
      </tr>
    </table>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; margin-top: 20px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: .15em; margin: 0;">
        ${bizName}${bizAddress ? ` · ${bizAddress.replace(/\n/g, ", ")}` : ""}
      </p>
    </div>
  </div>
</body>
</html>`,
                    });
                });

            await Promise.allSettled(emailPromises);
        }

        // ── Send pickup-ready SMS ─────────────────────────────────────────────
        const smsPromises = orders
            .filter(o => !!o.customer_phone)
            .map(order => {
                const ref = order.id.substring(0, 8).toUpperCase();
                const parts = [
                    `${bizName}: Hi ${order.customer_name || "there"}, your order #${ref} is ready for pickup!`,
                    bizAddress ? `📍 ${bizAddress.replace(/\n/g, ", ")}` : "",
                    bizContact ? `📞 ${bizContact}` : "",
                    bizHours   ? `🕐 ${bizHours}` : "",
                ].filter(Boolean).join(" | ");

                return sendSMS({ to: order.customer_phone!, message: parts });
            });

        await Promise.allSettled(smsPromises);

        return NextResponse.json({ status: "ready_for_pickup", count: orderIds.length });
    } catch (err: any) {
        console.error("[pickup-ready]", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
