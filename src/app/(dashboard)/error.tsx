"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => { console.error("[dashboard error]", error.digest ?? "", error); }, [error]);
    return (
        <div className="ac-card" style={{ maxWidth: 560, margin: "48px auto", textAlign: "center" }}>
            <div className="ac-empty">
                <div className="ac-empty-title">We are updating this feature. Please try again shortly. Sorry for the inconvenience.</div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                <button type="button" className="ac-btn ac-btn-primary" onClick={reset}>Try again</button>
                <Link href="/overview" className="ac-btn ac-btn-ghost">Back to Dashboard</Link>
            </div>
        </div>
    );
}
