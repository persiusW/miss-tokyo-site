"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import { logActivity } from "@/lib/utils/logActivity";
import { after } from "next/server";
import { INVITABLE_ROLES } from "@/lib/teamInvites";
import { sendTeamInviteMessages } from "@/lib/teamInviteMessages";

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

    // A server action is a public endpoint — the Invite button being admin-only
    // in the UI gates nothing. The insert below runs on the service role and so
    // bypasses the admin/owner RLS policy on team_invitations, which means this
    // check is the only thing standing between a signed-in customer and an
    // invitation minted for whatever role they ask for.
    if (!callerProfile || !["admin", "owner"].includes(callerProfile.role)) {
        return { success: false, error: "Forbidden: Only admins and owners can invite team members." };
    }

    if (!INVITABLE_ROLES.includes(data.role)) {
        return { success: false, error: "Invalid role." };
    }

    if (!data.email?.trim()) {
        return { success: false, error: "An email address is required." };
    }

    // Store the address the way GoTrue does, so accepting the invite finds the
    // account behind it. A capitalised invite address is why a re-invite could
    // look like a different person.
    const email = data.email.trim().toLowerCase();

    // An address that's already on the staff list, or deactivated, needs a
    // role change or Reactivate, not an invite: accepting would quietly reset
    // their password, and a deactivated account is banned from signing in.
    const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("role, staff_deactivated_at")
        .eq("email", email)
        .maybeSingle();
    if (existing?.staff_deactivated_at) {
        return { success: false, error: "This person is deactivated. Reactivate them from the staff list instead." };
    }
    if (existing && ["owner", "admin", "sales_staff"].includes(existing.role)) {
        return { success: false, error: "This person is already on the staff list. Change their role there instead." };
    }

    const token = crypto.randomBytes(32).toString('hex');

    const { error: insertError } = await supabaseAdmin.from("team_invitations").insert({
        full_name: data.fullName,
        email,
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
    after(() => logActivity({
        userId: userData.user.id,
        userRole: callerProfile?.role ?? '',
        actionType: "INVITE",
        resource: "team",
        details: { email, role: data.role }
    }));

    return sendTeamInviteMessages({ email, role: data.role, token, phone: data.phone });
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
    // fn_staff_remove does it under the staff lock and refuses to demote the
    // last owner, which the old page only prevented by hiding the button.
    const { error: demoteError } = await supabaseAdmin.rpc("fn_staff_remove", { p_target: userId });

    if (demoteError) {
        console.error("Failed to demote user ID", userId, demoteError);
        if (demoteError.message === "last_owner") {
            return { success: false, error: "The store needs at least one owner. Make someone else an owner first." };
        }
        if (demoteError.message === "not_staff" || demoteError.message === "not_found") {
            return { success: false, error: "That account no longer exists." };
        }
        return { success: false, error: "Failed to remove team member." };
    }

    // A DB trigger can rewrite the row without raising. Confirm the demotion
    // actually landed before telling the caller it did.
    const { data: demoted } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (demoted?.role !== "customer") {
        console.error("Demote was reverted for user ID", userId, "role is still", demoted?.role);
        return { success: false, error: "The database blocked this change. Please try again shortly." };
    }

    // No session revoke here on purpose. auth.admin.signOut() takes an access
    // token, not a user id — passing the id threw "invalid JWT" on every call
    // and the result was discarded, so it never did anything. GoTrue exposes no
    // admin "revoke this user's sessions" endpoint (both /admin/users/:id/logout
    // and /admin/users/:id/sessions return 404 on this version). Access is gated
    // by a fresh profiles.role read in the dashboard layout on every request, so
    // the demotion above locks them out on their next navigation regardless of
    // whether their access token is still valid.

    // LOG ACTIVITY
    after(() => logActivity({
        userId: userData.user.id,
        userRole: callerData.role,
        actionType: "REMOVE_MEMBER",
        resource: "team",
        resourceId: userId
    }));

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

    after(() => logActivity({
        userId: userData.user.id,
        userRole: callerData.role,
        actionType: "RESET_PASSWORD",
        resource: "team",
        details: { target_email: targetEmail },
    }));

    return { success: true };
}
