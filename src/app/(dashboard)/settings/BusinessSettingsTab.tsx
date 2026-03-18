"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type SiteSettings = {
    store_name: string;
    store_tagline: string;
    store_description: string;
    store_email: string;
    store_phone: string;
    store_address: string;
    social_instagram: string;
    social_tiktok: string;
    social_facebook: string;
    social_twitter: string;
    social_pinterest: string;
    social_youtube: string;
    social_snapchat: string;
    social_threads: string;
    instagram_access_token: string;
};

const DEFAULT: SiteSettings = {
    store_name: "",
    store_tagline: "",
    store_description: "",
    store_email: "",
    store_phone: "",
    store_address: "",
    social_instagram: "",
    social_tiktok: "",
    social_facebook: "",
    social_twitter: "",
    social_pinterest: "",
    social_youtube: "",
    social_snapchat: "",
    social_threads: "",
    instagram_access_token: "",
};

const INPUT_CLASS =
    "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors";
const LABEL_CLASS =
    "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2";

const SOCIAL_PLATFORMS: { key: keyof SiteSettings; label: string }[] = [
    { key: "social_instagram", label: "Instagram" },
    { key: "social_tiktok", label: "TikTok" },
    { key: "social_facebook", label: "Facebook" },
    { key: "social_twitter", label: "Twitter / X" },
    { key: "social_pinterest", label: "Pinterest" },
    { key: "social_youtube", label: "YouTube" },
    { key: "social_snapchat", label: "Snapchat" },
    { key: "social_threads", label: "Threads" },
];

export function BusinessSettingsTab() {
    const [form, setForm] = useState<SiteSettings>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("*")
            .eq("id", "singleton")
            .single()
            .then(({ data }) => {
                if (data) {
                    setForm({
                        store_name: data.store_name || "",
                        store_tagline: data.store_tagline || "",
                        store_description: data.store_description || "",
                        store_email: data.store_email || "",
                        store_phone: data.store_phone || "",
                        store_address: data.store_address || "",
                        social_instagram: data.social_instagram || "",
                        social_tiktok: data.social_tiktok || "",
                        social_facebook: data.social_facebook || "",
                        social_twitter: data.social_twitter || "",
                        social_pinterest: data.social_pinterest || "",
                        social_youtube: data.social_youtube || "",
                        social_snapchat: data.social_snapchat || "",
                        social_threads: data.social_threads || "",
                        instagram_access_token: data.instagram_access_token || "",
                    });
                }
                setLoading(false);
            });
    }, []);

    const set = (key: keyof SiteSettings, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase
            .from("site_settings")
            .upsert({ id: "singleton", ...form }, { onConflict: "id" });
        setSaving(false);
        if (error) {
            toast.error("Failed to save settings");
        } else {
            toast.success("Settings saved");
        }
    };

    if (loading) {
        return (
            <p className="text-neutral-400 italic font-serif">Loading...</p>
        );
    }

    return (
        <div className="space-y-8 max-w-3xl">
            {/* Store Information */}
            <div className="bg-white border border-neutral-200 p-6 space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">
                    Store Information
                </h2>

                <div>
                    <label className={LABEL_CLASS}>Store Name</label>
                    <input
                        type="text"
                        value={form.store_name}
                        onChange={(e) => set("store_name", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="Miss Tokyo"
                    />
                </div>

                <div>
                    <label className={LABEL_CLASS}>
                        Tagline{" "}
                        <span className="text-neutral-400 normal-case tracking-normal">
                            (max 160 chars)
                        </span>
                    </label>
                    <textarea
                        rows={2}
                        maxLength={160}
                        value={form.store_tagline}
                        onChange={(e) => set("store_tagline", e.target.value)}
                        className={INPUT_CLASS + " resize-none"}
                        placeholder="Luxury footwear crafted for you."
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                        {form.store_tagline.length} / 160
                    </p>
                </div>

                <div>
                    <label className={LABEL_CLASS}>Store Email</label>
                    <input
                        type="email"
                        value={form.store_email}
                        onChange={(e) => set("store_email", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="hello@misstokyo.com"
                    />
                </div>

                <div>
                    <label className={LABEL_CLASS}>Phone</label>
                    <input
                        type="text"
                        value={form.store_phone}
                        onChange={(e) => set("store_phone", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="+234 800 000 0000"
                    />
                </div>

                <div>
                    <label className={LABEL_CLASS}>Address</label>
                    <textarea
                        rows={3}
                        value={form.store_address}
                        onChange={(e) => set("store_address", e.target.value)}
                        className={INPUT_CLASS + " resize-none"}
                        placeholder="123 Victoria Island, Lagos, Nigeria"
                    />
                </div>
            </div>

            {/* Social Links */}
            <div className="bg-white border border-neutral-200 p-6 space-y-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">
                    Social Links
                </h2>
                {SOCIAL_PLATFORMS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500 w-28 shrink-0">
                            {label}
                        </span>
                        <input
                            type="url"
                            value={form[key] as string}
                            onChange={(e) => set(key, e.target.value)}
                            className={INPUT_CLASS}
                            placeholder={`https://`}
                        />
                    </div>
                ))}
            </div>

            {/* Instagram Feed */}
            <div className="bg-white border border-neutral-200 p-6 space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">
                    Instagram Feed
                </h2>
                <div>
                    <label className={LABEL_CLASS}>Access Token</label>
                    <input
                        type="text"
                        value={form.instagram_access_token}
                        onChange={(e) =>
                            set("instagram_access_token", e.target.value)
                        }
                        className={INPUT_CLASS}
                        placeholder="IGQVJXb..."
                    />
                    <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed">
                        Required to show your live Instagram feed on the
                        homepage. Generate this from the Instagram Basic Display
                        API. Leave blank to show placeholder tiles.
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </div>
    );
}
