import { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = {
    title: "Gift Card Confirmed — Miss Tokyo",
};

async function activateGiftCard(reference: string) {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) return null;

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${paystackSecret}` },
        cache: "no-store",
    });
    const json = await res.json();

    if (!json.status || !json.data) return null;

    const tx = json.data;
    if (tx.status !== "success") return null;

    const meta = tx.metadata || {};
    const { gift_card_id, code, delivery_mode, recipient_email, recipient_name, sender_email, sender_name, personal_message, delivery_date, expires_at, amount } = meta;

    if (!gift_card_id || !code) return null;

    // Activate the gift card (idempotent — safe to call multiple times)
    const { data: card, error } = await supabaseAdmin
        .from("gift_cards")
        .update({ status: "active", is_active: true })
        .eq("id", gift_card_id)
        .neq("status", "active") // only update if not already active
        .select()
        .maybeSingle();

    // Send emails only when we just activated (card will be null if already active)
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
            const amtNum = Number(amount) || Number(tx.amount) / 100;

            const neverExpires = !expires_at;
            const expiryNote = neverExpires
                ? "This gift card never expires."
                : `Valid until ${new Date(expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.`;

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

            await resend.emails.send({
                from: `${bizName} <${fromEmail}>`,
                to: deliveryTo,
                subject: deliverySubject,
                html: giftCardHtml,
            });

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
            console.warn("[gift-cards/success] email send failed (non-fatal):", emailErr);
        }
    }

    return {
        code,
        amount: Number(amount) || Number(tx.amount) / 100,
        delivery_mode,
        recipient_email,
        sender_email,
        delivery_date,
    };
}

export default async function GiftCardSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
    const params = await searchParams;
    const reference = params.reference || params.trxref;

    if (!reference) {
        return <ErrorState message="No payment reference found." />;
    }

    const result = await activateGiftCard(reference);

    if (!result) {
        return <ErrorState message="We couldn't confirm your payment. If you were charged, please contact us with your reference number." reference={reference} />;
    }

    const { code, amount, delivery_mode, recipient_email, sender_email, delivery_date } = result;

    return (
        <div style={{ minHeight: "80vh", background: "#F7F2EC", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
            <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
                {/* Check icon */}
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", border: "2px solid #bbf7d0" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>

                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 300, color: "#141210", marginBottom: 12 }}>
                    Gift Card Purchased!
                </h1>

                <p style={{ fontSize: 14, color: "#8C8479", marginBottom: delivery_mode === "email" ? 8 : 32 }}>
                    Confirmation sent to <strong style={{ color: "#141210" }}>{sender_email}</strong>.
                </p>

                {delivery_mode === "email" && recipient_email && (
                    <p style={{ fontSize: 14, color: "#8C8479", marginBottom: 32 }}>
                        Your gift card will be delivered to{" "}
                        <strong style={{ color: "#141210" }}>{recipient_email}</strong>
                        {delivery_date
                            ? ` on ${new Date(delivery_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
                            : " shortly"}.
                    </p>
                )}

                {/* Code display */}
                <div style={{ background: "#fff", border: "1px solid #e0dbd3", borderRadius: 8, padding: "28px 32px", marginBottom: 32 }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#9c9289", marginBottom: 14 }}>
                        Gift Card Code
                    </p>
                    <p style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, letterSpacing: "0.18em", color: "#141210", marginBottom: 10 }}>
                        {code}
                    </p>
                    <p style={{ fontSize: 13, color: "#9c9289", letterSpacing: "0.1em" }}>
                        GH₵{Number(amount).toFixed(2)}
                    </p>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                    <Link
                        href="/shop"
                        style={{
                            display: "inline-block",
                            background: "#141210",
                            color: "#fff",
                            padding: "14px 40px",
                            fontSize: 11,
                            letterSpacing: "0.22em",
                            textTransform: "uppercase",
                            textDecoration: "none",
                            fontWeight: 600,
                        }}
                    >
                        Continue Shopping
                    </Link>
                    <Link
                        href="/gift-cards"
                        style={{ fontSize: 12, color: "#8C8479", textDecoration: "underline", textUnderlineOffset: 4, letterSpacing: "0.1em" }}
                    >
                        Send another gift card
                    </Link>
                </div>
            </div>
        </div>
    );
}

function ErrorState({ message, reference }: { message: string; reference?: string }) {
    return (
        <div style={{ minHeight: "80vh", background: "#F7F2EC", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
            <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", border: "2px solid #fecaca" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                </div>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 300, color: "#141210", marginBottom: 16 }}>
                    Payment Not Confirmed
                </h1>
                <p style={{ fontSize: 14, color: "#8C8479", marginBottom: 8, lineHeight: 1.7 }}>{message}</p>
                {reference && (
                    <p style={{ fontSize: 12, color: "#9c9289", marginBottom: 32 }}>
                        Reference: <span style={{ fontFamily: "monospace" }}>{reference}</span>
                    </p>
                )}
                <Link
                    href="/gift-cards"
                    style={{
                        display: "inline-block",
                        background: "#141210",
                        color: "#fff",
                        padding: "13px 36px",
                        fontSize: 11,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        textDecoration: "none",
                    }}
                >
                    Try Again
                </Link>
                <br />
                <Link
                    href="/contact"
                    style={{ display: "inline-block", marginTop: 16, fontSize: 12, color: "#8C8479", textDecoration: "underline", textUnderlineOffset: 4 }}
                >
                    Contact us for help
                </Link>
            </div>
        </div>
    );
}
