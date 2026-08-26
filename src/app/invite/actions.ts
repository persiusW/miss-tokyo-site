"use server";

import { createClient } from "@supabase/supabase-js";
import { findAccountByEmail, isEmailTakenError, isProtectedAccount } from "@/lib/teamInvites";

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

        if (typeof data.password !== "string" || data.password.length < 6) {
            return { success: false, error: "Your password must be at least 6 characters long." };
        }

        // Everything that decides *which* account this touches comes off the
        // invitation row, never off the request. The form posts the address it
        // was rendered with, but trusting it would let a token holder point the
        // acceptance at an address they were not invited under.
        const email = String(invite.email).trim().toLowerCase();
        const fullName = invite.full_name ?? data.fullName ?? null;

        // 2. Create the user in Auth
        const userMetadata = {
            full_name: fullName,
            role: invite.role, // Pass the role through metadata for the DB trigger
        };

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: data.password,
            email_confirm: true, // Auto-confirm since they received the email
            user_metadata: userMetadata,
        });

        let userId: string;

        if (!authError) {
            userId = authData.user.id;
        } else if (!isEmailTakenError(authError)) {
            console.error("Auth creation failed:", authError);
            return { success: false, error: authError.message };
        } else {
            // The address already has an auth user. That is the normal state for
            // a removed member being re-invited (removeTeamMember demotes the
            // profile and leaves auth alone) and for anyone who shopped as a
            // customer first. Adopt the account rather than dead-ending them:
            // they proved control of the mailbox by following the token.
            const existing = await findAccountByEmail(supabaseAdmin, email);

            if (!existing) {
                console.error("Address is registered but no account was found for it:", email);
                return { success: false, error: "An account with this email already exists." };
            }

            if (isProtectedAccount(existing)) {
                // Never let an invite set the password on an owner or admin.
                console.error("Refused to adopt a protected account via invite:", existing.id, existing.role);
                return {
                    success: false,
                    error: "This email already belongs to an administrator account. Sign in with it instead, or invite a different address.",
                };
            }

            const { error: adoptError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
                password: data.password,
                email_confirm: true,
                user_metadata: userMetadata,
            });

            if (adoptError) {
                console.error("Failed to adopt existing account:", adoptError);
                return { success: false, error: adoptError.message };
            }

            userId = existing.id;
        }

        // 3. Explicitly set profile role — DB trigger creates the profile but defaults to
        //    'customer'. We must upsert with the invited role so dashboard access works.
        //    For an adopted account this is the step that re-grants dashboard access.
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert(
                {
                    id: userId,
                    email,
                    full_name: fullName,
                    role: invite.role,
                },
                { onConflict: "id" }
            );

        if (profileError) {
            // Fatal on purpose. The role is what grants dashboard access, so
            // reporting success here would hand them a working password and an
            // "Access denied" screen — the exact dead end this flow is for.
            console.error("Failed to set profile role:", profileError);
            return { success: false, error: "We could not finish setting up your access. Please try again shortly." };
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
