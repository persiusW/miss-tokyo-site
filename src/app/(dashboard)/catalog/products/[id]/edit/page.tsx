"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { toast } from "@/lib/toast";

type Category = { id: string; name: string; slug: string; is_wholesale: boolean };

type VariantStore = Record<string, { sku: string; inventory_count: number }>;

const DebouncedInput = React.memo(({ id, value, onChange, type = "text", placeholder, className, required, min, step }: any) => {
    const [localVal, setLocalVal] = useState(value);

    useEffect(() => {
        setLocalVal(value);
    }, [value]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localVal !== value) {
                onChange({ target: { id, value: localVal, type } });
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [localVal, value, id, onChange, type]);

    return (
        <input
            id={id}
            type={type}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            placeholder={placeholder}
            className={className}
            required={required}
            min={min}
            step={step}
        />
    );
});
DebouncedInput.displayName = "DebouncedInput";

const DebouncedTextarea = React.memo(({ id, value, onChange, rows, placeholder, className }: any) => {
    const [localVal, setLocalVal] = useState(value);

    useEffect(() => {
        setLocalVal(value);
    }, [value]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localVal !== value) {
                onChange({ target: { id, value: localVal, type: "textarea" } });
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [localVal, value, id, onChange]);

    return (
        <textarea
            id={id}
            rows={rows}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            placeholder={placeholder}
            className={className}
        />
    );
});
DebouncedTextarea.displayName = "DebouncedTextarea";

export default function EditProductPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [globalSizes, setGlobalSizes] = useState<string[]>([]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [globalColors, setGlobalColors] = useState<string[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [trackInventory, setTrackInventory] = useState(true);
    const [trackVariantInventory, setTrackVariantInventory] = useState(false);
    const [variantData, setVariantData] = useState<VariantStore>({});
    const [wholesaleTierConfig, setWholesaleTierConfig] = useState<{ enabled: boolean; tier1Min: number; tier1Max: number; tier2Min: number; tier2Max: number; tier3Min: number; tier3Max: number } | null>(null);
    const [wholesalePrices, setWholesalePrices] = useState({ tier1: "", tier2: "", tier3: "" });
    const [wholesaleOverride, setWholesaleOverride] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        sku: "",
        price_ghs: 0,
        compare_at_price_ghs: "" as string | number,
        is_sale: false,
        discount_value: 0,
        inventory_count: 0,
        description: "",
        category_type: "",
        is_active: true,
    });

    const fetchProduct = useCallback(async () => {
        const [
            { data: product },
            { data: cats },
            { data: storeData },
            { data: existingVariants },
        ] = await Promise.all([
            supabase.from("products").select("*").eq("id", id).single(),
            supabase.from("categories").select("id, name, slug, is_wholesale").eq("is_active", true).order("name"),
            supabase.from("store_settings").select("global_sizes, global_colors, global_stitching, wholesale_enabled, wholesale_tier_1_min, wholesale_tier_1_max, wholesale_tier_2_min, wholesale_tier_2_max, wholesale_tier_3_min, wholesale_tier_3_max").eq("id", "default").single(),
            supabase.from("product_variants").select("size, color, stitching, sku, inventory_count").eq("product_id", id),
        ]);

        if (!product) {
            toast.error("Product not found.");
            router.push("/catalog/products");
            return;
        }

        if (cats) setCategories(cats);

        setTrackInventory(product.track_inventory ?? true);
        setTrackVariantInventory(product.track_variant_inventory ?? false);
        setFormData({
            name: product.name || "",
            slug: product.slug || "",
            sku: product.sku || "",
            price_ghs: product.price_ghs || 0,
            compare_at_price_ghs: product.compare_at_price_ghs ?? "",
            is_sale: product.is_sale ?? false,
            discount_value: product.discount_value ?? 0,
            inventory_count: product.inventory_count || 0,
            description: product.description || "",
            category_type: product.category_type || "",
            is_active: product.is_active ?? true,
        });

        setImageUrls(product.image_urls || []);

        if (storeData) {
            if (storeData.global_sizes) {
                setGlobalSizes(storeData.global_sizes);
                setSelectedSizes(
                    product.available_sizes?.length ? product.available_sizes : storeData.global_sizes
                );
            }
            if (storeData.global_colors) {
                setGlobalColors(storeData.global_colors);
                setSelectedColors(
                    product.available_colors?.length ? product.available_colors : []
                );
            }
            setSelectedCategoryIds(Array.isArray(product.category_ids) ? product.category_ids : []);
            setWholesaleOverride(product.wholesale_override === true);
            setWholesalePrices({
                tier1: product.wholesale_price_tier_1 != null ? String(product.wholesale_price_tier_1) : "",
                tier2: product.wholesale_price_tier_2 != null ? String(product.wholesale_price_tier_2) : "",
                tier3: product.wholesale_price_tier_3 != null ? String(product.wholesale_price_tier_3) : "",
            });

            if (storeData && storeData.wholesale_enabled) {
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

        if (existingVariants && existingVariants.length > 0) {
            const store: VariantStore = {};
            for (const v of existingVariants) {
                const key = `${v.size || ""}||${v.color || ""}||`;
                store[key] = { sku: v.sku || "", inventory_count: v.inventory_count ?? 0 };
            }
            setVariantData(store);
        }

        setLoading(false);
    }, [id, router]);

    useEffect(() => { fetchProduct(); }, [fetchProduct]);

    const variantCombos = useMemo(() => {
        const ss = selectedSizes.length > 0 ? selectedSizes : [""];
        const cc = selectedColors.length > 0 ? selectedColors : [""];
        const combos: Array<{ size: string; color: string; stitching: string; key: string }> = [];
        for (const s of ss) for (const c of cc) {
            const key = `${s}||${c}||`;
            combos.push({ size: s, color: c, stitching: "", key });
        }
        return combos;
    }, [selectedSizes, selectedColors]);

    const handleChange = useCallback((e: any) => {
        const { id: fieldId, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [fieldId]: type === "checkbox" ? e.target.checked : value,
        }));
    }, []);

    const toggleSize = (size: string) => {
        setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
    };

    const toggleColor = (col: string) => {
        setSelectedColors(prev => prev.includes(col) ? prev.filter(s => s !== col) : [...prev, col]);
    };

    const updateVariantCell = (key: string, field: "sku" | "inventory_count", value: string | number) => {
        setVariantData(prev => ({
            ...prev,
            [key]: {
                sku: prev[key]?.sku ?? "",
                inventory_count: prev[key]?.inventory_count ?? 0,
                [field]: value,
            },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch("/api/admin/products", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    name: formData.name,
                    slug: formData.slug,
                    sku: formData.sku || null,
                    price_ghs: Number(formData.price_ghs),
                    compare_at_price_ghs: formData.compare_at_price_ghs !== "" ? Number(formData.compare_at_price_ghs) : null,
                    is_sale: formData.is_sale,
                    discount_value: formData.is_sale ? Number(formData.discount_value) : 0,
                    inventory_count: trackInventory && !trackVariantInventory ? Number(formData.inventory_count) : 9999,
                    track_inventory: trackInventory,
                    track_variant_inventory: trackVariantInventory,
                    description: formData.description,
                    category_type: formData.category_type,
                    category_ids: selectedCategoryIds,
                    image_urls: imageUrls,
                    available_sizes: selectedSizes,
                    available_colors: selectedColors,
                    is_active: formData.is_active,
                    wholesale_override: wholesaleOverride,
                    wholesale_price_tier_1: wholesaleOverride && wholesalePrices.tier1 ? Number(wholesalePrices.tier1) : null,
                    wholesale_price_tier_2: wholesaleOverride && wholesalePrices.tier2 ? Number(wholesalePrices.tier2) : null,
                    wholesale_price_tier_3: wholesaleOverride && wholesalePrices.tier3 ? Number(wholesalePrices.tier3) : null,
                    variants: (trackInventory && trackVariantInventory && variantCombos.length > 0)
                        ? variantCombos.map(c => ({
                            product_id: id,
                            size: c.size || null,
                            color: c.color || null,
                            stitching: c.stitching || null,
                            sku: variantData[c.key]?.sku || null,
                            inventory_count: variantData[c.key]?.inventory_count ?? 0,
                        }))
                        : undefined,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to update product");

            toast.success("Product updated.");
            router.push("/catalog/products");
            router.refresh();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Failed to update product.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}>
                <p style={{ color: "var(--ac-ink-4)", fontStyle: "italic", fontFamily: "var(--f-display)" }}>Loading product…</p>
            </div>
        );
    }

    return (
        <>
            {/* Page heading */}
            <div className="ac-page-head">
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ac-ink-3)", marginBottom: 8 }}>
                        <Link href="/catalog/products" className="ac-text-link">Products</Link>
                        <span>/</span>
                        <span style={{ color: "var(--ac-ink)" }}>Edit</span>
                    </div>
                    <h1 className="ac-page-h1">Edit Product</h1>
                    <p className="ac-page-sub">{formData.name}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Link href="/catalog/products" className="ac-btn ac-btn-ghost">Cancel</Link>
                    <button
                        type="submit"
                        form="product-form"
                        disabled={saving || uploadingMedia}
                        className="ac-btn ac-btn-primary"
                    >
                        {saving ? "Saving…" : "Update Product"}
                    </button>
                </div>
            </div>

            <form id="product-form" onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
                    {/* Left column — main details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Basic Info */}
                        <div className="ac-card" style={{ padding: 24 }}>
                            <div className="ac-card-head" style={{ marginBottom: 20 }}>
                                <h2 className="ac-card-title">Basic Information</h2>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                <div>
                                    <label htmlFor="name" className="ac-label">Product Name</label>
                                    <DebouncedInput
                                        type="text"
                                        id="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="ac-input"
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                    <div>
                                        <label htmlFor="slug" className="ac-label">URL Slug</label>
                                        <DebouncedInput
                                            type="text"
                                            id="slug"
                                            value={formData.slug}
                                            onChange={handleChange}
                                            required
                                            className="ac-input"
                                        />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                        <div>
                                            <label htmlFor="category_type" className="ac-label">Primary Category</label>
                                            {categories.length === 0 ? (
                                                <div style={{ padding: "10px 0", borderBottom: "1px solid var(--ac-line)" }}>
                                                    <span style={{ fontSize: 13, color: "var(--ac-ink-4)", fontStyle: "italic" }}>No categories — </span>
                                                    <Link href="/catalog/categories" className="ac-text-link" style={{ fontSize: 13 }}>add one first</Link>
                                                </div>
                                            ) : (
                                                <select
                                                    id="category_type"
                                                    value={formData.category_type}
                                                    onChange={handleChange}
                                                    required
                                                    className="ac-select"
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
                                                <label className="ac-label">
                                                    Additional Categories
                                                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: "var(--ac-ink-4)", textTransform: "none", letterSpacing: 0 }}>incl. wholesale</span>
                                                </label>
                                                <div style={{ border: "1px solid var(--ac-line)", borderRadius: "var(--r-md)", overflow: "hidden", maxHeight: 176, overflowY: "auto" }}>
                                                    {categories.map(cat => (
                                                        <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--ac-line)" }}>
                                                            <input
                                                                type="checkbox"
                                                                className="ac-checkbox"
                                                                checked={selectedCategoryIds.includes(cat.id)}
                                                                onChange={() => setSelectedCategoryIds(prev =>
                                                                    prev.includes(cat.id) ? prev.filter(cid => cid !== cat.id) : [...prev, cat.id]
                                                                )}
                                                            />
                                                            <span style={{ fontSize: 13, flex: 1, color: "var(--ac-ink-2)" }}>{cat.name}</span>
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
                                    <label htmlFor="description" className="ac-label">Description</label>
                                    <DebouncedTextarea
                                        id="description"
                                        rows={4}
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="ac-textarea"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="sku" className="ac-label">SKU</label>
                                    <DebouncedInput
                                        type="text"
                                        id="sku"
                                        value={formData.sku}
                                        onChange={handleChange}
                                        className="ac-input"
                                        placeholder="e.g. MT-001"
                                    />
                                </div>

                                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={handleChange}
                                        className="ac-checkbox"
                                    />
                                    <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-2)" }}>Active (visible in shop)</span>
                                </label>
                            </div>
                        </div>

                        {/* Variants */}
                        <div className="ac-card" style={{ padding: 24 }}>
                            <div className="ac-card-head" style={{ marginBottom: 20 }}>
                                <h2 className="ac-card-title">Variants</h2>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                <div>
                                    <label className="ac-label">Available Sizes</label>
                                    {globalSizes.length === 0 ? (
                                        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>Loading sizes from store settings…</p>
                                    ) : (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                            {globalSizes.map(size => (
                                                <label key={size} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSizes.includes(size)}
                                                        onChange={() => toggleSize(size)}
                                                        className="ac-checkbox"
                                                    />
                                                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink-2)" }}>{size}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ paddingTop: 16, borderTop: "1px solid var(--ac-line)" }}>
                                    <label className="ac-label">Available Colors</label>
                                    {globalColors.length === 0 ? (
                                        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>Loading colors from store settings…</p>
                                    ) : (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                            {globalColors.map(col => (
                                                <label key={col} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedColors.includes(col)}
                                                        onChange={() => toggleColor(col)}
                                                        className="ac-checkbox"
                                                    />
                                                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink-2)" }}>{col}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Variant Inventory Matrix */}
                                {trackInventory && trackVariantInventory && (
                                    <div style={{ paddingTop: 16, borderTop: "1px solid var(--ac-line)" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                                            <h3 className="ac-card-title">Inventory by Variant</h3>
                                            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>
                                                {variantCombos.length} combination{variantCombos.length !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                        <div className="ac-table-wrap">
                                            <table className="ac-table">
                                                <thead>
                                                    <tr>
                                                        {selectedSizes.length > 0 && <th>Size</th>}
                                                        {selectedColors.length > 0 && <th>Color</th>}
                                                        <th>SKU</th>
                                                        <th>Stock</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {variantCombos.map((combo) => (
                                                        <tr key={combo.key}>
                                                            {selectedSizes.length > 0 && <td style={{ fontWeight: 500 }}>{combo.size}</td>}
                                                            {selectedColors.length > 0 && <td style={{ color: "var(--ac-ink-2)" }}>{combo.color}</td>}
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={variantData[combo.key]?.sku ?? ""}
                                                                    onChange={e => updateVariantCell(combo.key, "sku", e.target.value)}
                                                                    placeholder="e.g. SKU-001"
                                                                    className="ac-input"
                                                                    style={{ padding: "4px 0", fontSize: 12 }}
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={variantData[combo.key]?.inventory_count ?? 0}
                                                                    onChange={e => updateVariantCell(combo.key, "inventory_count", Number(e.target.value))}
                                                                    className="ac-input"
                                                                    style={{ width: 80, padding: "4px 0", fontSize: 12 }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginTop: 8 }}>
                                            Toggle options above to add or remove rows. Values are preserved when you deselect and re-select an option.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column — pricing, inventory, images */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Pricing & Inventory */}
                        <div className="ac-card" style={{ padding: 20 }}>
                            <div className="ac-card-head" style={{ marginBottom: 20 }}>
                                <h2 className="ac-card-title">Pricing & Inventory</h2>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                                <div>
                                    <label htmlFor="price_ghs" className="ac-label">Price (GHS)</label>
                                    <DebouncedInput
                                        type="number"
                                        id="price_ghs"
                                        value={formData.price_ghs}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        required
                                        className="ac-input"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="compare_at_price_ghs" className="ac-label">Compare-at / Was Price (GHS)</label>
                                    <DebouncedInput
                                        type="number"
                                        id="compare_at_price_ghs"
                                        value={formData.compare_at_price_ghs}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        className="ac-input"
                                        placeholder="Leave blank to clear"
                                    />
                                    <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>Shows strikethrough price on cards. Leave blank if unused.</p>
                                </div>

                                {/* Sale toggle */}
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-md)" }}>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, is_sale: !p.is_sale }))}
                                        style={{
                                            position: "relative", display: "inline-flex", height: 20, width: 36, flexShrink: 0,
                                            borderRadius: 10, border: "none", cursor: "pointer", marginTop: 2,
                                            background: formData.is_sale ? "var(--ac-danger)" : "var(--ac-line)",
                                            transition: "background .2s",
                                        }}
                                    >
                                        <span style={{
                                            display: "inline-block", height: 16, width: 16, borderRadius: "50%",
                                            background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                                            position: "absolute", top: 2,
                                            left: formData.is_sale ? 18 : 2,
                                            transition: "left .2s",
                                        }} />
                                    </button>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink)" }}>On Sale</p>
                                        <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>Shows Sale ribbon. Enter discount % to slash price.</p>
                                        {formData.is_sale && (
                                            <div style={{ marginTop: 12 }}>
                                                <label className="ac-label">Discount % (e.g. 20 for 20% off)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="1"
                                                    value={formData.discount_value}
                                                    onChange={e => setFormData(p => ({ ...p, discount_value: Number(e.target.value) }))}
                                                    className="ac-input"
                                                    style={{ width: 100 }}
                                                />
                                                {formData.discount_value > 0 && (
                                                    <p style={{ fontSize: 10, color: "var(--ac-danger)", marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>
                                                        Effective price: GH₵{(Number(formData.price_ghs) * (1 - Number(formData.discount_value) / 100)).toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Track Inventory toggle */}
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-md)" }}>
                                    <button
                                        type="button"
                                        onClick={() => setTrackInventory(v => !v)}
                                        style={{
                                            position: "relative", display: "inline-flex", height: 20, width: 36, flexShrink: 0,
                                            borderRadius: 10, border: "none", cursor: "pointer", marginTop: 2,
                                            background: trackInventory ? "var(--ac-ink)" : "var(--ac-line)",
                                            transition: "background .2s",
                                        }}
                                    >
                                        <span style={{
                                            display: "inline-block", height: 16, width: 16, borderRadius: "50%",
                                            background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                                            position: "absolute", top: 2,
                                            left: trackInventory ? 18 : 2,
                                            transition: "left .2s",
                                        }} />
                                    </button>
                                    <div>
                                        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink)" }}>Track Inventory</p>
                                        <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>
                                            {trackInventory ? "Tracked — goes out of stock at 0." : "Untracked — always available."}
                                        </p>
                                    </div>
                                </div>

                                {/* Track by Variant toggle */}
                                {trackInventory && (
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14, background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-md)" }}>
                                        <button
                                            type="button"
                                            onClick={() => setTrackVariantInventory(v => !v)}
                                            style={{
                                                position: "relative", display: "inline-flex", height: 20, width: 36, flexShrink: 0,
                                                borderRadius: 10, border: "none", cursor: "pointer", marginTop: 2,
                                                background: trackVariantInventory ? "var(--ac-ink)" : "var(--ac-line)",
                                                transition: "background .2s",
                                            }}
                                        >
                                            <span style={{
                                                display: "inline-block", height: 16, width: 16, borderRadius: "50%",
                                                background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                                                position: "absolute", top: 2,
                                                left: trackVariantInventory ? 18 : 2,
                                                transition: "left .2s",
                                            }} />
                                        </button>
                                        <div>
                                            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink)" }}>Track Inventory by Variant</p>
                                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 3, textTransform: "uppercase", letterSpacing: ".06em" }}>
                                                {trackVariantInventory
                                                    ? "Each size/colour combination has its own stock count."
                                                    : "All variants share one global stock count."}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {trackInventory && !trackVariantInventory && (
                                    <div>
                                        <label htmlFor="inventory_count" className="ac-label">Inventory Count</label>
                                        <input
                                            type="number"
                                            id="inventory_count"
                                            value={formData.inventory_count}
                                            onChange={handleChange}
                                            min="0"
                                            required
                                            className="ac-input"
                                        />
                                    </div>
                                )}

                                {trackInventory && trackVariantInventory && (
                                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-accent)" }}>
                                        ✓ Stock is managed per variant in the matrix below.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Wholesale Pricing */}
                        {wholesaleTierConfig?.enabled && (
                            <div className="ac-card" style={{ padding: 20 }}>
                                <div className="ac-card-head" style={{ marginBottom: 16 }}>
                                    <h2 className="ac-card-title">Wholesale Pricing</h2>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                        <div>
                                            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-2)" }}>Product-Specific Override</p>
                                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 3 }}>When OFF, inherits from wholesale category</p>
                                        </div>
                                        <div
                                            onClick={() => setWholesaleOverride(v => !v)}
                                            style={{
                                                width: 40, height: 22, borderRadius: 11, cursor: "pointer", position: "relative", flexShrink: 0,
                                                background: wholesaleOverride ? "var(--ac-ink)" : "var(--ac-line)",
                                                transition: "background .2s",
                                            }}
                                        >
                                            <span style={{
                                                display: "inline-block", height: 18, width: 18, borderRadius: "50%",
                                                background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                                                position: "absolute", top: 2,
                                                left: wholesaleOverride ? 20 : 2,
                                                transition: "left .2s",
                                            }} />
                                        </div>
                                    </label>
                                    {wholesaleOverride ? (
                                        <>
                                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)" }}>Set explicit per-item prices for each quantity tier.</p>
                                            {([
                                                { tier: "tier1" as const, label: "Tier 1", min: wholesaleTierConfig.tier1Min, max: wholesaleTierConfig.tier1Max },
                                                { tier: "tier2" as const, label: "Tier 2", min: wholesaleTierConfig.tier2Min, max: wholesaleTierConfig.tier2Max },
                                                { tier: "tier3" as const, label: "Tier 3", min: wholesaleTierConfig.tier3Min, max: wholesaleTierConfig.tier3Max },
                                            ]).map(({ tier, label, min, max }) => (
                                                <div key={tier}>
                                                    <label className="ac-label">{label} — {min}–{max} units</label>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>GH₵</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={wholesalePrices[tier]}
                                                            onChange={e => setWholesalePrices(p => ({ ...p, [tier]: e.target.value }))}
                                                            className="ac-input"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-accent)" }}>
                                            ✓ Will inherit from assigned wholesale category
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Media */}
                        <div className="ac-card" style={{ padding: 20 }}>
                            <div className="ac-card-head" style={{ marginBottom: 14 }}>
                                <h2 className="ac-card-title">Product Media</h2>
                            </div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", marginBottom: 14 }}>Up to 10 files. First image is the primary display.</p>
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
