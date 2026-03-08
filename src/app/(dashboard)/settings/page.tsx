"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";
import { toast } from "@/lib/toast";

type BusinessSettings = {
    business_name: string;
    email: string;
    contact: string;
    address: string;
    logo_url: string | null;
    tax_rate: number;
};

const DEFAULT_BUSINESS: BusinessSettings = {
    business_name: "Badu Atelier",
    email: "",
    contact: "",
    address: "",
    logo_url: null,
    tax_rate: 0,
};

type SiteMetadata = {
    id?: string;
    page_path: string;
    title: string;
    description: string;
    og_image_url: string;
    keywords: string;
};

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<"business" | "seo">("business");

    return (
        <div className="space-y-12 max-w-6xl">
            <header className="flex items-end justify-between border-b border-neutral-200 pb-4">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Settings</h1>
                    <p className="text-neutral-500">Manage your atelier's core details and search engine presence.</p>
                </div>
                <div className="flex gap-8 text-xs font-semibold uppercase tracking-widest">
                    <button
                        onClick={() => setActiveTab("business")}
                        className={`pb-4 border-b-2 transition-colors ${activeTab === "business" ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`}
                        style={{ marginBottom: "-17px" }}
                    >
                        Business Details
                    </button>
                    <button
                        onClick={() => setActiveTab("seo")}
                        className={`pb-4 border-b-2 transition-colors ${activeTab === "seo" ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`}
                        style={{ marginBottom: "-17px" }}
                    >
                        SEO & Metadata
                    </button>
                </div>
            </header>

            {activeTab === "business" ? <BusinessTab /> : <SEOTab />}
        </div>
    );
}

function BusinessTab() {
    const [form, setForm] = useState<BusinessSettings>(DEFAULT_BUSINESS);
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
            setFormData(existing);
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
                            placeholder="Badu Atelier | Handcrafted in Ghana"
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
                                <p className="font-medium">Badu Atelier</p>
                                <p className="text-neutral-500 text-[10px]">https://badu.co{selectedPath}</p>
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
