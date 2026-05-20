"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type SiteSettings = {
    store_tagline: string;
    store_description: string;
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
    store_tagline: "",
    store_description: "",
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

const SOCIAL_PLATFORMS: { key: keyof SiteSettings; label: string }[] = [
    { key: "social_instagram", label: "Instagram" },
    { key: "social_tiktok",   label: "TikTok" },
    { key: "social_facebook", label: "Facebook" },
    { key: "social_twitter",  label: "Twitter / X" },
    { key: "social_pinterest",label: "Pinterest" },
    { key: "social_youtube",  label: "YouTube" },
    { key: "social_snapchat", label: "Snapchat" },
    { key: "social_threads",  label: "Threads" },
];

const secTitle = (label: string) => (
    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "var(--ac-ink-3)", paddingBottom: 10, borderBottom: "1px solid var(--ac-line)", marginBottom: 16 }}>{label}</p>
);

export function BusinessSettingsTab() {
    const [form, setForm] = useState<SiteSettings>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        supabase.from("site_settings").select("*").eq("id", "singleton").single()
            .then(({ data }: { data: any }) => {
                if (data) {
                    setForm({
                        store_tagline: data.store_tagline || "",
                        store_description: data.store_description || "",
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
        setForm(prev => ({ ...prev, [key]: value }));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase
            .from("site_settings")
            .upsert({ id: "singleton", ...form }, { onConflict: "id" });
        setSaving(false);
        if (error) {
            toast.error("Failed to save settings");
        } else {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    if (loading) return <div className="ac-empty"><p className="ac-empty-title">Loading...</p></div>;

    return (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, alignItems: "start" }}>

                {/* Social Links — 2-col grid internally */}
                <div className="ac-card" style={{ padding: "20px 24px" }}>
                    {secTitle("Social Links")}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                        {SOCIAL_PLATFORMS.map(({ key, label }) => (
                            <div key={key}>
                                <label className="ac-label">{label}</label>
                                <input
                                    type="url"
                                    value={form[key] as string}
                                    onChange={e => set(key, e.target.value)}
                                    className="ac-input"
                                    style={{ marginTop: 4 }}
                                    placeholder="https://"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Store copy + Instagram */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                        {secTitle("Store Copy")}
                        <div>
                            <label className="ac-label">Tagline <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--ac-ink-4)" }}>(max 160 chars)</span></label>
                            <textarea
                                rows={2}
                                maxLength={160}
                                value={form.store_tagline}
                                onChange={e => set("store_tagline", e.target.value)}
                                className="ac-textarea"
                                style={{ marginTop: 6 }}
                                placeholder="Luxury footwear crafted for you."
                            />
                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 3 }}>{form.store_tagline.length} / 160</p>
                        </div>
                        <div>
                            <label className="ac-label">Store Description</label>
                            <textarea
                                rows={3}
                                value={form.store_description}
                                onChange={e => set("store_description", e.target.value)}
                                className="ac-textarea"
                                style={{ marginTop: 6 }}
                                placeholder="A short description of your brand..."
                            />
                        </div>
                    </div>

                    <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {secTitle("Instagram Feed")}
                        <div>
                            <label className="ac-label">Access Token</label>
                            <input
                                type="text"
                                value={form.instagram_access_token}
                                onChange={e => set("instagram_access_token", e.target.value)}
                                className="ac-input"
                                style={{ marginTop: 6 }}
                                placeholder="IGQVJXb..."
                            />
                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 6, lineHeight: 1.5 }}>
                                Required to show your live Instagram feed on the homepage. Leave blank to show placeholder tiles.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
                {saved && <span style={{ fontSize: 11, color: "var(--ac-accent)", textTransform: "uppercase", letterSpacing: ".06em" }}>Saved</span>}
                <button type="submit" disabled={saving} className="ac-btn ac-btn-primary">
                    {saving ? "Saving..." : "Save Store Settings"}
                </button>
            </div>
        </form>
    );
}
