import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required." }, { status: 400 });
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

        // Generate the recovery link server-side so we can send via Resend
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo: `${siteUrl}/reset-password` },
        });

        // Always return 200 — never reveal whether an account exists
        if (linkError || !linkData) {
            console.warn("[forgot-password] generateLink failed (account may not exist):", linkError?.message);
            return NextResponse.json({ ok: true });
        }

        const resetLink = (linkData as any)?.properties?.action_link;
        if (!resetLink) return NextResponse.json({ ok: true });

        // Fetch biz name for the email header
        const { data: biz } = await supabaseAdmin
            .from("business_settings")
            .select("business_name")
            .eq("id", "default")
            .single();
        const bizName = biz?.business_name || "Miss Tokyo";

        const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Password Reset</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      Reset your password
    </h2>

    <p style="font-size: 14px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      We received a request to reset the password for your account. Click the button below to choose a new password. This link expires in 1 hour.
    </p>

    <a href="${resetLink}" style="display: block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 16px 32px; text-align: center; font-weight: 700; margin-bottom: 32px;">
      Reset My Password →
    </a>

    <p style="font-size: 13px; color: #737373; line-height: 1.8; margin: 0 0 32px;">
      If you did not request a password reset, you can safely ignore this email — your account remains secure.
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${bizName}
      </p>
    </div>
  </div>
</body>
</html>`;

        await sendEmail({
            to: email,
            subject: `Reset your ${bizName} password`,
            html,
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[forgot-password] Unexpected error:", err);
        return NextResponse.json({ ok: true }); // always 200 — no account enumeration
    }
}
