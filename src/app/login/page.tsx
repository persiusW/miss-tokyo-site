"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                router.push("/overview");
                router.refresh();
            } else {
                setError("Invalid email or password.");
            }
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-full max-w-sm px-6">
                <div className="text-center mb-12">
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Badu</h1>
                    <p className="text-xs uppercase tracking-widest text-neutral-500">Atelier Console</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 p-8 space-y-8">
                    <div>
                        <label htmlFor="email" className="block text-xs uppercase tracking-widest font-semibold mb-3">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-xs uppercase tracking-widest font-semibold mb-3">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
