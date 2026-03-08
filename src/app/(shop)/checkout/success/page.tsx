"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/store/useCart";

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const trxref = searchParams.get("trxref");
    const ref = searchParams.get("reference");
    const reference = ref || trxref || "Unknown";
    const { clearCart } = useCart();

    // We will attempt to verify and capture the order just in case the webhook failed locally
    const [orderId, setOrderId] = useState<string | null>(null);

    useEffect(() => {
        // Automatically clear cart upon success
        clearCart();

        if (reference && reference !== "Unknown") {
            fetch(`/api/paystack/verify?reference=${reference}`)
                .then(res => res.json())
                .then(data => {
                    if (data?.orderId) {
                        setOrderId(data.orderId.substring(0, 8).toUpperCase());
                    }
                })
                .catch(console.error);
        }
    }, [reference, clearCart]);

    const displayRef = orderId || reference.substring(0, 8).toUpperCase();

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
            <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-700">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase text-neutral-900">
                    Thank You
                </h1>

                <p className="text-xl text-neutral-600 font-serif italic mb-2">
                    Your order is being crafted with intention.
                </p>

                <p className="text-sm text-neutral-500 uppercase tracking-widest mb-12">
                    Order Reference: {displayRef}
                </p>

                <div className="pt-8 border-t border-neutral-200">
                    <Link
                        href="/shop"
                        className="inline-block border-b border-black text-xs uppercase tracking-widest pb-1 hover:text-neutral-500 transition-colors"
                    >
                        Return to Collection
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-[80vh]" />}>
            <CheckoutSuccessContent />
        </Suspense>
    );
}
