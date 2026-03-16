/**
 * Abandoned cart reminder — triggered by an external cron service (cron-job.org).
 * Secured by Authorization: Bearer <CRON_SECRET> header.
 *
 * Point your cron to: POST /api/cron/abandoned-carts
 * Header: Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    // ── Auth check ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

    if (!expected || authHeader !== expected) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Find abandoned carts (pending, unpaid, 24-48h old) ───────────────────
    const now         = new Date();
    const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48h ago
    const windowEnd   = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago

    const { data: abandoned, error: fetchError } = await supabaseAdmin
        .from("orders")
        .select("id, customer_name, customer_email, total_amount, items, created_at")
        .eq("status", "pending")
        .is("paystack_reference", null)
        .gte("created_at", windowStart.toISOString())
        .lte("created_at", windowEnd.toISOString())
        .not("customer_email", "is", null);

    if (fetchError) {
        console.error("[cron/abandoned-carts] fetch error:", fetchError.message);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!abandoned || abandoned.length === 0) {
        return NextResponse.json({ success: true, emailsSent: 0, message: "No eligible carts" });
    }

    // ── Deduplicate: skip orders already reminded ─────────────────────────────
    const orderIds = abandoned.map(o => o.id);
    const { data: alreadyReminded } = await supabaseAdmin
        .from("abandoned_history")
        .select("order_id")
        .in("order_id", orderIds);

    const remindedSet = new Set((alreadyReminded ?? []).map(r => r.order_id));
    const toRemind = abandoned.filter(o => !remindedSet.has(o.id));

    if (toRemind.length === 0) {
        return NextResponse.json({ success: true, emailsSent: 0, message: "All already reminded" });
    }

    // ── Fetch business info for email branding ────────────────────────────────
    const { data: biz } = await supabaseAdmin
        .from("business_settings")
        .select("business_name")
        .eq("id", "default")
        .single();

    const bizName = biz?.business_name || "Miss Tokyo";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

    let emailsSent = 0;
    const failed: string[] = [];

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
            await supabaseAdmin.from("abandoned_history").insert([{
                order_id:       order.id,
                customer_email: order.customer_email,
                customer_name:  order.customer_name,
            }]);
            emailsSent++;
        } else {
            failed.push(order.id);
        }
    }

    console.log(`[cron/abandoned-carts] emailsSent=${emailsSent} failed=${failed.length}`);
    return NextResponse.json({
        success: true,
        emailsSent,
        ...(failed.length ? { failed } : {}),
    });
}
