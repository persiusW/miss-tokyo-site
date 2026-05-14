"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Landing page for email confirmation links.
// Supabase redirects here after verifying a signup token.
// We exchange the code/token for a session, then send the user to their account.
export default function ConfirmEmailPage() {
    const router = useRouter();
    const [error, setError] = useState("");

    useEffect(() => {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const params = new URLSearchParams(window.location.search);

        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const code = params.get("code");

        if (accessToken && refreshToken) {
            supabase.auth
                .setSession({ access_token: accessToken, refresh_token: refreshToken })
                .then(({ error: err }: { error: any }) => {
                    if (err) setError("Confirmation link is invalid or has expired.");
                    else router.replace("/account");
                });
            return;
        }

        if (code) {
            supabase.auth
                .exchangeCodeForSession(code)
                .then(({ error: err }: { error: any }) => {
                    if (err) setError("Confirmation link is invalid or has expired.");
                    else router.replace("/account");
                });
            return;
        }

        setError("Invalid confirmation link. Please register again.");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-6">
            <div className="w-full max-w-md text-center">
                <h1 className="font-serif text-3xl tracking-[0.3em] uppercase text-black mb-6">
                    {error ? "Link Expired" : "Confirming…"}
                </h1>
                <div className="h-px w-10 bg-black mx-auto mb-8"></div>

                {error ? (
                    <>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-bold mb-10 leading-relaxed">
                            {error}
                        </p>
                        <a
                            href="/register"
                            className="inline-block bg-black text-white px-12 py-5 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all duration-500 rounded-none shadow-sm"
                        >
                            Register Again
                        </a>
                    </>
                ) : (
                    <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-bold">
                        Verifying your email address…
                    </p>
                )}
            </div>
        </div>
    );
}
