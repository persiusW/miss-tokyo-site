"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[GlobalError]", error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] px-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-6">Miss Tokyo</p>
            <h1 className="font-serif text-3xl md:text-4xl tracking-widest uppercase mb-4">
                We&rsquo;ll be right back
            </h1>
            <p className="text-neutral-500 text-sm max-w-md mb-8 leading-relaxed">
                Sorry for the inconvenience — we&rsquo;re updating this feature.<br />
                Check back soon.
            </p>
            <button
                onClick={reset}
                className="text-[11px] uppercase tracking-widest border-b border-black pb-1 hover:text-neutral-500 transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
