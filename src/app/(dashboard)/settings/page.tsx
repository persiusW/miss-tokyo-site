"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";

type BusinessSettings = {
    business_name: string;
    email: string;
    contact: string;
    address: string;
    logo_url: string | null;
    tax_rate: number;
};

const DEFAULT: BusinessSettings = {
    business_name: "Badu Atelier",
    email: "",
    contact: "",
    address: "",
    logo_url: null,
    tax_rate: 0,
};

export default function SettingsPage() {
    const [form, setForm] = useState<BusinessSettings>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        supabase
            .from("business_settings")
            .select("*")
            .eq("id", "default")
            .single()
            .then(({ data }) => {
                if (data) {
                    setForm({
                        business_name: data.business_name || "",
                        email: data.email || "",
                        contact: data.contact || "",
                        address: data.address || "",
                        logo_url: data.logo_url || null,
                        tax_rate: Number(data.tax_rate) || 0,
                    });
                }
                setLoading(false);
            });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await supabase.from("business_settings").upsert(
            { id: "default", ...form, tax_rate: Number(form.tax_rate), updated_at: new Date().toISOString() },
            { onConflict: "id" }
        );
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) {
        return (
            <div className="space-y-12">
                <header>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Settings</h1>
                </header>
                <p className="text-neutral-400 italic font-serif">Loading...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 max-w-2xl">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Settings</h1>
                <p className="text-neutral-500">Business details used on invoices, quotations, and pay links.</p>
            </header>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Brand / Logo */}
                <div className="bg-white border border-neutral-200 p-8 space-y-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Brand</h2>
                    <ImageUploader
                        bucket="site-assets"
                        folder="logos"
                        currentUrl={form.logo_url}
                        onUpload={(url) => setForm(p => ({ ...p, logo_url: url }))}
                        aspectRatio="square"
                        label="Business Logo"
                    />
                </div>

                {/* Business Info */}
                <div className="bg-white border border-neutral-200 p-8 space-y-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Business Details</h2>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Business Name</label>
                        <input
                            type="text" name="business_name" required
                            value={form.business_name}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="Badu Atelier"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Business Email</label>
                            <input
                                type="email" name="email"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                placeholder="hello@badu.co"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Contact / Phone</label>
                            <input
                                type="text" name="contact"
                                value={form.contact}
                                onChange={handleChange}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                placeholder="+233 ..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Business Address</label>
                        <textarea
                            name="address" rows={2}
                            value={form.address}
                            onChange={handleChange}
                            className="w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black transition-colors resize-none text-sm"
                            placeholder="123 Main Street, Accra, Ghana"
                        />
                    </div>
                </div>

                {/* Finance */}
                <div className="bg-white border border-neutral-200 p-8 space-y-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Finance Defaults</h2>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Default Tax Rate (%)</label>
                        <input
                            type="number" name="tax_rate" min="0" max="100" step="0.1"
                            value={form.tax_rate}
                            onChange={handleChange}
                            className="w-40 border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="0"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Pre-filled when creating new invoices and quotations.</p>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-6">
                    {saved && <span className="text-xs text-green-600 tracking-wider uppercase">Saved successfully</span>}
                    <button
                        type="submit" disabled={saving}
                        className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </form>
        </div>
    );
}
