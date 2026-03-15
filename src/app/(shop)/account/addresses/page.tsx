"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Plus, Trash2, Star } from "lucide-react";

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
        supabase.auth.getUser().then(async ({ data: { user } }) => {
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

    if (loading) return <p className="text-neutral-400 italic font-serif">Loading...</p>;

    return (
        <div className="max-w-2xl">
            <div className="flex justify-between items-center mb-8">
                <h2 className="font-serif text-xl tracking-widest uppercase">Address Book</h2>
                <button
                    onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold hover:text-neutral-500 transition-colors"
                >
                    <Plus size={14} /> Add Address
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSave} className="border border-neutral-200 bg-neutral-50 p-6 mb-6 space-y-5">
                    <h3 className="text-xs font-semibold uppercase tracking-widest">New Address</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Label</label>
                            <input type="text" value={form.label}
                                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm"
                                placeholder="Home / Work / Other" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">City</label>
                            <input type="text" value={form.city ?? ""}
                                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm"
                                placeholder="Accra" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Address Line</label>
                        <input type="text" value={form.address_line}
                            onChange={e => setForm(p => ({ ...p, address_line: e.target.value }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm"
                            placeholder="123 Osu, Airport Residential" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Region</label>
                            <input type="text" value={form.region ?? ""}
                                onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm"
                                placeholder="Greater Accra" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Country</label>
                            <input type="text" value={form.country}
                                onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm" />
                        </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={form.is_default}
                            onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))}
                            className="w-4 h-4 accent-black" />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-600">Set as default address</span>
                    </label>
                    <div className="flex gap-4">
                        <button type="submit" disabled={saving}
                            className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50">
                            {saving ? "Saving..." : "Save Address"}
                        </button>
                        <button type="button" onClick={() => setShowForm(false)}
                            className="px-6 py-3 text-xs uppercase tracking-widest text-neutral-500 hover:text-black border border-neutral-200 hover:border-black transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {addresses.length === 0 && !showForm ? (
                <p className="text-neutral-500 italic font-serif text-center py-12">No saved addresses yet.</p>
            ) : (
                <div className="space-y-3">
                    {addresses.map(addr => (
                        <div key={addr.id} className={`border p-5 flex justify-between items-start gap-4 ${addr.is_default ? "border-black" : "border-neutral-200"}`}>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold uppercase tracking-widest">{addr.label}</span>
                                    {addr.is_default && (
                                        <span className="text-[9px] bg-black text-white px-2 py-0.5 uppercase tracking-widest">Default</span>
                                    )}
                                </div>
                                <p className="text-sm text-neutral-700">{addr.address_line}</p>
                                <p className="text-xs text-neutral-500">{[addr.city, addr.region, addr.country].filter(Boolean).join(", ")}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {!addr.is_default && (
                                    <button onClick={() => handleSetDefault(addr.id)}
                                        className="p-2 text-neutral-400 hover:text-amber-500 transition-colors" title="Set as default">
                                        <Star size={15} />
                                    </button>
                                )}
                                <button onClick={() => handleDelete(addr.id)}
                                    className="p-2 text-neutral-400 hover:text-red-500 transition-colors" title="Remove">
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
