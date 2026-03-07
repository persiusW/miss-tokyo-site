"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";

type SiteMetadata = {
    id?: string;
    page_path: string;
    title: string;
    description: string;
    og_image_url: string;
    keywords: string;
};

export default function SEOMangementPage() {
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
            alert("SEO metadata saved successfully.");
        } catch (err) {
            console.error(err);
            alert("Failed to save SEO metadata.");
        } finally {
            setSaving(false);
        }
    };

    const titleLength = formData.title.length;
    const descriptionLength = formData.description.length;
    const titleColor = titleLength > 60 ? "text-red-500" : "text-neutral-500";
    const descColor = descriptionLength > 160 ? "text-red-500" : "text-neutral-500";

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">SEO Management</h1>
                <p className="text-neutral-500">Configure search engine titles, descriptions, and social preview images.</p>
            </header>

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
        </div>
    );
}
