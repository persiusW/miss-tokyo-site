"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "@/lib/toast";

type WishlistItem = {
    wishlist_id: string;
    product_id: string;
    name: string;
    slug: string;
    price_ghs: number;
    image_urls: string[] | null;
    badge: string | null;
    inventory_count: number | null;
    category_name: string | null;
};

export default function SavedPage() {
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>("ALL");

    const fetchSaved = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser() as any;
        if (!user) return;
        setUserId(user.id);

        // Step 1: fetch wishlist rows
        const { data: wRows, error: wErr } = await supabase
            .from("wishlists")
            .select("id, product_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (wErr || !wRows || wRows.length === 0) { setLoading(false); return; }

        const productIds = wRows.map((r: any) => r.product_id);

        // Step 2: fetch products separately (avoids PostgREST join cache timing issues)
        const { data: pRows } = await supabase
            .from("products")
            .select("id, name, slug, price_ghs, image_urls, badge, inventory_count, category_id")
            .in("id", productIds);

        // Step 3: fetch category names for any category_ids present
        const catIds = [...new Set((pRows ?? []).map((p: any) => p.category_id).filter(Boolean))];
        const { data: catRows } = catIds.length
            ? await supabase.from("categories").select("id, name").in("id", catIds)
            : { data: [] };
        const catMap = Object.fromEntries((catRows ?? []).map((c: any) => [c.id, c.name]));

        const productMap = Object.fromEntries((pRows ?? []).map((p: any) => [p.id, p]));

        setItems(wRows.map((row: any) => {
            const p = productMap[row.product_id] ?? {};
            return {
                wishlist_id: row.id,
                product_id: row.product_id,
                name: p.name ?? "",
                slug: p.slug ?? "",
                price_ghs: p.price_ghs ?? 0,
                image_urls: p.image_urls ?? null,
                badge: p.badge ?? null,
                inventory_count: p.inventory_count ?? null,
                category_name: catMap[p.category_id] ?? null,
            };
        }));
        setLoading(false);
    }, []);

    useEffect(() => { fetchSaved(); }, [fetchSaved]);

    const remove = async (wishlist_id: string) => {
        if (!userId) return;
        const { error } = await supabase.from("wishlists").delete().eq("id", wishlist_id);
        if (error) { toast.error("Failed to remove."); return; }
        setItems(prev => prev.filter(i => i.wishlist_id !== wishlist_id));
        toast.success("Removed from saved.");
    };

    // Collect unique categories
    const categories = ["ALL", ...Array.from(new Set(items.map(i => i.category_name).filter(Boolean) as string[]))];

    const visible = activeCategory === "ALL"
        ? items
        : items.filter(i => i.category_name === activeCategory);

    if (loading) return (
        <div className="space-y-6 animate-pulse max-w-3xl">
            <div className="h-8 w-48 bg-[#e0d5c0] rounded" />
            <div className="flex gap-2">
                {[1,2,3,4].map(i => <div key={i} className="h-8 w-24 bg-[#e0d5c0] rounded-full" />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] bg-[#e0d5c0] rounded-xl" />)}
            </div>
        </div>
    );

    return (
        <div className="max-w-3xl">
            {/* Header */}
            <div className="mb-6">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8c7e6a] mb-1">Account</p>
                <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase">
                    Saved <em className="font-serif not-italic italic">pieces</em>
                </h1>
                <p className="text-sm text-[#8c7e6a] mt-1">Your private collection — held for you until you&apos;re ready.</p>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-20">
                    <Heart size={32} className="mx-auto text-[#e0d5c0] mb-4" strokeWidth={1} />
                    <p className="font-serif text-[#8c7e6a] italic mb-6">Nothing saved yet.</p>
                    <Link
                        href="/shop"
                        className="text-xs uppercase tracking-widest font-semibold border-b border-[#8b2f30] text-[#8b2f30] pb-0.5 hover:opacity-70 transition-opacity"
                    >
                        Browse Shop →
                    </Link>
                </div>
            ) : (
                <>
                    {/* Category filter tabs */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-none mb-6 pb-1">
                        {categories.map(cat => {
                            const count = cat === "ALL" ? items.length : items.filter(i => i.category_name === cat).length;
                            const active = activeCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-colors border whitespace-nowrap ${
                                        active
                                            ? "bg-[#1a1714] text-white border-[#1a1714]"
                                            : "bg-transparent text-[#4a3f33] border-[#e0d5c0] hover:border-[#1a1714]"
                                    }`}
                                >
                                    {cat}
                                    <span className={`text-[9px] font-mono ${active ? "text-[#c8bb98]" : "text-[#8c7e6a]"}`}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Product grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {visible.map(item => {
                            const img = item.image_urls?.[0];
                            const outOfStock = item.inventory_count !== null && item.inventory_count <= 0;
                            const badgeLabel = item.badge || null;

                            return (
                                <article key={item.wishlist_id} className="relative bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl overflow-hidden">
                                    {/* Image */}
                                    <div className="relative aspect-[3/4] bg-[#e8e0cc] overflow-hidden">
                                        <Link href={`/products/${item.slug}`} className="block w-full h-full">
                                            {img ? (
                                                <img
                                                    src={img}
                                                    alt={item.name}
                                                    className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${outOfStock ? "opacity-40" : ""}`}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ShoppingBag size={24} className="text-[#c8bb98]" strokeWidth={1} />
                                                </div>
                                            )}
                                        </Link>

                                        {/* Out of stock overlay */}
                                        {outOfStock && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#4a3f33] bg-[#fdf9f3]/90 px-3 py-1.5 rounded">
                                                    Out of stock
                                                </span>
                                            </div>
                                        )}

                                        {/* Badge top-left */}
                                        {badgeLabel && !outOfStock && (
                                            <span className="absolute top-2 left-2 text-[9px] font-semibold uppercase tracking-widest bg-[#1a1714] text-white px-2 py-1 rounded-full">
                                                {badgeLabel}
                                            </span>
                                        )}

                                        {/* Heart / remove top-right */}
                                        <button
                                            onClick={() => remove(item.wishlist_id)}
                                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors group"
                                            title="Remove from saved"
                                        >
                                            <Heart size={14} className="text-[#8b2f30] fill-[#8b2f30] group-hover:fill-red-500 group-hover:text-red-500 transition-colors" />
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div className="p-3">
                                        {item.category_name && (
                                            <p className="text-[9px] uppercase tracking-widest text-[#8c7e6a] mb-1">{item.category_name}</p>
                                        )}
                                        <Link href={`/products/${item.slug}`} className="block text-sm font-medium text-[#1a1714] hover:text-[#8b2f30] transition-colors leading-snug mb-1">
                                            {item.name}
                                        </Link>
                                        <p className="font-serif text-base text-[#4a3f33] mb-3">
                                            <span className="text-[11px] font-sans text-[#8c7e6a] mr-1">GH₵</span>
                                            {Number(item.price_ghs).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                                        </p>
                                        {outOfStock ? (
                                            <span className="block w-full text-center text-[10px] uppercase tracking-widest font-semibold py-2.5 border border-[#e0d5c0] text-[#c8bb98] rounded cursor-not-allowed">
                                                Add to Bag
                                            </span>
                                        ) : (
                                            <Link
                                                href={`/products/${item.slug}`}
                                                className="block w-full text-center text-[10px] uppercase tracking-widest font-semibold py-2.5 border border-[#1a1714] text-[#1a1714] rounded hover:bg-[#1a1714] hover:text-white transition-colors"
                                            >
                                                Add to Bag
                                            </Link>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
