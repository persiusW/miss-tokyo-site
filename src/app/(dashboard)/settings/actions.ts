"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUrl } from "@/lib/utils/getUrl";
import { Resend } from "resend";
import { sendSMS } from "@/lib/sms";
import crypto from "crypto";
import { logActivity } from "@/lib/utils/logActivity";

const resend = new Resend(process.env.RESEND_API_KEY!);

interface InviteData {
    fullName: string;
    email: string;
    phone?: string;
    role: string;
}

export async function inviteTeamMember(data: InviteData) {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
        return { success: false, error: "Unauthorized" };
    }

    // Get caller's role
    const { data: callerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

    const token = crypto.randomBytes(32).toString('hex');
    const dynamicHost = await getUrl();
    const inviteLink = `${dynamicHost}/invite?token=${token}`;

    const { error: insertError } = await supabaseAdmin.from("team_invitations").insert({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone || null,
        role: data.role,
        token,
        invited_by: userData.user.id,
    });

    if (insertError) {
        console.error("Invite insertion error:", insertError);
        return { success: false, error: "Failed to create invitation record." };
    }

    // LOG ACTIVITY
    await logActivity({
        userId: userData.user.id,
        userRole: callerProfile?.role || 'admin',
        actionType: "INVITE",
        resource: "team",
        details: { email: data.email, role: data.role }
    });

    const message = `You have been invited to collaborate on Miss Tokyo as a ${data.role}. Join here: ${inviteLink}`;

    // 1. Format Phone Number (Ghana standard +233)
    let formattedPhone = data.phone;
    if (formattedPhone) {
        formattedPhone = formattedPhone.replace(/\D/g, "");
        if (formattedPhone.startsWith("0")) {
            formattedPhone = "233" + formattedPhone.slice(1);
        } else if (!formattedPhone.startsWith("233")) {
            formattedPhone = "233" + formattedPhone;
        }
        formattedPhone = "+" + formattedPhone;
    }

    try {
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop",
            to: data.email,
            subject: "Invitation to Join Miss Tokyo Team",
            text: message,
            html: `<p>You have been invited to collaborate on Miss Tokyo as a <strong>${data.role}</strong>.</p><p><a href="${inviteLink}">Click here to accept your invitation</a></p>`,
        });

        if (formattedPhone) {
            try {
                await sendSMS({ to: formattedPhone, message });
            } catch (smsErr) {
                console.error("SMS failed, but email sent:", smsErr);
                return { success: true, warning: 'Email sent, but SMS failed.' };
            }
        }

        return { success: true };
    } catch (err: any) {
        console.error("Failed to send invite emails:", err);
        return { success: false, error: "Invitation saved, but failed to dispatch communications." };
    }
}

export async function removeTeamMember(userId: string) {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
        return { success: false, error: "Unauthorized" };
    }

    // CRITICAL SECURITY: Verify caller is an admin or owner
    const { data: callerData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
        
    if (!callerData || (callerData.role !== 'admin' && callerData.role !== 'owner')) {
        return { success: false, error: "Forbidden: Only admins and owners can remove members." };
    }

    // Demote role to 'customer' so they lose dashboard access without destroying
    // their account or triggering FK constraint failures on orders/pos_sessions/logs.
    const { error: demoteError } = await supabaseAdmin
        .from("profiles")
        .update({ role: "customer" })
        .eq("id", userId);

    if (demoteError) {
        console.error("Failed to demote user ID", userId, demoteError);
        return { success: false, error: "Failed to remove team member." };
    }

    // Force sign-out so the removed member's session ends immediately.
    await supabaseAdmin.auth.admin.signOut(userId, { scope: "global" });

    // LOG ACTIVITY
    await logActivity({
        userId: userData.user.id,
        userRole: callerData.role,
        actionType: "REMOVE_MEMBER",
        resource: "team",
        resourceId: userId
    });

    return { success: true };
}

export async function sendPasswordResetLink(targetEmail: string) {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return { success: false, error: "Unauthorized" };

    const { data: callerData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
    if (!callerData || (callerData.role !== "admin" && callerData.role !== "owner")) {
        return { success: false, error: "Forbidden: Only admins and owners can send reset links." };
    }

    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const adminClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

    // Fetch biz name so the email header matches the rest of the system
    const { data: biz } = await adminClient
        .from("business_settings")
        .select("business_name")
        .eq("id", "default")
        .single();
    const bizName = (biz as any)?.business_name || "Miss Tokyo";

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: targetEmail,
        options: { redirectTo: `${siteUrl}/account/reset-password` },
    });

    if (linkError || !linkData) {
        console.error("[sendPasswordResetLink] generateLink failed:", linkError);
        return { success: false, error: "Failed to generate reset link." };
    }

    const resetLink = (linkData as any)?.properties?.action_link;
    if (!resetLink) return { success: false, error: "Could not retrieve reset link." };

    const { sendEmail } = await import("@/lib/email");
    const { ok, error: emailError } = await sendEmail({
        to: targetEmail,
        subject: `Reset your ${bizName} password`,
        html: `
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
      An admin has requested a password reset for your account. Click the button below to set a new password. This link expires in 1 hour.
    </p>

    <a href="${resetLink}" style="display: block; background: #171717; color: white; text-decoration: none; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 16px 32px; text-align: center; font-weight: 700; margin-bottom: 32px;">
      Reset My Password →
    </a>

    <p style="font-size: 13px; color: #737373; line-height: 1.8; margin: 0 0 32px;">
      If you did not expect this email, you can safely ignore it — your account remains secure.
    </p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; margin-top: 24px;">
      <p style="font-size: 11px; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
        ${bizName}
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    if (!ok) {
        console.error("[sendPasswordResetLink] email failed:", emailError);
        return { success: false, error: "Reset link generated but email failed to send." };
    }

    return { success: true };
}
