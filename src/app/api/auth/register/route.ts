import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { email, password, full_name } = await req.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required." }, { status: 400 });
        }
        if (!password || typeof password !== "string" || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "signup",
            email,
            password,
            options: {
                data: { full_name: full_name || "" },
                redirectTo: `${siteUrl}/auth/confirm`,
            },
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const confirmLink = (data as any)?.properties?.action_link;
        if (!confirmLink) {
            return NextResponse.json({ error: "Could not generate confirmation link." }, { status: 500 });
        }

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
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Welcome</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      Confirm your email address
    </h2>

    <p style="font-size: 14px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      Thank you for creating your ${bizName} account. Click the button below to confirm your email address and activate your membership.
    </p>

    <a href="${confirmLink}" style="display: block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 16px 32px; text-align: center; font-weight: 700; margin-bottom: 32px;">
      Confirm Email Address &rarr;
    </a>

    <p style="font-size: 13px; color: #737373; line-height: 1.8; margin: 0 0 32px;">
      If you did not create an account, you can safely ignore this email.
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
            subject: `Welcome to ${bizName} — Confirm your email`,
            html,
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[register] Unexpected error:", err);
        return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
    }
}
