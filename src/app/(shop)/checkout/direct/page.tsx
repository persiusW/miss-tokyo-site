"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

function DirectPayContent() {
    const searchParams = useSearchParams();
    const ref = searchParams.get("ref") || "";
    const amt = searchParams.get("amt") || "0";
    const amount = Number(amt);

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/paystack/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    amount,
                    metadata: { invoiceRef: ref },
                }),
            });
            const data = await res.json();
            if (data.authorizationUrl) {
                window.location.href = data.authorizationUrl;
            } else {
                toast.error(data.error || "Payment initialization failed.");
                setLoading(false);
            }
        } catch {
            toast.error("A network error occurred.");
            setLoading(false);
        }
    };

    if (!ref || amount <= 0) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-6">
                <div className="text-center space-y-4">
                    <h1 className="font-serif text-3xl tracking-widest uppercase">Invalid Link</h1>
                    <p className="text-neutral-500 text-sm tracking-widest uppercase">This payment link is missing required parameters.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-6">
            <div className="w-full max-w-md space-y-12">
                <header className="text-center">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">Secure Payment</p>
                    <h1 className="font-serif text-4xl tracking-widest uppercase mb-2">MISS TOKYO</h1>
                </header>

                <div className="bg-neutral-50 border border-neutral-100 p-8 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Reference</span>
                        <span className="font-mono text-neutral-700">{ref.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-neutral-200 pt-4">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Amount Due</span>
                        <span className="font-serif text-2xl text-neutral-900">GH₵ {amount.toFixed(2)}</span>
                    </div>
                </div>

                <form onSubmit={handlePay} className="space-y-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-3">
                            Your Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                            placeholder="your@email.com"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Redirecting..." : `Pay GH₵ ${amount.toFixed(2)}`}
                    </button>
                </form>

                <p className="text-center text-[10px] text-neutral-400 tracking-widest uppercase">
                    Secured by Paystack
                </p>
            </div>
        </div>
    );
}

export default function DirectPayPage() {
    return (
        <Suspense fallback={<div className="min-h-[80vh]" />}>
            <DirectPayContent />
        </Suspense>
    );
}
