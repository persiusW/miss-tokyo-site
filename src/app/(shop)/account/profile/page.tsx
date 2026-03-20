"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

export default function AccountProfilePage() {

    const [email, setEmail] = useState("");
    const [form, setForm] = useState({ full_name: "", phone: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }: { data: any }) => {
            if (!user) return;
            setEmail(user.email ?? "");
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, phone")
                .eq("id", user.id)
                .single();
            setForm({
                full_name: profile?.full_name || "",
                phone: profile?.phone || "",
            });
            setLoading(false);
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const payload = { full_name: form.full_name, phone: form.phone };

        // Try update first (profile row exists for all registered customers)
        const { data: updated, error: updateError } = await supabase
            .from("profiles")
            .update(payload)
            .eq("id", user.id)
            .select("id");

        if (!updateError && updated && updated.length > 0) {
            toast.success("Profile updated.");
        } else if (!updateError && (!updated || updated.length === 0)) {
            // Row didn't exist yet — insert it (email is required)
            const { error: insertError } = await supabase
                .from("profiles")
                .insert({ id: user.id, email: user.email ?? "", ...payload });
            if (insertError) toast.error("Failed to save changes.");
            else toast.success("Profile updated.");
        } else {
            toast.error("Failed to save changes.");
        }

        setSaving(false);
    };

    if (loading) return <p className="text-neutral-400 italic font-serif">Loading...</p>;

    return (
        <div className="max-w-lg">
            <h2 className="font-serif text-xl tracking-widest uppercase mb-8">Profile</h2>
            <form onSubmit={handleSave} className="space-y-8">
                <div>
                    <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Email</label>
                    <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full border-b border-neutral-200 bg-transparent py-2 outline-none text-neutral-400 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider">Email cannot be changed here.</p>
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Full Name</label>
                    <input
                        type="text"
                        value={form.full_name}
                        onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                        placeholder="Your full name"
                    />
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Phone</label>
                    <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                        placeholder="+233 ..."
                    />
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </form>
        </div>
    );
}
