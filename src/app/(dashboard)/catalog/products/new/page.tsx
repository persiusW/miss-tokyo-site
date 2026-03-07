"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        price_ghs: 300,
        inventory_count: 10,
        description: "",
        category_type: "footwear",
        image_url: "",
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from("products").insert([
                {
                    name: formData.name,
                    slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                    price_ghs: Number(formData.price_ghs),
                    inventory_count: Number(formData.inventory_count),
                    description: formData.description,
                    category_type: formData.category_type,
                    image_urls: formData.image_url ? [formData.image_url] : [],
                    is_active: true,
                }
            ]);

            if (error) throw error;
            router.push("/catalog/products");
            router.refresh();
        } catch (err) {
            console.error(err);
            alert("Failed to create product.");
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
                            placeholder="e.g. Badu Slide 02"
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
                            <select
                                id="category_type"
                                value={formData.category_type}
                                onChange={handleChange}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none appearance-none"
                            >
                                <option value="footwear">Footwear</option>
                                <option value="accessories">Accessories</option>
                                <option value="bespoke">Bespoke</option>
                            </select>
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
                        ></textarea>
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

                {/* Media */}
                <div className="bg-white p-8 border border-neutral-200 space-y-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Media</h2>

                    <div>
                        <label htmlFor="image_url" className="block text-xs uppercase tracking-widest font-semibold mb-3">Image URL</label>
                        <p className="text-xs text-neutral-500 mb-3">Provide a direct link to the product image (integration with Supabase Storage can be added later).</p>
                        <input
                            type="url"
                            id="image_url"
                            value={formData.image_url}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                            placeholder="https://..."
                        />
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
