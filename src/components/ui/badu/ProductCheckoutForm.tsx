"use client";

import { useState } from "react";
import { useCart } from "@/store/useCart";

interface ProductCheckoutFormProps {
    productId: string;
    productName: string;
    productSlug: string;
    productImageUrl: string;
    priceNum: number;
    price: string;
    colors: string[];
    stitching: string[];
    availableSizes: string[] | null;
    onAddedToCart?: () => void;
}

export function ProductCheckoutForm({ productId, productName, productSlug, productImageUrl, priceNum, price, colors, stitching, availableSizes, onAddedToCart }: ProductCheckoutFormProps) {
    const { addItem } = useCart();

    // Default to the provided sizes or a fallback array
    const sizesToRender = (availableSizes && availableSizes.length > 0) ? availableSizes : ["39", "40", "41", "42", "43", "44", "45", "46"];

    const [selectedSize, setSelectedSize] = useState<string>("");

    // We can also have state for color and stitching if we want to store them in cart, but avoiding bloat for now
    const [selectedColor, setSelectedColor] = useState<string>(colors[0] || "");
    const [selectedStitching, setSelectedStitching] = useState<string>(stitching[0] || "");

    const handleAddToCart = () => {
        if (!selectedSize) {
            // Flash the size section briefly instead of alert
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
            quantity: 1,
            imageUrl: productImageUrl,
        });

        onAddedToCart?.();
    };

    return (
        <div className="space-y-8 mb-12">
            {/* Color Selection */}
            <div>
                <span className="block text-xs uppercase tracking-widest font-semibold mb-4">Color</span>
                <div className="flex gap-3 flex-wrap">
                    {colors.map(color => (
                        <label key={color} className="cursor-pointer">
                            <input
                                type="radio"
                                name="color"
                                className="sr-only peer"
                                checked={selectedColor === color}
                                onChange={() => setSelectedColor(color)}
                            />
                            <span className="flex items-center min-h-[44px] px-4 text-sm border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors uppercase tracking-widest">
                                {color}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Stitching Selection */}
            <div>
                <span className="block text-xs uppercase tracking-widest font-semibold mb-4">Stitching</span>
                <div className="flex gap-3 flex-wrap">
                    {stitching.map(style => (
                        <label key={style} className="cursor-pointer">
                            <input
                                type="radio"
                                name="stitching"
                                className="sr-only peer"
                                checked={selectedStitching === style}
                                onChange={() => setSelectedStitching(style)}
                            />
                            <span className="flex items-center min-h-[44px] px-4 text-sm border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors uppercase tracking-widest">
                                {style}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Size Selection */}
            <div id={`size-section-${productId}`} className="transition-all duration-300">
                <div className="flex justify-between items-center mb-4">
                    <span className="block text-xs uppercase tracking-widest font-semibold">Size (EU)</span>
                    <button type="button" className="text-xs uppercase tracking-widest text-neutral-500 underline">Size Guide</button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {sizesToRender.map(size => (
                        <label key={size} className="cursor-pointer">
                            <input
                                type="radio"
                                name="size"
                                className="sr-only peer"
                                checked={selectedSize === size}
                                onChange={() => setSelectedSize(size)}
                            />
                            <span className="flex items-center justify-center min-h-[44px] text-center text-sm border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors uppercase tracking-widest">
                                {size}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Desktop: inline button */}
            <button
                type="button"
                onClick={handleAddToCart}
                className={`hidden md:block w-full py-5 bg-black text-white text-xs uppercase tracking-widest transition-colors mt-8 ${!selectedSize ? 'opacity-50 cursor-not-allowed hover:bg-black' : 'hover:bg-neutral-800'}`}
            >
                Add to Cart — {price}
            </button>

            {/* Mobile: sticky bottom bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 p-4 safe-area-pb">
                <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`w-full py-4 bg-black text-white text-xs uppercase tracking-widest transition-colors ${!selectedSize ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-800'}`}
                >
                    {selectedSize ? `Add to Cart — ${price}` : `Select a Size — ${price}`}
                </button>
            </div>
        </div>
    );
}
