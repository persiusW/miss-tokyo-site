import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSMS } from "@/lib/sms";

/**
 * POST /api/dispatch
 * Batch-assigns a rider to selected orders, updates status to 'processing',
 * sends customer emails with rider info, and optionally notifies the rider via SMS.
 */
export async function POST(req: NextRequest) {
    try {
        const { orderIds, riderId, notifyRider } = await req.json();

        if (!orderIds?.length || !riderId) {
            return NextResponse.json({ error: "orderIds and riderId are required." }, { status: 400 });
        }

        // ── Fetch rider ───────────────────────────────────────────────────────
        const { data: rider, error: riderError } = await supabaseAdmin
            .from("riders")
            .select("*")
            .eq("id", riderId)
            .single();

        if (riderError || !rider) {
            return NextResponse.json({ error: "Rider not found." }, { status: 404 });
        }

        // ── Fetch orders ──────────────────────────────────────────────────────
        const { data: orders, error: ordersError } = await supabaseAdmin
            .from("orders")
            .select("id, customer_name, customer_email, customer_phone, shipping_address, total_amount")
            .in("id", orderIds);

        if (ordersError || !orders) {
            return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
        }

        // ── Batch update orders ───────────────────────────────────────────────
        const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({ status: "shipped", assigned_rider_id: riderId })
            .in("id", orderIds);

        if (updateError) {
            return NextResponse.json({ error: "Failed to update orders." }, { status: 500 });
        }

        // ── Fetch business settings (needed for email + SMS) ──────────────────
        const { data: biz } = await supabaseAdmin
            .from("business_settings")
            .select("business_name, email")
            .eq("id", "default")
            .single();

        const bizName = biz?.business_name || "Miss Tokyo";

        // ── Send customer notifications (email) ───────────────────────────────
        if (process.env.RESEND_API_KEY) {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            const fromEmail = biz?.email || "orders@misstokyo.shop";

            const emailPromises = orders
                .filter(o => !!o.customer_email)
                .map(order => {
                    const ref = order.id.substring(0, 8).toUpperCase();
                    const riderImg = rider.image_url
                        ? `<img src="${rider.image_url}" alt="${rider.full_name}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;margin-top:8px;"/>`
                        : "";

                    return resend.emails.send({
                        from: `${bizName} <${fromEmail}>`,
                        to: order.customer_email!,
                        subject: `Your order #${ref} is on its way!`,
                        html: `
                        <div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
                          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
                            <h1 style="font-size:20px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px;">${bizName}</h1>
                            <p style="color:#737373;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 36px;">Order Dispatched</p>
                            <p style="font-size:14px;color:#171717;margin:0 0 24px;">
                              Hello ${order.customer_name || "valued customer"}, your order <strong>#${ref}</strong> has been dispatched and is on its way to you.
                            </p>
                            <div style="background:#f9f9f9;border:1px solid #e5e5e5;padding:20px;margin-bottom:28px;">
                              <p style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#737373;margin:0 0 8px;">Your Delivery Rider</p>
                              <p style="font-size:15px;font-weight:600;color:#171717;margin:0 0 4px;">${rider.full_name}</p>
                              <p style="font-size:13px;color:#525252;margin:0 0 4px;">📞 ${rider.phone_number}</p>
                              ${rider.bike_reg ? `<p style="font-size:12px;color:#737373;margin:0;">🏍 ${rider.bike_reg}</p>` : ""}
                              ${riderImg}
                            </div>
                            <p style="font-size:12px;color:#737373;margin:0 0 24px;">
                              You can call or message your rider directly. Estimated delivery depends on your location.
                            </p>
                            <div style="border-top:1px solid #e5e5e5;padding-top:20px;margin-top:20px;">
                              <p style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:.15em;margin:0;">
                                ${bizName}
                              </p>
                            </div>
                          </div>
                        </div>`,
                    });
                });

            await Promise.allSettled(emailPromises);
        }

        // ── SMS: notify rider ─────────────────────────────────────────────────
        if (notifyRider && rider.phone_number) {
            const orderLines = orders
                .slice(0, 5)
                .map(o => `${o.customer_name || o.customer_email} · ${(o.shipping_address as any)?.text || (o.shipping_address as any)?.city || ""}`)
                .join("; ");

            await sendSMS({
                to: rider.phone_number,
                message: `${bizName} Dispatch: You have ${orders.length} order${orders.length > 1 ? "s" : ""} to deliver. ${orderLines}. Contact dispatch for full details.`,
            });
        }

        // ── SMS: notify customers ─────────────────────────────────────────────
        const customerSmsPromises = orders
            .filter(o => !!o.customer_phone)
            .map(o => {
                const ref = o.id.substring(0, 8).toUpperCase();
                return sendSMS({
                    to: o.customer_phone!,
                    message: `${bizName}: Hi ${o.customer_name || "there"}, your order #${ref} is on its way! Your rider ${rider.full_name} will contact you at ${rider.phone_number}. Thank you!`,
                });
            });

        await Promise.allSettled(customerSmsPromises);

        return NextResponse.json({ status: "dispatched", count: orderIds.length });
    } catch (err: any) {
        console.error("[dispatch]", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
