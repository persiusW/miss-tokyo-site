"use client";

import { useState, useEffect, useCallback } from "react";
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
            .select("id, name, slug, sku, category_type, category_ids, price_ghs, inventory_count, track_inventory, track_variant_inventory, is_active, image_urls, product_variants(sku, inventory_count)")
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
        const { error } = await supabase.from("products").update({ is_active: !current }).eq("id", id);
        if (error) {
            toast.error("Failed to update visibility.");
        } else {
            setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
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

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category_type || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">
                        Products
                        {!loading && (
                            <span className="ml-3 text-lg font-sans text-neutral-400 tracking-normal normal-case">
                                ({filteredProducts.length}{searchQuery ? ` of ${products.length}` : ""})
                            </span>
                        )}
                    </h1>
                    <p className="text-neutral-500">Manage your atelier's collection and inventory.</p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="SEARCH PRODUCTS..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-4 py-3 text-xs tracking-widest uppercase border border-neutral-200 outline-none focus:border-black transition-colors w-64 bg-transparent"
                    />
                    <Link
                        href="/catalog/products/low-stock"
                        className="border border-amber-400 text-amber-700 px-5 py-3 text-xs uppercase tracking-widest hover:bg-amber-50 transition-colors whitespace-nowrap"
                    >
                        Low Stock
                    </Link>
                    <Link
                        href="/catalog/products/new"
                        className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors whitespace-nowrap"
                    >
                        New Product
                    </Link>
                </div>
            </header>

            {selectedIds.length > 0 && (
                <div className="bg-neutral-50 border border-neutral-200 p-4 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest font-semibold text-neutral-600">
                        {selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected
                    </span>
                    <div className="flex items-center gap-6">
                        <button
                            onClick={openWholesaleModal}
                            className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-700 hover:text-emerald-900 font-semibold transition-colors"
                        >
                            <Tag size={13} />
                            Assign Wholesale Category
                        </button>
                        <button
                            onClick={handleBulkUntrack}
                            className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black font-semibold transition-colors"
                        >
                            Untrack Inventory
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="text-xs uppercase tracking-widest text-red-600 hover:text-red-800 font-semibold"
                        >
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center text-xs font-semibold uppercase tracking-widest text-neutral-500">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-black align-middle cursor-pointer"
                                    checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Product</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">SKU</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Inventory</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Price</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 italic font-serif">Loading...</td>
                            </tr>
                        ) : (!filteredProducts || filteredProducts.length === 0) ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    No products found.
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => {
                                const variantTotal = product.track_variant_inventory
                                    ? (product.product_variants || []).reduce((sum, v) => sum + (v.inventory_count ?? 0), 0)
                                    : null;
                                const displayCount = variantTotal !== null ? variantTotal : product.inventory_count;
                                const isLowStock = product.track_inventory && displayCount < 5;
                                const isConfirming = confirmDeleteId === product.id;
                                const displaySku = product.sku || "—";

                                return (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-neutral-50 transition-colors cursor-pointer ${!product.is_active ? "opacity-50" : ""}`}
                                        onClick={() => router.push(`/catalog/products/${product.id}/edit`)}
                                    >
                                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-black align-middle cursor-pointer"
                                                checked={selectedIds.includes(product.id)}
                                                onChange={() => toggleSelect(product.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-neutral-100 relative overflow-hidden flex-shrink-0">
                                                    {product.image_urls?.[0] ? (
                                                        <img src={product.image_urls[0]} alt={product.name} className="object-cover w-full h-full" />
                                                    ) : (
                                                        <div className="w-full h-full bg-neutral-200" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-neutral-900">{product.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <p className="text-xs text-neutral-500">{product.category_type || "No Primary Category"}</p>
                                                        {product.category_ids && product.category_ids.length > 0 && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-400 rounded-full font-medium">
                                                                +{product.category_ids.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono text-neutral-500">{displaySku}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${product.is_active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                                                {product.is_active ? 'Active' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!product.track_inventory ? (
                                                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Untracked</span>
                                            ) : isLowStock ? (
                                                <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                    <span className="font-medium">{displayCount} left</span>
                                                </div>
                                            ) : (
                                                <span className="text-neutral-600 font-medium">{displayCount}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            GH₵ {product.price_ghs}
                                        </td>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            {isConfirming ? (
                                                <div className="flex items-center gap-3 justify-end">
                                                    <span className="text-xs text-neutral-500">Delete?</span>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="text-xs uppercase tracking-widest text-red-600 hover:text-red-800 font-semibold"
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="text-xs uppercase tracking-widest text-neutral-400 hover:text-black"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 justify-end">
                                                    <button
                                                        onClick={() => handleToggleActive(product.id, product.is_active)}
                                                        className={`transition-colors ${product.is_active ? "text-neutral-400 hover:text-black" : "text-neutral-300 hover:text-black"}`}
                                                        title={product.is_active ? "Hide from store" : "Show on store"}
                                                    >
                                                        {product.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                                                    </button>
                                                    <Link
                                                        href={`/catalog/products/${product.id}/edit`}
                                                        className="text-neutral-400 hover:text-black transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={15} />
                                                    </Link>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(product.id)}
                                                        className="text-neutral-400 hover:text-red-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {/* Wholesale Category Assignment Modal */}
            {showWholesaleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
                        <div className="px-8 py-5 border-b border-neutral-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-serif text-lg tracking-widest uppercase">Assign Wholesale Category</h2>
                                <p className="text-[10px] text-neutral-400 mt-0.5 uppercase tracking-widest">
                                    {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} selected
                                </p>
                            </div>
                            <button onClick={() => setShowWholesaleModal(false)} className="text-neutral-400 hover:text-black">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            {wholesaleCategories.length === 0 ? (
                                <p className="text-neutral-400 italic text-sm font-serif text-center py-4">
                                    No wholesale categories found. Enable a category's "Wholesale" toggle first.
                                </p>
                            ) : (
                                <>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest leading-relaxed">
                                        Select a wholesale category. Its tier pricing will be applied to all selected products that don't have product-level overrides.
                                    </p>
                                    <div className="space-y-2">
                                        {wholesaleCategories.map(cat => (
                                            <label key={cat.id}
                                                className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${selectedWholesaleCatId === cat.id ? "border-black bg-neutral-50" : "border-neutral-200 hover:border-neutral-300"}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="radio" name="wholesale-cat" value={cat.id} checked={selectedWholesaleCatId === cat.id}
                                                        onChange={() => setSelectedWholesaleCatId(cat.id)} className="accent-black" />
                                                    <span className="text-sm font-medium">{cat.name}</span>
                                                </div>
                                                <div className="text-[10px] text-neutral-400 text-right">
                                                    {cat.wholesale_tier_1_price != null && <div>T1: GH₵{cat.wholesale_tier_1_price}</div>}
                                                    {cat.wholesale_tier_2_price != null && <div>T2: GH₵{cat.wholesale_tier_2_price}</div>}
                                                    {cat.wholesale_tier_3_price != null && <div>T3: GH₵{cat.wholesale_tier_3_price}</div>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 pt-2">
                                        <button onClick={() => setShowWholesaleModal(false)}
                                            className="flex-1 py-3 border border-neutral-200 text-xs uppercase tracking-widest hover:bg-neutral-50 transition-colors rounded-lg">
                                            Cancel
                                        </button>
                                        <button onClick={handleBulkAssignWholesale} disabled={assigning || !selectedWholesaleCatId}
                                            className="flex-1 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 rounded-lg">
                                            {assigning ? "Assigning..." : "Assign Category"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
