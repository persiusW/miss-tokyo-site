import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: caller } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!caller || !["admin", "owner"].includes(caller.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId, customerEmail, customerName } = await req.json();

    if (!customerEmail) {
      return NextResponse.json({ error: "customerEmail is required." }, { status: 400 });
    }

    const { data: biz } = await supabaseAdmin
      .from("business_settings").select("business_name, email").eq("id", "default").single();

    const bizName = biz?.business_name || "Miss Tokyo";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop";

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ status: "skipped", reason: "No RESEND_API_KEY" });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `${bizName} <${fromEmail}>`,
      to: customerEmail,
      subject: `You left something behind at ${bizName}`,
      html: `
            <div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
              <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
                <h1 style="font-size:20px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px;">${bizName}</h1>
                <p style="color:#737373;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 36px;">Your Cart Is Waiting</p>
                <p style="font-size:15px;color:#171717;margin:0 0 16px;">
                  Hello${customerName ? ` ${customerName}` : ""},
                </p>
                <p style="font-size:14px;color:#525252;line-height:1.8;margin:0 0 28px;">
                  You left items in your cart. Your selection is still here — complete your order before it sells out.
                </p>
                <div style="background:#171717;padding:14px 24px;display:inline-block;margin-bottom:32px;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || ""}/shop" style="color:#fff;font-size:11px;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;">
                    Return to Shop →
                  </a>
                </div>
                <div style="border-top:1px solid #e5e5e5;padding-top:20px;margin-top:20px;">
                  <p style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:.15em;margin:0;">${bizName}</p>
                </div>
              </div>
            </div>`,
    });

    return NextResponse.json({ status: "sent" });
  } catch (err: any) {
    console.error("[abandoned/remind]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
