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
        <footer className="w-full bg-white px-6 py-16 md:px-12 md:py-24 mt-24">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="col-span-1 md:col-span-2">
                    <h3 className="font-serif text-3xl tracking-widest uppercase mb-6">BADU</h3>
                    <p className="max-w-sm text-neutral-600 leading-relaxed text-sm mb-10">
                        Minimalist luxury footwear, handmade in Ghana. We believe in visual silence and uncompromised quality.
                    </p>

                    {/* Newsletter */}
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-4">
                            Newsletter
                        </p>
                        {status === "success" ? (
                            <p className="text-xs tracking-widest uppercase text-neutral-500">You are on the list.</p>
                        ) : (
                            <form onSubmit={handleSubscribe} className="flex gap-3 max-w-sm">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    disabled={status === "submitting"}
                                    className="flex-1 border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black transition-colors placeholder:text-neutral-400 disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={status === "submitting"}
                                    className="text-xs uppercase tracking-widest font-semibold border-b border-black pb-2 hover:text-neutral-500 hover:border-neutral-500 transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                    {status === "submitting" ? "..." : "Subscribe"}
                                </button>
                            </form>
                        )}
                        {status === "error" && (
                            <p className="text-[10px] text-red-500 tracking-wider uppercase mt-2">Something went wrong. Try again.</p>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="text-xs uppercase tracking-widest font-semibold mb-6">Explore</h4>
                    <ul className="space-y-4 text-sm text-neutral-600">
                        <li><Link href="/shop" className="hover:text-black transition-colors">The Collection</Link></li>
                        <li><Link href="/whitelabel" className="hover:text-black transition-colors">White Labelling</Link></li>
                        <li><Link href="/craft" className="hover:text-black transition-colors">The Craft</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-xs uppercase tracking-widest font-semibold mb-6">Support</h4>
                    <ul className="space-y-4 text-sm text-neutral-600">
                        <li><Link href="/faq" className="hover:text-black transition-colors">FAQ</Link></li>
                        <li><Link href="/shipping" className="hover:text-black transition-colors">Shipping & Returns</Link></li>
                        <li><Link href="/contact" className="hover:text-black transition-colors">Contact Us</Link></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center text-xs text-neutral-400">
                <p>&copy; {new Date().getFullYear()} BADU. All rights reserved.</p>
                <div className="space-x-6 mt-4 md:mt-0">
                    <Link href="/privacy" className="hover:text-neutral-600">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-neutral-600">Terms of Service</Link>
                </div>
            </div>
        </footer>
    );
}
