"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";

type SiteAsset = {
    id: string;
    section_key: string;
    label: string;
    image_url: string | null;
    alt_text: string | null;
    link_url: string | null;
    is_active: boolean;
    updated_at: string;
};

const DEFAULT_ASSETS = [
    { section_key: "home_hero", label: "Homepage Hero" },
    { section_key: "craft_banner", label: "Craft Page Banner" },
    { section_key: "custom_banner", label: "Custom Order Banner" },
    { section_key: "shop_banner", label: "Shop Page Banner" },
    { section_key: "gallery_banner", label: "Gallery Banner" },
];

export default function AssetsPage() {
    const [assets, setAssets] = useState<SiteAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [edits, setEdits] = useState<Record<string, Partial<SiteAsset>>>({});

    const fetchAssets = async () => {
        setLoading(true);
        const { data } = await supabase.from("site_assets").select("*");
        if (data) setAssets(data);
        setLoading(false);
    };

    useEffect(() => { fetchAssets(); }, []);

    const getAsset = (key: string) => assets.find(a => a.section_key === key);

    const getEditValue = (key: string, field: keyof SiteAsset, fallback: string | null) => {
        return edits[key]?.[field] !== undefined ? (edits[key][field] as string) : (fallback || "");
    };

    const handleChange = (key: string, field: keyof SiteAsset, value: string) => {
        setEdits(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
    };

    const handleSave = async (key: string) => {
        const current = getAsset(key);
        const patch = edits[key] || {};
        setSaving(key);

        if (current) {
            await supabase.from("site_assets")
                .update({ ...patch, updated_at: new Date().toISOString() })
                .eq("section_key", key);
        } else {
            const def = DEFAULT_ASSETS.find(d => d.section_key === key);
            await supabase.from("site_assets").upsert({
                section_key: key,
                label: def?.label || key,
                image_url: patch.image_url || null,
                alt_text: patch.alt_text || null,
                link_url: patch.link_url || null,
                is_active: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: "section_key" });
        }

        setEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
        await fetchAssets();
        setSaving(null);
    };

    if (loading) {
        return (
            <div className="space-y-12">
                <header>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Site Assets</h1>
                    <p className="text-neutral-500">Manage global images and banners.</p>
                </header>
                <p className="text-neutral-400 italic font-serif">Loading assets...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Site Assets</h1>
                <p className="text-neutral-500">Control global images, banners, and visual content across the storefront.</p>
            </header>

            <div className="space-y-6">
                {DEFAULT_ASSETS.map(({ section_key, label }) => {
                    const asset = getAsset(section_key);
                    const isDirty = !!edits[section_key];
                    const isSaving = saving === section_key;
                    const altText = getEditValue(section_key, "alt_text", asset?.alt_text || null);
                    const linkUrl = getEditValue(section_key, "link_url", asset?.link_url || null);

                    return (
                        <div key={section_key} className="bg-white border border-neutral-200">
                            <div className="px-8 py-4 border-b border-neutral-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold tracking-wide">{label}</h2>
                                    <span className="font-mono text-[10px] text-neutral-400">{section_key}</span>
                                </div>
                                {asset && (
                                    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${asset.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                                        {asset.is_active ? "Active" : "Inactive"}
                                    </span>
                                )}
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Fields */}
                                <div className="space-y-6">
                                    <div>
                                        <ImageUploader
                                            bucket="site-assets"
                                            folder="banners"
                                            currentUrl={asset?.image_url || null}
                                            onUpload={(url) => handleChange(section_key, "image_url", url)}
                                            aspectRatio="banner"
                                            label="Image"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Alt Text</label>
                                            <input
                                                type="text"
                                                value={altText}
                                                onChange={e => handleChange(section_key, "alt_text", e.target.value)}
                                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                                                placeholder="Descriptive alt text"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Link URL (Optional)</label>
                                            <input
                                                type="url"
                                                value={linkUrl}
                                                onChange={e => handleChange(section_key, "link_url", e.target.value)}
                                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                                                placeholder="/shop"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-[10px] text-neutral-400 tracking-wider">
                                            {asset?.updated_at
                                                ? `Last updated ${new Date(asset.updated_at).toLocaleDateString()}`
                                                : "Not yet configured"}
                                        </span>
                                        <button
                                            onClick={() => handleSave(section_key)}
                                            disabled={isSaving || !isDirty}
                                            className="px-6 py-2 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            {isSaving ? "Saving..." : "Save"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
