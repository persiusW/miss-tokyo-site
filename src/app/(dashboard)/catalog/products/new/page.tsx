"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";
import { toast } from "@/lib/toast";

type Category = { id: string; name: string; slug: string };

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [imageUrls, setImageUrls] = useState<(string | null)[]>([null, null, null, null]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [globalSizes, setGlobalSizes] = useState<string[]>([]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [globalColors, setGlobalColors] = useState<string[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [globalStitching, setGlobalStitching] = useState<string[]>([]);
    const [selectedStitching, setSelectedStitching] = useState<string[]>([]);
    const [trackInventory, setTrackInventory] = useState(true);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        price_ghs: 300,
        inventory_count: 10,
        description: "",
        category_type: "",
    });

    useEffect(() => {
        Promise.all([
            supabase.from("categories").select("id, name, slug").eq("is_active", true).order("name"),
            supabase.from("store_settings").select("global_sizes, global_colors, global_stitching").eq("id", "default").single()
        ]).then(([{ data: catData }, { data: storeData }]) => {
            if (catData && catData.length > 0) {
                setCategories(catData);
                setFormData(prev => ({ ...prev, category_type: catData[0].slug }));
            }
            if (storeData) {
                if (storeData.global_sizes) {
                    setGlobalSizes(storeData.global_sizes);
                    setSelectedSizes(storeData.global_sizes);
                }
                if (storeData.global_colors) {
                    setGlobalColors(storeData.global_colors);
                    setSelectedColors(storeData.global_colors);
                }
                if (storeData.global_stitching) {
                    setGlobalStitching(storeData.global_stitching);
                    setSelectedStitching(storeData.global_stitching);
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

    const handleImageUpload = (index: number, url: string) => {
        setImageUrls(prev => {
            const next = [...prev];
            next[index] = url;
            return next;
        });
    };

    const handleImageRemove = (index: number) => {
        setImageUrls(prev => {
            const next = [...prev];
            next[index] = null;
            return next;
        });
    };

    const toggleSize = (size: string) => {
        setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
    };

    const toggleColor = (col: string) => {
        setSelectedColors(prev => prev.includes(col) ? prev.filter(s => s !== col) : [...prev, col]);
    };

    const toggleStitching = (stitch: string) => {
        setSelectedStitching(prev => prev.includes(stitch) ? prev.filter(s => s !== stitch) : [...prev, stitch]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const uploadedUrls = imageUrls.filter((u): u is string => !!u);
            const { error } = await supabase.from("products").insert([
                {
                    name: formData.name,
                    slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                    price_ghs: Number(formData.price_ghs),
                    inventory_count: trackInventory ? Number(formData.inventory_count) : 9999,
                    track_inventory: trackInventory,
                    description: formData.description,
                    category_type: formData.category_type,
                    image_urls: uploadedUrls,
                    available_sizes: selectedSizes,
                    available_colors: selectedColors,
                    available_stitching: selectedStitching,
                    is_active: true,
                }
            ]);

            if (error) throw error;
            router.push("/catalog/products");
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error("Failed to create product.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12 max-w-3xl">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                        <Link href="/catalog/products" className="hover:text-black">Products</Link>
                        <span>/</span>
                        <span className="text-black">New Product</span>
                    </div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">New Product</h1>
                    <p className="text-neutral-500">Add a new piece to the collection.</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
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
                                placeholder="badu-slide-02"
                            />
                        </div>
                        <div>
                            <label htmlFor="category_type" className="block text-xs uppercase tracking-widest font-semibold mb-3">Category</label>
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
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none appearance-none"
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.slug}>{cat.name}</option>
                                    ))}
                                </select>
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
                </div>

                {/* Pricing & Inventory */}
                <div className="bg-white p-8 border border-neutral-200 space-y-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Pricing & Inventory</h2>

                    {/* Track Inventory Toggle */}
                    <div className="flex items-start gap-4 p-4 bg-neutral-50 border border-neutral-200">
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
                                {trackInventory
                                    ? "Inventory is tracked. Product goes out of stock when count reaches 0."
                                    : "Inventory not tracked. Product always shows as available."}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

                    <div className="pt-8 border-t border-neutral-100">
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
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Select the sizes available for this specific product.</p>
                    </div>

                    <div className="pt-8 border-t border-neutral-100">
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
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Select the colors available for this specific product.</p>
                    </div>

                    <div className="pt-8 border-t border-neutral-100">
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
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Select the stitching options available for this specific product.</p>
                    </div>
                </div>

                {/* Media — up to 4 images */}
                <div className="bg-white p-8 border border-neutral-200 space-y-6">
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Product Images</h2>
                        <p className="text-[10px] text-neutral-400 tracking-wider uppercase mt-4">Upload up to 4 images. The first image is used as the primary display photo.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i}>
                                <ImageUploader
                                    bucket="product-images"
                                    folder="products"
                                    currentUrl={imageUrls[i]}
                                    onUpload={(url) => handleImageUpload(i, url)}
                                    onRemove={() => handleImageRemove(i)}
                                    aspectRatio="video"
                                    label={i === 0 ? "Primary Image" : `Image ${i + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-4">
                    <Link
                        href="/catalog/products"
                        className="px-6 py-4 text-xs uppercase tracking-widest hover:bg-neutral-100 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Save Product"}
                    </button>
                </div>
            </form>
        </div>
    );
}
