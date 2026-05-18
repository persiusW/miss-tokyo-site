"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { Pencil, Trash2, X, Check, Star, Tag, Copy, Search, LayoutGrid, List } from "lucide-react";
import { toast } from "@/lib/toast";
import { createCategory, updateCategory, deleteCategory } from "./actions";


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
    preorder_enabled: boolean;
    preorder_estimated_weeks: number | null;
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
    const [newPreorderEnabled, setNewPreorderEnabled] = useState(false);
    const [newPreorderWeeks, setNewPreorderWeeks] = useState("");
    const [editPreorderEnabled, setEditPreorderEnabled] = useState(false);
    const [editPreorderWeeks, setEditPreorderWeeks] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    const fetchCategories = async () => {
        setLoading(true);
        const { data } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
        if (data) setCategories(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchCategories();
        supabase.from("store_settings").select("wholesale_enabled,wholesale_tier_1_min,wholesale_tier_1_max,wholesale_tier_2_min,wholesale_tier_2_max,wholesale_tier_3_min,wholesale_tier_3_max").eq("id", "default").single()
            .then(({ data }: { data: { wholesale_enabled: boolean; wholesale_tier_1_min: number; wholesale_tier_1_max: number; wholesale_tier_2_min: number; wholesale_tier_2_max: number; wholesale_tier_3_min: number; wholesale_tier_3_max: number } | null }) => {
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

        const preorderWeeksNum = newPreorderEnabled && newPreorderWeeks ? Number(newPreorderWeeks) : 0;
        const res = await createCategory({
            name: form.name,
            slug: form.slug || slugify(form.name),
            description: form.description || null,
            image_url: newImageUrl || null,
            is_active: true,
            is_wholesale: newIsWholesale,
            wholesale_tier_1_price: newIsWholesale && newWholesalePrices.t1 ? Number(newWholesalePrices.t1) : null,
            wholesale_tier_2_price: newIsWholesale && newWholesalePrices.t2 ? Number(newWholesalePrices.t2) : null,
            wholesale_tier_3_price: newIsWholesale && newWholesalePrices.t3 ? Number(newWholesalePrices.t3) : null,
            preorder_enabled: newPreorderEnabled,
            preorder_estimated_weeks: preorderWeeksNum,
        });

        if (!res.success) {
            toast.error(res.error || "Failed to add category.");
        } else {
            toast.success("Category added.");
            setForm({ name: "", slug: "", description: "" });
            setNewImageUrl(null);
            setNewIsWholesale(false);
            setNewWholesalePrices({ t1: "", t2: "", t3: "" });
            setNewPreorderEnabled(false);
            setNewPreorderWeeks("");
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
        const res = await updateCategory(id, { is_featured: !is_featured });
        if (!res.success) {
            toast.error("Failed to update featured status.");
            setCategories(prev => prev.map(c => c.id === id ? { ...c, is_featured } : c));
        }
    };

    const toggleActive = async (id: string, is_active: boolean) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
        await updateCategory(id, { is_active: !is_active });
    };

    const handleDelete = async (id: string) => {
        const cat = categories.find(c => c.id === id);
        const res = await deleteCategory(id, cat?.name || "Unknown");
        if (!res.success) { toast.error(res.error || "Failed to delete category."); }
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
        setEditPreorderEnabled(cat.preorder_enabled ?? false);
        setEditPreorderWeeks(cat.preorder_estimated_weeks ? String(cat.preorder_estimated_weeks) : "");
    };

    const cancelEdit = () => { setEditingId(null); };

    const handleDuplicateAsWholesale = async (cat: Category) => {
        if (cat.is_wholesale) {
            toast.error("This category is already a wholesale category.");
            return;
        }
        setSaving(true);
        // 1. Create the wholesale clone using the action
        const res = await createCategory({
            name: `${cat.name} Wholesale`,
            slug: `${cat.slug}-wholesale`,
            description: cat.description,
            image_url: cat.image_url,
            is_active: true,
            is_wholesale: true,
            wholesale_tier_1_price: null,
            wholesale_tier_2_price: null,
            wholesale_tier_3_price: null,
        });

        if (!res.success || !res.category) {
            toast.error("Failed to create wholesale category.");
            setSaving(false);
            return;
        }

        const newCatId = res.category.id;

        // 2. Find all products whose primary category matches this category's slug
        const { data: matchedProducts } = await supabase
            .from("products")
            .select("id, category_ids")
            .eq("category_type", cat.slug);

        // 3. Append the new wholesale category ID to each product's category_ids
        const updates = (matchedProducts ?? []).map((p: { id: string; category_ids: string[] | null }) => {
            const existing: string[] = p.category_ids ?? [];
            const merged = existing.includes(newCatId) ? existing : [...existing, newCatId];
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
        const cat = categories.find(c => c.id === id);
        const weeksNum = editPreorderEnabled && editPreorderWeeks ? Number(editPreorderWeeks) : 0;
        const res = await updateCategory(id, {
            name: editForm.name,
            slug: editForm.slug,
            description: editForm.description || null,
            image_url: editForm.image_url || null,
            is_wholesale: editIsWholesale,
            wholesale_tier_1_price: editIsWholesale && editWholesalePrices.t1 ? Number(editWholesalePrices.t1) : null,
            wholesale_tier_2_price: editIsWholesale && editWholesalePrices.t2 ? Number(editWholesalePrices.t2) : null,
            wholesale_tier_3_price: editIsWholesale && editWholesalePrices.t3 ? Number(editWholesalePrices.t3) : null,
            preorder_enabled: editPreorderEnabled,
            preorder_estimated_weeks: weeksNum,
        });

        if (!res.success) { toast.error(res.error || "Failed to update category."); setSaving(false); return; }

        // Bulk-update products belonging to this category
        if (cat) {
            const { data: matched } = await supabase
                .from("products")
                .select("id")
                .or(`category_type.eq.${cat.slug},category_ids.cs.{${id}}`);
            const ids = (matched ?? []).map((p: { id: string }) => p.id);
            if (ids.length > 0) {
                const estDate = editPreorderEnabled && weeksNum > 0
                    ? (() => { const d = new Date(); d.setDate(d.getDate() + weeksNum * 7); return d.toISOString().slice(0, 10); })()
                    : null;
                await supabase.from("products").update({
                    preorder_enabled: editPreorderEnabled,
                    preorder_estimated_date: estDate,
                }).in("id", ids);
                if (ids.length > 0) toast.success(`Category updated. Pre-order applied to ${ids.length} product${ids.length !== 1 ? "s" : ""}.`);
            } else {
                toast.success("Category updated.");
            }
        } else {
            toast.success("Category updated.");
        }
        setEditingId(null);
        await fetchCategories();
        setSaving(false);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Categories</h1>
                    <p className="ac-page-sub">
                        Organise your catalog. Mark categories as Wholesale to enable B2B tier pricing.
                        <span className="ac-badge ac-badge-warn" style={{ marginLeft: 10 }}>
                            {categories.filter(c => c.is_featured).length}/3 Featured
                        </span>
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="admin-search" style={{ position: "relative" }}>
                        <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ac-ink-4)", pointerEvents: "none" }} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search categories…"
                            className="ac-input"
                            style={{ paddingLeft: 32, width: 200 }}
                        />
                    </div>
                    {/* View toggle */}
                    <div style={{ display: "flex", border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
                        <button
                            onClick={() => setViewMode("list")}
                            title="List view"
                            className="ac-btn ac-btn-ghost ac-btn-sm"
                            style={{ borderRadius: 0, border: "none", background: viewMode === "list" ? "var(--ac-ink)" : "transparent", color: viewMode === "list" ? "var(--ac-bg)" : "var(--ac-ink-4)" }}
                        >
                            <List size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            title="Grid view"
                            className="ac-btn ac-btn-ghost ac-btn-sm"
                            style={{ borderRadius: 0, border: "none", background: viewMode === "grid" ? "var(--ac-ink)" : "transparent", color: viewMode === "grid" ? "var(--ac-bg)" : "var(--ac-ink-4)" }}
                        >
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="ac-btn ac-btn-primary"
                        type="button"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        {isAdding ? "Cancel" : "New Category"}
                    </button>
                </div>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="ac-card" style={{ padding: 24 }}>
                    <div className="ac-card-head" style={{ marginBottom: 20 }}>
                        <h2 className="ac-card-title">Add Category</h2>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label className="ac-label">Name</label>
                                <input type="text" value={form.name} onChange={e => handleNameChange(e.target.value)} required
                                    className="ac-input"
                                    placeholder="e.g. Footwear" />
                            </div>
                            <div>
                                <label className="ac-label">Slug</label>
                                <input type="text" value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} required
                                    className="ac-input"
                                    style={{ fontFamily: "var(--f-mono)", fontSize: 12 }}
                                    placeholder="footwear" />
                            </div>
                            <div>
                                <label className="ac-label">Description</label>
                                <input type="text" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="ac-input"
                                    placeholder="Optional" />
                            </div>
                            {/* Wholesale toggle */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0" }}>
                                <div>
                                    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-2)" }}>Wholesale Category</p>
                                    <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 2 }}>Enable B2B tier pricing on this category</p>
                                </div>
                                <div
                                    onClick={() => setNewIsWholesale(v => !v)}
                                    style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", position: "relative", flexShrink: 0, background: newIsWholesale ? "var(--ac-ink)" : "var(--ac-line)", transition: "background .2s" }}
                                >
                                    <span style={{ display: "inline-block", height: 18, width: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", position: "absolute", top: 2, left: newIsWholesale ? 20 : 2, transition: "left .2s" }} />
                                </div>
                            </div>
                            {newIsWholesale && (
                                <WholesalePricingFields prices={newWholesalePrices} onChange={setNewWholesalePrices} tierConfig={tierConfig} />
                            )}
                            {/* Pre-Order toggle */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0" }}>
                                <div>
                                    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-2)" }}>Pre-Order Category</p>
                                    <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 2 }}>Mark all products in this category as pre-order</p>
                                </div>
                                <div
                                    onClick={() => setNewPreorderEnabled(v => !v)}
                                    style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", position: "relative", flexShrink: 0, background: newPreorderEnabled ? "var(--ac-warn)" : "var(--ac-line)", transition: "background .2s" }}
                                >
                                    <span style={{ display: "inline-block", height: 18, width: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", position: "absolute", top: 2, left: newPreorderEnabled ? 20 : 2, transition: "left .2s" }} />
                                </div>
                            </div>
                            {newPreorderEnabled && (
                                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "color-mix(in oklab, var(--ac-warn) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--ac-warn) 25%, transparent)", borderRadius: "var(--r-sm)" }}>
                                    <label style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-warn)", whiteSpace: "nowrap" }}>Est. Weeks</label>
                                    <input
                                        type="number" min="1" max="52"
                                        value={newPreorderWeeks}
                                        onChange={e => setNewPreorderWeeks(e.target.value)}
                                        className="ac-input"
                                        style={{ width: 72 }}
                                        placeholder="e.g. 6"
                                    />
                                    <span style={{ fontSize: 10, color: "var(--ac-warn)" }}>weeks from today</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <ImageUploader bucket="product-images" folder="categories" currentUrl={null} onUpload={setNewImageUrl} aspectRatio="video" label="Category Image" />
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--ac-line)", paddingTop: 16, marginTop: 8 }}>
                        <button type="submit" disabled={saving} className="ac-btn ac-btn-primary">
                            {saving ? "Saving…" : "Add Category"}
                        </button>
                    </div>
                </form>
            )}

            {(() => {
                const q = search.trim().toLowerCase();
                const filtered = q
                    ? categories.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q))
                    : categories;

                if (loading) return (
                    <div className="ac-card"><div className="ac-empty"><div className="ac-empty-title">Loading…</div></div></div>
                );
                if (categories.length === 0) return (
                    <div className="ac-card"><div className="ac-empty"><div className="ac-empty-title">No categories yet. Add your first above.</div></div></div>
                );
                if (filtered.length === 0) return (
                    <div className="ac-card"><div className="ac-empty"><div className="ac-empty-title">No categories match &ldquo;{search}&rdquo;</div></div></div>
                );

                /* ── Grid view ─────────────────────────────────────────── */
                if (viewMode === "grid") return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                        {filtered.map(cat => (
                            <div key={cat.id} className="ac-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                <div style={{ position: "relative", aspectRatio: "4/3", background: "var(--ac-panel-2)", overflow: "hidden" }}>
                                    {cat.image_url
                                        ? <img src={cat.image_url} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-line)" }}>No image</span></div>
                                    }
                                    <button
                                        onClick={() => toggleFeatured(cat.id, cat.is_featured)}
                                        title={cat.is_featured ? "Unfeature" : "Feature on homepage"}
                                        style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: cat.is_featured ? "var(--ac-warn)" : "rgba(255,255,255,.6)" }}
                                    >
                                        <Star size={16} fill={cat.is_featured ? "currentColor" : "none"} />
                                    </button>
                                    <div style={{ position: "absolute", top: 8, left: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                                        {cat.is_wholesale && <span className="ac-badge ac-badge-ok" style={{ fontSize: 9 }}>B2B</span>}
                                        {!cat.is_active && <span className="ac-badge ac-badge-inactive" style={{ fontSize: 9 }}>Inactive</span>}
                                    </div>
                                </div>
                                <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                                    <p style={{ fontWeight: 500, fontSize: 13, color: "var(--ac-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</p>
                                    <p style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--ac-ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.slug}</p>
                                    {cat.description && <p style={{ fontSize: 11, color: "var(--ac-ink-3)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{cat.description}</p>}
                                    {cat.is_wholesale && (
                                        <div style={{ fontSize: 10, color: "var(--ac-ink-3)", marginTop: "auto", paddingTop: 4, borderTop: "1px solid var(--ac-line)", display: "flex", flexDirection: "column", gap: 1 }}>
                                            {cat.wholesale_tier_1_price != null && <span>T1: GH₵{cat.wholesale_tier_1_price}</span>}
                                            {cat.wholesale_tier_2_price != null && <span>T2: GH₵{cat.wholesale_tier_2_price}</span>}
                                            {cat.wholesale_tier_3_price != null && <span>T3: GH₵{cat.wholesale_tier_3_price}</span>}
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--ac-line)" }}>
                                    <button onClick={() => toggleActive(cat.id, cat.is_active)} className={`ac-badge ${cat.is_active ? "ac-badge-ok" : "ac-badge-inactive"}`} style={{ cursor: "pointer" }}>
                                        {cat.is_active ? "Active" : "Inactive"}
                                    </button>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {!cat.is_wholesale && (
                                            <button onClick={() => handleDuplicateAsWholesale(cat)} disabled={saving} title="Duplicate as Wholesale" style={{ color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                                                <Copy size={13} />
                                            </button>
                                        )}
                                        <button onClick={() => startEdit(cat)} title="Edit" style={{ color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                                            <Pencil size={13} />
                                        </button>
                                        {confirmDeleteId === cat.id ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <button onClick={() => handleDelete(cat.id)} style={{ fontSize: 10, color: "var(--ac-danger)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Yes</button>
                                                <button onClick={() => setConfirmDeleteId(null)} style={{ fontSize: 10, color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}>No</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setConfirmDeleteId(cat.id)} title="Delete" style={{ color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

                /* ── List / table view ─────────────────────────────────── */
                return (
            <div className="ac-card flush">
                <div className="ac-table-wrap">
                <table className="ac-table">
                    <thead>
                        <tr>
                            <th style={{ width: 52 }}>Image</th>
                            <th>Name</th>
                            <th>Slug</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Featured</th>
                            <th>Wholesale / Pre-Order</th>
                            <th style={{ width: 80 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            return filtered.map((cat) => (
                            editingId === cat.id ? (
                                <tr key={cat.id} style={{ background: "var(--ac-panel-2)" }}>
                                    <td>
                                        <div style={{ width: 72 }}>
                                            <ImageUploader bucket="product-images" folder="categories" currentUrl={editForm.image_url || null}
                                                onUpload={(url) => setEditForm(prev => ({ ...prev, image_url: url }))} aspectRatio="square" label="" />
                                        </div>
                                    </td>
                                    <td>
                                        <input type="text" value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="ac-input" style={{ fontSize: 13 }} />
                                    </td>
                                    <td>
                                        <input type="text" value={editForm.slug} onChange={e => setEditForm(prev => ({ ...prev, slug: e.target.value }))}
                                            className="ac-input" style={{ fontFamily: "var(--f-mono)", fontSize: 11 }} />
                                    </td>
                                    <td>
                                        <input type="text" value={editForm.description} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                            className="ac-input" style={{ fontSize: 13 }} />
                                    </td>
                                    <td><span style={{ fontSize: 11, color: "var(--ac-ink-4)", fontStyle: "italic" }}>editing</span></td>
                                    <td>—</td>
                                    <td style={{ minWidth: 240 }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                                <div onClick={() => setEditIsWholesale(v => !v)}
                                                    style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", position: "relative", flexShrink: 0, background: editIsWholesale ? "var(--ac-ink)" : "var(--ac-line)", transition: "background .2s" }}>
                                                    <span style={{ display: "inline-block", height: 16, width: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", position: "absolute", top: 2, left: editIsWholesale ? 18 : 2, transition: "left .2s" }} />
                                                </div>
                                                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-3)" }}>{editIsWholesale ? "Wholesale" : "Retail"}</span>
                                            </label>
                                            {editIsWholesale && (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    {[
                                                        { key: "t1" as const, label: `T1 (${tierConfig?.tier1Min ?? 3}–${tierConfig?.tier1Max ?? 5})` },
                                                        { key: "t2" as const, label: `T2 (${tierConfig?.tier2Min ?? 8}–${tierConfig?.tier2Max ?? 10})` },
                                                        { key: "t3" as const, label: `T3 (${tierConfig?.tier3Min ?? 12}–${tierConfig?.tier3Max ?? 24})` },
                                                    ].map(({ key, label }) => (
                                                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            <span style={{ fontSize: 9, color: "var(--ac-ink-4)", width: 72, flexShrink: 0 }}>{label}</span>
                                                            <span style={{ color: "var(--ac-ink-4)", fontSize: 11 }}>₵</span>
                                                            <input type="number" min="0" step="0.01" value={editWholesalePrices[key]}
                                                                onChange={e => setEditWholesalePrices(p => ({ ...p, [key]: e.target.value }))}
                                                                className="ac-input"
                                                                style={{ width: 72, fontSize: 11 }}
                                                                placeholder="0.00" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                                <div onClick={() => setEditPreorderEnabled(v => !v)}
                                                    style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", position: "relative", flexShrink: 0, background: editPreorderEnabled ? "var(--ac-warn)" : "var(--ac-line)", transition: "background .2s" }}>
                                                    <span style={{ display: "inline-block", height: 16, width: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", position: "absolute", top: 2, left: editPreorderEnabled ? 18 : 2, transition: "left .2s" }} />
                                                </div>
                                                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-warn)" }}>{editPreorderEnabled ? "Pre-Order On" : "Pre-Order Off"}</span>
                                            </label>
                                            {editPreorderEnabled && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <input type="number" min="1" max="52" value={editPreorderWeeks}
                                                        onChange={e => setEditPreorderWeeks(e.target.value)}
                                                        className="ac-input"
                                                        style={{ width: 60, fontSize: 11 }}
                                                        placeholder="wks" />
                                                    <span style={{ fontSize: 9, color: "var(--ac-warn)" }}>weeks from today</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                                            <button onClick={() => handleSaveEdit(cat.id)} disabled={saving}
                                                style={{ color: "var(--ac-accent)", background: "none", border: "none", cursor: "pointer" }} title="Save">
                                                <Check size={16} />
                                            </button>
                                            <button onClick={cancelEdit} style={{ color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }} title="Cancel">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={cat.id}>
                                    <td>
                                        <div style={{ width: 44, height: 44, background: "var(--ac-panel-2)", borderRadius: "var(--r-sm)", overflow: "hidden", border: "1px solid var(--ac-line)" }}>
                                            {cat.image_url
                                                ? <img src={cat.image_url} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                : null}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500, color: "var(--ac-ink)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            {cat.name}
                                            {cat.is_wholesale && <span className="ac-badge ac-badge-ok" style={{ fontSize: 9 }}>B2B</span>}
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-4)" }}>{cat.slug}</td>
                                    <td style={{ color: "var(--ac-ink-2)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.description || "—"}</td>
                                    <td>
                                        <button onClick={() => toggleActive(cat.id, cat.is_active)}
                                            className={`ac-badge ${cat.is_active ? "ac-badge-ok" : "ac-badge-inactive"}`}
                                            style={{ cursor: "pointer" }}>
                                            {cat.is_active ? "Active" : "Inactive"}
                                        </button>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <button onClick={() => toggleFeatured(cat.id, cat.is_featured)}
                                            title={cat.is_featured ? "Unfeature" : "Feature on homepage"}
                                            style={{ color: cat.is_featured ? "var(--ac-warn)" : "var(--ac-line)", background: "none", border: "none", cursor: "pointer" }}>
                                            <Star size={16} fill={cat.is_featured ? "currentColor" : "none"} />
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            {cat.is_wholesale ? (
                                                <div style={{ fontSize: 10, color: "var(--ac-ink-3)", display: "flex", flexDirection: "column", gap: 1 }}>
                                                    {cat.wholesale_tier_1_price != null && <span>T1: GH₵{cat.wholesale_tier_1_price}</span>}
                                                    {cat.wholesale_tier_2_price != null && <span>T2: GH₵{cat.wholesale_tier_2_price}</span>}
                                                    {cat.wholesale_tier_3_price != null && <span>T3: GH₵{cat.wholesale_tier_3_price}</span>}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 10, color: "var(--ac-line)" }}>—</span>
                                            )}
                                            {cat.preorder_enabled && (
                                                <span className="ac-badge ac-badge-warn" style={{ fontSize: 9 }}>
                                                    Pre-Order{cat.preorder_estimated_weeks ? ` · ${cat.preorder_estimated_weeks}wks` : ""}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {confirmDeleteId === cat.id ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                                                <span style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>Delete?</span>
                                                <button onClick={() => handleDelete(cat.id)} style={{ fontSize: 11, color: "var(--ac-danger)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Yes</button>
                                                <button onClick={() => setConfirmDeleteId(null)} style={{ fontSize: 11, color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}>No</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                                                {!cat.is_wholesale && (
                                                    <button onClick={() => handleDuplicateAsWholesale(cat)} disabled={saving} title="Duplicate as Wholesale"
                                                        style={{ color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}>
                                                        <Copy size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => startEdit(cat)} style={{ color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }} title="Edit">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => setConfirmDeleteId(cat.id)} style={{ color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }} title="Delete">
                                                    <Trash2 size={14} />
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
            })()}
        </div>
    );
}
