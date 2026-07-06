import { Metadata } from "next";
import Link from "next/link";
import { activateAndDeliverGiftCard } from "@/lib/giftCardDelivery";

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

    return activateAndDeliverGiftCard(tx.metadata || {}, Number(tx.amount));
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
