"use server";

import { createClient } from "@/lib/supabaseServer";
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

    const { error: insertError } = await supabase.from("team_invitations").insert({
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

    // Use Service Role to delete the user from Auth fully (which cascades to profiles)
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
        console.error("Failed to delete user ID", userId, deleteError);
        return { success: false, error: "Failed to delete from Auth layer." };
    }

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

    const fromEmail = process.env.RESEND_FROM_EMAIL || "info@misstokyo.shop";
    const { error: emailError } = await resend.emails.send({
        from: `Miss Tokyo <${fromEmail}>`,
        to: targetEmail,
        subject: "Reset your Miss Tokyo password",
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#111">
                <p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#999;margin-bottom:32px">Miss Tokyo</p>
                <h1 style="font-size:22px;font-weight:400;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px">Password Reset</h1>
                <p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:32px">
                    A password reset was requested for your account. Click the button below to set a new password.
                    This link expires in 1 hour.
                </p>
                <a href="${resetLink}" style="display:inline-block;background:#000;color:#fff;padding:14px 32px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;text-decoration:none">
                    Reset Password
                </a>
                <p style="font-size:12px;color:#999;margin-top:32px">If you did not request this, you can safely ignore this email.</p>
            </div>
        `,
    });

    if (emailError) {
        console.error("[sendPasswordResetLink] email send failed:", emailError);
        return { success: false, error: "Reset link generated but email failed to send." };
    }

    return { success: true };
}
