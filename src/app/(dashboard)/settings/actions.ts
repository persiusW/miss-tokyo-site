"use server";

import { createClient } from "@/lib/supabaseServer";
import { getUrl } from "@/lib/utils/getUrl";
import { Resend } from "resend";
import { sendSMS } from "@/lib/sms";
import crypto from "crypto";

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

    const message = `You have been invited to collaborate on Miss Tokyo as a ${data.role}. Join here: ${inviteLink}`;

    try {
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop",
            to: data.email,
            subject: "Invitation to Join Miss Tokyo Team",
            text: message,
            html: `<p>You have been invited to collaborate on Miss Tokyo as a <strong>${data.role}</strong>.</p><p><a href="${inviteLink}">Click here to accept your invitation</a></p>`,
        });

        if (data.phone) {
            await sendSMS({ to: data.phone, message });
        }

        return { success: true };
    } catch (err: any) {
        console.error("Failed to send invite emails/sms:", err);
        return { success: false, error: "Invitation saved, but failed to dispatch communications." };
    }
}
