"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type SiteAsset = {
    section_key: string;
    image_url: string;
    alt_text: string;
}

const CATEGORIES = {
    "Home Page": ["home_hero"],
    "Gallery Page": ["gallery_img_1", "gallery_img_2", "gallery_img_3", "gallery_img_4"],
    "Craft Page": ["craft_img_1", "craft_img_2", "craft_img_3"]
};

// Friendly labels to help the user understand where the image reflects
const ASSET_LABELS: Record<string, string> = {
    "home_hero": "Hero Banner (Top of Home Page)",
    "gallery_img_1": "Gallery Image 1 (Editorial Portrait, 3:4)",
    "gallery_img_2": "Gallery Image 2 (Macro Texture, 4:3)",
    "gallery_img_3": "Gallery Image 3 (Minimal Space, 1:1)",
    "gallery_img_4": "Gallery Image 4 (Abstract, 3:4)",
    "craft_img_1": "Craft - Heritage Section (Portrait)",
    "craft_img_2": "Craft - Philosophy Section (Portrait)",
    "craft_img_3": "Craft - Detail Section (Portrait)"
};

export default function CMSPage() {
    const [assets, setAssets] = useState<SiteAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null); // Track which asset key is saving
    const [error, setError] = useState<string | null>(null);

    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const { data, error } = await supabase
                .from("site_assets")
                .select("*")
                .order("section_key");

            if (error) throw error;
            setAssets(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssetChange = (index: number, field: keyof SiteAsset, value: string) => {
        const newAssets = [...assets];
        newAssets[index] = { ...newAssets[index], [field]: value };
        setAssets(newAssets);
    };

    const handleFileUpload = async (asset: SiteAsset, index: number, file: File) => {
        setIsSaving(asset.section_key);
        setError(null);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${asset.section_key}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage 'site-assets' bucket
            const { error: uploadError } = await supabase.storage
                .from('site-assets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('site-assets')
                .getPublicUrl(filePath);

            // Update local state
            handleAssetChange(index, "image_url", publicUrl);

            // Auto save to database
            const payload = { ...asset, image_url: publicUrl };
            await performSaveAction(payload);

        } catch (err: any) {
            setError(err.message || "Failed to upload file. Ensure the 'site-assets' bucket exists and is public.");
        } finally {
            setIsSaving(null);
        }
    };

    const handleSave = async (asset: SiteAsset) => {
        setIsSaving(asset.section_key);
        setError(null);
        try {
            await performSaveAction(asset);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(null);
        }
    };

    const performSaveAction = async (asset: SiteAsset) => {
        const { error } = await supabase
            .from("site_assets")
            .upsert({
                section_key: asset.section_key,
                image_url: asset.image_url,
                alt_text: asset.alt_text,
            });

        if (error) throw error;
        // Optional: you could re-fetch after a successful save, or just rely on state
    }

    if (isLoading) {
        return <div className="text-sm tracking-widest uppercase text-neutral-500">Loading assets...</div>;
    }

    return (
        <div className="pb-24">
            <header className="mb-12 border-b border-neutral-200 pb-8">
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Site Assets</h1>
                <p className="text-sm text-neutral-500 max-w-2xl">
                    Manage the static imagery across the public storefront. You can paste a direct URL or upload directly from your computer.
                    Remember to write descriptive Alt Text for SEO purposes.
                </p>
            </header>

            {error && (
                <div className="mb-8 p-4 bg-red-50 text-red-900 border border-red-200 text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold ml-4">&times;</button>
                </div>
            )}

            <div className="space-y-16">
                {Object.entries(CATEGORIES).map(([categoryName, keys]) => {
                    // Find assets corresponding to this category
                    const categoryAssets = keys.map(k => {
                        const idx = assets.findIndex(a => a.section_key === k);
                        return { asset: assets[idx], index: idx };
                    }).filter(item => item.asset !== undefined);

                    if (categoryAssets.length === 0) return null;

                    return (
                        <section key={categoryName} className="border border-neutral-200 bg-white">
                            <div className="bg-neutral-50 border-b border-neutral-200 px-8 py-4">
                                <h2 className="font-serif text-xl tracking-widest uppercase text-neutral-900">{categoryName}</h2>
                            </div>

                            <div className="divide-y divide-neutral-100">
                                {categoryAssets.map(({ asset, index }) => (
                                    <div key={asset.section_key} className="p-8 flex flex-col xl:flex-row gap-8">

                                        {/* Preview */}
                                        <div className="w-full xl:w-1/3">
                                            <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-900 mb-1">
                                                {ASSET_LABELS[asset.section_key] || asset.section_key}
                                            </h3>
                                            <p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-4 font-mono">
                                                KEY: {asset.section_key}
                                            </p>
                                            <div className="relative aspect-video bg-white w-full overflow-hidden border border-neutral-100 group">
                                                {asset.image_url ? (
                                                    <img
                                                        src={asset.image_url}
                                                        alt={asset.alt_text}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">No Image</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Form & Upload */}
                                        <div className="w-full xl:w-2/3 flex flex-col justify-center space-y-6">

                                            {/* File Upload OR URL Paste */}
                                            <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-sm">
                                                <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-600 mb-3">
                                                    Media Source
                                                </label>

                                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                                    <div className="w-full relative">
                                                        <input
                                                            type="text"
                                                            value={asset.image_url || ""}
                                                            onChange={(e) => handleAssetChange(index, "image_url", e.target.value)}
                                                            placeholder="Paste URL here..."
                                                            className="w-full border border-neutral-300 py-2 px-3 bg-white text-sm focus:outline-none focus:border-black transition-colors"
                                                        />
                                                    </div>
                                                    <span className="text-xs uppercase tracking-widest text-neutral-400">OR</span>
                                                    <div className="w-full md:w-auto shrink-0">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            ref={(el) => { fileInputRefs.current[asset.section_key] = el; }}
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files.length > 0) {
                                                                    handleFileUpload(asset, index, e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => fileInputRefs.current[asset.section_key]?.click()}
                                                            className="w-full md:w-auto px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                                                            Upload File
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">Alt Text (SEO)</label>
                                                <input
                                                    type="text"
                                                    value={asset.alt_text || ""}
                                                    onChange={(e) => handleAssetChange(index, "alt_text", e.target.value)}
                                                    placeholder="Descriptive alt text for visually impaired and search engines"
                                                    className="w-full border-b border-neutral-300 py-2 bg-transparent text-sm focus:outline-none focus:border-black transition-colors"
                                                />
                                            </div>

                                            <div className="pt-2">
                                                <button
                                                    onClick={() => handleSave(asset)}
                                                    disabled={isSaving === asset.section_key}
                                                    className="px-8 py-3 bg-black text-white text-xs font-semibold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                                                >
                                                    {isSaving === asset.section_key ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                            Processing...
                                                        </>
                                                    ) : "Save Text & Asset"}
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}

                {assets.length === 0 && (
                    <div className="text-sm text-neutral-500 italic">
                        No asset keys configured in the database yet. Run the SQL initialization.
                    </div>
                )}
            </div>
        </div>
    );
}
