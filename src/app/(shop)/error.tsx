"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/components/errors/ErrorNet";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error("[shop error]", error.digest ?? "", error);
        reportClientError(error, error.digest);
    }, [error]);
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
            <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase mb-4">Something happened</h1>
            <p className="text-neutral-500 text-sm max-w-md mb-8 leading-relaxed">Something happened. Please refresh or try again shortly.</p>
            <div className="flex flex-col items-center gap-4">
                <button onClick={reset} className="text-[11px] uppercase tracking-widest border-b border-black pb-1">Try again</button>
                <Link href="/shop" className="text-[11px] uppercase tracking-widest text-neutral-500">Back to the shop</Link>
            </div>
        </div>
    );
}
