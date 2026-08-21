import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { email: rawEmail } = await req.json();
        if (!rawEmail || typeof rawEmail !== "string") {
            return NextResponse.json({ error: "Email is required." }, { status: 400 });
        }
        // Supabase stores addresses lower-cased; matching on anything else is
        // how a real account looks missing.
        const email = rawEmail.trim().toLowerCase();

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

        // Generate the recovery link server-side so we can send via Resend
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo: `${siteUrl}/reset-password` },
        });

        // Always return 200 — the HTTP response never differs, whatever happens.
        if (linkError || !linkData) {
            // Silence here is what drove the repeat requests: someone who has
            // ordered as a guest has no account, gets no email, assumes it was
            // lost and tries again. Tell them what is actually wrong and how to
            // fix it. This is a deliberate trade — the email body now differs by
            // whether an account exists — approved because the support cost of
            // saying nothing was the larger problem.
            console.warn("[forgot-password] no account for this address — sending signup guidance instead");
            const { data: bizRow } = await supabaseAdmin
                .from("business_settings")
                .select("business_name")
                .eq("id", "default")
                .single();
            const name = bizRow?.business_name || "Miss Tokyo";
            await sendEmail({
                to: email,
                subject: `No ${name} account found for this address`,
                html: noAccountEmail(name, siteUrl),
            });
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

/**
 * Sent when a reset is requested for an address with no account. Ordering as a
 * guest does not create one, so this is the common case for customers who are
 * certain they have bought before.
 */
function noAccountEmail(bizName: string, siteUrl: string): string {
    return `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 40px;">Account</p>

    <h2 style="font-size: 16px; font-weight: normal; color: #171717; margin: 0 0 24px; letter-spacing: 0.05em;">
      There is no account for this address yet
    </h2>

    <p style="font-size: 14px; color: #525252; line-height: 1.8; margin: 0 0 24px;">
      You asked to reset a password for this email, but we could not find an account attached to it. That usually means your orders were placed as a guest \u2014 checking out does not create an account on its own.
    </p>

    <p style="font-size: 14px; color: #525252; line-height: 1.8; margin: 0 0 32px;">
      Create one with this same email address and your past orders will appear in it automatically.
    </p>

    <a href="${siteUrl}/register" style="display: block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 16px 32px; text-align: center; font-weight: 700; margin-bottom: 32px;">
      Create My Account \u2192
    </a>

    <p style="font-size: 13px; color: #737373; line-height: 1.8; margin: 0 0 32px;">
      If you did not ask for this, you can ignore this email \u2014 nothing has changed.
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${bizName}
      </p>
    </div>
  </div>
</body>
</html>`;
}
