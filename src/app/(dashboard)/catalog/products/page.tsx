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
        }
        setConfirmDeleteId(null);
    };

    return (
        <div className="space-y-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Products</h1>
                    <p className="text-neutral-500">Manage your atelier's collection and inventory.</p>
                </div>
                <Link
                    href="/catalog/products/new"
                    className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    New Product
                </Link>
            </header>

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
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
                                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 italic font-serif">Loading...</td>
                            </tr>
                        ) : (!products || products.length === 0) ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    No products in the collection yet.
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => {
                                const isLowStock = product.inventory_count < 5;
                                const isConfirming = confirmDeleteId === product.id;

                                return (
                                    <tr key={product.id} className="hover:bg-neutral-50 transition-colors">
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
