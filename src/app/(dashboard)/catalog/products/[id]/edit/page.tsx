"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";
import { toast } from "@/lib/toast";

type Category = { id: string; name: string; slug: string };

export default function EditProductPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [imageUrls, setImageUrls] = useState<(string | null)[]>([null, null, null, null]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        price_ghs: 0,
        inventory_count: 0,
        description: "",
        category_type: "",
        is_active: true,
    });

    const fetchProduct = useCallback(async () => {
        const [{ data: product }, { data: cats }] = await Promise.all([
            supabase.from("products").select("*").eq("id", id).single(),
            supabase.from("categories").select("id, name, slug").eq("is_active", true).order("name"),
        ]);

        if (!product) {
            toast.error("Product not found.");
            router.push("/catalog/products");
            return;
        }

        if (cats) setCategories(cats);

        setFormData({
            name: product.name || "",
            slug: product.slug || "",
            price_ghs: product.price_ghs || 0,
            inventory_count: product.inventory_count || 0,
            description: product.description || "",
            category_type: product.category_type || "",
            is_active: product.is_active ?? true,
        });

        const urls: (string | null)[] = [null, null, null, null];
        if (product.image_urls) {
            product.image_urls.forEach((url: string, i: number) => {
                if (i < 4) urls[i] = url;
            });
        }
        setImageUrls(urls);
        setLoading(false);
    }, [id, router]);

    useEffect(() => { fetchProduct(); }, [fetchProduct]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id: fieldId, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [fieldId]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleImageUpload = (index: number, url: string) => {
        setImageUrls(prev => {
            const next = [...prev];
            next[index] = url;
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const uploadedUrls = imageUrls.filter((u): u is string => !!u);
            const { error } = await supabase.from("products").update({
                name: formData.name,
                slug: formData.slug,
                price_ghs: Number(formData.price_ghs),
                inventory_count: Number(formData.inventory_count),
                description: formData.description,
                category_type: formData.category_type,
                image_urls: uploadedUrls,
                is_active: formData.is_active,
            }).eq("id", id);

            if (error) throw error;
            toast.success("Product updated.");
            router.push("/catalog/products");
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update product.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-neutral-500 italic font-serif">Loading product...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 max-w-3xl">
            <header>
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                    <Link href="/catalog/products" className="hover:text-black">Products</Link>
                    <span>/</span>
                    <span className="text-black">Edit</span>
                </div>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Edit Product</h1>
                <p className="text-neutral-500">{formData.name}</p>
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
                            required
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
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
                            />
                        </div>
                        <div>
                            <label htmlFor="category_type" className="block text-xs uppercase tracking-widest font-semibold mb-3">Category</label>
                            {categories.length === 0 ? (
                                <div className="border-b border-neutral-200 py-2">
                                    <span className="text-sm text-neutral-400 italic">No categories — </span>
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
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="w-4 h-4 accent-black"
                        />
                        <label htmlFor="is_active" className="text-xs uppercase tracking-widest font-semibold">Active (visible in shop)</label>
                    </div>
                </div>

                {/* Pricing & Inventory */}
                <div className="bg-white p-8 border border-neutral-200 space-y-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Pricing & Inventory</h2>

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
                    </div>
                </div>

                {/* Media — up to 4 images */}
                <div className="bg-white p-8 border border-neutral-200 space-y-6">
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Product Images</h2>
                        <p className="text-[10px] text-neutral-400 tracking-wider uppercase mt-4">Upload up to 4 images. The first image is the primary display photo.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i}>
                                <ImageUploader
                                    bucket="product-images"
                                    folder="products"
                                    currentUrl={imageUrls[i]}
                                    onUpload={(url) => handleImageUpload(i, url)}
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
                        disabled={saving}
                        className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Update Product"}
                    </button>
                </div>
            </form>
        </div>
    );
}
