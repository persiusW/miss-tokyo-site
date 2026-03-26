import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

// Dummy values substituted for template variables in test sends
const DUMMY_VARS: Record<string, string> = {
    "{order_id}":      "TEST1234",
    "{customer_name}": "Test Customer",
    "{amount}":        "GH₵ 1,200.00",
    "{rider_name}":    "Kwame Mensah",
    "{rider_phone}":   "+233 20 000 0000",
};

function injectVars(text: string): string {
    return Object.entries(DUMMY_VARS).reduce(
        (str, [key, val]) => str.replaceAll(key, val),
        text,
    );
}

export async function POST(req: Request) {
    try {
        const serverClient = await createClient();
        const { data: { user } } = await serverClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { data: caller } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        if (!caller || !["admin", "owner"].includes(caller.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { email, eventType, eventLabel, subject, greeting, bodyText } = await req.json();
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const bizName  = process.env.BIZ_NAME || "Miss Tokyo";
        const baseUrl  = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";
        const label    = eventLabel || eventType || "Order Confirmed";
        const subj     = injectVars(subject || label);
        const greet    = injectVars(greeting || "Hello,");
        const body     = injectVars(bodyText || "Your message body. Dynamic values like order ID and rider name are injected automatically.");

        // CTAs that appear for specific events
        const ctaBlock = eventType === "account_setup"
            ? `<div style="background:#171717;display:inline-block;padding:12px 20px;margin-bottom:24px;">
                 <span style="color:white;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;">Set Up Your Account →</span>
               </div>`
            : eventType === "admin_new_order"
            ? `<a href="${baseUrl}/sales/orders" style="display:inline-block;background:#171717;color:white;text-decoration:none;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;padding:12px 20px;margin-bottom:24px;">
                 View Order in Dashboard →
               </a>`
            : `<a href="${baseUrl}/account/orders" style="display:block;border:1px solid #e5e5e5;padding:14px;text-align:center;text-decoration:none;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#171717;margin-bottom:24px;">
                 View Order Status →
               </a>`;

        const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 32px;">${label}</p>

    <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; margin-bottom: 28px; border-radius: 4px;">
      <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #92400e; margin: 0;">
        ⚡ Test send — dummy data injected for variables
      </p>
    </div>

    <p style="font-size: 13px; color: #171717; margin: 0 0 16px; font-family: Georgia, serif;">${greet}</p>
    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 24px; white-space: pre-wrap;">${body}</p>

    ${ctaBlock}

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; color: #737373;">
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 8px 0;">Order ID</td>
        <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #171717;">#TEST1234</td>
      </tr>
      <tr style="border-bottom: 1px solid #f5f5f5;">
        <td style="padding: 8px 0;">Customer</td>
        <td style="padding: 8px 0; text-align: right; color: #171717;">Test Customer</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">Amount</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #171717;">GH₵ 1,200.00</td>
      </tr>
    </table>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 8px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">${bizName}</p>
    </div>
  </div>
</body>
</html>`;

        const fromEmail = process.env.RESEND_FROM_EMAIL || "info@info.misstokyo.shop";
        const result = await sendEmail({
            to: email,
            subject: `[TEST] ${subj}`,
            html,
            from: `${bizName} <${fromEmail}>`,
        });

        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
        return NextResponse.json({ status: "sent" });
    } catch (err: any) {
        console.error("[test-email]", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
