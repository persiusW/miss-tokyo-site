import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

export async function POST(req: NextRequest) {
    // Auth check — only admin/owner can promote users
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: caller } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!caller || !["admin", "owner"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, action } = await req.json();
    if (!userId || !action) {
        return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
    }

    const newRole = action === "promote" ? "wholesale" : null;

    // Fetch the target user's profile for notifications
    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name, first_name, phone")
        .eq("id", userId)
        .single();

    const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send notifications if we have the user's email
    if (profile?.email) {
        const bizName  = process.env.BIZ_NAME || "Miss Tokyo";
        const baseUrl  = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";
        const fromEmail = process.env.RESEND_FROM_EMAIL || "info@info.misstokyo.shop";
        const firstName = profile.first_name || profile.full_name?.split(" ")[0] || "there";

        // Fetch template from DB
        const { data: emailTpl } = await supabaseAdmin
            .from("communication_templates")
            .select("subject, greeting, body_text")
            .eq("channel", "email")
            .eq("event_type", action === "promote" ? "wholesale_approved" : "wholesale_revoked")
            .maybeSingle();

        const { data: smsTpl } = await supabaseAdmin
            .from("communication_templates")
            .select("greeting, body_text")
            .eq("channel", "sms")
            .eq("event_type", "wholesale_approved")
            .maybeSingle();

        if (action === "promote") {
            const subject  = emailTpl?.subject  || `Welcome to ${bizName} Wholesale`;
            const greeting = emailTpl?.greeting || `Dear ${firstName},`;
            const bodyText = emailTpl?.body_text ||
                `Congratulations! Your account has been approved for wholesale access on ${bizName}. You now have access to exclusive wholesale pricing and products. Log in to your account to start shopping.`;

            const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 20px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 32px;">Wholesale Partner</p>

    <p style="font-size: 14px; color: #171717; margin: 0 0 16px; font-family: Georgia, serif;">${greeting}</p>
    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 28px; white-space: pre-wrap;">${bodyText}</p>

    <a href="${baseUrl}/account" style="display: inline-block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; padding: 14px 28px; margin-bottom: 32px;">
      Access Wholesale Account →
    </a>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 8px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">${bizName}</p>
    </div>
  </div>
</body>
</html>`;

            await Promise.allSettled([
                sendEmail({
                    to: profile.email,
                    subject,
                    html,
                    from: `${bizName} <${fromEmail}>`,
                }),
                profile.phone ? sendSMS({
                    to: profile.phone,
                    message: smsTpl?.body_text
                        ? (smsTpl.greeting ? `${smsTpl.greeting} ` : "") + smsTpl.body_text
                        : `Hi ${firstName}, your ${bizName} account has been approved for wholesale access! Log in to start shopping wholesale prices. ${baseUrl}/account`,
                }) : Promise.resolve(),
            ]);
        } else {
            // Revoke — email only
            const subject  = emailTpl?.subject  || `${bizName} Wholesale Access Update`;
            const greeting = emailTpl?.greeting || `Dear ${firstName},`;
            const bodyText = emailTpl?.body_text ||
                `Your wholesale access on ${bizName} has been updated. If you have any questions, please contact us directly.`;

            const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 20px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 32px;">Account Update</p>
    <p style="font-size: 14px; color: #171717; margin: 0 0 16px; font-family: Georgia, serif;">${greeting}</p>
    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 24px; white-space: pre-wrap;">${bodyText}</p>
    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 8px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">${bizName}</p>
    </div>
  </div>
</body>
</html>`;

            await sendEmail({
                to: profile.email,
                subject,
                html,
                from: `${bizName} <${fromEmail}>`,
            });
        }
    }

    return NextResponse.json({ success: true });
}
