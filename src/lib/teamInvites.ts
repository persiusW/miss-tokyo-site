import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared helpers for the team-invite paths.
 *
 * Every invite path used to assume the invited address had no auth user behind
 * it, so it called createUser/generateLink and gave up on the 422 that comes
 * back for an address that is already registered. That is the normal case, not
 * the exception: removing a team member demotes the profile to 'customer' and
 * deliberately leaves the auth user alone, and plenty of staff have shopped as
 * customers before being invited. Both left the invitee permanently stuck on
 * "An account with this email already exists."
 */

/**
 * Roles an invite acceptance must never overwrite.
 *
 * Accepting an invite sets a password on the account behind the address. For a
 * brand-new account that is the whole point; for an existing owner or admin it
 * would turn "invite <their address>" into an account takeover by anyone who
 * can read the token. Adoption stops at the door for these.
 */
const PROTECTED_ROLES = ["owner", "admin"];

export type ExistingAccount = { id: string; role: string };

/** True when GoTrue refused a create/generateLink because the address is taken. */
export function isEmailTakenError(error: { code?: string; message?: string } | null | undefined): boolean {
    if (!error) return false;
    if (error.code === "email_exists") return true;
    const message = (error.message || "").toLowerCase();
    return message.includes("already been registered") || message.includes("already exists");
}

/**
 * Find the account behind an address.
 *
 * profiles.email is unique and profiles.id is auth.users.id, so the common case
 * is one indexed read — listUsers() would page through every customer on the
 * store to answer the same question. The paged fallback only runs when an auth
 * user has no profile row, which the on_auth_user_created trigger makes rare.
 */
export async function findAccountByEmail(
    admin: SupabaseClient,
    email: string,
): Promise<ExistingAccount | null> {
    // GoTrue lower-cases addresses on the way in, and the profiles row is
    // written from auth.users, so an exact match on the lower-cased address is
    // the right lookup. Matching on anything else is how a real account looks
    // missing.
    const normalised = email.trim().toLowerCase();

    const { data: profile } = await admin
        .from("profiles")
        .select("id, role")
        .eq("email", normalised)
        .maybeSingle();

    if (profile) return { id: profile.id, role: profile.role };

    // No profile row — fall back to the auth list. Bounded so a large customer
    // table can never turn this into an unbounded scan.
    for (let page = 1; page <= 10; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !data?.users?.length) return null;

        const match = data.users.find(u => u.email?.toLowerCase() === normalised);
        if (match) return { id: match.id, role: "customer" };

        if (data.users.length < 1000) return null;
    }

    return null;
}

/** Existing accounts whose password an invite must not be allowed to set. */
export function isProtectedAccount(account: ExistingAccount): boolean {
    return PROTECTED_ROLES.includes(account.role);
}
