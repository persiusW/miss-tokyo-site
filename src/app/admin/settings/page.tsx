"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { toast } from "@/lib/toast";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { AssetsTab } from "./AssetsTab";
import { EmailsTab } from "./EmailsTab";

type BusinessSettings = {
    business_name: string;
    email: string;
    contact: string;
    address: string;
    logo_url: string | null;
    tax_rate: number;
};

type StoreSettings = {
    global_sizes: string[];
    global_colors: string[];
    global_stitching: string[];
    enable_store_pickup: boolean;
    maintenance_mode: boolean;
    home_grid_cols: 2 | 3 | 4;
    shop_grid_cols: 2 | 3 | 4;
    home_product_limit: 4 | 6 | 8 | 12;
};

const DEFAULT_BUSINESS: BusinessSettings = {
    business_name: "Miss Tokyo",
    email: "",
    contact: "",
    address: "",
    logo_url: null,
    tax_rate: 0,
};

const DEFAULT_STORE: StoreSettings = {
    global_sizes: ["S", "M", "L", "XL", "Free Size"],
    global_colors: ["Black", "White", "Grey"],
    global_stitching: ["Standard", "Premium"],
    enable_store_pickup: false,
    maintenance_mode: false,
    home_grid_cols: 4,
    shop_grid_cols: 4,
    home_product_limit: 4,
};

type SiteMetadata = {
    id?: string;
    page_path: string;
    title: string;
    description: string;
    og_image_url: string;
    keywords: string;
};

type TabKey = "business" | "store" | "seo" | "assets" | "emails";

const TABS: { key: TabKey; label: string }[] = [
    { key: "business", label: "Business" },
    { key: "store", label: "Store" },
    { key: "seo", label: "SEO" },
    { key: "assets", label: "Assets" },
    { key: "emails", label: "Templates" },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("business");

    return (
        <div className="p-8 max-w-6xl">
            <header className="mb-12">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Settings</h1>
                <p className="text-xs text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>Refining the essence of the Miss Tokyo digital experience.</p>
                
                <div className="flex gap-8 mt-10 border-b border-gray-100 overflow-x-auto scrollbar-hide">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`pb-4 text-[11px] uppercase tracking-[0.2em] font-bold transition-all whitespace-nowrap -mb-px ${activeTab === tab.key ? "border-b-2 border-black text-black" : "text-gray-300 hover:text-black"}`}
                            style={{ fontFamily: "Arial, sans-serif" }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="mt-8">
                {activeTab === "business" && <BusinessTab />}
                {activeTab === "store" && <StoreTab />}
                {activeTab === "seo" && <SEOTab />}
                {activeTab === "assets" && <AssetsTab />}
                {activeTab === "emails" && <EmailsTab />}
            </div>
        </div>
    );
}

function BusinessTab() {
    const supabase = createClient();
    const [form, setForm] = useState<BusinessSettings>(DEFAULT_BUSINESS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchBusiness = async () => {
            setLoading(true);
            try {
                const { data: bData } = await supabase.from("business_settings").select("*").eq("id", 1).single();
                if (bData) {
                    setForm({
                        business_name: bData.business_name || "Miss Tokyo",
                        email: bData.email || "",
                        contact: bData.contact || "",
                        address: bData.address || "",
                        logo_url: bData.logo_url || null,
                        tax_rate: Number(bData.tax_rate) || 0,
                    });
                }
            } catch (err) {
                console.error("Fetch business settings error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBusiness();
    }, [supabase]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from("business_settings").upsert(
                { id: 1, ...form, updated_at: new Date().toISOString() },
                { onConflict: "id" }
            );
            if (error) throw error;
            toast.success("Business profile updated.");
        } catch (error: any) {
            toast.error(`Update failed: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-[10px] uppercase tracking-widest text-gray-300 italic font-serif">Accessing records...</div>;

    return (
        <form onSubmit={handleSave} className="space-y-12 max-w-2xl">
            <div className="bg-white border border-gray-100 p-8 space-y-8">
                <h2 className="text-[11px] uppercase tracking-widest font-bold text-black border-b border-gray-50 pb-4">Brand Identity</h2>
                <ImageUploader
                    bucket="site-assets"
                    folder="logos"
                    currentUrls={form.logo_url ? [form.logo_url] : []}
                    onUpload={(urls: string[]) => setForm(p => ({ ...p, logo_url: urls[0] }))}
                    onRemove={() => setForm(p => ({ ...p, logo_url: null }))}
                    aspectRatio="square"
                    label="Signature Logo"
                />
            </div>

            <div className="bg-white border border-gray-100 p-8 space-y-8">
                <h2 className="text-[11px] uppercase tracking-widest font-bold text-black border-b border-gray-50 pb-4">Contact Logistics</h2>
                
                <div className="grid grid-cols-1 gap-6">
                    <Field label="Business Name" name="business_name" value={form.business_name} onChange={v => setForm(f => ({ ...f, business_name: v }))} />
                    <div className="grid grid-cols-2 gap-6">
                        <Field label="Official Email" name="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                        <Field label="Primary Contact" name="contact" value={form.contact} onChange={v => setForm(f => ({ ...f, contact: v }))} />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Atelier Address</label>
                        <textarea
                            value={form.address}
                            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                            rows={3}
                            className="w-full border border-gray-100 p-4 text-xs outline-none focus:border-black transition-colors resize-none"
                            placeholder="Street, City, Country"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" disabled={saving} className="bg-black text-white text-[10px] uppercase tracking-widest px-10 py-4 hover:bg-neutral-800 transition-all font-bold disabled:opacity-50">
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </form>
    );
}

function StoreTab() {
    const supabase = createClient();
    const [form, setForm] = useState<StoreSettings>(DEFAULT_STORE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchStore = async () => {
            setLoading(true);
            try {
                // Fetch settings
                const { data: sData } = await supabase.from("store_settings").select("*").eq("id", 1).single();
                if (sData) {
                    setForm({
                        global_sizes: sData.global_sizes || DEFAULT_STORE.global_sizes,
                        global_colors: sData.global_colors || DEFAULT_STORE.global_colors,
                        global_stitching: sData.global_stitching || DEFAULT_STORE.global_stitching,
                        enable_store_pickup: sData.enable_store_pickup || false,
                        maintenance_mode: sData.maintenance_mode || false,
                        home_grid_cols: sData.home_grid_cols || 4,
                        shop_grid_cols: sData.shop_grid_cols || 4,
                        home_product_limit: sData.home_product_limit || 4,
                    });
                }
            } catch (err) {
                console.error("Fetch store settings error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [supabase]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { 
                global_sizes, 
                global_colors, 
                global_stitching, 
                enable_store_pickup, 
                maintenance_mode 
            } = form;

            const { error: sError } = await supabase.from("store_settings").upsert({ 
                id: 1, 
                global_sizes, 
                global_colors, 
                global_stitching, 
                enable_store_pickup, 
                maintenance_mode,
                updated_at: new Date().toISOString()
            }, { onConflict: "id" });
            
            if (sError) throw sError;

            toast.success("Store configuration saved.");
        } catch (error: any) {
            toast.error(`Save failure: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-[10px] uppercase tracking-widest text-gray-300 italic font-serif">Syncing parameters...</div>;

    return (
        <form onSubmit={handleSave} className="space-y-12 max-w-2xl">
            <div className="bg-white border border-gray-100 p-8 space-y-8">
                <h2 className="text-[11px] uppercase tracking-widest font-bold text-black border-b border-gray-50 pb-4">Operational Toggles</h2>
                <div className="space-y-6">
                    <Toggle label="Enable Store Pickup" active={form.enable_store_pickup} onToggle={v => setForm(f => ({ ...f, enable_store_pickup: v }))} desc="Allow local collection from current atelier location." />
                    <Toggle label="Maintenance Mode" active={form.maintenance_mode} onToggle={v => setForm(f => ({ ...f, maintenance_mode: v }))} desc="Restrict public access with a placeholder screen." />
                </div>
            </div>

            <div className="bg-white border border-gray-100 p-8 space-y-8">
                <h2 className="text-[11px] uppercase tracking-widest font-bold text-black border-b border-gray-50 pb-4">Global Parameters</h2>
                <div className="space-y-6">
                    <TagInput label="Standard Sizes" tags={form.global_sizes} onChange={v => setForm(f => ({ ...f, global_sizes: v }))} />
                    <TagInput label="Core Colors" tags={form.global_colors} onChange={v => setForm(f => ({ ...f, global_colors: v }))} />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" disabled={saving} className="bg-black text-white text-[10px] uppercase tracking-widest px-10 py-4 hover:bg-neutral-800 transition-all font-bold disabled:opacity-50">
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </form>
    );
}

function SEOTab() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [metadataList, setMetadataList] = useState<SiteMetadata[]>([]);
    const [selectedPath, setSelectedPath] = useState<string>("/");
    const [formData, setFormData] = useState<SiteMetadata>({
        page_path: "/",
        title: "",
        description: "",
        og_image_url: "",
        keywords: ""
    });

    const fetchMetadata = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from("site_metadata").select("*");
            if (data) setMetadataList(data);
        } catch (err) {
            console.error("Fetch metadata error:", err);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => { fetchMetadata(); }, [fetchMetadata]);

    useEffect(() => {
        const existing = metadataList.find(m => m.page_path === selectedPath);
        if (existing) setFormData(existing);
        else setFormData({ page_path: selectedPath, title: "", description: "", og_image_url: "", keywords: "" });
    }, [selectedPath, metadataList]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from("site_metadata").upsert(
                { ...formData, updated_at: new Date().toISOString() },
                { onConflict: "page_path" }
            );
            if (error) throw error;
            toast.success("SEO Optimized.");
            fetchMetadata();
        } catch (error: any) {
            toast.error(`Save failed: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-[10px] uppercase tracking-widest text-gray-300 italic font-serif">Querying index...</div>;

    return (
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl">
            <div className="bg-white p-8 border border-gray-100 space-y-8">
                <h2 className="text-[11px] uppercase tracking-widest font-bold text-black border-b border-gray-50 pb-4">Metadata Editor</h2>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Target Route</label>
                        <select
                            value={selectedPath}
                            onChange={(e) => setSelectedPath(e.target.value)}
                            className="w-full border-b border-gray-100 py-3 text-xs outline-none focus:border-black bg-transparent appearance-none font-bold tracking-widest uppercase cursor-pointer"
                        >
                            <option value="/">Home (/)</option>
                            <option value="/shop">Shop (/shop)</option>
                            <option value="/checkout">Checkout (/checkout)</option>
                            <option value="/claim-account">Claim Account</option>
                        </select>
                    </div>

                    <Field label="Meta Title" value={formData.title} onChange={v => setFormData(f => ({ ...f, title: v }))} />
                    
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Meta Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                            className="w-full border border-gray-100 p-4 text-xs outline-none focus:border-black transition-colors resize-none"
                            rows={4}
                        />
                    </div>
                </div>

                <div className="pt-8">
                    <button type="submit" disabled={saving} className="w-full bg-black text-white text-[10px] uppercase tracking-widest py-4 hover:bg-neutral-800 transition-all font-bold disabled:opacity-50">
                        {saving ? "Indexing..." : "Update Route Metadata"}
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                <div className="p-8 border border-gray-100 bg-gray-50/30">
                     <h2 className="text-[11px] uppercase tracking-widest font-bold text-gray-400 border-b border-gray-100 pb-4 mb-6">Search Engine Preview</h2>
                     <div className="bg-white p-6 border border-gray-100 shadow-sm space-y-2">
                        <p className="text-xs text-blue-700 font-medium truncate underline">Miss Tokyo — {formData.title || "Page Title"}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{formData.description || "The metadata description defines how this page appears in search results."}</p>
                     </div>
                </div>
            </div>
        </form>
    );
}

function Field({ label, value, onChange, name }: { label: string; value: string; onChange: (v: string) => void; name?: string }) {
    return (
        <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">{label}</label>
            <input
                type="text" name={name} value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full border-b border-gray-100 py-3 text-xs outline-none focus:border-black transition-colors bg-transparent"
            />
        </div>
    );
}

function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (tags: string[]) => void }) {
    const [input, setInput] = useState("");

    const addTag = (raw: string) => {
        const val = raw.trim();
        if (val && !tags.includes(val)) onChange([...tags, val]);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
        } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    const handleBlur = () => {
        if (input.trim()) addTag(input);
    };

    return (
        <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2 min-h-[36px]">
                {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-neutral-100 text-[10px] uppercase tracking-widest font-bold px-2 py-1">
                        {tag}
                        <button
                            type="button"
                            onClick={() => onChange(tags.filter(t => t !== tag))}
                            className="text-gray-400 hover:text-black leading-none ml-1"
                            aria-label={`Remove ${tag}`}
                        >×</button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder="Add, press Enter"
                    className="flex-1 min-w-[120px] text-xs outline-none bg-transparent py-1 placeholder:text-gray-300"
                />
            </div>
            <p className="text-[9px] text-gray-300 mt-1 uppercase tracking-widest">Press Enter or comma to add · Backspace to remove last</p>
        </div>
    );
}

function Toggle({ label, active, onToggle, desc }: { label: string; active: boolean; onToggle: (v: boolean) => void; desc: string }) {
    return (
        <label className="flex items-start gap-4 cursor-pointer group">
            <input type="checkbox" checked={active} onChange={e => onToggle(e.target.checked)} className="mt-1 w-4 h-4 accent-black" />
            <div>
                <span className="block text-[10px] uppercase tracking-widest font-bold text-gray-900 group-hover:text-black transition-colors">{label}</span>
                <span className="block text-[10px] text-gray-400 mt-1">{desc}</span>
            </div>
        </label>
    );
}
