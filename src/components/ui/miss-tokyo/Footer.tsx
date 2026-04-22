"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ── Static SVG icon map — no dangerouslySetInnerHTML (SEC-13) ────────────────
function SocialIcon({ label }: { label: string }) {
    const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true as const };
    switch (label) {
        case "Instagram": return (
            <svg {...props}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
        );
        case "TikTok": return (
            <svg {...props}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.98a8.22 8.22 0 004.82 1.55V7.1a4.83 4.83 0 01-1.05-.41z" /></svg>
        );
        case "Facebook": return (
            <svg {...props}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
        );
        case "Twitter": return (
            <svg {...props}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        );
        case "Pinterest": return (
            <svg {...props}><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" /></svg>
        );
        case "YouTube": return (
            <svg {...props}><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" /></svg>
        );
        case "Snapchat": return (
            <svg {...props}><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.304 4.456-.79.089-1.347.345-1.347.69 0 .345.408.6.95.767 0 .167.014.301.028.453-.054.095-.19.32-.576.32-.23 0-.506-.083-.798-.205a3.975 3.975 0 00-1.458-.304c-.277 0-.55.027-.804.083-.013.024-.026.047-.04.07-.52.985-1.58 1.707-2.88 1.707-1.298 0-2.357-.722-2.877-1.707l-.038-.07c-.256-.056-.527-.083-.804-.083-.55 0-1.06.11-1.457.304-.293.122-.569.205-.799.205-.385 0-.523-.225-.576-.32.014-.152.028-.286.028-.453.542-.167.95-.422.95-.767 0-.345-.556-.601-1.347-.69-.099-1.237-.225-3.263.304-4.456C7.86 1.069 11.218.793 12.206.793z" /></svg>
        );
        case "Threads": return (
            <svg {...props}><path d="M19.59 13.428c-.012-1.29-.51-2.446-1.36-3.27-.85-.826-2.04-1.28-3.356-1.28-.017 0-.035 0-.052.001-.77.009-1.472.22-2.06.611.102-.42.16-.86.16-1.316 0-3.233-2.617-5.85-5.85-5.85-1.03 0-1.98.27-2.797.734.24-.752.37-1.554.37-2.388C4.645 1.12 3.525 0 2.155 0 .785 0-.335 1.12-.335 2.49c0 1.37 1.12 2.49 2.49 2.49.4 0 .775-.098 1.108-.27-.064.363-.098.737-.098 1.12 0 3.234 2.617 5.851 5.85 5.851a5.84 5.84 0 002.476-.549c-.024.215-.036.432-.036.652 0 3.234 2.617 5.851 5.85 5.851.017 0 .034 0 .051 0 2.888-.024 5.247-2.05 5.76-4.77.015-.075.028-.15.04-.227.056-.297.085-.603.085-.916 0-.158-.006-.314-.017-.468l-.025-.016z" /></svg>
        );
        default: return null;
    }
}

export function Footer() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [settings, setSettings] = useState({
        store_email: "orders@misstokyo.shop",
        social_instagram: "https://instagram.com/misstokyo__",
        social_tiktok: "https://tiktok.com/@misstshopper",
        social_facebook: null as string | null,
        social_twitter: null as string | null,
        social_pinterest: null as string | null,
        social_youtube: null as string | null,
        social_snapchat: null as string | null,
        social_threads: null as string | null,
    });

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("store_email, store_phone, store_address, store_name, social_instagram, social_tiktok, social_facebook, social_twitter, social_pinterest, social_youtube, social_snapchat, social_threads")
            .eq("id", "singleton")
            .single()
            .then(({ data }: { data: any }) => {
                if (data) setSettings(prev => ({ ...prev, ...data }));
            });
    }, []);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setStatus("submitting");
        const res = await fetch("/api/newsletter/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        if (data.success || data.alreadySubscribed) {
            setStatus("success");
        } else {
            setStatus("error");
        }
    };

    const socialLinks = [
        { key: "social_instagram", label: "Instagram" },
        { key: "social_tiktok", label: "TikTok" },
        { key: "social_facebook", label: "Facebook" },
        { key: "social_twitter", label: "Twitter" },
        { key: "social_pinterest", label: "Pinterest" },
        { key: "social_youtube", label: "YouTube" },
        { key: "social_snapchat", label: "Snapchat" },
        { key: "social_threads", label: "Threads" },
    ] as const;

    return (
        <footer className="w-full bg-black text-white px-6 py-16 md:px-12 md:py-24 mt-16 md:mt-24 rounded-none">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12">
                <div className="col-span-1 md:col-span-2 lg:col-span-2">
                    <h3 className="font-serif text-3xl tracking-[0.2em] uppercase mb-6">Miss Tokyo</h3>
                    <p className="max-w-sm text-neutral-400 leading-relaxed text-sm mb-10">
                        Cute. Cool. Feminine <br />By Miss Tokyo
                    </p>

                    {/* Newsletter */}
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-semibold text-neutral-500 mb-4">
                            Newsletter
                        </p>
                        {status === "success" ? (
                            <p className="text-xs tracking-widest uppercase text-neutral-400">Registry confirmed.</p>
                        ) : (
                            <form onSubmit={handleSubscribe} className="flex gap-3 max-w-sm">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder={settings.store_email?.toUpperCase() || "ORDERS@MISSTOKYO.SHOP"}
                                    disabled={status === "submitting"}
                                    className="flex-1 border-b border-neutral-700 bg-transparent py-3 text-[14px] uppercase tracking-widest outline-none focus:border-white transition-colors placeholder:text-neutral-600 disabled:opacity-50 min-h-[44px] rounded-none"
                                />
                                <button
                                    type="submit"
                                    disabled={status === "submitting"}
                                    className="min-h-[44px] px-6 text-[10px] uppercase tracking-[0.25em] font-bold border border-white bg-white text-black hover:bg-black hover:text-white transition-all duration-300 disabled:opacity-50 whitespace-nowrap rounded-none"
                                >
                                    {status === "submitting" ? "..." : "Join"}
                                </button>
                            </form>
                        )}
                        {status === "error" && (
                            <p className="text-[10px] text-red-500 tracking-widest uppercase mt-4">Registry error. Try again.</p>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white mb-8">Navigation</h4>
                    <ul className="space-y-4 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                        <li><Link href="/track" className="hover:text-white transition-colors">Track Order</Link></li>
                        <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                        <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                        <li><Link href="/gift-cards" className="hover:text-white transition-colors">Gift Cards</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white mb-8">Assistance</h4>
                    <ul className="space-y-4 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                        <li><Link href="/account" className="hover:text-white transition-colors">Account</Link></li>
                        <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                        <li><Link href="/size-guide" className="hover:text-white transition-colors">Size Guide</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white mb-8">Policies</h4>
                    <ul className="space-y-4 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                        <li><Link href="/policies/refund-policy" className="hover:text-white transition-colors">Refunds</Link></li>
                        <li><Link href="/policies/shipping-policy" className="hover:text-white transition-colors">Shipping</Link></li>
                        <li><Link href="/policies/terms-and-conditions" className="hover:text-white transition-colors">Terms</Link></li>
                        <li><Link href="/policies/privacy-policy" className="hover:text-white transition-colors">Privacy</Link></li>
                        <li><Link href="/policies/accessibility-statement" className="hover:text-white transition-colors">Accessibility</Link></li>
                    </ul>
                </div>
            </div>

            {socialLinks.some(s => !!settings[s.key as keyof typeof settings]) && (
                <div className="max-w-7xl mx-auto flex items-center gap-4 mt-8 mb-8">
                    {socialLinks.map(s => {
                        const href = settings[s.key as keyof typeof settings] as string | null;
                        if (!href) return null;
                        return (
                            <a
                                key={s.key}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={s.label}
                                className="text-white opacity-40 hover:opacity-100 transition-opacity"
                            >
                                <SocialIcon label={s.label} />
                            </a>
                        );
                    })}
                </div>
            )}

            <div className="max-w-7xl mx-auto pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                <p>
                    &copy; {new Date().getFullYear()} Miss Tokyo. Powered by{" "}
                    <a
                        href="https://dashttp.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                    >
                        DasHttp
                    </a>
                    .
                </p>
            </div>
        </footer>
    );
}
