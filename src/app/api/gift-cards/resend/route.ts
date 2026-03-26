import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
    try {
        const serverClient = await createClient();
        const { data: { user } } = await serverClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        const { data: caller } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        if (!caller || !["admin", "owner", "sales_staff"].includes(caller.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { gift_card_id } = await req.json();
        if (!gift_card_id) {
            return NextResponse.json({ error: "gift_card_id is required." }, { status: 400 });
        }

        // Fetch existing gift card
        const { data: card, error } = await supabaseAdmin
            .from("gift_cards")
            .select("*")
            .eq("id", gift_card_id)
            .single();

        if (error || !card) {
            return NextResponse.json({ error: "Gift card not found." }, { status: 404 });
        }

        if (!card.recipient_email) {
            return NextResponse.json({ error: "Gift card has no recipient email." }, { status: 400 });
        }

        // Send email if Resend is configured
        if (process.env.RESEND_API_KEY) {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            const { data: biz } = await supabaseAdmin
                .from("business_settings").select("business_name").eq("id", "default").single();

            const bizName = biz?.business_name || "Miss Tokyo";
            const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop";

            await resend.emails.send({
                from: `${bizName} <${fromEmail}>`,
                to: card.recipient_email,
                subject: `You've received a ${bizName} Gift Card!`,
                html: `
                <div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
                  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
                    <h1 style="font-size:20px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px;">${bizName}</h1>
                    <p style="color:#737373;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 36px;">Gift Card</p>
                    <p style="font-size:15px;color:#171717;margin:0 0 24px;">
                      ${card.sender_name ? `<strong>${card.sender_name}</strong> has sent you a gift card!` : "You have received a gift card!"}
                    </p>
                    ${card.message ? `<p style="font-size:14px;color:#525252;font-style:italic;margin:0 0 28px;">"${card.message}"</p>` : ""}
                    <div style="background:#171717;padding:28px;text-align:center;margin-bottom:32px;">
                      <p style="color:#a3a3a3;font-size:10px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 8px;">Your Gift Card Code</p>
                      <p style="color:#fff;font-size:28px;font-family:monospace;letter-spacing:.2em;margin:0;">${card.code}</p>
                      <p style="color:#a3a3a3;font-size:13px;margin:12px 0 0;">Value: GH₵ ${Number(card.initial_value).toFixed(2)}</p>
                    </div>
                    <p style="font-size:12px;color:#737373;margin:0 0 12px;">Enter this code at checkout to redeem your gift.</p>
                    <div style="border-top:1px solid #e5e5e5;padding-top:20px;margin-top:20px;">
                      <p style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:.15em;margin:0;">${bizName}</p>
                    </div>
                  </div>
                </div>`,
            });
        }

        // Update sent_at timestamp
        await supabaseAdmin
            .from("gift_cards")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", card.id);

        return NextResponse.json({ status: "resent" });
    } catch (err: any) {
        console.error("[gift-cards/resend]", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
