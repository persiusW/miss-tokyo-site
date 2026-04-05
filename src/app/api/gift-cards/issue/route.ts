import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

function genCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    ).join("-");
}

export async function POST(req: NextRequest) {
    try {
        const serverClient = await createClient();
        const { data: { user } } = await serverClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { data: caller } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        if (!caller || !["admin", "owner"].includes(caller.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { recipient_email, recipient_name, sender_name, message, initial_value } = await req.json();

        if (!recipient_email || !initial_value) {
            return NextResponse.json({ error: "recipient_email and initial_value are required." }, { status: 400 });
        }

        // Generate unique code (retry up to 3 times on collision)
        let code = "";
        for (let i = 0; i < 3; i++) {
            code = genCode();
            const { data: existing } = await supabaseAdmin
                .from("gift_cards").select("id").eq("code", code).single();
            if (!existing) break;
        }

        // Insert gift card
        const { data: card, error } = await supabaseAdmin
            .from("gift_cards")
            .insert([{
                code,
                initial_value: Number(initial_value),
                remaining_value: Number(initial_value),
                recipient_email,
                recipient_name: recipient_name || null,
                sender_name: sender_name || null,
                message: message || null,
                is_active: true,
            }])
            .select()
            .single();

        if (error || !card) {
            return NextResponse.json({ error: "Failed to create gift card." }, { status: 500 });
        }

        // Send email if Resend is configured
        if (process.env.RESEND_API_KEY) {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            const { data: biz } = await supabaseAdmin
                .from("business_settings").select("business_name, email").eq("id", "default").single();

            const bizName = biz?.business_name || "Miss Tokyo";
            const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop";

            await resend.emails.send({
                from: `${bizName} <${fromEmail}>`,
                to: recipient_email,
                subject: `You've received a ${bizName} Gift Card!`,
                html: `
                <div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
                  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
                    <h1 style="font-size:20px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px;">${bizName}</h1>
                    <p style="color:#737373;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 36px;">Gift Card</p>
                    <p style="font-size:15px;color:#171717;margin:0 0 24px;">
                      ${sender_name ? `<strong>${sender_name}</strong> has sent you a gift card!` : "You have received a gift card!"}
                    </p>
                    ${message ? `<p style="font-size:14px;color:#525252;font-style:italic;margin:0 0 28px;">"${message}"</p>` : ""}
                    <div style="background:#171717;padding:28px;text-align:center;margin-bottom:32px;">
                      <p style="color:#a3a3a3;font-size:10px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 8px;">Your Gift Card Code</p>
                      <p style="color:#fff;font-size:28px;font-family:monospace;letter-spacing:.2em;margin:0;">${code}</p>
                      <p style="color:#a3a3a3;font-size:13px;margin:12px 0 0;">Value: GH₵ ${Number(initial_value).toFixed(2)}</p>
                    </div>
                    <p style="font-size:12px;color:#737373;margin:0 0 12px;">Enter this code at checkout to redeem your gift.</p>
                    <div style="border-top:1px solid #e5e5e5;padding-top:20px;margin-top:20px;">
                      <p style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:.15em;margin:0;">${bizName}</p>
                    </div>
                  </div>
                </div>`,
            });
        }

        return NextResponse.json({ status: "issued", code: card.code, id: card.id });
    } catch (err: any) {
        console.error("[gift-cards/issue]", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
