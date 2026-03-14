"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCart } from "@/store/useCart";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalAmount, clearCart } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const total = totalAmount();

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel — slides in from right */}
      <div
        ref={drawerRef}
        className="relative ml-auto w-full max-w-md bg-white h-full flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} strokeWidth={1.5} />
            <span className="font-serif text-lg tracking-wide">Your Cart</span>
            {items.length > 0 && (
              <span className="text-xs text-gray-400 ml-1">({items.length} item{items.length !== 1 ? "s" : ""})</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-black transition-colors">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
              <ShoppingBag size={48} strokeWidth={1} className="text-gray-200" />
              <p className="text-sm uppercase tracking-widest text-gray-400">Your cart is empty</p>
              <button
                onClick={onClose}
                className="mt-2 bg-black text-white text-[11px] uppercase tracking-widest px-8 py-3 rounded-md hover:bg-gray-900 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 p-5">
                  {/* Image */}
                  <div className="w-20 h-24 bg-gray-100 shrink-0 overflow-hidden rounded-md">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wide text-gray-900 font-medium leading-snug">
                      {item.name}
                    </p>
                    {item.size && (
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                        Size: {item.size}{item.color ? ` · ${item.color}` : ""}
                      </p>
                    )}
                    <p className="text-sm text-gray-900 mt-2 font-medium">
                      GH₵{(item.price * item.quantity).toFixed(2)}
                    </p>

                    {/* Qty + Remove */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <Minus size={12} strokeWidth={2} />
                        </button>
                        <span className="px-3 text-xs border-x border-gray-200">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <Plus size={12} strokeWidth={2} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-widest text-gray-500">Subtotal</span>
              <span className="font-serif text-lg text-gray-900">GH₵{total.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
              Shipping calculated at checkout
            </p>
            <Link
              href="/checkout"
              onClick={onClose}
              className="block w-full bg-black text-white text-[11px] uppercase tracking-widest py-4 text-center rounded-md hover:bg-gray-900 transition-colors"
            >
              Checkout
            </Link>
            <button
              onClick={clearCart}
              className="block w-full text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors text-center"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
