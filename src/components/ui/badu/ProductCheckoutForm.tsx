"use client";

import { useState } from "react";
import { useCart } from "@/store/useCart";
import { SizeGuideModal } from "@/components/ui/miss-tokyo/SizeGuideModal";

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
        <div className="space-y-10 mb-12">
            {/* Color Selection */}
            <div>
                <span className="block text-[10px] uppercase tracking-[0.3em] font-bold mb-5 text-neutral-400">Available Colors</span>
                <div className="flex gap-2 flex-wrap">
                    {colors.map(color => (
                        <label key={color} className="cursor-pointer">
                            <input
                                type="radio"
                                name="color"
                                className="sr-only peer"
                                checked={selectedColor === color}
                                onChange={() => setSelectedColor(color)}
                            />
                            <span className="flex items-center h-12 px-6 text-[10px] border border-neutral-100 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all uppercase tracking-[0.2em] font-bold shadow-sm">
                                {color}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Stitching Selection */}
            {stitching.length > 0 && (
                <div>
                    <span className="block text-[10px] uppercase tracking-[0.3em] font-bold mb-5 text-neutral-400">Stitching Option</span>
                    <div className="flex gap-2 flex-wrap">
                        {stitching.map(style => (
                            <label key={style} className="cursor-pointer">
                                <input
                                    type="radio"
                                    name="stitching"
                                    className="sr-only peer"
                                    checked={selectedStitching === style}
                                    onChange={() => setSelectedStitching(style)}
                                />
                                <span className="flex items-center h-12 px-6 text-[10px] border border-neutral-100 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all uppercase tracking-[0.2em] font-bold shadow-sm">
                                    {style}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Size Selection */}
            <div id={`size-section-${productId}`} className="transition-all duration-300">
                <div className="flex justify-between items-center mb-5">
                    <span className="block text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400">Select Size (EU)</span>
                    <SizeGuideModal />
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
                            <span className="flex items-center justify-center h-12 text-center text-[11px] border border-neutral-100 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-all uppercase tracking-widest font-bold shadow-sm">
                                {size}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Registration/Action */}
            <div className="pt-6 border-t border-neutral-100">
                <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`w-full py-6 bg-black text-white text-[11px] uppercase tracking-[0.4em] font-black transition-all duration-500 rounded-none shadow-2xl ${
                        !selectedSize 
                        ? 'opacity-30 cursor-not-allowed grayscale' 
                        : 'hover:bg-white hover:text-black border border-black'
                    }`}
                >
                    {selectedSize ? `Add to Cart — ${price}` : `Select a Size to Continue`}
                </button>
            </div>
        </div>
    );
}
