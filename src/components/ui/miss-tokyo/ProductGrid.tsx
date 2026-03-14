"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Product, ProductCard } from "./ProductCard";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export const latestProducts: Product[] = [
  // Mock fallback for design preview
  {
    id: "1",
    name: "Animated Sleep Wear",
    slug: "animated-sleep-wear",
    price: 80,
    badge: "New Arrivals",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
  }
];

interface ProductGridProps {
  products?: Product[];
  title?: string;
  showTitle?: boolean;
  className?: string;
  limit?: number;
}

export function ProductGrid({
  products: initialProducts,
  title = "Latest Arrivals",
  showTitle = true,
  className = "",
  limit = 8,
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);

  useEffect(() => {
    if (initialProducts) {
      setProducts(initialProducts);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (data && data.length > 0) {
        setProducts(data.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            originalPrice: p.original_price,
            badge: p.is_new ? "New Arrival" : p.on_sale ? "Sale" : undefined,
            imageUrl: p.image_url || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
            dealText: p.deal_text
        })));
      } else if (!error) {
        // Fallback to mock if DB is empty for demo purposes
        setProducts(latestProducts);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [initialProducts, limit]);

  return (
    <section className={`px-4 sm:px-6 md:px-10 py-14 md:py-24 max-w-screen-xl mx-auto ${className}`}>
      {showTitle && (
        <div className="flex flex-col mb-12">
            <h2 className="font-serif text-3xl md:text-5xl text-gray-900 uppercase tracking-tighter leading-none">
            {title}
            </h2>
            <div className="h-0.5 w-12 bg-black mt-4" />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-gray-100" size={32} />
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300 font-sans">Accessing Collection...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-gray-50/50">
          <p className="text-xs uppercase tracking-widest text-gray-400 italic">The collection is currently being curated.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <div className="text-center mt-20">
        <Link
          href="/shop"
          className="inline-block border border-black text-black text-[11px] uppercase tracking-[0.2em] px-12 py-4 hover:bg-black hover:text-white transition-all duration-500 font-bold"
        >
          Discover All
        </Link>
      </div>
    </section>
  );
}
