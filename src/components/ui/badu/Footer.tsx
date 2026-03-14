"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function Footer() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setStatus("submitting");
        const { error } = await supabase.from("newsletter_subs").insert([{ email: email.trim() }]);
        if (error) {
            // Unique constraint violation — already subscribed
            if (error.code === "23505") {
                setStatus("success");
            } else {
                setStatus("error");
            }
        } else {
            setStatus("success");
        }
    };

    return (
        <footer className="w-full bg-black text-white px-6 py-16 md:px-12 md:py-24 mt-16 md:mt-24 rounded-none">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="col-span-1 md:col-span-2">
                    <h3 className="font-serif text-3xl tracking-[0.2em] uppercase mb-6">Miss Tokyo</h3>
                    <p className="max-w-sm text-neutral-400 leading-relaxed text-sm mb-10">
                        Sleek, Monochromatic, Stark. <br />Handmade in Ghana.
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
                                    placeholder="REGISTRY@MISSTOKYO.SHOP"
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
                        <li><Link href="/shop" className="hover:text-white transition-colors">Archive</Link></li>
                        <li><Link href="/whitelabel" className="hover:text-white transition-colors">Labelling</Link></li>
                        <li><Link href="/craft" className="hover:text-white transition-colors">Atelier</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white mb-8">Assistance</h4>
                    <ul className="space-y-4 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                        <li><Link href="/faq" className="hover:text-white transition-colors">Information</Link></li>
                        <li><Link href="/shipping" className="hover:text-white transition-colors">Logistics</Link></li>
                        <li><Link href="/contact" className="hover:text-white transition-colors">Concierge</Link></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                <p>&copy; {new Date().getFullYear()} Miss Tokyo. Directed by DashUp.</p>
                <div className="space-x-8 mt-6 md:mt-0">
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                </div>
            </div>
        </footer>
    );
}
