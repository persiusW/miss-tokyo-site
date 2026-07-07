"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type WholesaleUser = {
    id: string;
    email: string;
    full_name?: string | null;
    created_at: string;
};

type SearchResult = {
    id: string;
    email: string;
    full_name?: string | null;
    role: string | null;
};

export default function WholesalersPage() {
    const [wholesalers, setWholesalers] = useState<WholesaleUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [promoting, setPromoting] = useState<string | null>(null);

    const fetchWholesalers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("profiles")
            .select("id, email, full_name, created_at")
            .eq("role", "wholesale")
            .order("created_at", { ascending: false });
        setWholesalers(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchWholesalers(); }, []);

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (q.trim().length < 2) { setSearchResults([]); return; }
        setSearching(true);
        const { data } = await supabase
            .from("profiles")
            .select("id, email, full_name, role")
            .ilike("email", `%${q}%`)
            .not("role", "eq", "wholesale")
            .not("role", "in", '("admin","owner","sales_staff")')
            .limit(10);
        setSearchResults(data ?? []);
        setSearching(false);
    };

    const handlePromote = async (user: SearchResult) => {
        setPromoting(user.id);
        try {
            const res = await fetch("/api/admin/set-wholesale", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, action: "promote" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            toast.success(`${user.email} is now a Wholesale account.`);
            setShowModal(false);
            setSearchQuery("");
            setSearchResults([]);
            fetchWholesalers();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setPromoting(null);
        }
    };

    const handleRevoke = async (user: WholesaleUser) => {
        if (!confirm(`Revoke wholesale access for ${user.email}? They will revert to a standard retail account.`)) return;
        const res = await fetch("/api/admin/set-wholesale", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, action: "revoke" }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || "Failed to revoke."); return; }
        toast.success("Wholesale access revoked.");
        fetchWholesalers();
    };

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Wholesalers</h1>
                    <p className="ac-page-sub">Manage B2B wholesale accounts. These users see exclusive tier pricing on the storefront.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="ac-btn ac-btn-primary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", marginRight: 6 }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                    Manage Wholesalers
                </button>
            </div>

            {/* Stats */}
            <div className="ac-kpi-grid" style={{ marginBottom: 24 }}>
                <div className="ac-kpi">
                    <span className="ac-kpi-label">Active Wholesale Accounts</span>
                    <span className="ac-kpi-value">{wholesalers.length}</span>
                </div>
            </div>

            {/* Table */}
            <div className="ac-card flush">
                <div className="ac-card-head"><span className="ac-card-title">Wholesale Accounts</span></div>
                {loading ? (
                    <div className="ac-empty"><p className="ac-empty-title">Loading wholesalers...</p></div>
                ) : wholesalers.length === 0 ? (
                    <div className="ac-empty">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: "var(--ac-ink-4)", marginBottom: 8 }}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                        <p className="ac-empty-title">No wholesale accounts yet.</p>
                        <p style={{ fontSize: 11, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 4 }}>Use "Manage Wholesalers" to promote existing customers.</p>
                    </div>
                ) : (
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>Account</th>
                                    <th>Granted</th>
                                    <th style={{ width: 100 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {wholesalers.map(w => (
                                    <tr key={w.id}>
                                        <td>
                                            <div style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{w.full_name || "—"}</div>
                                            <div style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{w.email}</div>
                                        </td>
                                        <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{new Date(w.created_at).toLocaleDateString("en-GB")}</td>
                                        <td style={{ textAlign: "right" }}>
                                            <button onClick={() => handleRevoke(w)}
                                                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                                                onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-danger)")}
                                                onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                Revoke Access
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Manage Modal */}
            {showModal && (
                <div className="ac-modal">
                    <div className="ac-modal-box" style={{ maxWidth: 500 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, color: "var(--ac-ink)" }}>Promote to Wholesale</h2>
                            <button onClick={() => { setShowModal(false); setSearchQuery(""); setSearchResults([]); }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", fontSize: 22 }}>×</button>
                        </div>
                        <p style={{ fontSize: 11, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".06em", lineHeight: 1.6, marginBottom: 16 }}>
                            Search for an existing customer account by email to grant them wholesale pricing access.
                        </p>
                        <div style={{ position: "relative", marginBottom: 16 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ac-ink-4)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="email" placeholder="Search by email..."
                                value={searchQuery} onChange={e => handleSearch(e.target.value)}
                                className="ac-input" style={{ paddingLeft: 34 }}
                                autoFocus />
                        </div>

                        {searching && <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", fontStyle: "italic" }}>Searching...</p>}
                        {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)" }}>No matching customer accounts found.</p>
                        )}
                        {searchResults.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {searchResults.map(result => (
                                    <div key={result.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)" }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>{result.full_name || "—"}</div>
                                            <div style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{result.email}</div>
                                        </div>
                                        <button onClick={() => handlePromote(result)} disabled={promoting === result.id}
                                            className="ac-btn ac-btn-primary ac-btn-sm">
                                            {promoting === result.id ? "..." : "Promote"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
