import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

// GET /api/admin/invite-team?ids=id1,id2,...
// Returns which of the given user IDs have never signed in (pending setup)
export async function GET(req: NextRequest) {
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

    const ids = req.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
    if (!ids.length) return NextResponse.json({ pendingIds: [] });

    // listUsers may paginate — fetch up to 1000 which is more than enough for a team
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const pendingIds = users
        .filter(u => ids.includes(u.id) && !u.last_sign_in_at)
        .map(u => u.id);

    return NextResponse.json({ pendingIds });
}

export async function POST(req: NextRequest) {
    // Auth check — only admin/owner can invite
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

    const { email, role, name, phone } = await req.json();
    if (!email || !role) {
        return NextResponse.json({ error: "email and role are required" }, { status: 400 });
    }
    if (!["admin", "sales_staff"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const bizName   = process.env.BIZ_NAME || "Miss Tokyo";
    const baseUrl   = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const firstName = name?.split(" ")[0] || "there";

    // Generate a magic invite link (creates user without sending Supabase's default email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type:    "invite",
        email,
        options: { redirectTo: `${baseUrl}/admin/login` },
    });

    if (linkError || !linkData?.user) {
        return NextResponse.json({ error: linkError?.message || "Invite failed" }, { status: 500 });
    }

    // Set their profile role immediately
    const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(
            { id: linkData.user.id, email, role, ...(name ? { full_name: name } : {}) },
            { onConflict: "id" },
        );

    if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const inviteLink = (linkData.properties as any)?.action_link || `${baseUrl}/admin/login`;
    const roleLabel  = role === "admin" ? "Administrator" : "Sales Staff";

    // Fetch branded template from DB
    const { data: emailTpl } = await supabaseAdmin
        .from("communication_templates")
        .select("subject, greeting, body_text")
        .eq("channel", "email")
        .eq("event_type", "team_invite")
        .maybeSingle();

    const { data: smsTpl } = await supabaseAdmin
        .from("communication_templates")
        .select("greeting, body_text")
        .eq("channel", "sms")
        .eq("event_type", "team_invite")
        .maybeSingle();

    const subject  = emailTpl?.subject  || `You've been invited to join ${bizName}`;
    const greeting = emailTpl?.greeting || `Hi ${firstName},`;
    const bodyText = emailTpl?.body_text ||
        `You have been invited to join the ${bizName} team as ${roleLabel}. Click the button below to set up your account and get started. This link expires in 24 hours.`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #fafaf9; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e5e5; padding: 48px;">
    <h1 style="font-size: 20px; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">${bizName}</h1>
    <p style="color: #737373; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 32px;">Team Invitation · ${roleLabel}</p>

    <p style="font-size: 14px; color: #171717; margin: 0 0 16px; font-family: Georgia, serif;">${greeting}</p>
    <p style="font-size: 13px; color: #525252; line-height: 1.8; margin: 0 0 28px; white-space: pre-wrap;">${bodyText}</p>

    <a href="${inviteLink}" style="display: inline-block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; padding: 14px 28px; margin-bottom: 32px;">
      Accept Invitation →
    </a>

    <p style="font-size: 11px; color: #a3a3a3; line-height: 1.8; margin: 0 0 24px;">
      Or copy this link:<br/>
      <a href="${inviteLink}" style="color: #737373; word-break: break-all;">${inviteLink}</a>
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 8px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">${bizName} · Atelier Console</p>
    </div>
  </div>
</body>
</html>`;

    await Promise.allSettled([
        sendEmail({ to: email, subject, html, from: `${bizName} <${fromEmail}>` }),
        phone ? sendSMS({
            to: phone,
            message: smsTpl?.body_text
                ? (smsTpl.greeting ? `${smsTpl.greeting} ` : "") + smsTpl.body_text
                : `Hi ${firstName}, you've been invited to join the ${bizName} team as ${roleLabel}. Check your email to accept the invitation.`,
        }) : Promise.resolve(),
    ]);

    return NextResponse.json({ success: true, userId: linkData.user.id });
}
