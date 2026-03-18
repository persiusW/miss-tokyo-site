"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { AboutTimelineEntry, AboutValue, AboutTeamMember } from "@/types/settings";

// ── Animation hook ────────────────────────────────────────────────────────────
function useReveal<T extends HTMLElement = HTMLDivElement>(delay = 0) {
    const ref = useRef<T>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
        el.style.transition = `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`;
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.style.opacity = "1";
                    el.style.transform = "translateY(0)";
                    obs.disconnect();
                }
            },
            { threshold: 0.12 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [delay]);
    return ref;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Renders text with the last word in italic gold */
function GoldLastWord({ text }: { text: string }) {
    const i = text.lastIndexOf(" ");
    if (i === -1) return <em style={{ color: "var(--gold)", fontStyle: "italic" }}>{text}</em>;
    return <>{text.slice(0, i + 1)}<em style={{ color: "var(--gold)", fontStyle: "italic" }}>{text.slice(i + 1)}</em></>;
}

const ICONS: Record<string, React.ReactNode> = {
    heart: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
    ),
    shield: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
    ),
    users: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    ),
    globe: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
    ),
    message: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    ),
    "trending-up": (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
    ),
};

// ── Animated wrappers ─────────────────────────────────────────────────────────
function Reveal({ delay = 0, className = "", children }: { delay?: number; className?: string; children: React.ReactNode }) {
    const ref = useReveal<HTMLDivElement>(delay);
    return <div ref={ref} className={className}>{children}</div>;
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
    eyebrow: string; headLine1: string; headLine2: string;
    p1: string; p2: string; p3: string;
    stat1Value: string; stat1Label: string;
    stat2Value: string; stat2Label: string;
    stat3Value: string; stat3Label: string;
    storyHeading: string; storyP1: string; storyP2: string;
    quoteText: string; quoteAuthor: string;
    timeline: AboutTimelineEntry[];
    values: AboutValue[];
    team: AboutTeamMember[];
    ctaEyebrow: string; ctaHeadline: string; ctaBody: string;
    ctaBtnLabel: string; ctaBtnUrl: string;
};

export function AboutSections(p: Props) {
    // CTA headline: split on "Miss Tokyo" for gold styling
    const ctaParts = p.ctaHeadline.split("Miss Tokyo");

    return (
        <>
            {/* ── 1. HERO ──────────────────────────────────────────────────── */}
            <section
                className="min-h-screen flex flex-col justify-center px-6 md:px-16 py-24 relative"
                style={{ background: "var(--ink)", color: "white" }}
            >
                <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center flex-1">
                    {/* Left */}
                    <div>
                        <p className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] mb-8" style={{ color: "var(--gold)" }}>
                            <span className="inline-block w-8 h-px" style={{ background: "var(--gold)" }} />
                            {p.eyebrow}
                        </p>
                        <h1
                            className="font-serif font-light leading-[1.05]"
                            style={{ fontSize: "clamp(52px, 8vw, 110px)" }}
                        >
                            <GoldLastWord text={p.headLine1} />
                            <br />
                            <GoldLastWord text={p.headLine2} />
                        </h1>
                    </div>

                    {/* Right */}
                    <div>
                        <div className="space-y-5 mb-10" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.75 }}>
                            <p className="text-[15px]">{p.p1}</p>
                            <p className="text-[15px]">{p.p2}</p>
                            <p className="text-[15px]">{p.p3}</p>
                        </div>

                        {/* Stats — stacked with dividers */}
                        <div className="space-y-0 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                            {[
                                { v: p.stat1Value, l: p.stat1Label },
                                { v: p.stat2Value, l: p.stat2Label },
                                { v: p.stat3Value, l: p.stat3Label },
                            ].map(({ v, l }) => (
                                <div key={l} className="py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                                    <p className="font-serif font-light leading-none mb-1" style={{ fontSize: "clamp(48px, 6vw, 80px)" }}>
                                        {v}
                                    </p>
                                    <p className="text-xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>{l}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                    <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.3)" }}>Scroll</p>
                    <div className="w-px h-12 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <div
                            className="absolute top-0 left-0 w-full"
                            style={{
                                background: "var(--gold)",
                                height: "40%",
                                animation: "scrollLine 1.8s ease-in-out infinite",
                            }}
                        />
                    </div>
                </div>
                <style>{`@keyframes scrollLine { 0%{transform:translateY(-100%)} 100%{transform:translateY(350%)} }`}</style>
            </section>

            {/* ── 2. STORY ─────────────────────────────────────────────────── */}
            <section style={{ background: "var(--sand)" }}>
                {/* 2a. Story header */}
                <div className="max-w-7xl mx-auto px-6 md:px-16 py-20 md:py-28">
                    <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
                        <h2 className="font-serif font-light leading-tight" style={{ fontSize: "clamp(36px, 5vw, 60px)" }}>
                            <GoldLastWord text={p.storyHeading} />
                        </h2>
                        <div className="space-y-5 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
                            <p>{p.storyP1}</p>
                            <p>{p.storyP2}</p>
                        </div>
                    </Reveal>

                    {/* 2b. Image grid — TODO: connect to CMS image upload in a future phase */}
                    <Reveal delay={100} className="mt-16 grid grid-cols-2 gap-4">
                        {/* Left: tall portrait */}
                        <div className="relative overflow-hidden rounded-sm" style={{ aspectRatio: "3/4" }}>
                            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #3d2116 0%, #c4896a 100%)" }} />
                            <span className="absolute bottom-3 left-4 text-[9px] uppercase tracking-[0.2em] text-white/60">Dome Road, Accra</span>
                        </div>
                        {/* Right: two stacked landscape */}
                        <div className="flex flex-col gap-4">
                            <div className="relative overflow-hidden rounded-sm flex-1">
                                <div className="absolute inset-0 w-full h-full" style={{ background: "linear-gradient(135deg, #1a1240 0%, #c4386a 60%, #e8a030 100%)" }} />
                                <span className="absolute bottom-3 left-4 text-[9px] uppercase tracking-[0.2em] text-white/60">New Arrivals, Weekly</span>
                            </div>
                            <div className="relative overflow-hidden rounded-sm flex-1">
                                <div className="absolute inset-0 w-full h-full" style={{ background: "linear-gradient(135deg, #0a3020 0%, #059669 100%)" }} />
                                <span className="absolute bottom-3 left-4 text-[9px] uppercase tracking-[0.2em] text-white/60">Curated with Love</span>
                            </div>
                        </div>
                    </Reveal>
                </div>

                {/* 2c. Pull quote */}
                <Reveal>
                    <div className="py-20 md:py-24 px-6 md:px-16 text-center" style={{ background: "var(--ink)", color: "white" }}>
                        <blockquote className="font-serif font-light italic max-w-4xl mx-auto" style={{ fontSize: "clamp(22px, 3.5vw, 42px)", lineHeight: 1.4 }}>
                            "{p.quoteText.replace(/owning it/, '')}<em style={{ color: "var(--gold)" }}>owning it.</em>"
                        </blockquote>
                        <p className="mt-6 text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                            — {p.quoteAuthor.toUpperCase()}
                        </p>
                    </div>
                </Reveal>

                {/* 2d. Timeline */}
                <div className="max-w-7xl mx-auto px-6 md:px-16 py-20 md:py-28">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                        {p.timeline.map((entry, i) => (
                            <Reveal key={i} delay={i * 50}>
                                <div className="border-t py-10 pr-8" style={{ borderColor: "var(--border)" }}>
                                    <p className="font-serif font-light mb-2" style={{ fontSize: "clamp(36px, 4vw, 56px)", color: "var(--gold)" }}>
                                        {entry.year}
                                    </p>
                                    <p className="font-semibold text-sm mb-2" style={{ color: "var(--ink)" }}>{entry.title}</p>
                                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{entry.body}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 3. VALUES ────────────────────────────────────────────────── */}
            <section className="bg-white py-20 md:py-28 px-6 md:px-16">
                <div className="max-w-7xl mx-auto">
                    <Reveal>
                        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "var(--muted)" }}>What we stand for</p>
                        <h2 className="font-serif font-light mb-14" style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>
                            Our <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Values</em>
                        </h2>
                    </Reveal>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {p.values.map((v, i) => (
                            <Reveal key={i} delay={i * 80}>
                                <div
                                    className="border rounded-xl p-6 transition-all duration-300 cursor-default"
                                    style={{ borderColor: "var(--border)" }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                                        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.07)";
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.transform = "";
                                        (e.currentTarget as HTMLElement).style.boxShadow = "";
                                    }}
                                >
                                    <div className="mb-4" style={{ color: "var(--muted)" }}>
                                        {ICONS[v.icon] ?? ICONS["heart"]}
                                    </div>
                                    <p className="font-semibold text-sm mb-2" style={{ color: "var(--ink)" }}>{v.title}</p>
                                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{v.body}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 4. TEAM ──────────────────────────────────────────────────── */}
            <section className="py-20 md:py-28 px-6 md:px-16" style={{ background: "var(--sand)" }}>
                <div className="max-w-7xl mx-auto">
                    <Reveal>
                        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "var(--muted)" }}>The people behind the brand</p>
                        <h2 className="font-serif font-light mb-14" style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>
                            Meet the <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Team</em>
                        </h2>
                    </Reveal>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {p.team.map((member, i) => (
                            <Reveal key={i} delay={i * 80}>
                                {/* Avatar */}
                                <div
                                    className="w-full mb-4 rounded-sm overflow-hidden"
                                    style={{ aspectRatio: "3/4" }}
                                >
                                    {member.photo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div
                                            className="w-full h-full"
                                            style={{
                                                background: `linear-gradient(135deg, ${member.avatar_color}88, ${member.avatar_color})`,
                                            }}
                                        />
                                    )}
                                </div>
                                <p className="font-serif text-base" style={{ color: "var(--ink)" }}>{member.name}</p>
                                <p className="text-[9px] uppercase tracking-widest mt-0.5 mb-2" style={{ color: "var(--muted)" }}>{member.role}</p>
                                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{member.bio}</p>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 5. CTA ───────────────────────────────────────────────────── */}
            <Reveal>
                <section className="py-20 md:py-28 px-6 text-center" style={{ background: "var(--sand)" }}>
                    <div className="max-w-2xl mx-auto">
                        <p className="text-[10px] uppercase tracking-[0.25em] mb-6" style={{ color: "var(--muted)" }}>
                            {p.ctaEyebrow}
                        </p>
                        <h2 className="font-serif font-light leading-tight mb-6" style={{ fontSize: "clamp(38px, 5vw, 64px)" }}>
                            {ctaParts.length > 1 ? (
                                <>
                                    {ctaParts[0]}
                                    <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Miss Tokyo</em>
                                    {ctaParts[1]}
                                </>
                            ) : (
                                p.ctaHeadline
                            )}
                        </h2>
                        <p className="text-[15px] leading-relaxed mb-10" style={{ color: "var(--muted)" }}>{p.ctaBody}</p>
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            <Link
                                href={p.ctaBtnUrl}
                                className="px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
                                style={{ background: "var(--ink)" }}
                            >
                                {p.ctaBtnLabel} →
                            </Link>
                            <Link
                                href="/contact"
                                className="px-8 py-3.5 text-xs font-semibold uppercase tracking-widest border transition-colors hover:bg-black hover:text-white hover:border-black"
                                style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
                            >
                                Get in Touch
                            </Link>
                        </div>
                    </div>
                </section>
            </Reveal>
        </>
    );
}
