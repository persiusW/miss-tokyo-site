"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";
import { toast } from "@/lib/toast";
import { AssetsTab } from "./AssetsTab";
import { EmailsTab } from "./EmailsTab";
import { RidersTab } from "./RidersTab";

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
    enable_gift_cards: boolean;
    enable_gallery: boolean;
    enable_craft: boolean;
    enable_whitelabel: boolean;
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
    global_sizes: ["39", "40", "41", "42", "43", "44", "45"],
    global_colors: ["Noir", "Cognac", "Sand"],
    global_stitching: ["Tonal", "Contrast White"],
    enable_store_pickup: false,
    maintenance_mode: false,
    home_grid_cols: 4,
    shop_grid_cols: 4,
    home_product_limit: 4,
    enable_gift_cards: true,
    enable_gallery: true,
    enable_craft: true,
    enable_whitelabel: true,
};

type SiteMetadata = {
    id?: string;
    page_path: string;
    title: string;
    description: string;
    og_image_url: string;
    keywords: string;
};

type TabKey = "business" | "store" | "seo" | "assets" | "emails" | "riders";

const TABS: { key: TabKey; label: string }[] = [
    { key: "business", label: "Business" },
    { key: "store", label: "Store" },
    { key: "seo", label: "SEO" },
    { key: "assets", label: "Site Assets" },
    { key: "emails", label: "Emails" },
    { key: "riders", label: "Riders" },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("business");

    return (
        <div className="space-y-10 max-w-6xl">
            <header className="border-b border-neutral-200 pb-0">
                <div className="mb-6">
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Settings</h1>
                    <p className="text-neutral-500">Manage your atelier's business details, store configuration, SEO, site assets, and email templates.</p>
                </div>
                <div className="flex gap-6 text-xs font-semibold uppercase tracking-widest overflow-x-auto scrollbar-hide">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`pb-4 border-b-2 transition-colors whitespace-nowrap -mb-px ${activeTab === tab.key ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {activeTab === "business" && <BusinessTab />}
            {activeTab === "store" && <StoreTab />}
            {activeTab === "seo" && <SEOTab />}
            {activeTab === "assets" && <AssetsTab />}
            {activeTab === "emails" && <EmailsTab />}
            {activeTab === "riders" && <RidersTab />}
        </div>
    );
}

function BusinessTab() {
    const [form, setForm] = useState<BusinessSettings>(DEFAULT_BUSINESS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        supabase.from("business_settings").select("*").eq("id", "default").single()
            .then(({ data: bData }) => {
                setForm({
                    business_name: bData?.business_name || "",
                    email: bData?.email || "",
                    contact: bData?.contact || "",
                    address: bData?.address || "",
                    logo_url: bData?.logo_url || null,
                    tax_rate: Number(bData?.tax_rate) || 0,
                });
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
        return <p className="text-neutral-400 italic font-serif">Loading...</p>;
    }

    return (
        <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
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
                        placeholder="Miss Tokyo"
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
    );
}

function StoreTab() {
    const [form, setForm] = useState<StoreSettings>(DEFAULT_STORE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        supabase.from("store_settings").select("*").eq("id", "default").single()
            .then(({ data: sData }) => {
                if (sData) {
                    setForm({
                        global_sizes: sData.global_sizes || DEFAULT_STORE.global_sizes,
                        global_colors: sData.global_colors || DEFAULT_STORE.global_colors,
                        global_stitching: sData.global_stitching || DEFAULT_STORE.global_stitching,
                        enable_store_pickup: sData.enable_store_pickup || false,
                        maintenance_mode: sData.maintenance_mode || false,
                        home_grid_cols: (sData.home_grid_cols as 2 | 3 | 4) || 4,
                        shop_grid_cols: (sData.shop_grid_cols as 2 | 3 | 4) || 4,
                        home_product_limit: (sData.home_product_limit as 4 | 6 | 8 | 12) || 4,
                        enable_gift_cards: sData.enable_gift_cards ?? true,
                        enable_gallery: sData.enable_gallery ?? true,
                        enable_craft: sData.enable_craft ?? true,
                        enable_whitelabel: sData.enable_whitelabel ?? true,
                    });
                }
                setLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await supabase.from("store_settings").upsert(
            { id: "default", ...form },
            { onConflict: "id" }
        );
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) {
        return <p className="text-neutral-400 italic font-serif">Loading...</p>;
    }

    return (
        <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
            {/* Store Configuration */}
            <div className="bg-white border border-neutral-200 p-8 space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Store Configuration</h2>

                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.enable_store_pickup}
                            onChange={(e) => setForm(p => ({ ...p, enable_store_pickup: e.target.checked }))}
                            className="w-4 h-4 accent-black"
                        />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Enable Store Pickup</span>
                    </label>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7">Allow customers to pick up orders directly from the atelier.</p>
                </div>

                <div className="pt-4 border-t border-neutral-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.maintenance_mode}
                            onChange={(e) => setForm(p => ({ ...p, maintenance_mode: e.target.checked }))}
                            className="w-4 h-4 accent-black"
                        />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Enable Coming Soon / Maintenance Mode</span>
                    </label>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7">Restrict access to the shop and show a coming soon placeholder.</p>
                </div>

                <div className="pt-4 border-t border-neutral-100 mt-6 grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Global Shoe Sizes</label>
                        <input
                            type="text"
                            value={form.global_sizes.join(", ")}
                            onChange={(e) => setForm(p => ({ ...p, global_sizes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="39, 40, 41, 42, 43, 44, 45, 46"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Comma-separated list of globally available sizes.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Global Colors</label>
                        <input
                            type="text"
                            value={form.global_colors.join(", ")}
                            onChange={(e) => setForm(p => ({ ...p, global_colors: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="Noir, Cognac, Sand"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Comma-separated list of colors available globally.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Global Stitching Options</label>
                        <input
                            type="text"
                            value={form.global_stitching.join(", ")}
                            onChange={(e) => setForm(p => ({ ...p, global_stitching: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="Tonal, Contrast White"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Comma-separated list of stitching styles.</p>
                    </div>
                </div>
            </div>

            {/* Visual Merchandising */}
            <div className="bg-white border border-neutral-200 p-8 space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Visual Merchandising</h2>
                <p className="text-[10px] text-neutral-400 tracking-wider uppercase">
                    Control the product columns on desktop and how many items appear in the homepage featured grid. Mobile stays 2-column, tablet stays 2-column.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4">Homepage Grid Columns</label>
                        <div className="flex gap-3">
                            {([2, 3, 4] as const).map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, home_grid_cols: n }))}
                                    className={`flex-1 py-3 text-sm font-semibold border transition-colors ${form.home_grid_cols === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Columns on the homepage collection grid.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4">Shop Page Grid Columns</label>
                        <div className="flex gap-3">
                            {([2, 3, 4] as const).map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, shop_grid_cols: n }))}
                                    className={`flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_grid_cols === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Columns on the full shop listing grid.</p>
                    </div>
                </div>

                <div className="pt-6 border-t border-neutral-100">
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4">Featured Products on Homepage</label>
                    <div className="flex gap-3 max-w-xs">
                        {([4, 6, 8, 12] as const).map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setForm(p => ({ ...p, home_product_limit: n }))}
                                className={`flex-1 py-3 text-sm font-semibold border transition-colors ${form.home_product_limit === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Number of products shown in the homepage collection grid.</p>
                </div>
            </div>

            {/* Feature Toggles */}
            <div className="bg-white border border-neutral-200 p-8 space-y-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Feature Toggles</h2>
                <p className="text-[10px] text-neutral-400 tracking-wider uppercase">Enable or disable storefront sections. Hidden sections are removed from the navigation.</p>

                {([
                    { key: "enable_gift_cards" as const, label: "Gift Cards", desc: "Show the gift card purchase page in the navbar." },
                    { key: "enable_gallery" as const,    label: "Gallery",    desc: "Show the gallery page and nav link." },
                    { key: "enable_craft" as const,      label: "The Craft",  desc: "Show the craft / process page in the navbar." },
                    { key: "enable_whitelabel" as const, label: "White Labelling", desc: "Show the white labelling / custom order page." },
                ] as const).map(({ key, label, desc }) => (
                    <div key={key} className="pt-4 border-t border-neutral-100 first:border-t-0 first:pt-0">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={form[key]}
                                onChange={(e) => setForm(p => ({ ...p, [key]: e.target.checked }))}
                                className="w-4 h-4 accent-black" />
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">{label}</span>
                        </label>
                        <p className="text-[10px] text-neutral-400 mt-1 tracking-wider uppercase ml-7">{desc}</p>
                    </div>
                ))}
            </div>

            <div className="flex justify-end items-center gap-6">
                {saved && <span className="text-xs text-green-600 tracking-wider uppercase">Saved successfully</span>}
                <button
                    type="submit" disabled={saving}
                    className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Store Settings"}
                </button>
            </div>
        </form>
    );
}

function SEOTab() {
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

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        const existing = metadataList.find(m => m.page_path === selectedPath);
        if (existing) {
            setFormData({
                ...existing,
                keywords:     existing.keywords     ?? "",
                og_image_url: existing.og_image_url ?? "",
                title:        existing.title        ?? "",
                description:  existing.description  ?? "",
            });
        } else {
            setFormData({
                page_path: selectedPath,
                title: "",
                description: "",
                og_image_url: "",
                keywords: ""
            });
        }
    }, [selectedPath, metadataList]);

    const fetchMetadata = async () => {
        setLoading(true);
        const { data } = await supabase.from("site_metadata").select("*");
        if (data) setMetadataList(data);
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { page_path, title, description, og_image_url, keywords } = formData;
            await supabase.from("site_metadata").upsert(
                { page_path, title, description, og_image_url, keywords, updated_at: new Date().toISOString() },
                { onConflict: "page_path" }
            );
            await fetchMetadata();
            toast.success("SEO metadata saved.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save SEO metadata.");
        } finally {
            setSaving(false);
        }
    };

    const titleLength = formData.title.length;
    const descriptionLength = formData.description.length;
    const titleColor = titleLength > 60 ? "text-red-500" : "text-neutral-500";
    const descColor = descriptionLength > 160 ? "text-red-500" : "text-neutral-500";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Editor Form */}
            <div className="bg-white p-8 border border-neutral-200">
                <form onSubmit={handleSave} className="space-y-8">
                    <div>
                        <label htmlFor="page_path" className="block text-xs uppercase tracking-widest font-semibold mb-3">Target Route</label>
                        <select
                            id="page_path"
                            value={selectedPath}
                            onChange={(e) => setSelectedPath(e.target.value)}
                            className="w-full border-b border-black bg-transparent py-2 outline-none focus:border-neutral-400 transition-colors uppercase text-sm font-medium tracking-wide appearance-none"
                        >
                            <option value="/">Home (/)</option>
                            <option value="/shop">Shop (/shop)</option>
                            <option value="/craft">Craft (/craft)</option>
                            <option value="/custom">Custom (/custom)</option>
                        </select>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label htmlFor="title" className="block text-xs uppercase tracking-widest font-semibold">Meta Title</label>
                            <span className={`text-[10px] tracking-widest ${titleColor}`}>{titleLength} / 60</span>
                        </div>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                            placeholder="Miss Tokyo | Handcrafted in Ghana"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label htmlFor="description" className="block text-xs uppercase tracking-widest font-semibold">Meta Description</label>
                            <span className={`text-[10px] tracking-widest ${descColor}`}>{descriptionLength} / 160</span>
                        </div>
                        <textarea
                            id="description"
                            name="description"
                            rows={4}
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full border border-neutral-200 p-4 bg-transparent outline-none focus:border-black transition-colors resize-y"
                            placeholder="Discover our latest collection..."
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="keywords" className="block text-xs uppercase tracking-widest font-semibold mb-3">Keywords (Comma Separated)</label>
                        <input
                            type="text"
                            id="keywords"
                            name="keywords"
                            value={formData.keywords}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                            placeholder="leather, bespoke, artisanal, ghana"
                        />
                    </div>

                    <div>
                        <ImageUploader
                            bucket="site-assets"
                            folder="og-images"
                            currentUrl={formData.og_image_url || null}
                            onUpload={(url) => setFormData(prev => ({ ...prev, og_image_url: url }))}
                            aspectRatio="og"
                            label="Social Share Image"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || saving}
                        className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Route Metadata"}
                    </button>
                </form>
            </div>

            {/* Live Preview Console */}
            <div className="space-y-8">
                <div className="sticky top-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4 mb-6">Google Search Preview</h2>
                    <div className="bg-white p-6 border border-neutral-200 shadow-sm font-sans max-w-md">
                        <div className="text-[12px] text-neutral-800 flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center">
                                <span className="font-serif italic text-[10px]">B</span>
                            </div>
                            <div>
                                <p className="font-medium">Miss Tokyo</p>
                                <p className="text-neutral-500 text-[10px]">https://misstokyo.shop{selectedPath}</p>
                            </div>
                        </div>
                        <h3 className="text-[#1a0dab] text-lg font-medium cursor-pointer hover:underline mb-1 w-full truncate">
                            {formData.title || "Page Title Will Appear Here"}
                        </h3>
                        <p className="text-[13px] text-[#4d5156] leading-snug line-clamp-2">
                            {formData.description || "The meta description will appear here. Keep it under 160 characters to prevent it from being truncated in search results."}
                        </p>
                    </div>

                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4 mb-6 mt-12">Social Card Preview</h2>
                    <div className="bg-white border text-center border-neutral-200 shadow-sm font-sans max-w-md overflow-hidden rounded-md">
                        <div className="w-full h-48 bg-neutral-100 flex items-center justify-center text-neutral-400 capitalize">
                            {formData.og_image_url ? (
                                <img src={formData.og_image_url} alt="Social Cover" className="w-full h-full object-cover" />
                            ) : (
                                "No Image Provided"
                            )}
                        </div>
                        <div className="p-4 bg-neutral-50 border-t border-neutral-200 text-left">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">badu.co</p>
                            <h3 className="font-medium text-neutral-900 mb-1 truncate">{formData.title || "Page Title"}</h3>
                            <p className="text-xs text-neutral-500 truncate">{formData.description || "Page description..."}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
