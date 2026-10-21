"use server";

// Staff page actions. Server actions are public endpoints that run on the
// service role, so every one re-reads the caller's role here; the last-owner
// rule lives in the fn_staff_* database functions, under one lock.
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logActivity } from "@/lib/utils/logActivity";
import { sendTeamInviteMessages } from "@/lib/teamInviteMessages";
import { inviteTeamMember, sendPasswordResetLink } from "@/app/(dashboard)/settings/actions";
import { INVITE_ROLES, isStaffRole, refusalOf, roleLabel, staffRefusal, type StaffRoleKey } from "./staffCopy";

type Result = { ok: true; message: string; signedOutSelf?: boolean; warning?: boolean } | { ok: false; error: string };

const FORBIDDEN: Result = { ok: false, error: "Only owners and admins can change staff." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Long enough to mean "until someone reactivates them".
const BAN_FOREVER = "876000h";

async function caller() {
    const gate = await requireStaff(["owner", "admin"]);
    return "status" in gate ? null : gate;
}

async function nameOf(id: string): Promise<{ name: string; email: string | null }> {
    const { data } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", id).maybeSingle();
    return { name: data?.full_name || data?.email || "This person", email: data?.email ?? null };
}

function refused(error: { message?: string } | null, what: string): Result {
    const reason = refusalOf(error?.message);
    if (!reason) console.error(`[staff] ${what} failed:`, error?.message);
    return { ok: false, error: staffRefusal(reason) };
}

function done() {
    revalidatePath("/staff", "layout");
}

export async function changeStaffRole(memberId: string, role: string): Promise<Result> {
    const me = await caller();
    if (!me) return FORBIDDEN;
    if (!UUID.test(memberId) || !isStaffRole(role)) return { ok: false, error: staffRefusal("bad_role") };

    const { data: prev, error } = await supabaseAdmin.rpc("fn_staff_set_role", { p_target: memberId, p_role: role });
    if (error) return refused(error, "role change");

    const who = await nameOf(memberId);
    after(() => logActivity({
        userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "staff", resourceId: memberId,
        details: { action: "role", from: prev, to: role, resource_name: who.name },
    }));
    done();
    return { ok: true, message: `${who.name} is now ${roleLabel(role).toLowerCase()}` };
}

export async function deactivateStaff(memberId: string): Promise<Result> {
    const me = await caller();
    if (!me) return FORBIDDEN;
    if (!UUID.test(memberId)) return { ok: false, error: staffRefusal("not_found") };

    const { data: prev, error } = await supabaseAdmin.rpc("fn_staff_deactivate", { p_target: memberId, p_actor: me.userId });
    if (error) return refused(error, "deactivate");

    // The role change already locks them out of the admin, and their sessions
    // are gone. The ban also stops them signing in to the shop with this account.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(memberId, { ban_duration: BAN_FOREVER });
    if (banError) console.error("[staff] ban after deactivate failed:", banError.message);

    const who = await nameOf(memberId);
    after(() => logActivity({
        userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "staff", resourceId: memberId,
        details: { action: "deactivate", role: prev, resource_name: who.name },
    }));
    done();
    return { ok: true, message: `${who.name} can no longer sign in` };
}

export async function reactivateStaff(memberId: string): Promise<Result> {
    const me = await caller();
    if (!me) return FORBIDDEN;
    if (!UUID.test(memberId)) return { ok: false, error: staffRefusal("not_found") };

    const { data: role, error } = await supabaseAdmin.rpc("fn_staff_reactivate", { p_target: memberId });
    if (error) return refused(error, "reactivate");

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(memberId, { ban_duration: "none" });
    if (banError) {
        console.error("[staff] unban after reactivate failed:", banError.message);
        return { ok: false, error: "Their role is back, but signing in is still blocked. Please try Reactivate again shortly." };
    }

    const who = await nameOf(memberId);
    after(() => logActivity({
        userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "staff", resourceId: memberId,
        details: { action: "reactivate", role, resource_name: who.name },
    }));
    done();
    return { ok: true, message: `${who.name} can sign in again` };
}

/** The old "Remove member": back to a customer account that can still shop. */
export async function removeFromStaff(memberId: string): Promise<Result> {
    const me = await caller();
    if (!me) return FORBIDDEN;
    if (!UUID.test(memberId)) return { ok: false, error: staffRefusal("not_found") };

    const who = await nameOf(memberId);
    const { data: was } = await supabaseAdmin.from("profiles").select("role, staff_deactivated_role").eq("id", memberId).maybeSingle();
    const { error } = await supabaseAdmin.rpc("fn_staff_remove", { p_target: memberId });
    if (error) return refused(error, "remove");

    // A deactivated person was banned; a removed one keeps their shop account.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(memberId, { ban_duration: "none" });
    if (banError) console.error("[staff] unban after remove failed:", banError.message);

    after(() => logActivity({
        userId: me.userId, userRole: me.role, actionType: "REMOVE_MEMBER", resource: "team", resourceId: memberId,
        details: { resource_name: who.name, email: who.email, role: was?.staff_deactivated_role ?? was?.role ?? null },
    }));
    done();
    return { ok: true, message: `${who.name} is no longer on the staff list` };
}

export async function signOutEverywhere(memberId: string): Promise<Result> {
    const me = await caller();
    if (!me) return FORBIDDEN;
    if (!UUID.test(memberId)) return { ok: false, error: staffRefusal("not_found") };

    const { error } = await supabaseAdmin.rpc("fn_staff_sign_out_everywhere", { p_target: memberId });
    if (error) return refused(error, "sign out everywhere");

    const who = await nameOf(memberId);
    after(() => logActivity({
        userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "staff", resourceId: memberId,
        details: { action: "sign_out", resource_name: who.name },
    }));
    const self = memberId === me.userId;
    if (!self) done();
    return { ok: true, message: self ? "You're signed out on every device" : `${who.name.split(" ")[0]} is signed out on every device`, signedOutSelf: self };
}

export async function sendStaffResetLink(memberId: string): Promise<Result> {
    const me = await caller();
    if (!me) return FORBIDDEN;
    if (!UUID.test(memberId)) return { ok: false, error: staffRefusal("not_found") };
    const { data: p } = await supabaseAdmin.from("profiles").select("email, role").eq("id", memberId).maybeSingle();
    if (!p?.email || !isStaffRole(p.role)) return { ok: false, error: staffRefusal("not_staff") };

    // The existing action: generates the recovery link, sends the email and logs it.
    const res = await sendPasswordResetLink(p.email);
    if (!res.success) return { ok: false, error: res.error || "The reset link didn't go out. Please try again shortly." };
    return { ok: true, message: `Reset link sent to ${p.email}` };
}

export async function inviteStaff(input: { fullName: string; email: string; phone?: string; role: string }): Promise<Result> {
    const me = await caller();
    if (!me) return FORBIDDEN;
    if (!INVITE_ROLES.includes(input.role as StaffRoleKey)) return { ok: false, error: "Choose Sales staff or Admin." };
    if (!input.fullName.trim()) return { ok: false, error: "Add their name so the team knows who this is." };

    // The existing invite flow: team_invitations row, email with the setup
    // link, SMS when there's a phone number, and the INVITE log.
    const res = await inviteTeamMember({ fullName: input.fullName.trim(), email: input.email, phone: input.phone?.trim() || undefined, role: input.role });
    const email = input.email.trim().toLowerCase();
    if (!res.success) {
        // The row is saved before the email goes out. When only the email
        // failed, the invite is on the list and Resend can try again.
        const { data: saved } = await supabaseAdmin.from("team_invitations").select("id").eq("email", email).eq("status", "pending").limit(1);
        if (saved?.length && res.error === "Invitation saved, but failed to dispatch communications.") {
            done();
            return { ok: true, warning: true, message: `The invite is saved, but the email to ${email} didn't go out. Tap Resend on it to try again.` };
        }
        return { ok: false, error: res.error || "The invite didn't go out. Please try again shortly." };
    }
    done();
    return res.warning
        ? { ok: true, warning: true, message: `Invite emailed to ${email}. The text message didn't go out.` }
        : { ok: true, message: `Invite sent to ${email}` };
}

async function pendingInvite(id: string) {
    if (!UUID.test(id)) return null;
    const { data } = await supabaseAdmin.from("team_invitations").select("id, email, role, token, phone, status").eq("id", id).maybeSingle();
    return data?.status === "pending" ? data : null;
}

export async function resendInvite(inviteId: string): Promise<Result> {
    const me = await caller();
    if (!me) return FORBIDDEN;
    const inv = await pendingInvite(inviteId);
    if (!inv) return { ok: false, error: "That invite was already used or revoked. Refresh the page." };

    // A fresh 7 days from now, same link.
    const expires = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const { error } = await supabaseAdmin.from("team_invitations").update({ expires_at: expires }).eq("id", inv.id).eq("status", "pending");
    if (error) {
        console.error("[staff] invite expiry update failed:", error.message);
        return { ok: false, error: "Something happened. Please try again shortly." };
    }
    const sent = await sendTeamInviteMessages({ email: inv.email, role: inv.role, token: inv.token, phone: inv.phone });
    if (!sent.success) return { ok: false, error: "The invite email didn't go out. Please try again shortly." };

    after(() => logActivity({
        userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "invite", resourceId: inv.id,
        details: { action: "resend", email: inv.email, role: inv.role },
    }));
    done();
    return { ok: true, message: `Invite sent again to ${inv.email}` };
}

export async function revokeInvite(inviteId: string): Promise<Result> {
    const me = await caller();
    if (!me) return FORBIDDEN;
    const inv = await pendingInvite(inviteId);
    if (!inv) return { ok: false, error: "That invite was already used or revoked. Refresh the page." };

    const { data, error } = await supabaseAdmin.from("team_invitations").update({ status: "revoked" }).eq("id", inv.id).eq("status", "pending").select("id");
    if (error || !data?.length) {
        if (error) console.error("[staff] revoke failed:", error.message);
        return { ok: false, error: "Something happened. Please try again shortly." };
    }
    after(() => logActivity({
        userId: me.userId, userRole: me.role, actionType: "DELETE", resource: "invite", resourceId: inv.id,
        details: { email: inv.email, role: inv.role },
    }));
    done();
    return { ok: true, message: "Invite revoked" };
}
