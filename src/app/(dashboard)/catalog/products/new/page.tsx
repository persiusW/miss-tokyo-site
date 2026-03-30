"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { toast } from "@/lib/toast";

type Category = { id: string; name: string; slug: string; is_wholesale: boolean };

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [globalSizes, setGlobalSizes] = useState<string[]>([]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [globalColors, setGlobalColors] = useState<string[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    // const [globalStitching, setGlobalStitching] = useState<string[]>([]);
    // const [selectedStitching, setSelectedStitching] = useState<string[]>([]);
    const [trackInventory, setTrackInventory] = useState(true);
    const [wholesaleTierConfig, setWholesaleTierConfig] = useState<{ enabled: boolean; tier1Min: number; tier1Max: number; tier2Min: number; tier2Max: number; tier3Min: number; tier3Max: number } | null>(null);
    const [wholesalePrices, setWholesalePrices] = useState({ tier1: "", tier2: "", tier3: "" });
    const [wholesaleOverride, setWholesaleOverride] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        sku: "",
        price_ghs: 300,
        inventory_count: 10,
        description: "",
        category_type: "",
    });

    useEffect(() => {
        Promise.all([
            supabase.from("categories").select("id, name, slug, is_wholesale").eq("is_active", true).order("name"),
            supabase.from("store_settings").select("global_sizes, global_colors, global_stitching, wholesale_enabled, wholesale_tier_1_min, wholesale_tier_1_max, wholesale_tier_2_min, wholesale_tier_2_max, wholesale_tier_3_min, wholesale_tier_3_max").eq("id", "default").single()
        ]).then(([{ data: catData }, { data: storeData }]) => {
            if (catData && catData.length > 0) {
                setCategories(catData);
            }
            if (storeData) {
                if (storeData.global_sizes) {
                    setGlobalSizes(storeData.global_sizes);
                    setSelectedSizes(storeData.global_sizes);
                }
                if (storeData.global_colors) {
                    setGlobalColors(storeData.global_colors);
                    // Colors start unticked — admin selects which apply to this product
                    setSelectedColors([]);
                }
                // if (storeData.global_stitching) {
                //     setGlobalStitching(storeData.global_stitching);
                //     setSelectedStitching(storeData.global_stitching);
                // }
                if (storeData.wholesale_enabled) {
                    setWholesaleTierConfig({
                        enabled: true,
                        tier1Min: storeData.wholesale_tier_1_min ?? 3,
                        tier1Max: storeData.wholesale_tier_1_max ?? 5,
                        tier2Min: storeData.wholesale_tier_2_min ?? 8,
                        tier2Max: storeData.wholesale_tier_2_max ?? 10,
                        tier3Min: storeData.wholesale_tier_3_min ?? 12,
                        tier3Max: storeData.wholesale_tier_3_max ?? 24,
                    });
                }
            }
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSlugify = () => {
        if (formData.name) {
            setFormData(prev => ({
                ...prev,
                slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
            }));
        }
    };


    const toggleSize = (size: string) => {
        setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
    };

    const toggleColor = (col: string) => {
        setSelectedColors(prev => prev.includes(col) ? prev.filter(s => s !== col) : [...prev, col]);
    };

    // const toggleStitching = (stitch: string) => {
    //     setSelectedStitching(prev => prev.includes(stitch) ? prev.filter(s => s !== stitch) : [...prev, stitch]);
    // };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/admin/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                    sku: formData.sku || null,
                    price_ghs: Number(formData.price_ghs),
                    inventory_count: trackInventory ? Number(formData.inventory_count) : 9999,
                    track_inventory: trackInventory,
                    description: formData.description,
                    category_type: formData.category_type,
                    category_ids: selectedCategoryIds,
                    image_urls: imageUrls,
                    available_sizes: selectedSizes,
                    available_colors: selectedColors,
                    // available_stitching: selectedStitching,
                    wholesale_override: wholesaleOverride,
                    wholesale_price_tier_1: wholesaleOverride && wholesalePrices.tier1 ? Number(wholesalePrices.tier1) : null,
                    wholesale_price_tier_2: wholesaleOverride && wholesalePrices.tier2 ? Number(wholesalePrices.tier2) : null,
                    wholesale_price_tier_3: wholesaleOverride && wholesalePrices.tier3 ? Number(wholesalePrices.tier3) : null,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to create product");

            router.push("/catalog/products");
            router.refresh();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Failed to create product.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header with top-right save */}
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                        <Link href="/catalog/products" className="hover:text-black">Products</Link>
                        <span>/</span>
                        <span className="text-black">New Product</span>
                    </div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">New Product</h1>
                    <p className="text-neutral-500">Add a new piece to the collection.</p>
                </div>
                <div className="flex items-center gap-3 md:mt-8">
                    <Link
                        href="/catalog/products"
                        className="px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-100 transition-colors border border-neutral-200"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        form="product-form"
                        disabled={loading || uploadingMedia}
                        className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Save Product"}
                    </button>
                </div>
            </header>

            <form id="product-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Left column — main details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <div className="bg-white p-8 border border-neutral-200 space-y-8">
                            <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Basic Information</h2>

                            <div>
                                <label htmlFor="name" className="block text-xs uppercase tracking-widest font-semibold mb-3">Product Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    onBlur={handleSlugify}
                                    required
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                                    placeholder="e.g. Miss Tokyo Piece 02"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label htmlFor="slug" className="block text-xs uppercase tracking-widest font-semibold mb-3">URL Slug</label>
                                    <input
                                        type="text"
                                        id="slug"
                                        value={formData.slug}
                                        onChange={handleChange}
                                        required
                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                                        placeholder="miss-tokyo-slide-02"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="category_type" className="block text-xs uppercase tracking-widest font-semibold mb-3">Primary Category</label>
                                        {categories.length === 0 ? (
                                            <div className="border-b border-neutral-200 py-2">
                                                <span className="text-sm text-neutral-400 italic">No categories yet — </span>
                                                <Link href="/catalog/categories" className="text-sm text-black underline">add one first</Link>
                                            </div>
                                        ) : (
                                            <select
                                                id="category_type"
                                                value={formData.category_type}
                                                onChange={handleChange}
                                                required
                                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none appearance-none"
                                            >
                                                <option value="" disabled>Select Category</option>
                                                {categories.filter(c => !c.is_wholesale).map(cat => (
                                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    {categories.length > 0 && (
                                        <div>
                                            <label className="block text-xs uppercase tracking-widest font-semibold mb-3">
                                                Additional Categories
                                                <span className="ml-2 text-[10px] font-normal text-neutral-400 normal-case tracking-normal">incl. wholesale</span>
                                            </label>
                                            <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 max-h-44 overflow-y-auto">
                                                {categories.map(cat => (
                                                    <label key={cat.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-neutral-50 transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 accent-black flex-shrink-0"
                                                            checked={selectedCategoryIds.includes(cat.id)}
                                                            onChange={() => setSelectedCategoryIds(prev =>
                                                                prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                                                            )}
                                                        />
                                                        <span className="text-sm flex-1">{cat.name}</span>
                                                        {cat.is_wholesale && (
                                                            <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full flex-shrink-0">B2B</span>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-xs uppercase tracking-widest font-semibold mb-3">Description</label>
                                <textarea
                                    id="description"
                                    rows={4}
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full border border-neutral-200 p-4 bg-transparent outline-none focus:border-black transition-colors resize-y"
                                    placeholder="Describe the materials and craftsmanship..."
                                />
                            </div>

                            <div>
                                <label htmlFor="sku" className="block text-xs uppercase tracking-widest font-semibold mb-3">SKU</label>
                                <input
                                    type="text"
                                    id="sku"
                                    value={formData.sku}
                                    onChange={handleChange}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                                    placeholder="e.g. MT-001"
                                />
                            </div>
                        </div>

                        {/* Variants */}
                        <div className="bg-white p-8 border border-neutral-200 space-y-8">
                            <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Variants</h2>

                            <div>
                                <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Available Sizes</label>
                                {globalSizes.length === 0 ? (
                                    <p className="text-[10px] uppercase tracking-widest text-neutral-400">Loading sizes from store settings...</p>
                                ) : (
                                    <div className="flex flex-wrap gap-4">
                                        {globalSizes.map(size => (
                                            <label key={size} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSizes.includes(size)}
                                                    onChange={() => toggleSize(size)}
                                                    className="w-4 h-4 accent-black"
                                                />
                                                <span className="text-sm font-medium">{size}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-neutral-100">
                                <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Available Colors</label>
                                {globalColors.length === 0 ? (
                                    <p className="text-[10px] uppercase tracking-widest text-neutral-400">Loading colors from store settings...</p>
                                ) : (
                                    <div className="flex flex-wrap gap-4">
                                        {globalColors.map(col => (
                                            <label key={col} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedColors.includes(col)}
                                                    onChange={() => toggleColor(col)}
                                                    className="w-4 h-4 accent-black"
                                                />
                                                <span className="text-sm font-medium">{col}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* <div className="pt-6 border-t border-neutral-100">
                                <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Available Stitching</label>
                                {globalStitching.length === 0 ? (
                                    <p className="text-[10px] uppercase tracking-widest text-neutral-400">Loading stitching from store settings...</p>
                                ) : (
                                    <div className="flex flex-wrap gap-4">
                                        {globalStitching.map(stitch => (
                                            <label key={stitch} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStitching.includes(stitch)}
                                                    onChange={() => toggleStitching(stitch)}
                                                    className="w-4 h-4 accent-black"
                                                />
                                                <span className="text-sm font-medium">{stitch}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div> */}
                        </div>
                    </div>

                    {/* Right column — pricing, inventory, images */}
                    <div className="space-y-6">
                        {/* Pricing & Inventory */}
                        <div className="bg-white p-6 border border-neutral-200 space-y-6">
                            <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Pricing & Inventory</h2>

                            <div>
                                <label htmlFor="price_ghs" className="block text-xs uppercase tracking-widest font-semibold mb-3">Price (GHS)</label>
                                <input
                                    type="number"
                                    id="price_ghs"
                                    value={formData.price_ghs}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    required
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                                />
                            </div>

                            {/* Track Inventory Toggle */}
                            <div className="flex items-start gap-3 p-4 bg-neutral-50 border border-neutral-200">
                                <button
                                    type="button"
                                    onClick={() => setTrackInventory(v => !v)}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none mt-0.5 ${trackInventory ? "bg-black" : "bg-neutral-300"}`}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${trackInventory ? "translate-x-4" : "translate-x-0"}`} />
                                </button>
                                <div>
                                    <p className="text-xs uppercase tracking-widest font-semibold">Track Inventory</p>
                                    <p className="text-[10px] text-neutral-400 mt-1 tracking-wider uppercase">
                                        {trackInventory ? "Tracked — goes out of stock at 0." : "Untracked — always available."}
                                    </p>
                                </div>
                            </div>

                            {trackInventory && (
                                <div>
                                    <label htmlFor="inventory_count" className="block text-xs uppercase tracking-widest font-semibold mb-3">Inventory Count</label>
                                    <input
                                        type="number"
                                        id="inventory_count"
                                        value={formData.inventory_count}
                                        onChange={handleChange}
                                        min="0"
                                        required
                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Wholesale Pricing */}
                        {wholesaleTierConfig?.enabled && (
                            <div className="bg-white p-6 border border-neutral-200 space-y-5">
                                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Wholesale Pricing</h2>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Product-Specific Override</p>
                                        <p className="text-[10px] text-neutral-400 mt-0.5">When OFF, pricing inherits from the assigned wholesale category</p>
                                    </div>
                                    <div onClick={() => setWholesaleOverride(v => !v)}
                                        className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative flex-shrink-0 ${wholesaleOverride ? "bg-black" : "bg-neutral-200"}`}>
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${wholesaleOverride ? "translate-x-5" : ""}`} />
                                    </div>
                                </label>
                                {wholesaleOverride ? (
                                    <>
                                        <p className="text-[10px] text-neutral-400 tracking-wider uppercase">Set explicit per-item prices for each quantity tier.</p>
                                        {([
                                            { tier: "tier1" as const, label: "Tier 1", min: wholesaleTierConfig.tier1Min, max: wholesaleTierConfig.tier1Max },
                                            { tier: "tier2" as const, label: "Tier 2", min: wholesaleTierConfig.tier2Min, max: wholesaleTierConfig.tier2Max },
                                            { tier: "tier3" as const, label: "Tier 3", min: wholesaleTierConfig.tier3Min, max: wholesaleTierConfig.tier3Max },
                                        ]).map(({ tier, label, min, max }) => (
                                            <div key={tier}>
                                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">{label} — {min}–{max} units</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-neutral-400 text-sm">GH₵</span>
                                                    <input type="number" min="0" step="0.01" value={wholesalePrices[tier]}
                                                        onChange={e => setWholesalePrices(p => ({ ...p, [tier]: e.target.value }))}
                                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors rounded-none"
                                                        placeholder="0.00" />
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-semibold">
                                        ✓ Will inherit from assigned wholesale category
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Media */}
                        <div className="bg-white p-6 border border-neutral-200 space-y-4">
                            <div>
                                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Product Media</h2>
                                <p className="text-[10px] text-neutral-400 tracking-wider uppercase mt-4">Up to 10 files — select multiple at once. First image is the primary display.</p>
                            </div>
                            <ImageUploader
                                bucket="product-images"
                                folder="products"
                                currentUrls={imageUrls}
                                onUpload={setImageUrls}
                                onUploading={setUploadingMedia}
                                maxFiles={10}
                                label="Product Media"
                            />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
