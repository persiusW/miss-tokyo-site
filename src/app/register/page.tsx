"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    }
                }
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            if (data.user) {
                setSuccess(true);
            }
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-6">
                <div className="w-full max-w-md text-center">
                    <h1 className="font-serif text-3xl tracking-[0.3em] uppercase text-black mb-6">Success</h1>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 leading-relaxed mb-12 font-bold">
                        Your account has been registered. Please check your email for a confirmation link to finalize your membership.
                    </p>
                    <Link 
                        href="/login" 
                        className="inline-block bg-black text-white px-12 py-5 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-neutral-900 transition-all duration-500 rounded-none shadow-sm"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

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
                        Create Account
                    </h1>
                    <div className="h-px w-10 bg-black mx-auto"></div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                    <div className="group">
                        <label htmlFor="name" className="block text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-bold group-focus-within:text-black transition-colors">
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-transparent border-b border-neutral-200 text-black text-sm py-4 focus:outline-none focus:border-black transition-all rounded-none"
                            placeholder="ALEXANDER SMITH"
                        />
                    </div>

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
                            placeholder="STUDIO@CLIENT.COM"
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
                            autoComplete="new-password"
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
                            {loading ? "Processing..." : "Enter the Atelier"}
                        </button>
                        
                        <div className="text-center">
                            <Link 
                                href="/login" 
                                className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 hover:text-black transition-colors font-bold"
                            >
                                Already a Member? Sign In
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
