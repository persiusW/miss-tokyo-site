"use client";

import React, { useState, useEffect, useCallback, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye, EyeOff, Tag, X, ChevronLeft, ChevronRight } from "lucide-react";
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

type ProductsClientProps = {
    initialProducts: Product[];
    totalCount: number;
    page: number;
    pageSize: number;
    query: string;
    status: string;
    stock: string;
};

export default function ProductsClient({ initialProducts, totalCount, page, pageSize, query, status, stock }: ProductsClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const loading = isPending;
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(query);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showWholesaleModal, setShowWholesaleModal] = useState(false);
    const [wholesaleCategories, setWholesaleCategories] = useState<WholesaleCategory[]>([]);
    const [selectedWholesaleCatId, setSelectedWholesaleCatId] = useState<string>("");
    const [assigning, setAssigning] = useState(false);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Re-sync when the server sends a new page (search/pagination nav or router.refresh)
    useEffect(() => { setProducts(initialProducts); }, [initialProducts]);
    useEffect(() => { setSearchQuery(query); }, [query]);

    // Re-fetch the current page from the server (after mutations)
    const fetchProducts = useCallback(() => { router.refresh(); }, [router]);

    const buildUrl = (next: { q?: string; page?: number; status?: string; stock?: string }) => {
        const params = new URLSearchParams();
        const q = next.q ?? searchQuery;
        const p = next.page ?? 1;
        const st = next.status ?? status;
        const sk = next.stock ?? stock;
        if (q.trim()) params.set("q", q.trim());
        if (st && st !== "all") params.set("status", st);
        if (sk && sk !== "all") params.set("stock", sk);
        if (p > 1) params.set("page", String(p));
        const qs = params.toString();
        return `/catalog/products${qs ? `?${qs}` : ""}`;
    };

    const navigate = (next: { q?: string; page?: number; status?: string; stock?: string }) => {
        startTransition(() => router.push(buildUrl(next)));
    };

    const goToPage = (p: number) => { setSelectedIds([]); navigate({ page: p }); };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete product.");
        } else {
            toast.success("Product deleted.");
            setProducts(prev => prev.filter(p => p.id !== id));
            setSelectedIds(prev => prev.filter(pid => pid !== id));
            router.refresh();
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
            router.refresh();
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
            router.refresh();
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
            router.refresh();
        }
    };

    // Search runs server-side now: the visible page IS the filtered result.
    const filteredProducts = products;

    // Debounce the search box → URL navigation
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            setSelectedIds([]);
            navigate({ q: value, page: 1 });
        }, 350);
    };

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
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">
                        Products
                        <span style={{ marginLeft: 12, fontSize: 18, fontFamily: "var(--f-sans)", color: "var(--ac-ink-4)", letterSpacing: 0, textTransform: "none" }}>
                            ({totalCount}{query ? " found" : ""})
                        </span>
                    </h1>
                    <p className="ac-page-sub">Manage your atelier's collection and inventory.</p>
                </div>
                <div className="ac-page-actions">
                    <input
                        type="text"
                        placeholder="Search products…"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="ac-input"
                        style={{ width: 220 }}
                    />
                    <Link href="/catalog/products/low-stock" className="ac-btn ac-btn-ghost" style={{ color: "var(--ac-warn)", borderColor: "color-mix(in oklab, var(--ac-warn) 45%, transparent)" }}>
                        Low Stock
                    </Link>
                    <Link href="/catalog/products/new" className="ac-btn ac-btn-primary">New Product</Link>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="ac-bulk-bar" style={{ position: "static", transform: "none", marginBottom: 16 }}>
                    <span className="ac-bulk-label">
                        {selectedIds.length} selected
                    </span>
                    <button onClick={() => handleBulkSetVisibility(true)} className="ac-btn ac-btn-ghost ac-btn-sm" title="Show all selected">
                        <Eye size={13} /> Show
                    </button>
                    <button onClick={() => handleBulkSetVisibility(false)} className="ac-btn ac-btn-ghost ac-btn-sm" title="Hide all selected">
                        <EyeOff size={13} /> Hide
                    </button>
                    <button onClick={openWholesaleModal} className="ac-btn ac-btn-ghost ac-btn-sm" style={{ color: "var(--ac-accent)" }}>
                        <Tag size={13} /> Wholesale
                    </button>
                    <button onClick={handleBulkUntrack} className="ac-btn ac-btn-ghost ac-btn-sm">
                        Untrack
                    </button>
                    <button onClick={handleBulkDelete} className="ac-btn ac-btn-danger ac-btn-sm">
                        Delete
                    </button>
                </div>
            )}

            <div className="ac-card flush">
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="ac-label" htmlFor="product-status">Status</label>
                    <select id="product-status" className="ac-input" style={{ minWidth: 160 }}
                        value={status} onChange={e => navigate({ status: e.target.value, page: 1 })}>
                        <option value="all">All products</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="preorder">Pre-order</option>
                    </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="ac-label" htmlFor="product-stock">Stock</label>
                    <select id="product-stock" className="ac-input" style={{ minWidth: 160 }}
                        value={stock} onChange={e => navigate({ stock: e.target.value, page: 1 })}>
                        <option value="all">Any stock level</option>
                        <option value="in">In stock</option>
                        <option value="low">Low stock</option>
                        <option value="out">Out of stock</option>
                    </select>
                </div>
                {(status !== "all" || stock !== "all" || query.trim()) && (
                    <button type="button" className="ac-btn ac-btn-ghost ac-btn-sm"
                        onClick={() => { setSearchQuery(""); navigate({ q: "", status: "all", stock: "all", page: 1 }); }}>
                        Clear filters
                    </button>
                )}
            </div>

                <div className="ac-table-wrap">
                <table className="ac-table">
                    <thead>
                        <tr>
                            <th style={{ width: 44, textAlign: "center" }}>
                                <input
                                    type="checkbox"
                                    className="ac-checkbox"
                                    style={{ verticalAlign: "middle", cursor: "pointer" }}
                                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Status</th>
                            <th className="r">Inventory</th>
                            <th className="r">Price</th>
                            <th>Pre-Order</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="ac-table-empty">Loading…</td>
                            </tr>
                        ) : (!filteredProducts || filteredProducts.length === 0) ? (
                            <tr>
                                <td colSpan={8} className="ac-table-empty">No products found.</td>
                            </tr>
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
                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: "1px solid var(--ac-line)" }}>
                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>
                            Page {page} of {totalPages} · {totalCount} product{totalCount !== 1 ? "s" : ""}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => goToPage(page - 1)} disabled={page <= 1 || isPending} className="ac-btn ac-btn-ghost ac-btn-sm">
                                <ChevronLeft size={13} /> Prev
                            </button>
                            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages || isPending} className="ac-btn ac-btn-ghost ac-btn-sm">
                                Next <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>{/* end ac-card */}
            {/* Wholesale Category Assignment Modal */}
            {showWholesaleModal && (
                <div className="ac-modal-scrim" onClick={() => setShowWholesaleModal(false)}>
                    <div className="ac-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="ac-modal-head">
                            <div>
                                <h2 className="ac-modal-title">Assign Wholesale Category</h2>
                                <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 2, textTransform: "uppercase", letterSpacing: ".08em" }}>
                                    {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} selected
                                </p>
                            </div>
                            <button onClick={() => setShowWholesaleModal(false)} className="ac-modal-close">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="ac-modal-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                            {wholesaleCategories.length === 0 ? (
                                <p style={{ color: "var(--ac-ink-3)", fontStyle: "italic", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                                    No wholesale categories found. Enable a category's "Wholesale" toggle first.
                                </p>
                            ) : (
                                <>
                                    <p style={{ fontSize: 10, color: "var(--ac-ink-3)", textTransform: "uppercase", letterSpacing: ".06em", lineHeight: 1.6 }}>
                                        Select a wholesale category. Its tier pricing will be applied to all selected products that don't have product-level overrides.
                                    </p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {wholesaleCategories.map(cat => (
                                            <label key={cat.id}
                                                style={{
                                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                                    padding: 14, borderRadius: 10, cursor: "pointer",
                                                    border: `1px solid ${selectedWholesaleCatId === cat.id ? "var(--ac-ink)" : "var(--ac-line)"}`,
                                                    background: selectedWholesaleCatId === cat.id ? "color-mix(in oklab, var(--ac-ink) 4%, transparent)" : "transparent",
                                                }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                    <input type="radio" name="wholesale-cat" value={cat.id} checked={selectedWholesaleCatId === cat.id}
                                                        onChange={() => setSelectedWholesaleCatId(cat.id)} className="ac-checkbox" />
                                                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>{cat.name}</span>
                                                </div>
                                                <div style={{ fontSize: 10, color: "var(--ac-ink-4)", textAlign: "right" }}>
                                                    {cat.wholesale_tier_1_price != null && <div>T1: GH₵{cat.wholesale_tier_1_price}</div>}
                                                    {cat.wholesale_tier_2_price != null && <div>T2: GH₵{cat.wholesale_tier_2_price}</div>}
                                                    {cat.wholesale_tier_3_price != null && <div>T3: GH₵{cat.wholesale_tier_3_price}</div>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                                        <button onClick={() => setShowWholesaleModal(false)} className="ac-btn ac-btn-ghost" style={{ flex: 1 }}>
                                            Cancel
                                        </button>
                                        <button onClick={handleBulkAssignWholesale} disabled={assigning || !selectedWholesaleCatId} className="ac-btn ac-btn-primary" style={{ flex: 1 }}>
                                            {assigning ? "Assigning…" : "Assign Category"}
                                        </button>
                                    </div>
                                </>
                            )}
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
            style={{ cursor: "pointer", opacity: product.is_active ? 1 : 0.55 }}
            onClick={() => router.push(`/catalog/products/${product.id}/edit`)}
        >
            <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    className="ac-checkbox"
                    style={{ verticalAlign: "middle", cursor: "pointer" }}
                    checked={isSelected}
                    onChange={() => onToggleSelect(product.id)}
                />
            </td>
            <td>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, background: "var(--ac-bg)", borderRadius: 6, overflow: "hidden", flexShrink: 0, border: "1px solid var(--ac-line)" }}>
                        {product.image_urls?.[0] && (
                            <img src={product.image_urls[0]} alt={product.name} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                        )}
                    </div>
                    <div>
                        <p style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{product.name}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>{product.category_type || "No Primary Category"}</span>
                            {product.category_ids && product.category_ids.length > 0 && (
                                <span style={{ fontSize: 10, padding: "1px 6px", background: "color-mix(in oklab, var(--ac-ink) 8%, transparent)", color: "var(--ac-ink-3)", borderRadius: 999, fontWeight: 500 }}>
                                    +{product.category_ids.length}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <span className="ac-mono" style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{displaySku}</span>
            </td>
            <td>
                <span className={`ac-badge ${product.is_active ? "ac-badge-active" : "ac-badge-inactive"}`}>
                    {product.is_active ? "Active" : "Draft"}
                </span>
            </td>
            <td className="r">
                {!product.track_inventory ? (
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", fontWeight: 600 }}>Untracked</span>
                ) : isLowStock ? (
                    <span className="ac-badge ac-badge-danger" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                        {displayCount} left
                    </span>
                ) : (
                    <span style={{ color: "var(--ac-ink-2)", fontWeight: 500 }}>{displayCount}</span>
                )}
            </td>
            <td className="r" style={{ fontWeight: 500, color: "var(--ac-ink)" }}>
                GH₵ {product.price_ghs}
            </td>
            <td onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            className="ac-checkbox"
                            checked={product.preorder_enabled}
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
                                    type="number" min="1" max="52"
                                    value={weeksInput}
                                    onChange={e => setWeeksInput(e.target.value)}
                                    onBlur={() => {
                                        const w = Number(weeksInput);
                                        if (w >= 1) onTogglePreorder(product.id, true, weeksToDate(w));
                                    }}
                                    className="ac-input"
                                    style={{ width: 56, fontSize: 11, padding: "3px 6px" }}
                                    placeholder="wks"
                                />
                                <span style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>wks</span>
                            </div>
                            {product.preorder_estimated_date && (
                                <span style={{ fontSize: 10, color: "var(--ac-warn)" }}>Est. {fmtEstDate(product.preorder_estimated_date)}</span>
                            )}
                        </div>
                    )}
                </div>
            </td>
            <td onClick={(e) => e.stopPropagation()}>
                {isConfirming ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>Delete?</span>
                        <button onClick={() => onConfirmDelete(product.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-danger)", fontWeight: 600 }}>Yes</button>
                        <button onClick={onCancelDelete} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>No</button>
                    </div>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end", color: "var(--ac-ink-4)" }}>
                        <button
                            onClick={() => onToggleActive(product.id, product.is_active)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "inline-flex" }}
                            title={product.is_active ? "Hide from store" : "Show on store"}
                        >
                            {product.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <Link href={`/catalog/products/${product.id}/edit`} style={{ color: "inherit", display: "inline-flex" }} title="Edit">
                            <Pencil size={15} />
                        </Link>
                        <button
                            onClick={() => onDeleteClick(product.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "inline-flex" }}
                            title="Delete"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
});
