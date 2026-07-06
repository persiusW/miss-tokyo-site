// Gift card activation + delivery, shared by the /gift-cards/success page and
// the Paystack webhook. Activation is claim-based (only updates a non-active
// card), so whichever path runs first sends the emails and the other is a no-op.

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type GiftCardMeta = {
    gift_card_id?: string;
    code?: string;
    delivery_mode?: string;
    recipient_email?: string | null;
    recipient_name?: string | null;
    sender_email?: string | null;
    sender_name?: string | null;
    personal_message?: string | null;
    delivery_date?: string | null;
    expires_at?: string | null;
    amount?: number | string;
};

/**
 * Idempotently activates a purchased gift card and emails the code.
 * `amountPesewas` is the Paystack transaction amount, used as a fallback when
 * metadata has no amount. Returns null when metadata is incomplete.
 */
export async function activateAndDeliverGiftCard(meta: GiftCardMeta, amountPesewas?: number) {
    const { gift_card_id, code, delivery_mode, recipient_email, recipient_name, sender_email, sender_name, personal_message, delivery_date, expires_at, amount } = meta;

    if (!gift_card_id || !code) return null;

    // Activate the gift card (claim: only one caller sees the updated row)
    const { data: card } = await supabaseAdmin
        .from("gift_cards")
        .update({ status: "active", is_active: true })
        .eq("id", gift_card_id)
        .neq("status", "active")
        .select()
        .maybeSingle();

    const amtNum = Number(amount) || (amountPesewas ? amountPesewas / 100 : 0);

    // Send emails only when we just activated (card is null if already active)
    if (card && process.env.RESEND_API_KEY) {
        try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);

            const { data: biz } = await supabaseAdmin
                .from("business_settings")
                .select("business_name, email, website_url")
                .eq("id", "default")
                .single();

            const bizName = biz?.business_name || "Miss Tokyo";
            const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@info.misstokyo.shop";
            const storeUrl = biz?.website_url || process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

            const neverExpires = !expires_at;
            const expiryNote = neverExpires
                ? "This gift card never expires."
                : `Valid until ${new Date(expires_at!).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.`;

            const quoteBlock = personal_message
                ? `<div style="border-left:3px solid #b5956a;padding:12px 20px;margin:0 0 24px;background:#fafaf9;">
                     <p style="font-size:14px;color:#525252;font-style:italic;margin:0;">"${personal_message}"</p>
                   </div>`
                : "";

            const giftCardHtml = `
<div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
    <h1 style="font-size:18px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 4px;">${bizName}</h1>
    <p style="color:#a3a3a3;font-size:10px;letter-spacing:.25em;text-transform:uppercase;margin:0 0 40px;">Gift Card</p>
    <p style="font-size:16px;color:#171717;margin:0 0 8px;font-weight:600;">
      ${delivery_mode === "email" && sender_name ? `${sender_name} sent you a Gift Card!` : "Your Gift Card is Ready!"}
    </p>
    <p style="font-size:14px;color:#525252;margin:0 0 28px;">
      ${delivery_mode === "email" ? `${recipient_name || "You"} can use this to shop the latest drops at ${bizName}.` : "Use this code at checkout to redeem your gift card."}
    </p>
    ${quoteBlock}
    <div style="background:#171717;padding:32px;text-align:center;margin-bottom:32px;border-radius:4px;">
      <p style="color:#b5956a;font-size:10px;letter-spacing:.25em;text-transform:uppercase;margin:0 0 12px;">Gift Card Code</p>
      <p style="color:#fff;font-size:26px;font-family:monospace;letter-spacing:.18em;margin:0 0 12px;font-weight:700;">${code}</p>
      <p style="color:#a3a3a3;font-size:13px;margin:0;">Value: GH₵${amtNum.toFixed(2)}</p>
    </div>
    <p style="font-size:13px;color:#737373;margin:0 0 8px;">Enter your code at checkout to redeem. It can be used across multiple orders until the balance runs out.</p>
    <p style="font-size:12px;color:#a3a3a3;margin:0 0 32px;">${expiryNote}</p>
    <a href="${storeUrl}/shop" style="display:inline-block;background:#171717;color:#fff;padding:14px 32px;text-decoration:none;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-family:sans-serif;">Shop Now →</a>
    <div style="border-top:1px solid #e5e5e5;padding-top:20px;margin-top:40px;">
      <p style="font-size:11px;color:#a3a3a3;text-transform:uppercase;letter-spacing:.15em;margin:0 0 4px;">${bizName}</p>
      <p style="font-size:11px;color:#a3a3a3;margin:0;">${fromEmail}</p>
    </div>
  </div>
</div>`;

            const deliveryTo = delivery_mode === "email" && recipient_email ? recipient_email : sender_email;
            const deliverySubject = delivery_mode === "email"
                ? `You've received a Gift Card 🎁 — GH₵${amtNum.toFixed(2)} from ${bizName}`
                : `Your ${bizName} Gift Card — GH₵${amtNum.toFixed(2)}`;

            if (deliveryTo) {
                await resend.emails.send({
                    from: `${bizName} <${fromEmail}>`,
                    to: deliveryTo,
                    subject: deliverySubject,
                    html: giftCardHtml,
                });
            }

            if (delivery_mode === "email" && sender_email && sender_email !== recipient_email) {
                const deliveryDateLabel = delivery_date
                    ? new Date(delivery_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                    : "today";

                await resend.emails.send({
                    from: `${bizName} <${fromEmail}>`,
                    to: sender_email,
                    subject: `Gift card sent! — ${bizName}`,
                    html: `
<div style="font-family:Georgia,serif;background:#fafaf9;padding:40px 20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:48px;">
    <h1 style="font-size:18px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 40px;">${bizName}</h1>
    <p style="font-size:16px;color:#171717;margin:0 0 16px;font-weight:600;">Your gift card is confirmed!</p>
    <p style="font-size:14px;color:#525252;margin:0 0 24px;">
      A gift card for <strong>GH₵${amtNum.toFixed(2)}</strong> was sent to <strong>${recipient_email}</strong> on ${deliveryDateLabel}.
    </p>
    <div style="background:#f5f5f4;padding:20px;border-radius:4px;margin:0 0 24px;">
      <p style="font-size:11px;color:#a3a3a3;letter-spacing:.2em;text-transform:uppercase;margin:0 0 8px;">Gift Card Code (for your records)</p>
      <p style="font-family:monospace;font-size:18px;letter-spacing:.15em;color:#171717;margin:0;">${code}</p>
    </div>
    <a href="${storeUrl}/shop" style="display:inline-block;background:#171717;color:#fff;padding:14px 32px;text-decoration:none;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-family:sans-serif;">Shop our latest drops →</a>
    <div style="border-top:1px solid #e5e5e5;padding-top:20px;margin-top:40px;">
      <p style="font-size:11px;color:#a3a3a3;margin:0;">${bizName} · ${fromEmail}</p>
    </div>
  </div>
</div>`,
                });
            }

            // Mark as sent
            await supabaseAdmin
                .from("gift_cards")
                .update({ sent_at: new Date().toISOString() })
                .eq("id", gift_card_id);

        } catch (emailErr) {
            console.warn("[giftCardDelivery] email send failed (non-fatal):", emailErr);
        }
    }

    return {
        code,
        amount: amtNum,
        delivery_mode,
        recipient_email,
        sender_email,
        delivery_date,
    };
}
