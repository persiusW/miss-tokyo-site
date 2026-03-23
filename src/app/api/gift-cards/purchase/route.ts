import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateGiftCardCode } from "@/lib/gift-cards";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Record<string, string>;

function validate(body: Record<string, unknown>): FieldErrors {
    const errors: FieldErrors = {};
    const { amount, delivery_mode, recipient_name, recipient_email, sender_name, sender_email, delivery_date } = body as Record<string, string | number | undefined>;
    const amt = Number(amount);

    if (!amount || isNaN(amt) || amt <= 0) errors.amount = "Please enter a valid amount.";
    if (!sender_name || String(sender_name).trim().length < 2) errors.sender_name = "Your name is required.";
    if (!sender_email || !EMAIL_RE.test(String(sender_email))) errors.sender_email = "A valid email is required.";

    if (delivery_mode === "email") {
        if (!recipient_name || String(recipient_name).trim().length < 2) errors.recipient_name = "Recipient name is required.";
        if (!recipient_email || !EMAIL_RE.test(String(recipient_email))) errors.recipient_email = "A valid recipient email is required.";
    }

    if (delivery_date) {
        const d = new Date(String(delivery_date));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(d.getTime()) || d < today) errors.delivery_date = "Delivery date cannot be in the past.";
    }

    return errors;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            amount, delivery_mode = "email",
            recipient_name, recipient_email, personal_message, delivery_date,
            sender_name, sender_email,
        } = body as Record<string, string | number | undefined>;

        // ── Fetch site settings ───────────────────────────────────────────────
        const { data: s } = await supabaseAdmin
            .from("site_settings")
            .select("gc_min_amount, gc_max_amount, gc_never_expires, gc_validity_days")
            .eq("id", "singleton")
            .single();

        const minAmt = Number(s?.gc_min_amount ?? 20);
        const maxAmt = Number(s?.gc_max_amount ?? 500);
        const amt = Number(amount);

        // ── Validate ─────────────────────────────────────────────────────────
        const errors = validate(body);
        if (!errors.amount && (amt < minAmt || amt > maxAmt)) {
            errors.amount = `Amount must be between GH₵${minAmt} and GH₵${maxAmt}.`;
        }
        if (Object.keys(errors).length > 0) {
            return NextResponse.json({ success: false, errors }, { status: 400 });
        }

        // ── Rate limit: 3 purchases per sender email per hour ─────────────────
        const { count } = await supabaseAdmin
            .from("gift_cards")
            .select("id", { count: "exact", head: true })
            .eq("purchased_by_email", String(sender_email))
            .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

        if ((count ?? 0) >= 3) {
            return NextResponse.json(
                { success: false, message: "Too many gift cards purchased recently. Please try again later." },
                { status: 429 }
            );
        }

        // ── Generate unique code ──────────────────────────────────────────────
        const code = await generateGiftCardCode();

        // ── Calculate expiry ──────────────────────────────────────────────────
        let expires_at: string | null = null;
        if (!s?.gc_never_expires) {
            const exp = new Date();
            exp.setDate(exp.getDate() + Number(s?.gc_validity_days ?? 365));
            expires_at = exp.toISOString();
        }

        // ── Insert gift card as pending_payment ───────────────────────────────
        const { data: card, error: insertErr } = await supabaseAdmin
            .from("gift_cards")
            .insert({
                code,
                initial_value: amt,
                remaining_value: amt,
                currency: "GHS",
                status: "pending_payment",
                purchased_by_email: String(sender_email),
                sender_name: String(sender_name),
                recipient_name: recipient_name ? String(recipient_name) : null,
                recipient_email: recipient_email ? String(recipient_email) : null,
                message: personal_message ? String(personal_message) : null,
                delivery_mode: String(delivery_mode),
                delivery_date: delivery_date ? String(delivery_date) : null,
                expires_at,
                is_active: false,
            })
            .select()
            .single();

        if (insertErr || !card) {
            console.error("[gift-cards/purchase] insert error", insertErr);
            return NextResponse.json({ success: false, message: "Failed to create gift card." }, { status: 500 });
        }

        // ── Initialize Paystack payment ───────────────────────────────────────
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
        if (!paystackSecret) {
            // Dev fallback: no Paystack key configured
            return NextResponse.json({ authorizationUrl: null, gift_card_id: card.id, code });
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";
        const amountInPesewas = Math.round(amt * 100);

        const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${paystackSecret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: String(sender_email),
                amount: amountInPesewas,
                currency: "GHS",
                callback_url: `${siteUrl}/gift-cards/success`,
                channels: ["card", "mobile_money", "bank", "bank_transfer", "ussd"],
                metadata: {
                    type: "gift_card",
                    gift_card_id: card.id,
                    code,
                    delivery_mode: String(delivery_mode),
                    recipient_email: recipient_email ? String(recipient_email) : null,
                    recipient_name: recipient_name ? String(recipient_name) : null,
                    sender_email: String(sender_email),
                    sender_name: String(sender_name),
                    personal_message: personal_message ? String(personal_message) : null,
                    delivery_date: delivery_date ? String(delivery_date) : null,
                    expires_at,
                    amount: amt,
                },
            }),
        });

        const paystackData = await paystackRes.json();

        if (!paystackData.status || !paystackData.data?.authorization_url) {
            // Paystack init failed — clean up the pending gift card
            await supabaseAdmin.from("gift_cards").update({ status: "cancelled" }).eq("id", card.id);
            console.error("[gift-cards/purchase] Paystack init failed", paystackData);
            return NextResponse.json(
                { success: false, message: paystackData.message || "Payment initialization failed. Please try again." },
                { status: 400 }
            );
        }

        // Save the Paystack reference on the gift card record
        await supabaseAdmin
            .from("gift_cards")
            .update({ order_id: paystackData.data.reference })
            .eq("id", card.id);

        return NextResponse.json({
            authorizationUrl: paystackData.data.authorization_url,
            reference: paystackData.data.reference,
            gift_card_id: card.id,
        });

    } catch (err: any) {
        console.error("[gift-cards/purchase]", err);
        return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
    }
}
