// The order of a team invite's sends. Pure, so it can be tested without a
// provider. Email and SMS are independent: one failing never stops the other,
// and the invite only counts as failed when neither went.

export type InviteResult = { success: boolean; warning?: string; error?: string };

export const INVITE_SMS_FAILED = "Email sent, but SMS failed.";
export const INVITE_EMAIL_FAILED = "SMS sent, but the email failed.";

export type InviteSends = {
    /** True when the email went. */
    email: () => Promise<boolean>;
    /** Best effort; only sends when an approved team_invite template id is set. */
    whatsapp: () => Promise<unknown>;
    /** Throws when the SMS did not go. */
    sms: () => Promise<void>;
};

export async function dispatchInvite(hasPhone: boolean, sends: InviteSends): Promise<InviteResult> {
    let emailed = false;
    try {
        emailed = await sends.email();
    } catch (err) {
        console.error("Failed to send invite email:", err);
    }

    let texted = false;
    if (hasPhone) {
        await sends.whatsapp();
        try {
            await sends.sms();
            texted = true;
        } catch (err) {
            console.error("Failed to send invite SMS:", err);
        }
    }

    if (!emailed && !texted) return { success: false, error: "Invitation saved, but failed to dispatch communications." };
    if (hasPhone && !texted) return { success: true, warning: INVITE_SMS_FAILED };
    if (!emailed) return { success: true, warning: INVITE_EMAIL_FAILED };
    return { success: true };
}
