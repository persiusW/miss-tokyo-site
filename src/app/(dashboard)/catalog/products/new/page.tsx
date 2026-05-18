"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { toast } from "@/lib/toast";

type Category = { id: string; name: string; slug: string; is_wholesale: boolean };

const toggleStyle = (on: boolean): React.CSSProperties => ({
    position: "relative", display: "inline-flex", height: 20, width: 36, flexShrink: 0,
    borderRadius: 10, border: "none", cursor: "pointer", transition: "background .2s",
    background: on ? "var(--ac-accent)" : "var(--ac-line)",
});
const knobStyle = (on: boolean): React.CSSProperties => ({
    position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16,
    borderRadius: "50%", background: "#fff", transition: "left .2s",
    boxShadow: "0 1px 3px rgba(0,0,0,.2)",
});

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
            if (catData && catData.length > 0) setCategories(catData);
            if (storeData) {
                if (storeData.global_sizes) { setGlobalSizes(storeData.global_sizes); setSelectedSizes(storeData.global_sizes); }
                if (storeData.global_colors) { setGlobalColors(storeData.global_colors); setSelectedColors([]); }
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

    const toggleSize  = (s: string) => setSelectedSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    const toggleColor = (c: string) => setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

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
            toast.error(err?.message || "Failed to create product.");
        } finally {
            setLoading(false);
        }
    };

    const sectionTitle = (label: string) => (
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)", paddingBottom: 12, borderBottom: "1px solid var(--ac-line)", marginBottom: 20 }}>{label}</p>
    );

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ac-ink-4)", marginBottom: 10 }}>
                        <Link href="/catalog/products" className="ac-text-link">Products</Link>
                        <span>/</span>
                        <span style={{ color: "var(--ac-ink)" }}>New Product</span>
                    </div>
                    <h1 className="ac-page-h1">New Product</h1>
                    <p className="ac-page-sub">Add a new piece to the collection.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Link href="/catalog/products" className="ac-btn ac-btn-ghost">Cancel</Link>
                    <button type="submit" form="product-form" disabled={loading || uploadingMedia} className="ac-btn ac-btn-primary">
                        {loading ? "Saving..." : "Save Product"}
                    </button>
                </div>
            </div>

            <form id="product-form" onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
                    {/* Left: main details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Basic Info */}
                        <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                            {sectionTitle("Basic Information")}

                            <div>
                                <label className="ac-label" htmlFor="name">Product Name</label>
                                <input type="text" id="name" value={formData.name} onChange={handleChange} onBlur={handleSlugify}
                                    required className="ac-input" style={{ marginTop: 6 }} placeholder="e.g. Miss Tokyo Piece 02" />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <label className="ac-label" htmlFor="slug">URL Slug</label>
                                    <input type="text" id="slug" value={formData.slug} onChange={handleChange} required
                                        className="ac-input" style={{ marginTop: 6 }} placeholder="miss-tokyo-slide-02" />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div>
                                        <label className="ac-label" htmlFor="category_type">Primary Category</label>
                                        {categories.length === 0 ? (
                                            <div style={{ marginTop: 6, fontSize: 13, color: "var(--ac-ink-4)" }}>
                                                No categories yet — <Link href="/catalog/categories" className="ac-text-link">add one first</Link>
                                            </div>
                                        ) : (
                                            <select id="category_type" value={formData.category_type} onChange={handleChange} required className="ac-select" style={{ marginTop: 6 }}>
                                                <option value="" disabled>Select Category</option>
                                                {categories.filter(c => !c.is_wholesale).map(cat => (
                                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    {categories.length > 0 && (
                                        <div>
                                            <label className="ac-label">
                                                Additional Categories
                                                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: "var(--ac-ink-4)", textTransform: "none", letterSpacing: 0 }}>incl. wholesale</span>
                                            </label>
                                            <div style={{ marginTop: 6, border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", maxHeight: 160, overflowY: "auto" }}>
                                                {categories.map(cat => (
                                                    <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--ac-line)" }}>
                                                        <input type="checkbox" className="ac-checkbox"
                                                            checked={selectedCategoryIds.includes(cat.id)}
                                                            onChange={() => setSelectedCategoryIds(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])} />
                                                        <span style={{ fontSize: 12, flex: 1, color: "var(--ac-ink)" }}>{cat.name}</span>
                                                        {cat.is_wholesale && (
                                                            <span className="ac-badge ac-badge-ok" style={{ fontSize: 9 }}>B2B</span>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="ac-label" htmlFor="description">Description</label>
                                <textarea id="description" rows={4} value={formData.description} onChange={handleChange}
                                    className="ac-textarea" style={{ marginTop: 6 }} placeholder="Describe the materials and craftsmanship..." />
                            </div>

                            <div>
                                <label className="ac-label" htmlFor="sku">SKU</label>
                                <input type="text" id="sku" value={formData.sku} onChange={handleChange}
                                    className="ac-input" style={{ marginTop: 6 }} placeholder="e.g. MT-001" />
                            </div>
                        </div>

                        {/* Variants */}
                        <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                            {sectionTitle("Variants")}

                            <div>
                                <label className="ac-label">Available Sizes</label>
                                {globalSizes.length === 0 ? (
                                    <p style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 6 }}>Loading sizes from store settings...</p>
                                ) : (
                                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 14 }}>
                                        {globalSizes.map(size => (
                                            <label key={size} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                                <input type="checkbox" className="ac-checkbox" checked={selectedSizes.includes(size)} onChange={() => toggleSize(size)} />
                                                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>{size}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ paddingTop: 16, borderTop: "1px solid var(--ac-line)" }}>
                                <label className="ac-label">Available Colors</label>
                                {globalColors.length === 0 ? (
                                    <p style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 6 }}>Loading colors from store settings...</p>
                                ) : (
                                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 14 }}>
                                        {globalColors.map(col => (
                                            <label key={col} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                                <input type="checkbox" className="ac-checkbox" checked={selectedColors.includes(col)} onChange={() => toggleColor(col)} />
                                                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>{col}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: pricing, inventory, images */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Pricing & Inventory */}
                        <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                            {sectionTitle("Pricing & Inventory")}

                            <div>
                                <label className="ac-label" htmlFor="price_ghs">Price (GHS)</label>
                                <input type="number" id="price_ghs" value={formData.price_ghs} onChange={handleChange}
                                    min="0" step="0.01" required className="ac-input" style={{ marginTop: 6 }} />
                            </div>

                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)" }}>
                                <button type="button" onClick={() => setTrackInventory(v => !v)} style={toggleStyle(trackInventory)}>
                                    <span style={knobStyle(trackInventory)} />
                                </button>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink)" }}>Track Inventory</p>
                                    <p style={{ fontSize: 10, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".05em", marginTop: 2 }}>
                                        {trackInventory ? "Tracked — goes out of stock at 0." : "Untracked — always available."}
                                    </p>
                                </div>
                            </div>

                            {trackInventory && (
                                <div>
                                    <label className="ac-label" htmlFor="inventory_count">Inventory Count</label>
                                    <input type="number" id="inventory_count" value={formData.inventory_count} onChange={handleChange}
                                        min="0" required className="ac-input" style={{ marginTop: 6 }} />
                                </div>
                            )}
                        </div>

                        {/* Wholesale Pricing */}
                        {wholesaleTierConfig?.enabled && (
                            <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                                {sectionTitle("Wholesale Pricing")}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-3)" }}>Product-Specific Override</p>
                                        <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 2 }}>When OFF, inherits from the wholesale category</p>
                                    </div>
                                    <button type="button" onClick={() => setWholesaleOverride(v => !v)} style={toggleStyle(wholesaleOverride)}>
                                        <span style={knobStyle(wholesaleOverride)} />
                                    </button>
                                </div>
                                {wholesaleOverride ? (
                                    <>
                                        <p style={{ fontSize: 10, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".05em" }}>Set explicit per-item prices for each quantity tier.</p>
                                        {([
                                            { tier: "tier1" as const, label: "Tier 1", min: wholesaleTierConfig.tier1Min, max: wholesaleTierConfig.tier1Max },
                                            { tier: "tier2" as const, label: "Tier 2", min: wholesaleTierConfig.tier2Min, max: wholesaleTierConfig.tier2Max },
                                            { tier: "tier3" as const, label: "Tier 3", min: wholesaleTierConfig.tier3Min, max: wholesaleTierConfig.tier3Max },
                                        ]).map(({ tier, label, min, max }) => (
                                            <div key={tier}>
                                                <label className="ac-label">{label} — {min}–{max} units</label>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                                    <span style={{ fontSize: 12, color: "var(--ac-ink-4)" }}>GH₵</span>
                                                    <input type="number" min="0" step="0.01" value={wholesalePrices[tier]}
                                                        onChange={e => setWholesalePrices(p => ({ ...p, [tier]: e.target.value }))}
                                                        className="ac-input" placeholder="0.00" />
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <p style={{ fontSize: 10, color: "var(--ac-accent)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>
                                        ✓ Will inherit from assigned wholesale category
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Media */}
                        <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                            {sectionTitle("Product Media")}
                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".05em" }}>Up to 10 files — select multiple at once. First image is primary.</p>
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
        </>
    );
}
