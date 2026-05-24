"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "@/lib/toast";

type WishlistProduct = {
    wishlist_id: string;
    product_id: string;
    name: string;
    slug: string;
    price_ghs: number;
    image_urls: string[] | null;
};

export default function SavedPage() {
    const [items, setItems] = useState<WishlistProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const fetchSaved = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser() as any;
        if (!user) return;
        setUserId(user.id);

        const { data, error } = await supabase
            .from("wishlists")
            .select("id, product_id, products(name, slug, price_ghs, image_urls)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setItems(data.map((row: any) => ({
                wishlist_id: row.id,
                product_id: row.product_id,
                name: row.products?.name ?? "",
                slug: row.products?.slug ?? "",
                price_ghs: row.products?.price_ghs ?? 0,
                image_urls: row.products?.image_urls ?? null,
            })));
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchSaved(); }, [fetchSaved]);

    const remove = async (wishlist_id: string, product_id: string) => {
        if (!userId) return;
        const { error } = await supabase.from("wishlists").delete().eq("id", wishlist_id);
        if (error) { toast.error("Failed to remove."); return; }
        setItems(prev => prev.filter(i => i.wishlist_id !== wishlist_id));
        toast.success("Removed from wishlist.");
    };

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-5 w-40 bg-[#e0d5c0] rounded" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] bg-[#e0d5c0] rounded-xl" />)}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8c7e6a] mb-1">Account</p>
                <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase">
                    Saved <em className="font-serif not-italic italic">pieces</em>
                </h1>
                <p className="text-sm text-[#8c7e6a] mt-1">Your private collection — held until you&apos;re ready.</p>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {items.map(item => {
                        const img = item.image_urls?.[0];
                        return (
                            <article key={item.wishlist_id} className="group relative bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl overflow-hidden">
                                {/* Image */}
                                <Link href={`/products/${item.slug}`} className="block aspect-[3/4] bg-[#e8e0cc] overflow-hidden">
                                    {img ? (
                                        <img src={img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ShoppingBag size={24} className="text-[#c8bb98]" strokeWidth={1} />
                                        </div>
                                    )}
                                </Link>
                                {/* Remove button */}
                                <button
                                    onClick={() => remove(item.wishlist_id, item.product_id)}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#8c7e6a] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove from wishlist"
                                >
                                    <Trash2 size={12} />
                                </button>
                                {/* Info */}
                                <div className="p-3">
                                    <Link href={`/products/${item.slug}`} className="block text-xs font-semibold text-[#1a1714] truncate hover:text-[#8b2f30] transition-colors">
                                        {item.name}
                                    </Link>
                                    <p className="font-serif text-sm text-[#4a3f33] mt-0.5">
                                        GH₵ {Number(item.price_ghs).toFixed(2)}
                                    </p>
                                    <Link
                                        href={`/products/${item.slug}`}
                                        className="mt-2 w-full block text-center text-[10px] uppercase tracking-widest font-semibold py-2 bg-[#1a1714] text-white rounded hover:bg-[#8b2f30] transition-colors"
                                    >
                                        View item
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
