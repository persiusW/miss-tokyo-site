"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, CreditCard, ShieldCheck, Mail, Gift } from "lucide-react";

type Config = {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
    presetAmounts: number[];
    neverExpires: boolean;
    deliveryNote: string;
};

type FieldErrors = Record<string, string>;

type SuccessData = {
    code: string;
    senderEmail: string;
    recipientEmail?: string;
    deliveryDate?: string;
    amount: number;
    deliveryMode: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const todayISO = () => new Date().toISOString().split("T")[0];

// ── Shared field styles (flat/square, matching reference) ─────────────────────
const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #ddd8d0",
    background: "#fff",
    fontSize: 14,
    padding: "10px 12px",
    outline: "none",
    borderRadius: 0,
    color: "#141210",
};
const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#9c9289",
    marginBottom: 6,
    fontWeight: 500,
};

// ── Card preview ──────────────────────────────────────────────────────────────
function GiftCard({
    amount,
    recipientLabel,
    size = "large",
}: {
    amount: number;
    recipientLabel: string;
    size?: "large" | "small";
}) {
    const isLarge = size === "large";

    return (
        <div
            style={{
                width: "100%",
                aspectRatio: "1.586 / 1",
                borderRadius: isLarge ? 14 : 10,
                background: "linear-gradient(145deg, #1c1509 0%, #2e1e08 28%, #1a1307 55%, #100e08 100%)",
                padding: isLarge ? "28px 28px 22px" : "18px 18px 14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                boxShadow: isLarge
                    ? "0 20px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.3)"
                    : "0 6px 24px rgba(0,0,0,0.3)",
            }}
        >
            {/* Subtle noise/grain overlay */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "linear-gradient(135deg, rgba(201,168,76,0.03) 0%, transparent 50%, rgba(201,168,76,0.05) 100%)",
                    pointerEvents: "none",
                }}
            />

            {/* Top row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <span
                    style={{
                        fontSize: isLarge ? 11 : 8,
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.88)",
                        fontWeight: 700,
                    }}
                >
                    MISS TOKYO
                </span>
                {recipientLabel && (
                    <span
                        style={{
                            fontSize: isLarge ? 9 : 7,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: "rgba(201,168,76,0.7)",
                        }}
                    >
                        {recipientLabel}
                    </span>
                )}
                {!recipientLabel && (
                    <span
                        style={{
                            fontSize: isLarge ? 9 : 7,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: "rgba(201,168,76,0.45)",
                        }}
                    >
                        For Someone Special
                    </span>
                )}
            </div>

            {/* Chip */}
            <div
                style={{
                    position: "absolute",
                    top: isLarge ? 72 : 48,
                    left: isLarge ? 28 : 18,
                    width: isLarge ? 42 : 28,
                    height: isLarge ? 32 : 21,
                    background: "linear-gradient(145deg, #c9a84c 0%, #e2c87a 45%, #b08a38 100%)",
                    borderRadius: 4,
                    opacity: 0.95,
                }}
            />

            {/* Bottom row */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <span
                    style={{
                        fontFamily: "Georgia, serif",
                        fontSize: isLarge ? 36 : 24,
                        fontWeight: 300,
                        color: "#c9a84c",
                        lineHeight: 1,
                        letterSpacing: "-0.01em",
                    }}
                >
                    GH₵{amount > 0 ? amount.toLocaleString() : "—"}
                </span>
                <span
                    style={{
                        fontSize: isLarge ? 8 : 6,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.28)",
                    }}
                >
                    Gift Card
                </span>
            </div>
        </div>
    );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
    {
        q: "Do Miss Tokyo gift cards expire?",
        a: "No. Miss Tokyo gift cards never expire. Use them anytime across as many orders as you like until the balance is gone.",
    },
    {
        q: "Can I use a gift card with a discount code?",
        a: "Yes. At checkout you can apply both a gift card and a discount code — they work independently and stack.",
    },
    {
        q: "What if I entered the wrong email?",
        a: "Contact us right away and we'll resend the gift card to the correct address. Include the sender name and amount so we can locate it quickly.",
    },
    {
        q: "Can a gift card be used across multiple orders?",
        a: "Yes. Your balance carries over automatically between orders until it's fully used.",
    },
    {
        q: "Are gift cards refundable?",
        a: "Gift card purchases are non-refundable. If you have an issue please reach out and we'll do our best to help.",
    },
];

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderBottom: "1px solid #e0dbd3" }}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px 0",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    gap: 16,
                }}
            >
                <span style={{ fontSize: 14, color: "#141210" }}>{q}</span>
                <span
                    style={{
                        fontSize: 20,
                        color: "#9c9289",
                        lineHeight: 1,
                        flexShrink: 0,
                        transform: open ? "rotate(45deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        display: "inline-block",
                    }}
                >
                    +
                </span>
            </button>
            <div
                style={{
                    overflow: "hidden",
                    maxHeight: open ? 200 : 0,
                    transition: "max-height 0.3s ease",
                }}
            >
                <p style={{ fontSize: 14, color: "#8C8479", lineHeight: 1.7, paddingBottom: 20 }}>{a}</p>
            </div>
        </div>
    );
}

// ── Success state ─────────────────────────────────────────────────────────────
function SuccessCard({ data, onReset }: { data: SuccessData; onReset: () => void }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(data.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };
    return (
        <div style={{ textAlign: "center", padding: "80px 24px", maxWidth: 480, margin: "0 auto" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <Check size={26} color="#16a34a" />
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 300, marginBottom: 12 }}>Gift Card Purchased!</h2>
            <p style={{ fontSize: 14, color: "#8C8479", marginBottom: 8 }}>
                Confirmation sent to <strong style={{ color: "#141210" }}>{data.senderEmail}</strong>.
            </p>
            {data.deliveryMode === "email" && data.recipientEmail && (
                <p style={{ fontSize: 14, color: "#8C8479", marginBottom: 32 }}>
                    Your gift card will be delivered to <strong style={{ color: "#141210" }}>{data.recipientEmail}</strong>
                    {data.deliveryDate ? ` on ${new Date(data.deliveryDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` : " shortly"}.
                </p>
            )}
            <div style={{ background: "#f9f6f2", border: "1px solid #e0dbd3", borderRadius: 8, padding: 24, marginBottom: 32 }}>
                <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9c9289", marginBottom: 12 }}>Gift Card Code</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, letterSpacing: "0.18em", color: "#141210" }}>{data.code}</span>
                    <button type="button" onClick={copy} style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#16a34a" : "#9c9289" }}>
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                </div>
                <p style={{ fontSize: 11, color: "#9c9289", marginTop: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>GH₵{data.amount.toLocaleString()}</p>
            </div>
            <button type="button" onClick={onReset} style={{ background: "none", border: "none", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8C8479", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4 }}>
                Send another gift card
            </button>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function GiftCardPageClient({ config }: { config: Config }) {
    const [amount, setAmount] = useState(config.presetAmounts[1] ?? 100);
    const [customAmt, setCustomAmt] = useState("");
    const [isCustom, setIsCustom] = useState(false);
    const [deliveryMode, setDeliveryMode] = useState<"email" | "self">("email");
    const [recipientName, setRecipientName] = useState("");
    const [recipientEmail, setRecipientEmail] = useState("");
    const [message, setMessage] = useState("");
    const [deliveryDate, setDeliveryDate] = useState(todayISO());
    const [senderName, setSenderName] = useState("");
    const [senderEmail, setSenderEmail] = useState("");
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<SuccessData | null>(null);

    const displayAmount = isCustom ? parseFloat(customAmt) || 0 : amount;
    const cardLabel =
        deliveryMode === "email" && recipientName.trim()
            ? recipientName.trim()
            : "";

    const selectPreset = (val: number) => {
        setAmount(val);
        setIsCustom(false);
        setCustomAmt("");
        setErrors(e => ({ ...e, amount: "" }));
    };

    function clientValidate(): FieldErrors {
        const e: FieldErrors = {};
        if (!displayAmount || displayAmount < config.minAmount || displayAmount > config.maxAmount) {
            e.amount = `Amount must be between GH₵${config.minAmount} and GH₵${config.maxAmount}.`;
        }
        if (deliveryMode === "email") {
            if (!recipientName.trim()) e.recipient_name = "Recipient name is required.";
            if (!EMAIL_RE.test(recipientEmail)) e.recipient_email = "Enter a valid email address.";
        }
        if (!senderName.trim()) e.sender_name = "Your name is required.";
        if (!EMAIL_RE.test(senderEmail)) e.sender_email = "Enter a valid email address.";
        return e;
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const errs = clientValidate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setErrors({});
        setSubmitting(true);
        try {
            const res = await fetch("/api/gift-cards/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: displayAmount,
                    delivery_mode: deliveryMode,
                    recipient_name: deliveryMode === "email" ? recipientName : undefined,
                    recipient_email: deliveryMode === "email" ? recipientEmail : undefined,
                    personal_message: message || undefined,
                    delivery_date: deliveryDate || undefined,
                    sender_name: senderName,
                    sender_email: senderEmail,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.errors) setErrors(data.errors);
                else setErrors({ _: data.message || "Something went wrong. Please try again." });
                return;
            }
            // Redirect to Paystack checkout
            if (data.authorizationUrl) {
                window.location.href = data.authorizationUrl;
                return;
            }
            // Fallback if no Paystack key (dev mode)
            setErrors({ _: "Payment could not be initialized. Please try again." });
        } catch {
            setErrors({ _: "Network error. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setSuccess(null);
        setAmount(config.presetAmounts[1] ?? 100);
        setCustomAmt(""); setIsCustom(false); setDeliveryMode("email");
        setRecipientName(""); setRecipientEmail(""); setMessage("");
        setDeliveryDate(todayISO()); setSenderName(""); setSenderEmail(""); setErrors({});
    };

    if (!config.enabled) {
        return (
            <div style={{ minHeight: "80vh", background: "#141210", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 24px", color: "white" }}>
                <p style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>Coming soon</p>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 48, fontWeight: 300, marginBottom: 20 }}>Gift Cards</h1>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", maxWidth: 320 }}>We're working on something special. Gift cards will be available soon.</p>
                <Link href="/shop" style={{ marginTop: 40, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", textDecoration: "underline" }}>Continue Shopping</Link>
            </div>
        );
    }

    return (
        <div>
            {/* ══════════════════════════════════════════════════════════════════
                1. HERO
            ══════════════════════════════════════════════════════════════════ */}
            <section style={{ background: "#141210", padding: "72px 48px 80px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
                    {/* Left */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                            <span style={{ display: "inline-block", width: 32, height: 1, background: "rgba(255,255,255,0.35)" }} />
                            <span style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
                                The Perfect Gift
                            </span>
                        </div>
                        <h1
                            style={{
                                fontFamily: "Georgia, serif",
                                fontSize: "clamp(52px, 7vw, 84px)",
                                fontWeight: 300,
                                lineHeight: 1.05,
                                color: "white",
                                marginBottom: 28,
                            }}
                        >
                            Give the
                            <br />
                            Gift of{" "}
                            <em style={{ fontStyle: "italic", color: "#c9a84c" }}>Style</em>
                        </h1>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 300 }}>
                            {config.deliveryNote}
                        </p>
                    </div>

                    {/* Right — live card */}
                    <div style={{ maxWidth: 420 }}>
                        <GiftCard amount={displayAmount} recipientLabel={cardLabel} size="large" />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════════
                2. FORM + ORDER SUMMARY
            ══════════════════════════════════════════════════════════════════ */}
            <section style={{ background: "#F7F2EC", padding: "72px 48px 80px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    {success ? (
                        <SuccessCard data={success} onReset={handleReset} />
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 56, alignItems: "start" }}>

                            {/* ── Form ─────────────────────────────────────── */}
                            <form onSubmit={handleSubmit} noValidate>

                                {/* Global error */}
                                {errors._ && (
                                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, padding: "10px 14px", marginBottom: 28 }}>
                                        {errors._}
                                    </div>
                                )}

                                {/* Amount heading */}
                                <h2
                                    style={{
                                        fontFamily: "Georgia, serif",
                                        fontSize: "clamp(28px, 3.5vw, 40px)",
                                        fontWeight: 300,
                                        color: "#141210",
                                        marginBottom: 8,
                                        lineHeight: 1.1,
                                    }}
                                >
                                    Choose Your{" "}
                                    <em style={{ fontStyle: "italic", color: "#c9a84c" }}>Amount</em>
                                </h2>
                                <p style={{ fontSize: 13, color: "#8C8479", marginBottom: 24 }}>
                                    Pick a preset amount or enter a custom value between GH₵{config.minAmount} and GH₵{config.maxAmount}.
                                </p>

                                {/* Preset grid */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                                    {config.presetAmounts.map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => selectPreset(val)}
                                            style={{
                                                padding: "11px 0",
                                                fontSize: 13,
                                                border: "1px solid",
                                                borderColor: !isCustom && amount === val ? "#141210" : "#d8d3cb",
                                                background: !isCustom && amount === val ? "#141210" : "#fff",
                                                color: !isCustom && amount === val ? "#fff" : "#141210",
                                                cursor: "pointer",
                                                borderRadius: 0,
                                                transition: "all 0.15s",
                                            }}
                                        >
                                            GH₵{val}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom amount */}
                                <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9c9289", marginBottom: 8 }}>
                                    Or enter a custom amount
                                </p>
                                <div style={{ position: "relative", marginBottom: 4 }}>
                                    <input
                                        type="number"
                                        value={customAmt}
                                        onChange={e => { setCustomAmt(e.target.value); setIsCustom(true); setErrors(er => ({ ...er, amount: "" })); }}
                                        onFocus={() => setIsCustom(true)}
                                        min={config.minAmount}
                                        max={config.maxAmount}
                                        placeholder={`e.g. ${Math.round((config.minAmount + config.maxAmount) / 2)}`}
                                        style={{ ...inputStyle, paddingRight: 40 }}
                                    />
                                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9c9289", pointerEvents: "none" }}>GH₵</span>
                                </div>
                                {errors.amount && <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 0 }}>{errors.amount}</p>}

                                {/* Personalise section */}
                                <div style={{ marginTop: 36 }}>
                                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 400, color: "#141210", marginBottom: 16 }}>
                                        Personalise It
                                    </h3>

                                    {/* Mode toggle */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginBottom: 24 }}>
                                        <button
                                            type="button"
                                            onClick={() => setDeliveryMode("email")}
                                            style={{
                                                padding: "13px 0",
                                                fontSize: 11,
                                                letterSpacing: "0.18em",
                                                textTransform: "uppercase",
                                                fontWeight: 600,
                                                border: "1px solid",
                                                borderColor: deliveryMode === "email" ? "#141210" : "#d8d3cb",
                                                background: deliveryMode === "email" ? "#141210" : "#fff",
                                                color: deliveryMode === "email" ? "#fff" : "#8C8479",
                                                cursor: "pointer",
                                                borderRadius: 0,
                                            }}
                                        >
                                            Send by Email
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeliveryMode("self")}
                                            style={{
                                                padding: "13px 0",
                                                fontSize: 11,
                                                letterSpacing: "0.18em",
                                                textTransform: "uppercase",
                                                fontWeight: 600,
                                                border: "1px solid",
                                                borderLeft: "none",
                                                borderColor: deliveryMode === "self" ? "#141210" : "#d8d3cb",
                                                background: deliveryMode === "self" ? "#141210" : "#fff",
                                                color: deliveryMode === "self" ? "#fff" : "#8C8479",
                                                cursor: "pointer",
                                                borderRadius: 0,
                                            }}
                                        >
                                            Buy for Myself
                                        </button>
                                    </div>

                                    {/* Recipient fields */}
                                    {deliveryMode === "email" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                                <div>
                                                    <label style={labelStyle}>Recipient Name</label>
                                                    <input
                                                        type="text"
                                                        value={recipientName}
                                                        onChange={e => { setRecipientName(e.target.value); setErrors(er => ({ ...er, recipient_name: "" })); }}
                                                        placeholder="e.g. Abena"
                                                        style={inputStyle}
                                                    />
                                                    {errors.recipient_name && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{errors.recipient_name}</p>}
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Recipient Email</label>
                                                    <input
                                                        type="email"
                                                        value={recipientEmail}
                                                        onChange={e => { setRecipientEmail(e.target.value); setErrors(er => ({ ...er, recipient_email: "" })); }}
                                                        placeholder="abena@email.com"
                                                        style={inputStyle}
                                                    />
                                                    {errors.recipient_email && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{errors.recipient_email}</p>}
                                                </div>
                                            </div>

                                            <div>
                                                <label style={labelStyle}>Personal Message (Optional)</label>
                                                <textarea
                                                    rows={3}
                                                    maxLength={300}
                                                    value={message}
                                                    onChange={e => setMessage(e.target.value)}
                                                    placeholder="Happy birthday! Treat yourself to something beautiful 💛"
                                                    style={{ ...inputStyle, resize: "none", height: "auto" }}
                                                />
                                            </div>

                                            <div>
                                                <label style={labelStyle}>Delivery Date</label>
                                                <input
                                                    type="date"
                                                    min={todayISO()}
                                                    value={deliveryDate}
                                                    onChange={e => setDeliveryDate(e.target.value)}
                                                    style={inputStyle}
                                                />
                                                {errors.delivery_date && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{errors.delivery_date}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Your details */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: deliveryMode === "self" ? 8 : 0 }}>
                                    <div>
                                        <label style={labelStyle}>Your Name</label>
                                        <input
                                            type="text"
                                            value={senderName}
                                            onChange={e => { setSenderName(e.target.value); setErrors(er => ({ ...er, sender_name: "" })); }}
                                            placeholder="Your name"
                                            style={inputStyle}
                                        />
                                        {errors.sender_name && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{errors.sender_name}</p>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Your Email</label>
                                        <input
                                            type="email"
                                            value={senderEmail}
                                            onChange={e => { setSenderEmail(e.target.value); setErrors(er => ({ ...er, sender_email: "" })); }}
                                            placeholder="your@email.com"
                                            style={inputStyle}
                                        />
                                        {errors.sender_email && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{errors.sender_email}</p>}
                                    </div>
                                </div>
                            </form>

                            {/* ── Order Summary ─────────────────────────────── */}
                            <div style={{ position: "sticky", top: 24 }}>
                                <div style={{ background: "#fff", border: "1px solid #e0dbd3" }}>
                                    {/* Header */}
                                    <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0ece6" }}>
                                        <p style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 400, color: "#141210", marginBottom: 16 }}>
                                            Order Summary
                                        </p>
                                        <GiftCard amount={displayAmount} recipientLabel={cardLabel} size="small" />
                                    </div>

                                    {/* Line items */}
                                    <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0ece6" }}>
                                        {[
                                            { label: "Gift card value", value: displayAmount > 0 ? `GH₵${displayAmount.toFixed(2)}` : "—", valueColor: "#141210" },
                                            { label: "Delivery", value: "Free", valueColor: "#16a34a" },
                                            { label: "Delivery method", value: deliveryMode === "email" ? "Email" : "My account", valueColor: "#141210" },
                                        ].map(({ label, value, valueColor }) => (
                                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f5f1ec" }}>
                                                <span style={{ fontSize: 13, color: "#8C8479" }}>{label}</span>
                                                <span style={{ fontSize: 13, color: valueColor }}>{value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Total */}
                                    <div style={{ padding: "14px 24px", borderBottom: "1px solid #f0ece6" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#141210" }}>Total</span>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: "#141210" }}>
                                                GH₵{displayAmount > 0 ? displayAmount.toFixed(2) : "—"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Purchase button */}
                                    <div style={{ padding: "16px 24px 20px" }}>
                                        <button
                                            type="button"
                                            onClick={() => handleSubmit()}
                                            disabled={submitting}
                                            style={{
                                                width: "100%",
                                                background: submitting ? "#666" : "#141210",
                                                color: "#fff",
                                                border: "none",
                                                padding: "14px 0",
                                                fontSize: 11,
                                                letterSpacing: "0.2em",
                                                textTransform: "uppercase",
                                                fontWeight: 600,
                                                cursor: submitting ? "not-allowed" : "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 8,
                                                borderRadius: 0,
                                                transition: "background 0.15s",
                                            }}
                                        >
                                            <CreditCard size={13} />
                                            {submitting ? "Processing…" : "Purchase Gift Card"}
                                        </button>
                                        <p style={{ textAlign: "center", fontSize: 11, color: "#9c9289", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                            <span style={{ display: "inline-block", width: 12, height: 12, border: "1px solid #d8d3cb", borderRadius: "50%" }} />
                                            Secure checkout · Mobile money accepted
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════════
                3. HOW IT WORKS
            ══════════════════════════════════════════════════════════════════ */}
            <section style={{ background: "#ffffff", padding: "80px 48px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <div style={{ textAlign: "center", marginBottom: 56 }}>
                        <p style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#9c9289", marginBottom: 12 }}>
                            Simple &amp; Instant
                        </p>
                        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 300, color: "#141210" }}>
                            How It <em style={{ fontStyle: "italic", color: "#c9a84c" }}>Works</em>
                        </h2>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40, textAlign: "center" }}>
                        {[
                            { icon: <ShieldCheck size={20} color="#8C8479" />, n: "01", title: "Choose an amount", body: `Pick from GH₵${config.minAmount} to GH₵${config.maxAmount} or enter a custom value that feels right.` },
                            { icon: <Mail size={20} color="#8C8479" />, n: "02", title: "Personalise it", body: "Add their name, a message, and choose when you'd like it delivered." },
                            { icon: <CreditCard size={20} color="#8C8479" />, n: "03", title: "Checkout securely", body: "Pay with mobile money, card, or bank transfer. Instant confirmation." },
                            { icon: <Gift size={20} color="#8C8479" />, n: "04", title: "They shop & enjoy", body: "The recipient gets an email with their code. It never expires. No strings attached." },
                        ].map(({ icon, n, title, body }) => (
                            <div key={n}>
                                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f4f0eb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                                    {icon}
                                </div>
                                <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 10 }}>{n}</p>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "#141210", marginBottom: 8 }}>{title}</p>
                                <p style={{ fontSize: 12, color: "#8C8479", lineHeight: 1.65 }}>{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════════
                4. FAQ
            ══════════════════════════════════════════════════════════════════ */}
            <section style={{ background: "#F7F2EC", padding: "80px 48px" }}>
                <div style={{ maxWidth: 760, margin: "0 auto" }}>
                    <div style={{ textAlign: "center", marginBottom: 48 }}>
                        <p style={{ fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "#9c9289", marginBottom: 12 }}>
                            Got Questions?
                        </p>
                        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(30px, 4vw, 44px)", fontWeight: 300, color: "#141210" }}>
                            Frequently <em style={{ fontStyle: "italic", color: "#c9a84c" }}>Asked</em>
                        </h2>
                    </div>

                    <div>
                        {/* First item has top border */}
                        <div style={{ borderTop: "1px solid #e0dbd3" }}>
                            {FAQS.map(({ q, a }) => (
                                <FaqItem key={q} q={q} a={a} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
