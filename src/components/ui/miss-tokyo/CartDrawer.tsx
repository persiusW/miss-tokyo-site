"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCart, getEffectivePrice } from "@/store/useCart";
import { X, Trash2, Plus, Minus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { evaluateAutoDiscounts, type AutoDiscountResult } from "@/lib/autoDiscount";

export function CartDrawer() {
    // PERF-18: granular selectors — each re-renders only when its slice changes
    const isOpen = useCart(s => s.isOpen);
    const setIsOpen = useCart(s => s.setIsOpen);
    const items = useCart(s => s.items);
    const removeItem = useCart(s => s.removeItem);
    const updateQuantity = useCart(s => s.updateQuantity);
    const [mounted, setMounted] = useState(false);
    const [autoDiscountResult, setAutoDiscountResult] = useState<AutoDiscountResult | null>(null);
    // Track the items fingerprint we last fetched for — avoids re-fetching on cart re-open
    const lastFetchedKey = useRef<string>("");
    const router = useRouter();

    useEffect(() => { setMounted(true); }, []);

    // Fetch auto discount preview only when items actually change
    const fetchAutoDiscounts = useCallback(async () => {
        if (!items.length) { setAutoDiscountResult(null); lastFetchedKey.current = ""; return; }
        const productIds = [...new Set(items.map(i => i.productId))];
        // Key = sorted product IDs + quantities so a qty change also triggers a re-fetch
        const key = items.map(i => `${i.productId}:${i.quantity}`).sort().join(",");
        if (key === lastFetchedKey.current) return; // same cart — skip
        lastFetchedKey.current = key;
        try {
            const res = await fetch(`/api/checkout/auto-discount?productIds=${productIds.join(",")}`);
            if (!res.ok) return;
            const { rules, productCategoryMap } = await res.json();
            setAutoDiscountResult(evaluateAutoDiscounts(items, rules, productCategoryMap));
        } catch {
            // Non-fatal — cart shows raw total if fetch fails
        }
    }, [items]);

    useEffect(() => {
        if (isOpen) fetchAutoDiscounts();
    }, [isOpen, fetchAutoDiscounts]);

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
                                    <div className="w-24 h-24 bg-neutral-50 flex-shrink-0 relative">
                                        {item.imageUrl ? (
                                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="96px" />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-100" />
                                        )}
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
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Size: {item.size}{item.color ? ` · ${item.color}` : ""}</p>
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
                                                        disabled={item.inventoryCount !== undefined && item.quantity >= item.inventoryCount}
                                                        className="flex items-center justify-center w-10 h-10 text-neutral-500 hover:text-black hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
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
                        {/* Pricing breakdown — only shown when there's something to break down */}
                        {(() => {
                            const autoDiscount = autoDiscountResult?.totalAutoDiscount ?? 0;
                            const hasWholesale = items.some(i => i.isWholesale && getEffectivePrice(i) < i.price);
                            const showBreakdown = autoDiscount > 0 || hasWholesale;

                            if (!showBreakdown) {
                                return (
                                    <div className="flex justify-between items-center text-lg">
                                        <span className="font-serif tracking-widest uppercase">Total</span>
                                        <span className="font-medium">GHS {total.toFixed(2)}</span>
                                    </div>
                                );
                            }

                            const retailSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
                            const finalTotal = Math.max(0, total - autoDiscount);
                            const totalSavings = parseFloat((retailSubtotal - finalTotal).toFixed(2));

                            return (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm text-neutral-500">
                                        <span className="uppercase tracking-widest text-xs">Subtotal</span>
                                        <span>GHS {total.toFixed(2)}</span>
                                    </div>

                                    {hasWholesale && (
                                        <div className="flex justify-between items-center text-xs text-emerald-600">
                                            <span className="uppercase tracking-widest">Wholesale pricing</span>
                                            <span>−GHS {(retailSubtotal - total).toFixed(2)}</span>
                                        </div>
                                    )}

                                    {autoDiscount > 0 && autoDiscountResult?.appliedRules.map(rule => (
                                        <div key={rule.id} className="flex justify-between items-center text-xs text-green-600">
                                            <span className="uppercase tracking-widest">{rule.title}</span>
                                            <span>−GHS {rule.discountAmount.toFixed(2)}</span>
                                        </div>
                                    ))}

                                    <div className="flex justify-between items-center text-lg pt-2 border-t border-neutral-100">
                                        <span className="font-serif tracking-widest uppercase">Total</span>
                                        <span className="font-medium">GHS {finalTotal.toFixed(2)}</span>
                                    </div>

                                    {totalSavings > 0 && (
                                        <p className="text-[10px] text-center text-green-600 font-semibold uppercase tracking-widest">
                                            You save GHS {totalSavings.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            );
                        })()}
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest text-center">Shipping and taxes calculated at checkout.</p>

                        {/* Auto discount nudges */}
                        {autoDiscountResult?.nearMisses.map(miss => (
                            <p key={miss.id} className="text-[10px] text-center text-amber-600 font-semibold uppercase tracking-widest">
                                Add {miss.needed} more {miss.targetLabel} to unlock &ldquo;{miss.title}&rdquo;
                            </p>
                        ))}

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
