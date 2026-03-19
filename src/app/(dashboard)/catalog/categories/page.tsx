"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";
import { Pencil, Trash2, X, Check, Star, Tag, Copy, Search } from "lucide-react";
import { toast } from "@/lib/toast";

type Category = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    is_featured: boolean;
    is_wholesale: boolean;
    wholesale_tier_1_price: number | null;
    wholesale_tier_2_price: number | null;
    wholesale_tier_3_price: number | null;
    created_at: string;
};

type TierConfig = {
    enabled: boolean;
    tier1Min: number; tier1Max: number;
    tier2Min: number; tier2Max: number;
    tier3Min: number; tier3Max: number;
};

function WholesalePricingFields({
    prices,
    onChange,
    tierConfig,
}: {
    prices: { t1: string; t2: string; t3: string };
    onChange: (p: { t1: string; t2: string; t3: string }) => void;
    tierConfig: TierConfig | null;
}) {
    if (!tierConfig) return null;
    const tiers = [
        { key: "t1" as const, label: `Tier 1 — ${tierConfig.tier1Min}–${tierConfig.tier1Max} units` },
        { key: "t2" as const, label: `Tier 2 — ${tierConfig.tier2Min}–${tierConfig.tier2Max} units` },
        { key: "t3" as const, label: `Tier 3 — ${tierConfig.tier3Min}–${tierConfig.tier3Max} units` },
    ];
    return (
        <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
            <p className="col-span-3 text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-1">
                Category Wholesale Tier Prices
            </p>
            {tiers.map(({ key, label }) => (
                <div key={key}>
                    <label className="block text-[10px] uppercase tracking-widest text-neutral-400 mb-1">{label}</label>
                    <div className="flex items-center gap-1">
                        <span className="text-neutral-400 text-xs">GH₵</span>
                        <input
                            type="number" min="0" step="0.01"
                            value={prices[key]}
                            onChange={e => onChange({ ...prices, [key]: e.target.value })}
                            className="w-full border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black text-sm transition-colors"
                            placeholder="0.00"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [tierConfig, setTierConfig] = useState<TierConfig | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", slug: "", description: "" });
    const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
    const [newIsWholesale, setNewIsWholesale] = useState(false);
    const [newWholesalePrices, setNewWholesalePrices] = useState({ t1: "", t2: "", t3: "" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", slug: "", description: "", image_url: "" });
    const [editIsWholesale, setEditIsWholesale] = useState(false);
    const [editWholesalePrices, setEditWholesalePrices] = useState({ t1: "", t2: "", t3: "" });
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const fetchCategories = async () => {
        setLoading(true);
        const { data } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
        if (data) setCategories(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchCategories();
        supabase.from("store_settings").select("wholesale_enabled,wholesale_tier_1_min,wholesale_tier_1_max,wholesale_tier_2_min,wholesale_tier_2_max,wholesale_tier_3_min,wholesale_tier_3_max").eq("id", "default").single()
            .then(({ data }) => {
                if (data) {
                    setTierConfig({
                        enabled: data.wholesale_enabled ?? false,
                        tier1Min: data.wholesale_tier_1_min ?? 3, tier1Max: data.wholesale_tier_1_max ?? 5,
                        tier2Min: data.wholesale_tier_2_min ?? 8, tier2Max: data.wholesale_tier_2_max ?? 10,
                        tier3Min: data.wholesale_tier_3_min ?? 12, tier3Max: data.wholesale_tier_3_max ?? 24,
                    });
                }
            });
    }, []);

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
            is_wholesale: newIsWholesale,
            wholesale_tier_1_price: newIsWholesale && newWholesalePrices.t1 ? Number(newWholesalePrices.t1) : null,
            wholesale_tier_2_price: newIsWholesale && newWholesalePrices.t2 ? Number(newWholesalePrices.t2) : null,
            wholesale_tier_3_price: newIsWholesale && newWholesalePrices.t3 ? Number(newWholesalePrices.t3) : null,
        }]);

        if (error) {
            toast.error("Failed to add category.");
        } else {
            toast.success("Category added.");
            setForm({ name: "", slug: "", description: "" });
            setNewImageUrl(null);
            setNewIsWholesale(false);
            setNewWholesalePrices({ t1: "", t2: "", t3: "" });
            setIsAdding(false);
            await fetchCategories();
        }
        setSaving(false);
    };

    const toggleFeatured = async (id: string, is_featured: boolean) => {
        if (!is_featured) {
            const featuredCount = categories.filter(c => c.is_featured).length;
            if (featuredCount >= 3) { toast.error("Max 3 featured categories. Unfeature one first."); return; }
        }
        setCategories(prev => prev.map(c => c.id === id ? { ...c, is_featured: !is_featured } : c));
        const { error } = await supabase.from("categories").update({ is_featured: !is_featured }).eq("id", id);
        if (error) {
            toast.error("Failed to update featured status.");
            setCategories(prev => prev.map(c => c.id === id ? { ...c, is_featured } : c));
        }
    };

    const toggleActive = async (id: string, is_active: boolean) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
        await supabase.from("categories").update({ is_active: !is_active }).eq("id", id);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (error) { toast.error("Failed to delete category."); }
        else { toast.success("Category deleted."); setCategories(prev => prev.filter(c => c.id !== id)); }
        setConfirmDeleteId(null);
    };

    const startEdit = (cat: Category) => {
        setEditingId(cat.id);
        setEditForm({ name: cat.name, slug: cat.slug, description: cat.description || "", image_url: cat.image_url || "" });
        setEditIsWholesale(cat.is_wholesale);
        setEditWholesalePrices({
            t1: cat.wholesale_tier_1_price != null ? String(cat.wholesale_tier_1_price) : "",
            t2: cat.wholesale_tier_2_price != null ? String(cat.wholesale_tier_2_price) : "",
            t3: cat.wholesale_tier_3_price != null ? String(cat.wholesale_tier_3_price) : "",
        });
    };

    const cancelEdit = () => { setEditingId(null); };

    const handleDuplicateAsWholesale = async (cat: Category) => {
        if (cat.is_wholesale) {
            toast.error("This category is already a wholesale category.");
            return;
        }
        setSaving(true);
        // 1. Create the wholesale clone
        const { data: newCat, error: catError } = await supabase
            .from("categories")
            .insert([{
                name: `${cat.name} Wholesale`,
                slug: `${cat.slug}-wholesale`,
                description: cat.description,
                image_url: cat.image_url,
                is_active: true,
                is_wholesale: true,
                wholesale_tier_1_price: null,
                wholesale_tier_2_price: null,
                wholesale_tier_3_price: null,
            }])
            .select("id")
            .single();

        if (catError || !newCat) {
            toast.error("Failed to create wholesale category.");
            setSaving(false);
            return;
        }

        // 2. Find all products whose primary category matches this category's slug
        const { data: matchedProducts } = await supabase
            .from("products")
            .select("id, category_ids")
            .eq("category_type", cat.slug);

        // 3. Append the new wholesale category ID to each product's category_ids
        const updates = (matchedProducts ?? []).map(p => {
            const existing: string[] = p.category_ids ?? [];
            const merged = existing.includes(newCat.id) ? existing : [...existing, newCat.id];
            return supabase.from("products").update({ category_ids: merged }).eq("id", p.id);
        });

        await Promise.all(updates);

        const count = matchedProducts?.length ?? 0;
        toast.success(`Wholesale category created. ${count} product${count !== 1 ? "s" : ""} inherited.`);
        await fetchCategories();
        setSaving(false);
    };

    const handleSaveEdit = async (id: string) => {
        setSaving(true);
        const { error } = await supabase.from("categories").update({
            name: editForm.name,
            slug: editForm.slug,
            description: editForm.description || null,
            image_url: editForm.image_url || null,
            is_wholesale: editIsWholesale,
            wholesale_tier_1_price: editIsWholesale && editWholesalePrices.t1 ? Number(editWholesalePrices.t1) : null,
            wholesale_tier_2_price: editIsWholesale && editWholesalePrices.t2 ? Number(editWholesalePrices.t2) : null,
            wholesale_tier_3_price: editIsWholesale && editWholesalePrices.t3 ? Number(editWholesalePrices.t3) : null,
        }).eq("id", id);

        if (error) { toast.error("Failed to update category."); }
        else { toast.success("Category updated."); setEditingId(null); await fetchCategories(); }
        setSaving(false);
    };

    return (
        <div className="space-y-12">
            <header className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Categories</h1>
                    <p className="text-neutral-500">
                        Organise your catalog. Mark categories as Wholesale to enable B2B tier pricing.
                        <span className="ml-3 text-xs font-semibold uppercase tracking-widest text-amber-600">
                            {categories.filter(c => c.is_featured).length}/3 Featured
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search categories…"
                            className="pl-9 pr-4 py-2.5 border border-neutral-200 bg-white text-sm outline-none focus:border-black transition-colors w-56 rounded-none"
                        />
                    </div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors whitespace-nowrap"
                    >
                        {isAdding ? "Cancel" : "New Category"}
                    </button>
                </div>
            </header>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-white border border-neutral-200 p-8 space-y-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Add Category</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Name</label>
                                <input type="text" value={form.name} onChange={e => handleNameChange(e.target.value)} required
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                    placeholder="e.g. Footwear" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Slug</label>
                                <input type="text" value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} required
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors font-mono text-sm"
                                    placeholder="footwear" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Description</label>
                                <input type="text" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                    placeholder="Optional" />
                            </div>
                            {/* Wholesale toggle */}
                            <div>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Wholesale Category</p>
                                        <p className="text-[10px] text-neutral-400 mt-0.5">Enable B2B tier pricing on this category</p>
                                    </div>
                                    <div
                                        onClick={() => setNewIsWholesale(v => !v)}
                                        className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 relative ${newIsWholesale ? "bg-black" : "bg-neutral-200"}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newIsWholesale ? "translate-x-5" : ""}`} />
                                    </div>
                                </label>
                                {newIsWholesale && (
                                    <WholesalePricingFields prices={newWholesalePrices} onChange={setNewWholesalePrices} tierConfig={tierConfig} />
                                )}
                            </div>
                        </div>
                        <div>
                            <ImageUploader bucket="product-images" folder="categories" currentUrl={null} onUpload={setNewImageUrl} aspectRatio="video" label="Category Image" />
                        </div>
                    </div>
                    <div className="flex justify-end border-t border-neutral-100 pt-6">
                        <button type="submit" disabled={saving}
                            className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50">
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
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Featured</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Wholesale</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={8} className="px-6 py-12 text-center text-neutral-500 italic font-serif">Loading...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={8} className="px-6 py-16 text-center text-neutral-500 italic font-serif">No categories yet. Add your first above.</td></tr>
                        ) : (() => {
                            const q = search.trim().toLowerCase();
                            const filtered = q
                                ? categories.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q))
                                : categories;
                            if (filtered.length === 0) return (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-neutral-400 text-sm">No categories match &ldquo;{search}&rdquo;</td></tr>
                            );
                            return filtered.map((cat) => (
                            editingId === cat.id ? (
                                <tr key={cat.id} className="bg-neutral-50">
                                    <td className="px-6 py-4">
                                        <div className="w-20">
                                            <ImageUploader bucket="product-images" folder="categories" currentUrl={editForm.image_url || null}
                                                onUpload={(url) => setEditForm(prev => ({ ...prev, image_url: url }))} aspectRatio="square" label="" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input type="text" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black transition-colors" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input type="text" value={editForm.slug} onChange={e => setEditForm(prev => ({ ...prev, slug: e.target.value }))}
                                            className="w-full border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black transition-colors font-mono text-xs" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input type="text" value={editForm.description} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black transition-colors" />
                                    </td>
                                    <td className="px-6 py-4"><span className="text-xs text-neutral-400 italic">editing</span></td>
                                    <td className="px-6 py-4">—</td>
                                    <td className="px-6 py-4 min-w-[200px]">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <div onClick={() => setEditIsWholesale(v => !v)}
                                                    className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative flex-shrink-0 ${editIsWholesale ? "bg-black" : "bg-neutral-200"}`}>
                                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editIsWholesale ? "translate-x-4" : ""}`} />
                                                </div>
                                                <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
                                                    {editIsWholesale ? "Wholesale" : "Retail"}
                                                </span>
                                            </label>
                                            {editIsWholesale && (
                                                <div className="space-y-1">
                                                    {[
                                                        { key: "t1" as const, label: `T1 (${tierConfig?.tier1Min ?? 3}–${tierConfig?.tier1Max ?? 5})` },
                                                        { key: "t2" as const, label: `T2 (${tierConfig?.tier2Min ?? 8}–${tierConfig?.tier2Max ?? 10})` },
                                                        { key: "t3" as const, label: `T3 (${tierConfig?.tier3Min ?? 12}–${tierConfig?.tier3Max ?? 24})` },
                                                    ].map(({ key, label }) => (
                                                        <div key={key} className="flex items-center gap-1">
                                                            <span className="text-[9px] text-neutral-400 w-20 flex-shrink-0">{label}</span>
                                                            <span className="text-neutral-400 text-xs">₵</span>
                                                            <input type="number" min="0" step="0.01" value={editWholesalePrices[key]}
                                                                onChange={e => setEditWholesalePrices(p => ({ ...p, [key]: e.target.value }))}
                                                                className="w-20 border-b border-neutral-300 bg-transparent py-0.5 outline-none focus:border-black text-xs transition-colors"
                                                                placeholder="0.00" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 justify-end">
                                            <button onClick={() => handleSaveEdit(cat.id)} disabled={saving}
                                                className="text-green-600 hover:text-green-800 transition-colors disabled:opacity-50" title="Save">
                                                <Check size={16} />
                                            </button>
                                            <button onClick={cancelEdit} className="text-neutral-400 hover:text-black transition-colors" title="Cancel">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={cat.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="w-12 h-12 bg-neutral-100 overflow-hidden flex-shrink-0">
                                            {cat.image_url
                                                ? <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full bg-neutral-200" />}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-neutral-900">
                                        <div className="flex items-center gap-2">
                                            {cat.name}
                                            {cat.is_wholesale && (
                                                <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                                                    <Tag size={9} /> B2B
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className="font-mono text-xs text-neutral-500">{cat.slug}</span></td>
                                    <td className="px-6 py-4 text-neutral-600 max-w-xs truncate">{cat.description || "—"}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleActive(cat.id, cat.is_active)}
                                            className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${cat.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                                            {cat.is_active ? "Active" : "Inactive"}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => toggleFeatured(cat.id, cat.is_featured)}
                                            title={cat.is_featured ? "Unfeature" : "Feature on homepage"}
                                            className={`transition-colors ${cat.is_featured ? "text-amber-500 hover:text-amber-300" : "text-neutral-300 hover:text-amber-500"}`}>
                                            <Star size={16} fill={cat.is_featured ? "currentColor" : "none"} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        {cat.is_wholesale ? (
                                            <div className="text-[10px] text-neutral-500 space-y-0.5">
                                                {cat.wholesale_tier_1_price != null && <div>T1: GH₵{cat.wholesale_tier_1_price}</div>}
                                                {cat.wholesale_tier_2_price != null && <div>T2: GH₵{cat.wholesale_tier_2_price}</div>}
                                                {cat.wholesale_tier_3_price != null && <div>T3: GH₵{cat.wholesale_tier_3_price}</div>}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-neutral-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {confirmDeleteId === cat.id ? (
                                            <div className="flex items-center gap-3 justify-end">
                                                <span className="text-xs text-neutral-500">Delete?</span>
                                                <button onClick={() => handleDelete(cat.id)} className="text-xs uppercase tracking-widest text-red-600 hover:text-red-800 font-semibold">Yes</button>
                                                <button onClick={() => setConfirmDeleteId(null)} className="text-xs uppercase tracking-widest text-neutral-400 hover:text-black">No</button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 justify-end">
                                                {!cat.is_wholesale && (
                                                    <button
                                                        onClick={() => handleDuplicateAsWholesale(cat)}
                                                        disabled={saving}
                                                        className="text-neutral-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                                                        title="Duplicate as Wholesale"
                                                    >
                                                        <Copy size={15} />
                                                    </button>
                                                )}
                                                <button onClick={() => startEdit(cat)} className="text-neutral-400 hover:text-black transition-colors" title="Edit">
                                                    <Pencil size={15} />
                                                </button>
                                                <button onClick={() => setConfirmDeleteId(cat.id)} className="text-neutral-400 hover:text-red-600 transition-colors" title="Delete">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        ));
                        })()}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
