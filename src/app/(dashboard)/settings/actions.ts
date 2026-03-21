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
