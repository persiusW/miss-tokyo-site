"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Plus, Trash2, Star, MapPin } from "lucide-react";

type Address = {
    id: string;
    label: string;
    address_line: string;
    city: string | null;
    region: string | null;
    country: string;
    is_default: boolean;
};

const EMPTY: Omit<Address, "id"> = {
    label: "Home",
    address_line: "",
    city: "",
    region: "",
    country: "Ghana",
    is_default: false,
};

export default function AccountAddressesPage() {

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }: { data: any }) => {
            if (!user) return;
            setUserId(user.id);
            const { data } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", user.id)
                .order("is_default", { ascending: false });
            setAddresses(data ?? []);
            setLoading(false);
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.address_line.trim()) { toast.error("Address line is required."); return; }
        if (!userId) return;
        setSaving(true);

        // If setting as default, unset others first
        if (form.is_default) {
            await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
        }

        const { data, error } = await supabase
            .from("addresses")
            .insert({ ...form, user_id: userId })
            .select()
            .single();

        setSaving(false);
        if (error) { toast.error("Failed to save address."); return; }
        setAddresses(prev => form.is_default
            ? [data, ...prev.map(a => ({ ...a, is_default: false }))]
            : [...prev, data]
        );
        setForm(EMPTY);
        setShowForm(false);
        toast.success("Address saved.");
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("addresses").delete().eq("id", id);
        if (error) { toast.error("Failed to delete."); return; }
        setAddresses(prev => prev.filter(a => a.id !== id));
        toast.success("Address removed.");
    };

    const handleSetDefault = async (id: string) => {
        if (!userId) return;
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
        await supabase.from("addresses").update({ is_default: true }).eq("id", id);
        setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
        toast.success("Default address updated.");
    };

    if (loading) return (
        <div className="max-w-2xl space-y-3 animate-pulse">
            <div className="flex justify-between mb-8">
                <div className="space-y-2">
                    <div className="h-3 w-20 bg-[#e0d5c0] rounded" />
                    <div className="h-6 w-40 bg-[#e0d5c0] rounded" />
                </div>
                <div className="h-8 w-28 bg-[#e0d5c0] rounded" />
            </div>
            {[1, 2].map(i => <div key={i} className="h-24 bg-[#e0d5c0] rounded-xl" />)}
        </div>
    );

    return (
        <div className="max-w-2xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8c7e6a] mb-1">Account</p>
                    <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase">Address <em className="italic">book</em></h1>
                </div>
                <button
                    onClick={() => { setShowForm(v => !v); setForm(EMPTY); }}
                    className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#1a1714] hover:text-[#8b2f30] transition-colors mt-2"
                >
                    <Plus size={14} /> {showForm ? "Cancel" : "Add Address"}
                </button>
            </div>

            {/* Add form */}
            {showForm && (
                <form onSubmit={handleSave} className="border border-[#e0d5c0] bg-[#fdf9f3] rounded-xl p-5 mb-5 space-y-5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[#4a3f33]">New Address</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Label</label>
                            <input type="text" value={form.label}
                                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                                className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors"
                                placeholder="Home / Work / Other" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">City</label>
                            <input type="text" value={form.city ?? ""}
                                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                                className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors"
                                placeholder="Accra" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Address Line</label>
                        <input type="text" value={form.address_line}
                            onChange={e => setForm(p => ({ ...p, address_line: e.target.value }))}
                            className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors"
                            placeholder="123 Osu, Airport Residential" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Region</label>
                            <input type="text" value={form.region ?? ""}
                                onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                                className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors"
                                placeholder="Greater Accra" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Country</label>
                            <input type="text" value={form.country}
                                onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                                className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors" />
                        </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.is_default}
                            onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))}
                            className="w-4 h-4 accent-[#8b2f30]" />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a]">Set as default address</span>
                    </label>
                    <div className="flex gap-3">
                        <button type="submit" disabled={saving}
                            className="px-8 py-3 bg-[#1a1714] text-white text-xs uppercase tracking-widest hover:bg-[#8b2f30] transition-colors disabled:opacity-50">
                            {saving ? "Saving..." : "Save Address"}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)}
                            className="px-6 py-3 text-xs uppercase tracking-widest text-[#8c7e6a] hover:text-[#1a1714] border border-[#e0d5c0] hover:border-[#8c7e6a] transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Empty state */}
            {addresses.length === 0 && !showForm ? (
                <div className="text-center py-20">
                    <MapPin size={32} className="mx-auto text-[#e0d5c0] mb-4" strokeWidth={1} />
                    <p className="font-serif text-[#8c7e6a] italic mb-6">No saved addresses yet.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="text-xs uppercase tracking-widest font-semibold border-b border-[#8b2f30] text-[#8b2f30] pb-0.5 hover:opacity-70 transition-opacity"
                    >
                        Add your first address →
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {addresses.map(addr => (
                        <div key={addr.id} className={`border rounded-xl p-5 bg-[#fdf9f3] flex justify-between items-start gap-4 transition-colors ${
                            addr.is_default ? "border-[#8b2f30]/40" : "border-[#e0d5c0]"
                        }`}>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-[#1a1714]">{addr.label}</span>
                                    {addr.is_default && (
                                        <span className="text-[9px] bg-[#8b2f30] text-white px-2 py-0.5 uppercase tracking-widest rounded-full">Default</span>
                                    )}
                                </div>
                                <p className="text-sm text-[#4a3f33]">{addr.address_line}</p>
                                <p className="text-xs text-[#8c7e6a] mt-0.5">{[addr.city, addr.region, addr.country].filter(Boolean).join(", ")}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {!addr.is_default && (
                                    <button onClick={() => handleSetDefault(addr.id)}
                                        className="p-2 text-[#c8bb98] hover:text-[#b4894a] transition-colors" title="Set as default">
                                        <Star size={15} />
                                    </button>
                                )}
                                <button onClick={() => handleDelete(addr.id)}
                                    className="p-2 text-[#c8bb98] hover:text-red-500 transition-colors" title="Remove">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
