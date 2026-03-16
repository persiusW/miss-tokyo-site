/**
 * Automated abandoned cart reminder — runs every hour via Vercel Cron.
 * Finds pending orders with no payment, created 24-48 hours ago,
 * that have not yet received a reminder, and sends one reminder email each.
 *
 * Secured by CRON_SECRET env var (set in Vercel project settings).
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    // Verify this is a legitimate Vercel Cron call
    const authHeader = req.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48h ago
    const windowEnd   = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago

    // Fetch abandoned orders in the 24-48h window
    const { data: abandoned, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("id, customer_name, customer_email, total_amount, items, created_at")
        .eq("status", "pending")
        .is("paystack_reference", null)
        .gte("created_at", windowStart.toISOString())
        .lte("created_at", windowEnd.toISOString())
        .not("customer_email", "is", null);

    if (fetchError) {
        console.error("[cron/abandoned-cart] fetch error:", fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!abandoned || abandoned.length === 0) {
        return NextResponse.json({ sent: 0, message: "No eligible carts" });
    }

    // Check which order IDs have already been reminded
    const orderIds = abandoned.map(o => o.id);
    const { data: alreadyReminded } = await supabaseAdmin
        .from("abandoned_history")
        .select("order_id")
        .in("order_id", orderIds);

    const remindedSet = new Set((alreadyReminded ?? []).map(r => r.order_id));
    const toRemind = abandoned.filter(o => !remindedSet.has(o.id));

    if (toRemind.length === 0) {
        return NextResponse.json({ sent: 0, message: "All already reminded" });
    }

    const { data: biz } = await supabaseAdmin
        .from("business_settings")
        .select("business_name, email")
        .eq("id", "default")
        .single();

    const bizName  = biz?.business_name || "Miss Tokyo";
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || "";

    let sent = 0;
    const errors: string[] = [];

    for (const order of toRemind) {
        if (!order.customer_email) continue;

        const itemCount = Array.isArray(order.items) ? order.items.length : 0;

        const { ok } = await sendEmail({
            to: order.customer_email,
            subject: `You left something behind at ${bizName}`,
            html: `
            <div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
              <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
                <h1 style="font-size:20px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px;">${bizName}</h1>
                <p style="color:#737373;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 36px;">Your Cart Is Waiting</p>
                <p style="font-size:15px;color:#171717;margin:0 0 16px;">
                  Hello${order.customer_name ? ` ${order.customer_name}` : ""},
                </p>
                <p style="font-size:14px;color:#525252;line-height:1.8;margin:0 0 28px;">
                  You left ${itemCount > 0 ? `${itemCount} item${itemCount > 1 ? "s" : ""}` : "items"} in your cart.
                  Your selection is still here — complete your order before it sells out.
                </p>
                <div style="background:#171717;padding:14px 24px;display:inline-block;margin-bottom:32px;">
                  <a href="${siteUrl}/shop" style="color:#fff;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;">
                    Return to Shop →
                  </a>
                </div>
                <div style="border-top:1px solid #e5e5e5;padding-top:20px;margin-top:20px;">
                  <p style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:.15em;margin:0;">${bizName}</p>
                </div>
              </div>
            </div>`,
        });

        if (ok) {
            // Log so we don't double-send
            await supabaseAdmin.from("abandoned_history").insert([{
                order_id:       order.id,
                customer_email: order.customer_email,
                customer_name:  order.customer_name,
            }]);
            sent++;
        } else {
            errors.push(order.id);
        }
    }

    console.log(`[cron/abandoned-cart] sent=${sent} errors=${errors.length}`);
    return NextResponse.json({ sent, errors: errors.length ? errors : undefined });
}
