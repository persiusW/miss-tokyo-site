"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/store/useCart";

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;        // current price in GHS
  originalPrice?: number; // if on sale
  dealText?: string;    // e.g. "3 FOR 120"
  badge?: string;       // e.g. "New Arrivals"
  imageUrl: string;
  is_sale?: boolean;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const isSale = product.is_sale || !!product.originalPrice;
  const addItem = useCart((s) => s.addItem);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      id: `${product.id}-one-size`,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      size: "One Size",
      quantity: 1,
      imageUrl: product.imageUrl,
    });
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Image Container — strict 3:4 ratio */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* SALE Ribbon or Badge */}
        {product.is_sale ? (
           <span 
            className="absolute top-0 left-0 bg-black text-white text-[10px] uppercase tracking-[0.2em] px-4 py-2 font-bold z-10"
          >
            SALE
          </span>
        ) : product.badge && (
          <span 
            className="absolute top-3 left-3 bg-white text-black text-[9px] uppercase tracking-widest px-3 py-1.5 font-sans font-bold shadow-sm"
            style={{ borderRadius: "calc(var(--gallery_ribbonCornerRadius) * 1px)" }}
          >
            {product.badge}
          </span>
        )}

        {/* Add to Cart hover overlay */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-5 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
          <button
            onClick={handleAddToCart}
            className="flex items-center gap-2 bg-black text-white text-[10px] uppercase tracking-[0.2em] px-6 py-3 hover:bg-neutral-800 transition-all duration-300 shadow-2xl rounded-none border border-white/10"
          >
            <ShoppingCart size={14} strokeWidth={1.5} /> Add to Cart
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="pt-3">
        <p className="text-[11px] uppercase tracking-wider text-gray-900 leading-snug">
          {product.name}
        </p>
        <div className="mt-1 h-px w-6 bg-gray-400" />
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
          {isSale ? (
            <>
              <span className="text-[12px] text-gray-400 line-through">
                GH₵{product.originalPrice!.toFixed(2)}
              </span>
              <span className="text-[12px] text-black font-medium">
                GH₵{product.price.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-[12px] text-black">
              GH₵{product.price.toFixed(2)}
            </span>
          )}
        </div>
        {product.dealText && (
          <p className="text-[10px] text-red-600 uppercase tracking-wide mt-0.5">
            {product.dealText}
          </p>
        )}
      </div>
    </Link>
  );
}
