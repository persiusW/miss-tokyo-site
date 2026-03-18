import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ContactForm } from "./ContactForm";
import { StoreHours } from "./StoreHours";

export const metadata: Metadata = {
    title: "Contact — Miss Tokyo",
    description:
        "Get in touch with the Miss Tokyo team. We're here to help with orders, sizing, returns and more.",
};

export const revalidate = 60;

export default async function ContactPage() {
    const { data: s } = await supabaseAdmin
        .from("site_settings")
        .select(
            "store_email, store_phone, store_address, social_instagram, social_tiktok, hours_weekday, hours_saturday, hours_sunday, hours_note"
        )
        .eq("id", "singleton")
        .single();

    const email = s?.store_email || "";
    const phone = s?.store_phone || "";
    const address = s?.store_address || "";
    const instagram = s?.social_instagram || null;
    const tiktok = s?.social_tiktok || null;
    const hoursWeekday = s?.hours_weekday || "Monday – Friday · 9:00 AM – 6:00 PM";
    const hoursSaturday = s?.hours_saturday || "Saturday · 10:00 AM – 5:00 PM";
    const hoursSunday = s?.hours_sunday || "Sunday · Closed";
    const hoursNote = s?.hours_note || "Online orders accepted 24/7";

    const mapSrc = address
        ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
        : null;

    return (
        <div style={{ background: "var(--sand)" }} className="min-h-screen">
            {/* ── Hero header ──────────────────────────────────────────────── */}
            <header
                className="relative overflow-hidden px-6 py-20 md:py-28"
                style={{ background: "var(--ink)", color: "white" }}
            >
                {/* Watermark */}
                <span
                    aria-hidden
                    className="absolute right-0 top-1/2 -translate-y-1/2 select-none pointer-events-none font-serif font-bold text-[clamp(80px,18vw,200px)] leading-none tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.04)" }}
                >
                    CONTACT
                </span>
                <div className="relative max-w-5xl mx-auto">
                    <h1 className="font-serif text-[clamp(40px,7vw,80px)] font-light leading-tight mb-4">
                        Get in <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Touch</em>
                    </h1>
                    <p className="text-sm md:text-base" style={{ color: "rgba(255,255,255,0.55)" }}>
                        We'd love to hear from you — questions, orders, collabs, anything.
                    </p>
                </div>
            </header>

            {/* ── Two-column section ────────────────────────────────────────── */}
            <section className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
                <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">

                    {/* ── LEFT: Info column ── */}
                    <div className="w-full lg:w-[340px] shrink-0 space-y-6">
                        <div>
                            <h2 className="font-serif text-[clamp(26px,4vw,38px)] font-light leading-snug">
                                We're here<br />
                                to <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Help</em>
                            </h2>
                            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                                Whether you need help with an order, want to know about sizing, or just want to say hi — our team typically responds within a few hours.
                            </p>
                        </div>

                        {/* Contact cards */}
                        <div className="space-y-3">
                            {email && (
                                <a
                                    href={`mailto:${email}`}
                                    className="flex items-center justify-between gap-4 bg-white rounded-xl border border-[var(--border)] px-5 py-4 group hover:border-[var(--ink)] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--sand)" }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Email Us</p>
                                            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{email}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium group-hover:opacity-70 transition-opacity" style={{ color: "var(--gold)" }}>Send →</span>
                                </a>
                            )}

                            {phone && (
                                <a
                                    href={`tel:${phone.replace(/\s/g, "")}`}
                                    className="flex items-center justify-between gap-4 bg-white rounded-xl border border-[var(--border)] px-5 py-4 group hover:border-[var(--ink)] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--sand)" }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.55 3.18 2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 5.47 5.47l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Call Us</p>
                                            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{phone}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium group-hover:opacity-70 transition-opacity" style={{ color: "var(--gold)" }}>Call →</span>
                                </a>
                            )}

                            {address && (
                                <div className="flex items-center gap-4 bg-white rounded-xl border border-[var(--border)] px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--sand)" }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Visit Us</p>
                                            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{address}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Store hours (client — needs today detection) */}
                        <StoreHours
                            weekday={hoursWeekday}
                            saturday={hoursSaturday}
                            sunday={hoursSunday}
                            note={hoursNote}
                        />

                        {/* Social links */}
                        {(instagram || tiktok) && (
                            <div className="flex gap-2">
                                {instagram && (
                                    <a
                                        href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace("@", "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-white text-sm hover:border-[var(--ink)] transition-colors"
                                        style={{ color: "var(--ink)" }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                                        </svg>
                                        Instagram
                                    </a>
                                )}
                                {tiktok && (
                                    <a
                                        href={tiktok.startsWith("http") ? tiktok : `https://tiktok.com/@${tiktok.replace("@", "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-white text-sm hover:border-[var(--ink)] transition-colors"
                                        style={{ color: "var(--ink)" }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.95a8.2 8.2 0 0 0 4.78 1.52V7.03a4.85 4.85 0 0 1-1.01-.34z"/>
                                        </svg>
                                        TikTok
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT: Form card ── */}
                    <div className="flex-1 min-w-0 bg-white rounded-2xl border border-[var(--border)] p-6 md:p-8 shadow-sm">
                        <h2 className="font-serif text-2xl mb-1">Send a Message</h2>
                        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
                            Fill in the form below and we'll get back to you within 24 hours. For urgent order issues, call us directly.
                        </p>
                        <ContactForm storeEmail={email} />
                    </div>
                </div>
            </section>

            {/* ── Map section ─────────────────────────────────────────────── */}
            {(address || mapSrc) && (
                <section style={{ background: "var(--sand-dark)" }} className="py-14 md:py-20">
                    <div className="max-w-6xl mx-auto px-5 md:px-8">
                        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
                            {/* Left: store info */}
                            <div className="w-full lg:w-[300px] shrink-0">
                                <h2 className="font-serif text-[clamp(28px,4vw,42px)] font-light mb-4 leading-snug">
                                    Find <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Us</em>
                                </h2>
                                <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--muted)" }}>
                                    We're located on Dome Road in Accra. Pop in to see our latest stock in person, or shop online from anywhere in Ghana.
                                </p>
                                <div className="space-y-3 text-sm" style={{ color: "var(--muted)" }}>
                                    {address && (
                                        <div className="flex items-start gap-2.5">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                                                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            <span>{address}</span>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-2.5">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        <span>
                                            Mon–Fri {hoursWeekday.split("·")[1]?.trim() || "9AM–6PM"} ·{" "}
                                            Sat {hoursSaturday.split("·")[1]?.trim() || "10AM–5PM"}
                                        </span>
                                    </div>
                                    {phone && (
                                        <div className="flex items-start gap-2.5">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.55 3.18 2 2 0 0 1 3.54 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 5.47 5.47l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                                            </svg>
                                            <span>{phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: map */}
                            <div className="flex-1 min-w-0">
                                {mapSrc ? (
                                    <div className="relative w-full overflow-hidden rounded-lg border border-[var(--border)]" style={{ aspectRatio: "16/9" }}>
                                        <iframe
                                            src={mapSrc}
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0, position: "absolute", inset: 0 }}
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            title="Store location map"
                                        />
                                        {/* Fallback overlay (shown if iframe fails) */}
                                        <noscript>
                                            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm" style={{ background: "var(--sand)", color: "var(--muted)" }}>
                                                Map unavailable — find us at {address}
                                            </div>
                                        </noscript>
                                    </div>
                                ) : address ? (
                                    <div
                                        className="w-full rounded-lg border border-[var(--border)] flex items-center justify-center p-8 text-sm text-center"
                                        style={{ aspectRatio: "16/9", background: "var(--sand)", color: "var(--muted)" }}
                                    >
                                        Map unavailable — find us at {address}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
