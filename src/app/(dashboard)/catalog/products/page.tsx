"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye, EyeOff, Tag, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type Product = {
    id: string;
    name: string;
    slug: string;
    category_type: string;
    category_ids: string[] | null;
    price_ghs: number;
    inventory_count: number;
    track_inventory: boolean;
    track_variant_inventory: boolean;
    is_active: boolean;
    image_urls: string[] | null;
    sku: string | null;
    product_variants: { sku: string | null; inventory_count: number | null }[] | null;
    preorder_enabled: boolean;
    preorder_estimated_date: string | null;
};

type WholesaleCategory = {
    id: string;
    name: string;
    wholesale_tier_1_price: number | null;
    wholesale_tier_2_price: number | null;
    wholesale_tier_3_price: number | null;
};

export default function CatalogProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showWholesaleModal, setShowWholesaleModal] = useState(false);
    const [wholesaleCategories, setWholesaleCategories] = useState<WholesaleCategory[]>([]);
    const [selectedWholesaleCatId, setSelectedWholesaleCatId] = useState<string>("");
    const [assigning, setAssigning] = useState(false);

    const fetchProducts = useCallback(async () => {
        const { data } = await supabase
            .from("products")
            .select("id, name, slug, sku, category_type, category_ids, price_ghs, inventory_count, track_inventory, track_variant_inventory, is_active, image_urls, preorder_enabled, preorder_estimated_date, product_variants(sku, inventory_count)")
            .order("created_at", { ascending: false });
        setProducts(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete product.");
        } else {
            toast.success("Product deleted.");
            setProducts(prev => prev.filter(p => p.id !== id));
            setSelectedIds(prev => prev.filter(pid => pid !== id));
        }
        setConfirmDeleteId(null);
    };

    const handleToggleActive = async (id: string, current: boolean) => {
        const next = !current;
        // Optimistic update
        setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: next } : p));
        const res = await fetch("/api/admin/products", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, is_active: next }),
        });
        if (!res.ok) {
            // Revert on failure
            setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: current } : p));
            toast.error("Failed to update visibility.");
        }
    };

    const handleBulkSetVisibility = async (visible: boolean) => {
        const ids = [...selectedIds];
        // Optimistic update
        setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, is_active: visible } : p));
        const results = await Promise.allSettled(
            ids.map(id => fetch("/api/admin/products", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, is_active: visible }),
            }))
        );
        const failed = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
        if (failed > 0) {
            toast.error(`${failed} product${failed !== 1 ? "s" : ""} failed to update.`);
            fetchProducts(); // Re-sync on partial failure
        } else {
            toast.success(`${ids.length} product${ids.length !== 1 ? "s" : ""} ${visible ? "visible" : "hidden"}.`);
            setSelectedIds([]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm("Are you sure you want to delete the selected products?")) return;

        const { error } = await supabase.from("products").delete().in("id", selectedIds);
        if (error) {
            toast.error("Failed to delete products.");
        } else {
            toast.success("Products deleted.");
            setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
            setSelectedIds([]);
        }
    };

    const openWholesaleModal = async () => {
        const { data } = await supabase
            .from("categories")
            .select("id, name, wholesale_tier_1_price, wholesale_tier_2_price, wholesale_tier_3_price")
            .eq("is_wholesale", true)
            .eq("is_active", true)
            .order("name");
        setWholesaleCategories(data ?? []);
        setSelectedWholesaleCatId(data?.[0]?.id ?? "");
        setShowWholesaleModal(true);
    };

    const handleBulkAssignWholesale = async () => {
        if (!selectedWholesaleCatId) return;
        setAssigning(true);
        const { error } = await supabase
            .from("products")
            .update({ 
                category_id: selectedWholesaleCatId,
                category_ids: [selectedWholesaleCatId] 
            })
            .in("id", selectedIds);
        if (error) {
            toast.error("Failed to assign wholesale category.");
        } else {
            toast.success(`Wholesale category assigned to ${selectedIds.length} product${selectedIds.length !== 1 ? "s" : ""}.`);
            setSelectedIds([]);
            setShowWholesaleModal(false);
        }
        setAssigning(false);
    };

    const handleBulkUntrack = async () => {
        const { error } = await supabase
            .from("products")
            .update({ track_inventory: false, inventory_count: 9999 })
            .in("id", selectedIds);
        if (error) {
            toast.error("Failed to update inventory tracking.");
        } else {
            toast.success(`Inventory tracking disabled for ${selectedIds.length} product${selectedIds.length !== 1 ? "s" : ""}.`);
            setProducts(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, track_inventory: false, inventory_count: 9999 } : p));
            setSelectedIds([]);
        }
    };

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const filteredProducts = useMemo(() => {
        const q = debouncedSearchQuery.toLowerCase();
        if (!q) return products;
        return products.filter((p: Product) =>
            p.name.toLowerCase().includes(q) ||
            (p.category_type || "").toLowerCase().includes(q) ||
            (p.sku || "").toLowerCase().includes(q) ||
            (p.product_variants || []).some(v => (v.sku || "").toLowerCase().includes(q))
        );
    }, [products, debouncedSearchQuery]);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    }, [selectedIds.length, filteredProducts]);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
    }, []);

    const togglePreorder = async (productId: string, enabled: boolean, estimatedDate?: string | null) => {
        const { error } = await supabase
            .from("products")
            .update({
                preorder_enabled: enabled,
                preorder_estimated_date: enabled ? (estimatedDate ?? null) : null,
            })
            .eq("id", productId);
        if (error) { toast.error("Failed to update pre-order settings"); return; }
        setProducts(prev => prev.map(p =>
            p.id === productId
                ? { ...p, preorder_enabled: enabled, preorder_estimated_date: enabled ? (estimatedDate ?? null) : null }
                : p
        ));
    };

    const handleDeleteClick = useCallback((id: string) => setConfirmDeleteId(id), []);
    const handleCancelDelete = useCallback(() => setConfirmDeleteId(null), []);
    const handleConfirmDeleteRow = useCallback((id: string) => handleDelete(id), [products, selectedIds]); // handle delete has access to these anyway
    const handleToggleActiveRow = useCallback((id: string, current: boolean) => handleToggleActive(id, current), [products]);

    return (
        <>
            {/* Page heading */}
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">
                        Products
                        {!loading && (
                            <em style={{ fontSize: 22, marginLeft: 12 }}>
                                {filteredProducts.length}{searchQuery ? ` / ${products.length}` : ""}
                            </em>
                        )}
                    </h1>
                    <p className="ac-page-sub">Manage your atelier&apos;s collection and inventory.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="admin-search" style={{ width: 220 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ac-ink-4)" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                        <input
                            type="text" placeholder="Search products…"
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Link href="/catalog/products/low-stock" className="ac-btn ac-btn-ghost" style={{ color: "var(--ac-warn)", borderColor: "color-mix(in oklab, var(--ac-warn) 35%, var(--ac-line))" }}>
                        Low Stock
                    </Link>
                    <Link href="/catalog/products/new" className="ac-btn ac-btn-primary">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        New Product
                    </Link>
                </div>
            </div>

            {/* Table card */}
            <div className="ac-card flush">
                {/* Bulk bar (inside card, above table) */}
                {selectedIds.length > 0 && (
                    <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 20px", borderBottom: "1px solid var(--ac-line)",
                        background: "var(--ac-panel-2)",
                    }}>
                        <span className="ac-bulk-label">{selectedIds.length} selected</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <button className="ac-btn ac-btn-ghost ac-btn-sm" onClick={() => handleBulkSetVisibility(true)} type="button">Show All</button>
                            <button className="ac-btn ac-btn-ghost ac-btn-sm" onClick={() => handleBulkSetVisibility(false)} type="button">Hide All</button>
                            <button className="ac-btn ac-btn-ghost ac-btn-sm" onClick={openWholesaleModal} type="button" style={{ color: "var(--ac-accent)", borderColor: "color-mix(in oklab, var(--ac-accent) 30%, var(--ac-line))" }}>
                                Assign Wholesale
                            </button>
                            <button className="ac-btn ac-btn-ghost ac-btn-sm" onClick={handleBulkUntrack} type="button">Untrack Inventory</button>
                            <button className="ac-btn ac-btn-sm" onClick={handleBulkDelete} type="button" style={{ background: "color-mix(in oklab, var(--ac-danger) 12%, transparent)", color: "var(--ac-danger)", borderColor: "color-mix(in oklab, var(--ac-danger) 25%, transparent)" }}>
                                Delete Selected
                            </button>
                        </div>
                    </div>
                )}

                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th style={{ width: 44 }}>
                                    <input type="checkbox" className="ac-checkbox"
                                        checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                                        onChange={toggleSelectAll} />
                                </th>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Status</th>
                                <th className="r">Inventory</th>
                                <th className="r">Price</th>
                                <th>Pre-Order</th>
                                <th style={{ width: 90 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="ac-table-empty">Loading…</td></tr>
                            ) : (!filteredProducts || filteredProducts.length === 0) ? (
                                <tr><td colSpan={8} className="ac-table-empty">No products found.</td></tr>
                            ) : (
                                filteredProducts.map((product: Product) => (
                                    <ProductRow
                                        key={product.id}
                                        product={product}
                                        isSelected={selectedIds.includes(product.id)}
                                        isConfirming={confirmDeleteId === product.id}
                                        onToggleSelect={toggleSelect}
                                        onToggleActive={handleToggleActiveRow}
                                        onTogglePreorder={togglePreorder}
                                        onDeleteClick={handleDeleteClick}
                                        onConfirmDelete={handleConfirmDeleteRow}
                                        onCancelDelete={handleCancelDelete}
                                        router={router}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Wholesale modal */}
            {showWholesaleModal && (
                <div className="ac-modal-scrim" onClick={e => { if (e.target === e.currentTarget) setShowWholesaleModal(false); }}>
                    <div className="ac-modal">
                        <div className="ac-modal-head">
                            <div>
                                <div className="ac-modal-title">Assign Wholesale</div>
                                <div style={{ fontSize: 11, color: "var(--ac-ink-3)", marginTop: 4 }}>
                                    {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} selected
                                </div>
                            </div>
                            <button className="ac-modal-close" onClick={() => setShowWholesaleModal(false)} type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div className="ac-modal-body">
                            {wholesaleCategories.length === 0 ? (
                                <div className="ac-empty">
                                    <div className="ac-empty-title">No wholesale categories found</div>
                                    <div className="ac-empty-sub">Enable a category&apos;s Wholesale toggle first.</div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <p style={{ fontSize: 11, color: "var(--ac-ink-3)", fontFamily: "var(--f-mono)", letterSpacing: ".06em", marginBottom: 6 }}>
                                        Tier pricing applied to selected products without overrides.
                                    </p>
                                    {wholesaleCategories.map(cat => (
                                        <label key={cat.id} style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            padding: "12px 14px",
                                            border: `1px solid ${selectedWholesaleCatId === cat.id ? "var(--ac-accent)" : "var(--ac-line)"}`,
                                            borderRadius: "var(--r-md)", cursor: "pointer",
                                            background: selectedWholesaleCatId === cat.id ? "color-mix(in oklab, var(--ac-accent) 6%, transparent)" : "transparent",
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <input type="radio" name="wholesale-cat" value={cat.id}
                                                    checked={selectedWholesaleCatId === cat.id}
                                                    onChange={() => setSelectedWholesaleCatId(cat.id)}
                                                    className="ac-checkbox" />
                                                <span style={{ fontSize: 13, color: "var(--ac-ink-2)" }}>{cat.name}</span>
                                            </div>
                                            <div style={{ fontSize: 10, color: "var(--ac-ink-4)", textAlign: "right", fontFamily: "var(--f-mono)" }}>
                                                {cat.wholesale_tier_1_price != null && <div>T1: GH₵{cat.wholesale_tier_1_price}</div>}
                                                {cat.wholesale_tier_2_price != null && <div>T2: GH₵{cat.wholesale_tier_2_price}</div>}
                                                {cat.wholesale_tier_3_price != null && <div>T3: GH₵{cat.wholesale_tier_3_price}</div>}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="ac-modal-foot">
                            <button className="ac-btn ac-btn-ghost" onClick={() => setShowWholesaleModal(false)} type="button">Cancel</button>
                            <button className="ac-btn ac-btn-accent" onClick={handleBulkAssignWholesale} disabled={assigning || !selectedWholesaleCatId} type="button">
                                {assigning ? "Assigning…" : "Assign Category"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function weeksFromDate(dateStr: string | null): string {
    if (!dateStr) return "";
    const diff = new Date(dateStr).getTime() - Date.now();
    const weeks = Math.max(1, Math.round(diff / (7 * 24 * 60 * 60 * 1000)));
    return String(weeks);
}

function weeksToDate(weeks: number): string {
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().slice(0, 10);
}

function fmtEstDate(dateStr: string | null): string {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

const ProductRow = React.memo(({
    product,
    isSelected,
    isConfirming,
    onToggleSelect,
    onToggleActive,
    onTogglePreorder,
    onDeleteClick,
    onConfirmDelete,
    onCancelDelete,
    router
}: {
    product: Product;
    isSelected: boolean;
    isConfirming: boolean;
    onToggleSelect: (id: string) => void;
    onToggleActive: (id: string, current: boolean) => void;
    onTogglePreorder: (id: string, enabled: boolean, estimatedDate?: string | null) => void;
    onDeleteClick: (id: string) => void;
    onConfirmDelete: (id: string) => void;
    onCancelDelete: () => void;
    router: any;
}) => {
    const [weeksInput, setWeeksInput] = React.useState<string>(() => weeksFromDate(product.preorder_estimated_date));

    const variantTotal = product.track_variant_inventory
        ? (product.product_variants || []).reduce((sum, v) => sum + (v.inventory_count ?? 0), 0)
        : null;
    const displayCount = variantTotal !== null ? variantTotal : product.inventory_count;
    const isLowStock = product.track_inventory && displayCount < 5;
    const displaySku = product.sku || "—";

    return (
        <tr
            className={!product.is_active ? "selected" : ""}
            onClick={() => router.push(`/catalog/products/${product.id}/edit`)}
            style={!product.is_active ? { opacity: .5 } : {}}
        >
            <td onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" className="ac-checkbox" checked={isSelected} onChange={() => onToggleSelect(product.id)} />
            </td>
            <td>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "var(--r-sm)", background: "var(--ac-panel-2)", overflow: "hidden", flexShrink: 0, border: "1px solid var(--ac-line)" }}>
                        {product.image_urls?.[0] ? (
                            <img src={product.image_urls[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : null}
                    </div>
                    <div>
                        <div style={{ fontSize: 13, color: "var(--ac-ink)", fontWeight: 500 }}>{product.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: "var(--ac-ink-4)", fontFamily: "var(--f-mono)" }}>{product.category_type || "Uncategorised"}</span>
                            {product.category_ids && product.category_ids.length > 0 && (
                                <span className="ac-badge ac-badge-info" style={{ fontSize: 8 }}>+{product.category_ids.length}</span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-4)" }}>{displaySku}</span>
            </td>
            <td>
                <span className={`ac-badge ${product.is_active ? "ac-badge-active" : "ac-badge-inactive"}`}>
                    {product.is_active ? "Active" : "Draft"}
                </span>
            </td>
            <td className="r">
                {!product.track_inventory ? (
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".1em" }}>Untracked</span>
                ) : isLowStock ? (
                    <span className="ac-badge ac-badge-danger">{displayCount} left</span>
                ) : (
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ac-ink-2)" }}>{displayCount}</span>
                )}
            </td>
            <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ac-ink-2)" }}>
                GH₵&nbsp;{product.price_ghs}
            </td>
            <td onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                            type="checkbox" checked={product.preorder_enabled} className="ac-checkbox"
                            onChange={e => {
                                if (!e.target.checked) { onTogglePreorder(product.id, false, null); setWeeksInput(""); }
                                else { onTogglePreorder(product.id, true, weeksInput ? weeksToDate(Number(weeksInput)) : null); }
                            }}
                        />
                        <span style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>Enable</span>
                    </label>
                    {product.preorder_enabled && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input
                                    type="number" min="1" max="52" value={weeksInput}
                                    onChange={e => setWeeksInput(e.target.value)}
                                    onBlur={() => { const w = Number(weeksInput); if (w >= 1) onTogglePreorder(product.id, true, weeksToDate(w)); }}
                                    style={{ width: 48, fontFamily: "var(--f-mono)", fontSize: 11, border: "1px solid var(--ac-warn)", borderRadius: "var(--r-sm)", padding: "2px 6px", background: "transparent", color: "var(--ac-ink-2)", outline: "none" }}
                                    placeholder="wks"
                                />
                                <span style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>wks</span>
                            </div>
                            {product.preorder_estimated_date && (
                                <span style={{ fontSize: 10, color: "var(--ac-warn)", fontFamily: "var(--f-mono)" }}>Est. {fmtEstDate(product.preorder_estimated_date)}</span>
                            )}
                        </div>
                    )}
                </div>
            </td>
            <td onClick={(e) => e.stopPropagation()}>
                {isConfirming ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>Delete?</span>
                        <button className="ac-btn ac-btn-danger ac-btn-sm" onClick={() => onConfirmDelete(product.id)} type="button">Yes</button>
                        <button className="ac-btn ac-btn-ghost ac-btn-sm" onClick={onCancelDelete} type="button">No</button>
                    </div>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                        <button
                            onClick={() => onToggleActive(product.id, product.is_active)} type="button"
                            style={{ background: "none", border: "none", cursor: "pointer", color: product.is_active ? "var(--ac-ink-3)" : "var(--ac-ink-4)", display: "flex" }}
                            title={product.is_active ? "Hide from store" : "Show on store"}
                        >
                            {product.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <Link href={`/catalog/products/${product.id}/edit`} style={{ color: "var(--ac-ink-3)", display: "flex" }} title="Edit">
                            <Pencil size={15} />
                        </Link>
                        <button
                            onClick={() => onDeleteClick(product.id)} type="button"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", display: "flex" }} title="Delete"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
});
