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
        <html>
            <body style={{ margin: 0, fontFamily: "serif", background: "#FAF9F6" }}>
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                    textAlign: "center",
                }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "#999", marginBottom: 24 }}>
                        Miss Tokyo
                    </p>
                    <h1 style={{ fontSize: 32, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16, fontWeight: 400 }}>
                        We&rsquo;ll be right back
                    </h1>
                    <p style={{ color: "#666", fontSize: 14, maxWidth: 400, lineHeight: 1.7, marginBottom: 32 }}>
                        Sorry for the inconvenience — we&rsquo;re updating this feature.<br />
                        Check back soon.
                    </p>
                    <button
                        onClick={reset}
                        style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", paddingBottom: 4, background: "none", border: "none", borderBottom: "1px solid #000", cursor: "pointer" }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
