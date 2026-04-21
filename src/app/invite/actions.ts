"use server";

import { createClient } from "@supabase/supabase-js";

export async function acceptInvite(data: any) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    try {
        // 1. Double check the invite is still valid
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from("team_invitations")
            .select("*")
            .eq("id", data.inviteId)
            .eq("token", data.token)
            .eq("status", "pending")
            .single();

        if (inviteError || !invite) {
            return { success: false, error: "Invalid or expired invitation." };
        }

        // 2. Create the user in Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true, // Auto-confirm since they received the email
            user_metadata: {
                full_name: data.fullName,
                role: invite.role, // Pass the role through metadata for the DB trigger
            }
        });

        if (authError) {
            console.error("Auth creation failed:", authError);
            if (authError.code === "email_exists" || authError.message.includes("already exists")) {
                return { success: false, error: "An account with this email already exists." };
            }
            return { success: false, error: authError.message };
        }

        // 3. Explicitly set profile role — DB trigger creates the profile but defaults to
        //    'customer'. We must upsert with the invited role so dashboard access works.
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert(
                {
                    id: authData.user.id,
                    email: data.email,
                    full_name: data.fullName,
                    role: invite.role,
                },
                { onConflict: "id" }
            );

        if (profileError) {
            console.error("Failed to set profile role:", profileError);
            // Non-fatal — auth user was created; log and continue
        }

        // 4. Mark the invitation as accepted
        const { error: updateInviteError } = await supabaseAdmin
            .from("team_invitations")
            .update({ status: "accepted" })
            .eq("id", data.inviteId);

        if (updateInviteError) {
            console.error("Failed to mark invite as accepted:", updateInviteError);
        }

        return { success: true };
    } catch (err: any) {
        console.error("Failed to accept invite:", err);
        return { success: false, error: "An unexpected error occurred." };
    }
}
