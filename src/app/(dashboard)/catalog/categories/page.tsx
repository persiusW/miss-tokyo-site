"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";

type Category = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    created_at: string;
};

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", slug: "", description: "" });
    const [newImageUrl, setNewImageUrl] = useState<string | null>(null);

    const fetchCategories = async () => {
        setLoading(true);
        const { data } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
        if (data) setCategories(data);
        setLoading(false);
    };

    useEffect(() => { fetchCategories(); }, []);

    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const handleNameChange = (name: string) => {
        setForm(prev => ({ ...prev, name, slug: slugify(name) }));
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) return;
        setSaving(true);

        const { error } = await supabase.from("categories").insert([{
            name: form.name,
            slug: form.slug || slugify(form.name),
            description: form.description || null,
            image_url: newImageUrl || null,
            is_active: true,
        }]);

        if (!error) {
            setForm({ name: "", slug: "", description: "" });
            setNewImageUrl(null);
            setIsAdding(false);
            await fetchCategories();
        }
        setSaving(false);
    };

    const toggleActive = async (id: string, is_active: boolean) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
        await supabase.from("categories").update({ is_active: !is_active }).eq("id", id);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this category?")) return;
        await supabase.from("categories").delete().eq("id", id);
        setCategories(prev => prev.filter(c => c.id !== id));
    };

    return (
        <div className="space-y-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Categories</h1>
                    <p className="text-neutral-500">Organise your catalog for future expansion.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    {isAdding ? "Cancel" : "New Category"}
                </button>
            </header>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-white border border-neutral-200 p-8 space-y-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Add Category</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left: text fields */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => handleNameChange(e.target.value)}
                                    required
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                    placeholder="e.g. Footwear"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Slug</label>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                                    required
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors font-mono text-sm"
                                    placeholder="footwear"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Description</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        {/* Right: image upload */}
                        <div>
                            <ImageUploader
                                bucket="product-images"
                                folder="categories"
                                currentUrl={null}
                                onUpload={setNewImageUrl}
                                aspectRatio="video"
                                label="Category Image"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end border-t border-neutral-100 pt-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Add Category"}
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Image</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Name</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Slug</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Description</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic font-serif">Loading...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-16 text-center text-neutral-500 italic font-serif">No categories yet. Add your first above.</td></tr>
                        ) : categories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="w-12 h-12 bg-neutral-100 overflow-hidden flex-shrink-0">
                                        {cat.image_url ? (
                                            <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-200" />
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-neutral-900">{cat.name}</td>
                                <td className="px-6 py-4"><span className="font-mono text-xs text-neutral-500">{cat.slug}</span></td>
                                <td className="px-6 py-4 text-neutral-600 max-w-xs truncate">{cat.description || "—"}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => toggleActive(cat.id, cat.is_active)}
                                        className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${cat.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}
                                    >
                                        {cat.is_active ? "Active" : "Inactive"}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="text-xs uppercase tracking-widest text-neutral-400 hover:text-red-600 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
