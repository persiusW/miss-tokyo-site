"use client";

import { useState } from "react";
import { useCart } from "@/store/useCart";
import { SizeGuideModal } from "@/components/ui/miss-tokyo/SizeGuideModal";
import { getActiveTier, WholesaleData } from "@/lib/wholesale";
import { Minus, Plus } from "lucide-react";

interface ProductCheckoutFormProps {
    productId: string;
    productName: string;
    productSlug: string;
    productImageUrl: string;
    priceNum: number;
    price: string;
    colors: string[];
    stitching?: string[];
    availableSizes: string[] | null;
    wholesale?: WholesaleData | null;
    trackInventory?: boolean;
    trackVariantInventory?: boolean;
    inventoryCount?: number;
    productVariants?: any[];
    onAddedToCart?: () => void;
    openDrawerOnAdd?: boolean;
}

export function ProductCheckoutForm({
    productId, productName, productSlug, productImageUrl,
    priceNum, price, colors, stitching = [], availableSizes,
    wholesale, trackInventory = true, trackVariantInventory = false,
    inventoryCount = 0, productVariants = [], onAddedToCart, openDrawerOnAdd,
}: ProductCheckoutFormProps) {
    const { addItem } = useCart();
    // Map plain size labels to "Label — UK number" format for consistent display
    const UK_SIZE_MAP: Record<string, number> = {
        XS: 6, S: 8, M: 10, L: 12, XL: 14, XXL: 16, XXXL: 18, '4XL': 20, '5XL': 22,
    };
    const formatSize = (s: string) => {
        if (s.includes(' — ')) return s; // already formatted
        const uk = UK_SIZE_MAP[s.toUpperCase()];
        return uk ? `${s} — ${uk}` : s;
    };

    // Deduplicate by root key (sizeKey strips " — 8" suffix), then format for display
    const seen = new Set<string>();
    const rawSizes = (availableSizes && availableSizes.length > 0) ? availableSizes : ["39", "40", "41", "42", "43", "44", "45", "46"];
    const sizesToRender = rawSizes.filter(s => {
        const k = sizeKey(s);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    }).map(formatSize);

    const [selectedSize, setSelectedSize] = useState<string>("");
    // Default to first color that has any in-stock variant; fall back to colors[0]
    const defaultColor = (() => {
        if (trackVariantInventory && productVariants.length > 0) {
            const inStockColor = colors.find(c =>
                productVariants.some(v => (v.color ?? "") === c && (v.inventory_count ?? 0) > 0)
            );
            return inStockColor || colors[0] || "";
        }
        return colors[0] || "";
    })();
    const [selectedColor, setSelectedColor] = useState<string>(defaultColor);
    const [selectedStitching, setSelectedStitching] = useState<string>(stitching[0] || "");
    const [quantity, setQuantity] = useState<number>(1);

    const isWholesale = wholesale?.enabled === true;

    // Compute effective wholesale price for display
    const getDisplayPrice = (): { perUnit: number; total: number; tier: number | null } => {
        if (!isWholesale || !wholesale) return { perUnit: priceNum, total: priceNum * quantity, tier: null };
        const activeTier = getActiveTier(quantity, wholesale.tiers);
        let perUnit = priceNum;
        if (activeTier === 3 && wholesale.prices.tier3 !== null) perUnit = wholesale.prices.tier3;
        else if (activeTier === 2 && wholesale.prices.tier2 !== null) perUnit = wholesale.prices.tier2;
        else if (activeTier === 1 && wholesale.prices.tier1 !== null) perUnit = wholesale.prices.tier1;
        return { perUnit, total: perUnit * quantity, tier: activeTier };
    };

    const { perUnit, total, tier: activeTier } = getDisplayPrice();

    // Normalise a size label to its root for fuzzy matching.
    // "M — 10" → "M", "Free Size" → "Free Size", "M" → "M"
    const sizeKey = (s: string) => s.split(" — ")[0].trim();

    // Inventory Logic
    const effectiveInventory = (() => {
        if (!trackInventory) return 9999;
        if (trackVariantInventory && productVariants.length > 0) {
            // Match by root size key so "M" and "M — 10" resolve to the same variant.
            // When duplicates exist (e.g. stale zero-stock + current labelled entry),
            // prefer the one with available inventory.
            const matches = productVariants.filter(v =>
                sizeKey(v.size ?? "") === sizeKey(selectedSize) &&
                (v.color ?? "") === selectedColor
            );
            const match = matches.find(v => (v.inventory_count ?? 0) > 0) ?? matches[0];
            return match?.inventory_count ?? 0;
        }
        return inventoryCount;
    })();

    const isOutOfStock = effectiveInventory === 0;

    const handleAddToCart = () => {
        if (isOutOfStock) return;
        if (!selectedSize) {
            const sizeSection = document.getElementById(`size-section-${productId}`);
            if (sizeSection) {
                sizeSection.classList.add("ring-1", "ring-red-400");
                setTimeout(() => sizeSection.classList.remove("ring-1", "ring-red-400"), 1500);
            }
            return;
        }

        addItem({
            id: `${productId}-${selectedSize}-${selectedColor}`,
            productId,
            name: productName,
            slug: productSlug,
            price: priceNum,
            size: selectedSize,
            color: selectedColor,
            stitching: selectedStitching,
            quantity,
            imageUrl: productImageUrl,
            inventoryCount: effectiveInventory,
            ...(isWholesale ? { isWholesale: true } : {}),
        }, openDrawerOnAdd ?? true);

        onAddedToCart?.();
    };

    return (
        <div className="space-y-10 mb-12">
            {/* Wholesale banner */}
            {isWholesale && (
                <div className="bg-neutral-900 text-white px-5 py-3 flex items-center gap-3">
                    <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-neutral-400">Wholesale Account</span>
                    <span className="w-px h-3 bg-neutral-600" />
                    <span className="text-[10px] uppercase tracking-widest text-white font-semibold">B2B Pricing Active</span>
                </div>
            )}

            {/* Color Selection */}
            <div>
                <span className="block text-[10px] uppercase tracking-[0.3em] font-bold mb-5 text-neutral-400">Available Colors</span>
                <div className="flex gap-2 flex-wrap">
                    {colors.map(color => (
                        <label key={color} className="cursor-pointer">
                            <input type="radio" name="color" className="sr-only peer"
                                checked={selectedColor === color} onChange={() => setSelectedColor(color)} />
                            <span className="flex items-center h-12 px-6 text-[10px] border border-neutral-100 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all uppercase tracking-[0.2em] font-bold shadow-sm">
                                {color}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Stitching Selection */}
            {/* {stitching.length > 0 && (
                <div>
                    <span className="block text-[10px] uppercase tracking-[0.3em] font-bold mb-5 text-neutral-400">Stitching Option</span>
                    <div className="flex gap-2 flex-wrap">
                        {stitching.map(style => (
                            <label key={style} className="cursor-pointer">
                                <input type="radio" name="stitching" className="sr-only peer"
                                    checked={selectedStitching === style} onChange={() => setSelectedStitching(style)} />
                                <span className="flex items-center h-12 px-6 text-[10px] border border-neutral-100 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all uppercase tracking-[0.2em] font-bold shadow-sm">
                                    {style}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )} */}

            {/* Size Selection */}
            <div id={`size-section-${productId}`} className="transition-all duration-300">
                <div className="flex justify-between items-center mb-5">
                    <span className="block text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400">Select Size (EU)</span>
                    <SizeGuideModal />
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {sizesToRender.map(size => (
                        <label key={size} className="cursor-pointer">
                            <input type="radio" name="size" className="sr-only peer"
                                checked={selectedSize === size} onChange={() => setSelectedSize(size)} />
                            <span className="flex items-center justify-center h-12 text-center text-[11px] border border-neutral-100 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all uppercase tracking-widest font-bold shadow-sm">
                                {size}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Wholesale: quantity selector + tier pricing table */}
            {isWholesale && wholesale && (
                <>
                    {/* Quantity */}
                    <div>
                        <span className="block text-[10px] uppercase tracking-[0.3em] font-bold mb-5 text-neutral-400">Order Quantity</span>
                        <div className="flex items-center gap-0">
                            <button
                                type="button"
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                className="w-12 h-12 border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                            >
                                <Minus size={14} />
                            </button>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 h-12 text-center border-y border-neutral-200 bg-transparent outline-none text-sm font-semibold"
                            />
                            <button
                                type="button"
                                onClick={() => setQuantity(q => q + 1)}
                                className="w-12 h-12 border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Tier pricing table */}
                    <div>
                        <span className="block text-[10px] uppercase tracking-[0.3em] font-bold mb-4 text-neutral-400">Wholesale Tiers</span>
                        <div className="space-y-1.5">
                            {([
                                { tier: 1, min: wholesale.tiers.tier1Min, max: wholesale.tiers.tier1Max, price: wholesale.prices.tier1 },
                                { tier: 2, min: wholesale.tiers.tier2Min, max: wholesale.tiers.tier2Max, price: wholesale.prices.tier2 },
                                { tier: 3, min: wholesale.tiers.tier3Min, max: wholesale.tiers.tier3Max, price: wholesale.prices.tier3 },
                            ] as const).map(({ tier, min, max, price }) => {
                                if (price === null) return null;
                                const isActive = activeTier === tier;
                                return (
                                    <div
                                        key={tier}
                                        className={`flex justify-between items-center px-4 py-3 border transition-all ${isActive
                                                ? "border-black bg-black text-white"
                                                : "border-neutral-100 text-neutral-600"
                                            }`}
                                    >
                                        <div>
                                            <span className={`text-[10px] uppercase tracking-widest font-bold ${isActive ? "text-white" : "text-neutral-500"}`}>
                                                {min}–{max} units
                                            </span>
                                            {isActive && (
                                                <span className="ml-2 text-[9px] uppercase tracking-widest text-emerald-400 font-semibold">Active</span>
                                            )}
                                        </div>
                                        <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-neutral-800"}`}>
                                            GH₵ {price.toFixed(2)} / unit
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Add to cart */}
            <div className="pt-6 border-t border-neutral-100">
                {isOutOfStock ? (
                    <button
                        type="button"
                        disabled
                        className="w-full py-6 bg-neutral-200 text-neutral-400 text-[11px] uppercase tracking-[0.4em] font-black cursor-not-allowed rounded-none"
                    >
                        Out of Stock
                    </button>
                ) : isWholesale ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-baseline px-1">
                            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
                                {quantity} × GH₵ {perUnit.toFixed(2)}
                            </span>
                            <span className="text-lg font-semibold">GH₵ {total.toFixed(2)}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className={`w-full py-6 bg-black text-white text-[11px] uppercase tracking-[0.4em] font-black transition-all duration-500 rounded-none shadow-2xl ${!selectedSize ? "opacity-30 cursor-not-allowed grayscale" : "hover:bg-white hover:text-black border border-black"
                                }`}
                        >
                            {selectedSize
                                ? `Add ${quantity} to Cart — GH₵ ${total.toFixed(2)}`
                                : "Select a Size to Continue"}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        className={`w-full py-6 bg-black text-white text-[11px] uppercase tracking-[0.4em] font-black transition-all duration-500 rounded-none shadow-2xl ${!selectedSize ? "opacity-30 cursor-not-allowed grayscale" : "hover:bg-white hover:text-black border border-black"
                            }`}
                    >
                        {selectedSize ? `Add to Cart — ${price}` : `Select a Size to Continue`}
                    </button>
                )}
            </div>
        </div>
    );
}
