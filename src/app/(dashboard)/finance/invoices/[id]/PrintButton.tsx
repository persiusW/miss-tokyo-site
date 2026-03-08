"use client";

export function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
        >
            Print / Save PDF
        </button>
    );
}
