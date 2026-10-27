import { getUrl } from "@/lib/utils/getUrl";
import { sendSMSOrThrow } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { notifyTeamOnWhatsApp } from "@/lib/whatsapp/templateSendLive";
import { inviteChoice } from "@/lib/whatsapp/teamAlerts";

/**
 * The team-invite email (and SMS when there's a phone number), shared by the
 * first invite and "Resend" so both say the same thing and use the same link.
 * Server only.
 */
export async function sendTeamInviteMessages(invite: { email: string; role: string; token: string; phone?: string | null }): Promise<{ success: boolean; warning?: string; error?: string }> {
    const dynamicHost = await getUrl();
    const inviteLink = `${dynamicHost}/invite?token=${invite.token}`;
    const message = `You have been invited to collaborate on Miss Tokyo as a ${invite.role}. Join here: ${inviteLink}`;

    // Ghana standard +233
    let formattedPhone = invite.phone || undefined;
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
        // sendEmail never throws: a failed send comes back as { ok: false }.
        const sent = await sendEmail({
            from: process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop",
            to: invite.email,
            subject: "Invitation to Join Miss Tokyo Team",
            text: message,
            html: `<p>You have been invited to collaborate on Miss Tokyo as a <strong>${invite.role}</strong>.</p><p><a href="${inviteLink}">Click here to accept your invitation</a></p>`,
        }, { event: "team_invite" });
        if (!sent.ok) {
            console.error("Invite email failed:", sent.error);
            return { success: false, error: "Invitation saved, but failed to dispatch communications." };
        }

        if (formattedPhone) {
            // WhatsApp too, best effort: someone invited has never written to the shop, so only the team_invite template reaches them.
            await notifyTeamOnWhatsApp([formattedPhone], inviteChoice({ role: invite.role, token: invite.token }), { event: "team_invite" });
            try {
                await sendSMSOrThrow({ to: formattedPhone, message });
            } catch (smsErr) {
                console.error("SMS failed, but email sent:", smsErr);
                return { success: true, warning: "Email sent, but SMS failed." };
            }
        }

        return { success: true };
    } catch (err) {
        console.error("Failed to send invite emails:", err);
        return { success: false, error: "Invitation saved, but failed to dispatch communications." };
    }
}
