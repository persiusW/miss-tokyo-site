"use client";

import { useEffect, useState } from "react";
import { useCart, getEffectivePrice } from "@/store/useCart";
import { X, Trash2, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CartDrawer() {
    const { isOpen, setIsOpen, items, removeItem, updateQuantity } = useCart();
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => { setMounted(true); }, []);

    if (!mounted || !isOpen) return null;

    const total = items.reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0);

    return (
        <div className="fixed inset-0 z-[220] flex justify-end">
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={() => setIsOpen(false)}
            />

            <div className="relative w-full md:w-96 md:max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                    <h2 className="text-xl font-serif tracking-widest uppercase">Your Cart</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        aria-label="Close cart"
                        className="flex items-center justify-center w-10 h-10 -mr-2 text-neutral-500 hover:text-black transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-4">
                            <p className="font-serif italic">Your cart is empty</p>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-xs uppercase tracking-widest border-b border-black text-black pb-1 hover:text-neutral-600 transition-colors"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    ) : (
                        items.map((item) => {
                            const effectivePrice = getEffectivePrice(item);
                            const isWholesaleDiscounted = item.isWholesale && effectivePrice < item.price;
                            return (
                                <div key={item.id} className="flex gap-4 border-b border-neutral-100 pb-6">
                                    <div className="w-24 h-24 bg-neutral-50 flex-shrink-0">
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 flex flex-col pt-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-medium text-sm text-neutral-900">{item.name}</h3>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="text-neutral-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Size: {item.size}</p>
                                        {isWholesaleDiscounted && (
                                            <p className="text-[9px] text-emerald-600 uppercase tracking-widest mb-2 font-semibold">
                                                Wholesale Rate Applied
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center border border-neutral-200">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        aria-label="Decrease quantity"
                                                        className="flex items-center justify-center w-10 h-10 text-neutral-500 hover:text-black hover:bg-neutral-50"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="px-2 text-xs w-8 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        aria-label="Increase quantity"
                                                        className="flex items-center justify-center w-10 h-10 text-neutral-500 hover:text-black hover:bg-neutral-50"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>

                                                {item.isWholesale && item.wholesaleTiers && (
                                                    <div className="mt-1">
                                                        {(() => {
                                                            const { tier1_min, tier2_min, tier3_min } = item.wholesaleTiers;
                                                            let nextTierMin = null;
                                                            let nextTierNum = null;

                                                            if (item.quantity < tier1_min) { nextTierMin = tier1_min; nextTierNum = 1; }
                                                            else if (item.quantity < tier2_min) { nextTierMin = tier2_min; nextTierNum = 2; }
                                                            else if (item.quantity < tier3_min) { nextTierMin = tier3_min; nextTierNum = 3; }

                                                            if (nextTierMin) {
                                                                const diff = nextTierMin - item.quantity;
                                                                return (
                                                                    <p className="text-[9px] text-emerald-600 font-medium tracking-wide">
                                                                        Add {diff} more to unlock Tier {nextTierNum} pricing!
                                                                    </p>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-right">
                                                {isWholesaleDiscounted && (
                                                    <p className="text-[10px] text-neutral-400 line-through">
                                                        GHS {(item.price * item.quantity).toFixed(2)}
                                                    </p>
                                                )}
                                                <p className="font-medium text-sm">
                                                    GHS {(effectivePrice * item.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {items.length > 0 && (
                    <div className="p-6 border-t border-neutral-100 bg-white space-y-4">
                        <div className="flex justify-between items-center text-lg">
                            <span className="font-serif tracking-widest uppercase">Total</span>
                            <span className="font-medium">GHS {total.toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest text-center">Shipping and taxes calculated at checkout.</p>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.push("/checkout");
                            }}
                            className="w-full py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                        >
                            Checkout
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
