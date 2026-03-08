"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type Product = {
    id: string;
    name: string;
    slug: string;
    category_type: string;
    price_ghs: number;
    inventory_count: number;
    is_active: boolean;
    image_urls: string[] | null;
};

export default function CatalogProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const fetchProducts = useCallback(async () => {
        const { data } = await supabase
            .from("products")
            .select("id, name, slug, category_type, price_ghs, inventory_count, is_active, image_urls")
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

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category_type.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Products</h1>
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
                        {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        className="text-xs uppercase tracking-widest text-red-600 hover:text-red-800 font-semibold"
                    >
                        Delete Selected
                    </button>
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
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Inventory</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Price</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic font-serif">Loading...</td>
                            </tr>
                        ) : (!filteredProducts || filteredProducts.length === 0) ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    No products found.
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => {
                                const isLowStock = product.inventory_count < 5;
                                const isConfirming = confirmDeleteId === product.id;

                                return (
                                    <tr key={product.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-6 py-4 text-center">
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
                                                    <p className="text-xs text-neutral-500 mt-1">{product.category_type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${product.is_active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                                                {product.is_active ? 'Active' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {isLowStock ? (
                                                <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                    <span className="font-medium">{product.inventory_count || 0} left</span>
                                                </div>
                                            ) : (
                                                <span className="text-neutral-600 font-medium">{product.inventory_count || 0}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            GH₵ {product.price_ghs}
                                        </td>
                                        <td className="px-6 py-4">
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
        </div>
    );
}
