"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Parse both implicit flow (#access_token) and PKCE flow (?code) from the URL.
        // The forgot-password route generates the link server-side via supabaseAdmin, so
        // no PKCE verifier is stored in the browser — we must handle the exchange manually.
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const params = new URLSearchParams(window.location.search);

        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const type = hash.get("type");
        const code = params.get("code");

        if (type === "recovery" && accessToken && refreshToken) {
            supabase.auth
                .setSession({ access_token: accessToken, refresh_token: refreshToken })
                .then(({ error: err }: { error: any }) => {
                    if (err) setError("Your reset link has expired. Please request a new one.");
                    else setReady(true);
                });
            return;
        }

        if (code) {
            supabase.auth
                .exchangeCodeForSession(code)
                .then(({ error: err }: { error: any }) => {
                    if (err) setError("Your reset link has expired. Please request a new one.");
                    else setReady(true);
                });
            return;
        }

        // Fallback: listen for auth state events in case Supabase auto-processes the URL
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
        });

        const timeout = setTimeout(() => {
            setError("Invalid or expired reset link. Please request a new one.");
        }, 8000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        setLoading(true);
        setError("");

        const { error: updateError } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (updateError) {
            setError(updateError.message || "Failed to update password. Your link may have expired.");
        } else {
            router.push("/account?reset=success");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-6">
            <style jsx global>{`
                input:-webkit-autofill {
                    -webkit-box-shadow: 0 0 0 100px white inset !important;
                    -webkit-text-fill-color: black !important;
                }
            `}</style>

            <div className="w-full max-w-md">
                <div className="text-center mb-16">
                    <h1 className="font-serif text-3xl md:text-4xl tracking-[0.3em] uppercase text-black mb-4">
                        New Password
                    </h1>
                    <div className="h-px w-10 bg-black mx-auto"></div>
                </div>

                {error && !ready ? (
                    <div className="text-center">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-bold mb-8 leading-relaxed">
                            {error}
                        </p>
                        <Link
                            href="/login"
                            className="inline-block bg-black text-white px-12 py-5 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all duration-500 rounded-none shadow-sm"
                        >
                            Request New Link
                        </Link>
                    </div>
                ) : !ready ? (
                    <p className="text-center text-sm text-neutral-400 italic">Verifying your reset link…</p>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                        <div className="group">
                            <label htmlFor="new-password" className="block text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-bold group-focus-within:text-black transition-colors">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="new-password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                className="w-full bg-transparent border-b border-neutral-200 text-black text-sm py-4 focus:outline-none focus:border-black transition-all rounded-none"
                                placeholder="Min. 8 characters"
                            />
                        </div>

                        <div className="group">
                            <label htmlFor="confirm-password" className="block text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-bold group-focus-within:text-black transition-colors">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirm-password"
                                required
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                autoComplete="new-password"
                                className="w-full bg-transparent border-b border-neutral-200 text-black text-sm py-4 focus:outline-none focus:border-black transition-all rounded-none"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="text-red-600 text-[10px] uppercase tracking-widest text-center font-bold">
                                {error}
                            </div>
                        )}

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white py-5 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all duration-500 rounded-none disabled:opacity-50"
                            >
                                {loading ? "UPDATING..." : "SET NEW PASSWORD"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
