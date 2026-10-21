"use client";

// Two-step sign-in (gap 24): staff who turned it on in Settings › Your account
// land here after their password, and the admin opens once the code from
// their authenticator app checks out. The dashboard layout sends them here
// while their session is still at the first step.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";

export default function TwoStepPage() {
    const [factorId, setFactorId] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);

    const next = () => {
        const n = new URLSearchParams(window.location.search).get("next") || "";
        return n.startsWith("/") && !n.startsWith("//") ? n : "/overview";
    };

    useEffect(() => {
        const sb = createClient();
        (async () => {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) { window.location.href = "/login"; return; }
            const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aal?.currentLevel === "aal2" || aal?.nextLevel !== "aal2") { window.location.href = next(); return; }
            const { data } = await sb.auth.mfa.listFactors();
            const f = ((data?.totp ?? []) as { id: string; status: string }[]).find(x => x.status === "verified");
            if (!f) { window.location.href = next(); return; }
            setFactorId(f.id);
            setReady(true);
        })().catch(() => { setError("Something happened. Please refresh or try again later."); setReady(true); });
    }, []);

    const verify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!factorId) return;
        const c = code.replace(/\D/g, "");
        if (c.length !== 6) { setError("Enter the 6-digit code from your authenticator app."); return; }
        setBusy(true);
        setError("");
        const { error: err } = await createClient().auth.mfa.challengeAndVerify({ factorId, code: c });
        if (err) { setBusy(false); setError("That code didn't match. Check the time on your phone is right and try the newest code."); return; }
        window.location.href = next();
    };

    const signOut = async () => {
        await createClient().auth.signOut().catch(() => null);
        window.location.href = "/login";
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm">
                <div className="bg-white border border-gray-200 p-8 shadow-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-xl font-bold uppercase tracking-[0.3em] text-black mb-2" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Miss Tokyo</h1>
                        <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app.</p>
                    </div>
                    {!ready ? <p className="text-sm text-gray-500 text-center">One moment…</p> : (
                        <form onSubmit={verify} className="space-y-6">
                            <div>
                                <label htmlFor="code" className="block text-xs font-semibold text-gray-600 mb-2">Code</label>
                                <input id="code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={7} value={code}
                                    onChange={e => setCode(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-3 text-lg tracking-[0.3em] text-center outline-none focus:border-black" />
                            </div>
                            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                            <button type="submit" disabled={busy || !factorId}
                                className="w-full bg-black text-white text-sm font-semibold py-3 rounded hover:bg-neutral-800 disabled:opacity-50">
                                {busy ? "Checking…" : "Continue"}
                            </button>
                            <button type="button" onClick={() => void signOut()} className="w-full text-sm text-gray-600 underline">Sign out</button>
                        </form>
                    )}
                </div>
                <p className="text-center mt-6 text-xs text-gray-500">Lost your phone? Ask the owner or admin to help you get back in.</p>
            </div>
        </div>
    );
}
