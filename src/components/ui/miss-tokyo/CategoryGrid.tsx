"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface Category {
  label: string;
  href: string;
  imageUrl: string;
}

const mockCategories: Category[] = [
  {
    label: "Sale",
    href: "/shop?filter=sale",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80",
  }
];

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (data && data.length > 0) {
        setCategories(data.map(c => ({
          label: c.name,
          href: `/shop?category=${c.slug}`,
          imageUrl: c.image_url || "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80",
        })));
      } else if (!error) {
        setCategories(mockCategories);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  return (
    <section className="px-4 sm:px-6 md:px-10 py-12 md:py-20 max-w-screen-xl mx-auto">
      {/* Section Header */}
      <div className="flex items-baseline justify-between mb-10">
        <h2 className="font-serif text-2xl md:text-3xl text-gray-900 uppercase tracking-tight">
          Shop by Category
        </h2>
        <Link
          href="/shop"
          className="text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-black border-b border-gray-100 hover:border-black pb-1 transition-all font-bold"
        >
          View Collection
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-gray-100" size={32} />
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300 font-sans font-bold">Mapping Categories...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="group relative overflow-hidden aspect-[4/5] bg-gray-50"
            >
              <img
                src={cat.imageUrl}
                alt={cat.label}
                className="absolute inset-0 w-full h-full object-cover grayscale opacity-90 transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />
              {/* Label */}
              <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center pointer-events-none">
                <span className="bg-white/95 text-black text-[10px] uppercase tracking-[0.2em] px-8 py-3.5 font-sans font-bold shadow-2xl transition-all duration-500 group-hover:px-10 group-hover:bg-black group-hover:text-white">
                  {cat.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
