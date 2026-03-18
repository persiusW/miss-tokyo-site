import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Check for existing subscriber
  const { data: existing } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: false, alreadySubscribed: true });
  }

  // Fetch coupon settings
  const { data: settings } = await supabaseAdmin
    .from("site_settings")
    .select("welcome_coupon_enabled, welcome_coupon_code, store_name, store_email")
    .eq("id", "singleton")
    .maybeSingle();

  const couponEnabled = settings?.welcome_coupon_enabled ?? true;
  const couponCode = settings?.welcome_coupon_code || "FIRST10";

  // Insert subscriber
  const { error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .insert({
      email: email.toLowerCase().trim(),
      coupon_code: couponEnabled ? couponCode : null,
      subscribed_at: new Date().toISOString(),
    });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ success: false, alreadySubscribed: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Optionally send welcome email
  if (couponEnabled && settings?.store_email) {
    try {
      const bizName = settings.store_name || "Miss Tokyo";
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const html = `
<!DOCTYPE html><html><body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 20px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="font-size: 14px; color: #171717; margin: 0 0 16px;">Welcome to the family!</p>
    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 24px;">
      Thank you for subscribing. Here is your exclusive discount code:
    </p>
    <div style="background: #f5f5f5; border: 2px dashed #C8A97A; padding: 20px; text-align: center; margin: 0 0 24px;">
      <p style="font-size: 24px; letter-spacing: 0.3em; font-weight: bold; margin: 0; color: #171717;">${couponCode}</p>
      <p style="font-size: 11px; color: #737373; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 0.1em;">Use at checkout for your first order</p>
    </div>
    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 8px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">${bizName}</p>
    </div>
  </div>
</body></html>`;
      await sendEmail({
        to: email,
        subject: `Your ${couponCode} code — Welcome to ${bizName}`,
        html,
        from: `${bizName} <${fromEmail}>`,
      });
    } catch {
      // Don't fail the request if email sending fails
    }
  }

  return NextResponse.json({
    success: true,
    couponCode: couponEnabled ? couponCode : null,
    couponEnabled,
  });
}
