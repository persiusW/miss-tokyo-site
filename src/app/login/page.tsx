"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError("Invalid credentials. Please verify your email and password.");
                return;
            }

            if (data.user) {
                router.push("/account");
                router.refresh();
            }
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
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
            
            <div className="w-full max-w-md bg-transparent border-none shadow-none">
                <div className="text-center mb-16">
                    <h1 className="font-serif text-3xl md:text-4xl tracking-[0.3em] uppercase text-black mb-4">
                        Sign In
                    </h1>
                    <div className="h-px w-10 bg-black mx-auto"></div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                    <div className="group">
                        <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-bold group-focus-within:text-black transition-colors">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            className="w-full bg-transparent border-b border-neutral-200 text-black text-sm py-4 focus:outline-none focus:border-black transition-all rounded-none"
                            placeholder="email@example.com"
                        />
                    </div>

                    <div className="group">
                        <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-bold group-focus-within:text-black transition-colors">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            className="w-full bg-transparent border-b border-neutral-200 text-black text-sm py-4 focus:outline-none focus:border-black transition-all rounded-none"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="text-red-600 text-[10px] uppercase tracking-widest text-center animate-in fade-in zoom-in-95 font-bold">
                            {error}
                        </div>
                    )}

                    <div className="space-y-8 pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white py-5 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all duration-500 rounded-none shadow-sm disabled:opacity-50"
                        >
                            {loading ? "SIGNING IN..." : "SIGN IN"}
                        </button>
                        
                        <div className="text-center">
                            <Link 
                                href="/register" 
                                className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 hover:text-black transition-colors font-bold"
                            >
                                New to Miss Tokyo? Create an Account
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
