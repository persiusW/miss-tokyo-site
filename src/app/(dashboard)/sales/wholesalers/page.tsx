"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { X, Search, Building2 } from "lucide-react";

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
        <div className="space-y-10 max-w-4xl">
            <header className="flex items-start justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Wholesalers</h1>
                    <p className="text-neutral-500">Manage B2B wholesale accounts. These users see exclusive tier pricing on the storefront.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    <Building2 size={14} />
                    Manage Wholesalers
                </button>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-neutral-200 p-6">
                    <p className="text-3xl font-serif mb-1">{wholesalers.length}</p>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Active Wholesale Accounts</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-neutral-200">
                <div className="px-8 py-4 border-b border-neutral-100">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Wholesale Accounts</p>
                </div>

                {loading ? (
                    <p className="px-8 py-10 text-neutral-400 italic font-serif">Loading wholesalers...</p>
                ) : wholesalers.length === 0 ? (
                    <div className="px-8 py-12 text-center space-y-3">
                        <Building2 size={32} className="mx-auto text-neutral-300" />
                        <p className="text-neutral-400 italic font-serif">No wholesale accounts yet.</p>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                            Use "Manage Wholesalers" to promote existing customers.
                        </p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-neutral-100">
                                <th className="px-8 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Account</th>
                                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Granted</th>
                                <th className="px-8 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {wholesalers.map(w => (
                                <tr key={w.id} className="border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50 transition-colors">
                                    <td className="px-8 py-4">
                                        <p className="text-sm font-semibold">{w.full_name || "—"}</p>
                                        <p className="text-[10px] text-neutral-400 tracking-wide">{w.email}</p>
                                    </td>
                                    <td className="px-4 py-4 text-[11px] text-neutral-500">
                                        {new Date(w.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button
                                            onClick={() => handleRevoke(w)}
                                            className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-red-600 transition-colors font-semibold"
                                        >
                                            Revoke Access
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Manage Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg border border-neutral-200 shadow-2xl">
                        <div className="px-8 py-5 border-b border-neutral-100 flex items-center justify-between">
                            <h2 className="font-serif text-lg tracking-widest uppercase">Promote to Wholesale</h2>
                            <button onClick={() => { setShowModal(false); setSearchQuery(""); setSearchResults([]); }}
                                className="text-neutral-400 hover:text-black">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
                                Search for an existing customer account by email to grant them wholesale pricing access.
                            </p>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="email"
                                    placeholder="Search by email..."
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    className="w-full pl-9 border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                                    autoFocus
                                />
                            </div>

                            {searching && (
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400 italic">Searching...</p>
                            )}

                            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400">No matching customer accounts found.</p>
                            )}

                            {searchResults.length > 0 && (
                                <div className="space-y-2">
                                    {searchResults.map(result => (
                                        <div key={result.id} className="flex items-center justify-between p-4 border border-neutral-100 hover:border-neutral-300 transition-colors">
                                            <div>
                                                <p className="text-sm font-semibold">{result.full_name || "—"}</p>
                                                <p className="text-[10px] text-neutral-400 tracking-wide">{result.email}</p>
                                            </div>
                                            <button
                                                onClick={() => handlePromote(result)}
                                                disabled={promoting === result.id}
                                                className="px-4 py-2 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                            >
                                                {promoting === result.id ? "..." : "Promote"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
