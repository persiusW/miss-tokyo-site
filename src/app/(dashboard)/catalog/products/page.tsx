import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function CatalogProductsPage() {
    const { data: products } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

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
                        {(!products || products.length === 0) ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    No products in the collection yet.
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => {
                                const isLowStock = product.inventory_count < 5;

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
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-xs uppercase tracking-widest text-neutral-400 hover:text-black transition-colors border-b border-transparent hover:border-black">
                                                Edit
                                            </button>
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
