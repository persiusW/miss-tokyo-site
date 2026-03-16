"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { toast } from "@/lib/toast";

type SiteAsset = {
    section_key: string;
    label: string | null;
    image_url: string | null;
    alt_text: string | null;
    link_url: string | null;
    is_active: boolean;
    updated_at: string;
};

type CopyRow = {
    copy_key: string;
    label: string;
    page_group: string;
    value: string;
    updated_at: string;
};

type AssetDef = {
    section_key: string;
    label: string;
    group: string;
};

const DEFAULT_ASSETS: AssetDef[] = [
    { section_key: "home_hero",       label: "Main Hero Banner",     group: "Homepage" },
    { section_key: "shop_banner",     label: "Shop Catalogue Header",  group: "Catalog" },
    { section_key: "footer_logo",     label: "Footer Logotype",       group: "Global UI" },
];

// Specific site copy fields requested by the user
const SITE_COPY_FIELDS = [
    { key: "hero_headline", label: "Hero Main Headline", group: "Homepage" },
    { key: "hero_subheadline", label: "Hero Sub-headline", group: "Homepage" },
    { key: "about_us_text", label: "About Us Text", group: "Global" },
    { key: "footer_text", label: "Footer Description", group: "Global" },
    { key: "contact_email", label: "Contact Email", group: "Contact" },
    { key: "contact_phone", label: "Contact Phone", group: "Contact" },
];

export function AssetsTab() {
    const supabase = createClient();
    const [activeSubTab, setActiveSubTab] = useState<"images" | "text">("images");
    
    // Images State
    const [assets, setAssets] = useState<SiteAsset[]>([]);
    const [assetsLoading, setAssetsLoading] = useState(true);
    const [assetSaving, setAssetSaving] = useState<string | null>(null);

    // Text State
    const [copyRows, setCopyRows] = useState<CopyRow[]>([]);
    const [copyLoading, setCopyLoading] = useState(true);
    const [copySaving, setCopySaving] = useState<string | null>(null);

    const fetchAssets = async () => {
        setAssetsLoading(true);
        try {
            const { data } = await supabase.from("site_assets").select("*");
            if (data) setAssets(data);
        } catch (err) {
            console.error("Fetch assets error:", err);
        } finally {
            setAssetsLoading(false);
        }
    };

    const fetchCopy = async () => {
        setCopyLoading(true);
        try {
            const { data } = await supabase.from("site_copy").select("*");
            if (data) setCopyRows(data);
        } catch (err) {
            console.error("Fetch copy error:", err);
        } finally {
            setCopyLoading(false);
        }
    };

    useEffect(() => { 
        fetchAssets(); 
        fetchCopy();
    }, [supabase]);

    const handleAssetSave = async (key: string, patch: Partial<SiteAsset>) => {
        setAssetSaving(key);
        try {
            const { error } = await supabase.from("site_assets").upsert({
                section_key: key,
                ...patch,
                updated_at: new Date().toISOString()
            }, { onConflict: "section_key" });

            if (error) throw error;
            toast.success("Asset committed to collection.");
            fetchAssets();
        } catch (error: any) {
            toast.error(`Vault error: ${error.message}`);
        } finally {
            setAssetSaving(null);
        }
    };

    const handleCopySave = async (key: string, value: string) => {
        setCopySaving(key);
        try {
            const { error } = await supabase.from("site_copy")
                .upsert({ 
                    copy_key: key, 
                    value, 
                    updated_at: new Date().toISOString() 
                }, { onConflict: "copy_key" });
            
            if (error) throw error;
            toast.success("Script updated and synchronized.");
            fetchCopy();
        } catch (error: any) {
            toast.error(`Script error: ${error.message}`);
        } finally {
            setCopySaving(null);
        }
    };

    if (assetsLoading || copyLoading) return <div className="py-20 text-center text-[10px] uppercase tracking-widest text-gray-300 italic font-serif">Parsing aesthetic nodes...</div>;

    return (
        <div className="space-y-12">
            {/* Sub-tab Navigation */}
            <div className="flex gap-8 border-b border-gray-50 pb-px">
                {(["images", "text"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={`pb-4 text-[10px] uppercase tracking-[0.2em] font-bold transition-all -mb-px ${
                            activeSubTab === tab ? "border-b-2 border-black text-black" : "text-gray-300 hover:text-black"
                        }`}
                    >
                        {tab === "images" ? "Visual Assets" : "Dynamic Text"}
                    </button>
                ))}
            </div>

            {activeSubTab === "images" ? (
                <div className="space-y-12">
                     {DEFAULT_ASSETS.map(def => {
                        const asset = assets.find(a => a.section_key === def.section_key);
                        return (
                            <div key={def.section_key} className="bg-white border border-gray-100 overflow-hidden">
                                <div className="px-8 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/20">
                                    <div>
                                        <h3 className="text-[11px] uppercase tracking-widest font-bold text-black">{def.label}</h3>
                                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">{def.section_key}</p>
                                    </div>
                                    <span className={`text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 font-bold ${asset?.is_active ? "bg-black text-white" : "text-gray-300"}`}>
                                        {asset?.is_active ? "LIVE" : "DRAFT"}
                                    </span>
                                </div>
                                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    <ImageUploader
                                        bucket="site-assets"
                                        folder="banners"
                                        currentUrls={asset?.image_url ? [asset.image_url] : []}
                                        onUpload={(urls: string[]) => handleAssetSave(def.section_key, { image_url: urls[0], is_active: true })}
                                        onRemove={() => handleAssetSave(def.section_key, { image_url: null, is_active: false })}
                                        aspectRatio="banner"
                                        label="Imagery"
                                    />
                                    <div className="space-y-6">
                                        <AssetInput label="Link Destination" value={asset?.link_url || ""} onChange={v => handleAssetSave(def.section_key, { link_url: v })} placeholder="/shop" />
                                        <AssetInput label="Descriptive Context (Alt)" value={asset?.alt_text || ""} onChange={v => handleAssetSave(def.section_key, { alt_text: v })} placeholder="High-end fashion photography..." />
                                        <div className="pt-4 flex justify-between items-center border-t border-gray-50">
                                            <p className="text-[9px] text-gray-300 uppercase tracking-widest">
                                                {asset?.updated_at ? `Last sync: ${new Date(asset.updated_at).toLocaleDateString()}` : "Pending Initial Setup"}
                                            </p>
                                            <button 
                                                onClick={() => handleAssetSave(def.section_key, { is_active: !asset?.is_active })}
                                                className="text-[10px] uppercase tracking-widest font-bold text-black hover:underline"
                                            >
                                                {asset?.is_active ? "Retire from live" : "Deploy to live"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Simplified grouped view for Site Copy */}
                    {["Homepage", "Global", "Contact"].map(group => (
                        <div key={group}>
                            <h2 className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-6 pb-2 border-b border-gray-100">
                                {group} Copy
                            </h2>
                            <div className="space-y-6">
                                {SITE_COPY_FIELDS.filter(f => f.group === group).map(field => {
                                    const row = copyRows.find(r => r.copy_key === field.key);
                                    return (
                                        <div key={field.key} className="bg-white border border-gray-100 p-8 hover:border-black transition-colors group">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-widest font-bold text-black">{field.label}</p>
                                                    <span className="text-[9px] text-gray-300 font-mono italic">{field.key}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const el = document.getElementById(`copy-${field.key}`) as HTMLTextAreaElement | HTMLInputElement;
                                                        handleCopySave(field.key, el.value);
                                                    }}
                                                    disabled={copySaving === field.key}
                                                    className="text-[10px] uppercase tracking-widest font-bold text-gray-300 hover:text-black transition-colors"
                                                >
                                                    {copySaving === field.key ? "Syncing..." : "Save"}
                                                </button>
                                            </div>
                                            {field.key.includes("text") ? (
                                                <textarea
                                                    id={`copy-${field.key}`}
                                                    defaultValue={row?.value || ""}
                                                    rows={4}
                                                    className="w-full border-b border-gray-50 bg-transparent py-2 text-xs outline-none focus:border-black transition-colors resize-none font-medium leading-relaxed"
                                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                />
                                            ) : (
                                                <input
                                                    id={`copy-${field.key}`}
                                                    type="text"
                                                    defaultValue={row?.value || ""}
                                                    className="w-full border-b border-gray-50 bg-transparent py-2 text-xs outline-none focus:border-black transition-colors font-medium"
                                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AssetInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">{label}</label>
            <input
                type="text" value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full border-b border-gray-100 py-2.5 text-xs outline-none focus:border-black transition-colors bg-transparent italic"
            />
        </div>
    );
}
