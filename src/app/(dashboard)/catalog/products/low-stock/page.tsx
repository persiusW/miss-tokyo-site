import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LowStockPage() {
    const { data: products } = await supabase
        .from("products")
        .select("id, name, category_type, inventory_count, image_urls, price_ghs")
        .eq("is_active", true)
        .eq("track_inventory", true)
        .lt("inventory_count", 5)
        .order("inventory_count", { ascending: true });

    return (
        <div className="space-y-10">
            <header className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                        <Link href="/catalog/products" className="hover:text-black">Products</Link>
                        <span>/</span>
                        <span className="text-black">Low Stock</span>
                    </div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Low Stock</h1>
                    <p className="text-neutral-500">
                        {products?.length ?? 0} product{products?.length !== 1 ? "s" : ""} with fewer than 5 units remaining.
                    </p>
                </div>
                <Link
                    href="/catalog/products"
                    className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors border-b border-neutral-300 hover:border-black pb-0.5"
                >
                    ← All Products
                </Link>
            </header>

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Product</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Category</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Price</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Stock</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {!products || products.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center text-neutral-400 italic font-serif">
                                    All products are sufficiently stocked.
                                </td>
                            </tr>
                        ) : (
                            products.map(p => (
                                <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-neutral-100 overflow-hidden flex-shrink-0">
                                                {p.image_urls?.[0] ? (
                                                    <img src={p.image_urls[0]} alt={p.name} className="object-cover w-full h-full" />
                                                ) : (
                                                    <div className="w-full h-full bg-neutral-200" />
                                                )}
                                            </div>
                                            <span className="font-medium text-neutral-900">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-500 text-xs uppercase tracking-wider">{p.category_type || "—"}</td>
                                    <td className="px-6 py-4 text-right font-medium">GH₵ {Number(p.price_ghs).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">
                                        {p.inventory_count === 0 ? (
                                            <span className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded text-xs font-semibold">
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                Out of stock
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded text-xs font-semibold">
                                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                                {p.inventory_count} remaining
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/catalog/products/${p.id}/edit`}
                                            className="text-neutral-400 hover:text-black transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil size={15} />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
