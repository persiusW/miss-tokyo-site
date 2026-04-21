"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useCart } from "@/store/useCart";
import type { ShopProduct } from "@/lib/products";

const COLOR_HEX: Record<string, string> = {
    Black:"#0f0f0f", White:"#f5f5f5", Red:"#e8485a", Pink:"#f4a0b5",
    Nude:"#d4a574", Navy:"#1e3a5f", Green:"#22c55e", Orange:"#f97316",
    Apricot:"#fbceb1", Brown:"#92400e", Turquoise:"#14b8a6", Turqouise:"#14b8a6",
    Curry:"#c8963c", Blue:"#3b82f6", Yellow:"#eab308", Purple:"#8b5cf6",
    Grey:"#6b7280", Gray:"#6b7280", ButterYellow:"#f5d76e", Coffee:"#6f4e37",
    Wine:"#722f37", Peach:"#ffcba4", SeaBlue:"#2e86ab", Cream:"#f5f0e8",
    BlueBlack:"#1c1f36", Gold:"#c9a84c", Silver:"#c0c0c0", RoseGold:"#b76e79",
    Violet:"#7c3aed", ButterGreen:"#a8c97f", Burgundy:"#800020",
    Beige:"#d4b896", Khaki:"#c3b091", Teal:"#0d9488", Camel:"#c19a6b",
    Ivory:"#f8f4e8", Maroon:"#800000", Lilac:"#c8a2c8", Sage:"#bcceab",
    Mint:"#98d8c8", Chocolate:"#3d1c02", Mustard:"#e1ad01",
};

const getHex = (c: string) =>
    COLOR_HEX[c] ?? COLOR_HEX[c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()] ?? "#ccc";

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='133'%3E%3Crect width='100' height='133' fill='%23E8D5C4'/%3E%3C/svg%3E";

export function QuickAddModal({
    product,
    onClose,
}: {
    product: ShopProduct;
    onClose: () => void;
}) {
    const { addItem } = useCart();
    const [selectedColor, setSelectedColor] = useState(product.available_colors?.[0] || "");
    const [selectedSize, setSelectedSize] = useState("");
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [variants, setVariants] = useState<any[]>([]);
    const colors = product.available_colors ?? [];
    const sizes = product.available_sizes ?? [];
    const isOnSale = !!(product.compare_at_price_ghs && product.compare_at_price_ghs > product.price_ghs);

    useEffect(() => {
        if (product.track_variant_inventory) {
            import("@/lib/supabase").then(({ supabase }) => {
                supabase
                    .from("product_variants")
                    .select("size, color, inventory_count")
                    .eq("product_id", product.id)
                    .then(({ data }: { data: any[] | null }) => {
                        if (data) setVariants(data);
                    });
            });
        }
    }, [product.id, product.track_variant_inventory]);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
    }, [onClose]);

    // Colors that have ANY in-stock variant across all sizes.
    const colorsWithAnyStock = useMemo<Set<string> | null>(() => {
        if (!product.track_variant_inventory || variants.length === 0) return null;
        const result = new Set<string>();
        for (const v of variants) {
            if ((v.inventory_count ?? 0) > 0 && v.color != null) result.add(v.color);
        }
        return result;
    }, [product.track_variant_inventory, variants]);

    // Sizes that have a variant row for the selected color (in-stock OR out-of-stock).
    const sizesForSelectedColor = useMemo<string[]>(() => {
        if (!product.track_variant_inventory || variants.length === 0 || !selectedColor) return sizes;
        const colorVariantSizes = new Set(
            variants.filter(v => (v.color ?? "") === selectedColor && v.size != null).map((v: any) => v.size as string)
        );
        const ordered = sizes.filter(s => colorVariantSizes.has(s));
        return ordered.length > 0 ? ordered : Array.from(colorVariantSizes);
    }, [product.track_variant_inventory, variants, selectedColor, sizes]);

    // Sizes with stock > 0 for the selected color.
    const sizesInStockForColor = useMemo<Set<string>>(() => {
        if (!product.track_variant_inventory || variants.length === 0 || !selectedColor) return new Set(sizes);
        const result = new Set<string>();
        for (const v of variants) {
            if ((v.color ?? "") === selectedColor && (v.inventory_count ?? 0) > 0 && v.size != null) result.add(v.size);
        }
        return result;
    }, [product.track_variant_inventory, variants, selectedColor, sizes]);

    // Once variants load, advance selectedColor to first color with any stock.
    useEffect(() => {
        if (!colorsWithAnyStock) return;
        if (selectedColor && colorsWithAnyStock.has(selectedColor)) return;
        const first = colors.find(c => colorsWithAnyStock.has(c));
        setSelectedColor(first ?? colors[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorsWithAnyStock]);

    // When color changes or variants load, advance selectedSize to first in-stock size for the color.
    useEffect(() => {
        if (!selectedColor || sizesForSelectedColor.length === 0) return;
        if (selectedSize && sizesInStockForColor.has(selectedSize)) return;
        const first = sizesForSelectedColor.find(s => sizesInStockForColor.has(s));
        setSelectedSize(first ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedColor, sizesForSelectedColor, sizesInStockForColor]);

    const effectiveInventory = useMemo(() => {
        if (!product.track_inventory) return 9999;
        if (product.track_variant_inventory && variants.length > 0) {
            if (!selectedSize) {
                return variants
                    .filter(v => (v.color ?? "") === selectedColor && (v.inventory_count ?? 0) > 0)
                    .reduce((sum: number, v: any) => sum + (v.inventory_count ?? 0), 0);
            }
            const match = variants.find(v =>
                (v.size ?? "") === selectedSize &&
                (v.color ?? "") === selectedColor
            );
            return match?.inventory_count ?? 0;
        }
        return product.inventory_count;
    }, [product.track_inventory, product.track_variant_inventory, variants, selectedSize, selectedColor, product.inventory_count]);

    const isOutOfStock = effectiveInventory === 0;

    const handleAdd = () => {
        if (isOutOfStock) return;
        if (sizesForSelectedColor.length > 0 && !selectedSize) return;
        setAdding(true);
        addItem({
            id: `${product.id}-${selectedSize}-${selectedColor}`,
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price_ghs,
            size: selectedSize || "One Size",
            color: selectedColor || undefined,
            quantity: 1,
            imageUrl: product.image_urls?.[0] || "",
            inventoryCount: effectiveInventory,
        }, false);
        setAdding(false);
        setAdded(true);
        setTimeout(onClose, 1400);
    };

    return (
        <div
            className="fixed inset-0 z-[400] flex items-center justify-center p-5"
            style={{ background: "rgba(20,18,16,0.6)", backdropFilter: "blur(3px)" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white w-full max-w-[780px] max-h-[90vh] flex overflow-hidden" style={{ borderRadius: 6 }}>
                {/* Image */}
                <div className="relative flex-shrink-0 overflow-hidden" style={{ width: "45%" }}>
                    <Image
                        src={product.image_urls?.[0] || FALLBACK_IMG}
                        alt={product.name}
                        fill
                        sizes="(max-width: 780px) 45vw, 350px"
                        className="object-cover"
                    />
                    <button onClick={onClose}
                        className="absolute top-[14px] right-[14px] z-10 w-8 h-8 flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.9)", borderRadius: "50%", border: "none" }}
                    >
                        <X size={14} stroke="#141210" strokeWidth={2} />
                    </button>
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                    <p className="text-[10px] tracking-[0.15em] uppercase mb-2" style={{ color: "#7A7167" }}>
                        {product.category_name || ""}
                    </p>
                    <h2 className="mb-3" style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 400, lineHeight: 1.15, color: "#141210" }}>
                        {product.name}
                    </h2>
                    <div className="flex items-center gap-[10px] text-[18px] font-medium mb-5">
                        {isOnSale ? (
                            <>
                                <span style={{ color: "#E8485A" }}>GH₵{product.price_ghs.toFixed(2)}</span>
                                <span className="text-sm font-normal line-through" style={{ color: "#7A7167" }}>
                                    GH₵{product.compare_at_price_ghs!.toFixed(2)}
                                </span>
                            </>
                        ) : (
                            <span>GH₵{product.price_ghs.toFixed(2)}</span>
                        )}
                    </div>

                    {colors.length > 0 && (
                        <div className="mb-[18px]">
                            <p className="text-[10px] font-medium tracking-[0.12em] uppercase mb-2" style={{ color: "#7A7167" }}>
                                Colour — <span style={{ color: "#141210" }}>{selectedColor}</span>
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {colors.map(c => {
                                    const inStock = colorsWithAnyStock !== null ? colorsWithAnyStock.has(c) : true;
                                    const isSelected = selectedColor === c;
                                    return (
                                        <button key={c}
                                            onClick={() => { if (inStock) setSelectedColor(c); }}
                                            disabled={!inStock}
                                            title={inStock ? c : `${c} — out of stock`}
                                            className="relative w-7 h-7 rounded-full transition-all overflow-hidden"
                                            style={{
                                                background: getHex(c),
                                                border: "2px solid transparent",
                                                boxShadow: isSelected ? "0 0 0 2px #fff, 0 0 0 3.5px #141210" : "none",
                                                opacity: inStock ? 1 : 0.35,
                                                cursor: inStock ? "pointer" : "not-allowed",
                                            }}
                                        >
                                            {!inStock && (
                                                <span className="absolute inset-0 pointer-events-none">
                                                    <svg viewBox="0 0 28 28" width="28" height="28" style={{ position: "absolute", inset: 0 }}>
                                                        <line x1="4" y1="24" x2="24" y2="4" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
                                                        <line x1="4" y1="24" x2="24" y2="4" stroke="rgba(0,0,0,0.3)" strokeWidth="1" strokeLinecap="round" />
                                                    </svg>
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {sizesForSelectedColor.length > 0 && (
                        <div className="mb-[22px]">
                            <p className="text-[10px] font-medium tracking-[0.12em] uppercase mb-2" style={{ color: "#7A7167" }}>Size</p>
                            <div className="flex flex-wrap gap-[7px]">
                                {sizesForSelectedColor.map(s => {
                                    const inStock = sizesInStockForColor.has(s);
                                    const isActive = selectedSize === s;
                                    return (
                                        <button key={s}
                                            onClick={() => { if (inStock) setSelectedSize(s); }}
                                            disabled={!inStock}
                                            title={inStock ? s : `${s} — out of stock`}
                                            className="relative px-[14px] py-[7px] text-[12px] transition-all overflow-hidden"
                                            style={{
                                                borderRadius: 2,
                                                border: `1px solid ${isActive ? "#141210" : inStock ? "rgba(20,18,16,0.15)" : "rgba(20,18,16,0.08)"}`,
                                                background: isActive ? "#141210" : "transparent",
                                                color: isActive ? "#fff" : inStock ? "#141210" : "rgba(20,18,16,0.3)",
                                                cursor: inStock ? "pointer" : "not-allowed",
                                            }}
                                        >
                                            {s}
                                            {!inStock && (
                                                <span className="absolute inset-0 pointer-events-none overflow-hidden">
                                                    <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
                                                        <line x1="0" y1="100%" x2="100%" y2="0" stroke="rgba(20,18,16,0.2)" strokeWidth="1" />
                                                    </svg>
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <Link href="/size-guide" className="block mt-2 text-[11px] underline" style={{ color: "#7A7167" }}>
                                Size guide →
                            </Link>
                        </div>
                    )}

                    <button
                        onClick={handleAdd}
                        disabled={adding || isOutOfStock || (sizes.length > 0 && !selectedSize)}
                        className="w-full py-[13px] flex items-center justify-center gap-2 text-[12px] font-medium tracking-[0.1em] uppercase mb-[10px] transition-colors"
                        style={{
                            borderRadius: 2, border: "none",
                            background: added ? "#16a34a" : (isOutOfStock || (sizes.length > 0 && !selectedSize)) ? "#D1D5DB" : "#141210",
                            color: isOutOfStock ? "#9CA3AF" : "#fff",
                            cursor: (isOutOfStock || (sizes.length > 0 && !selectedSize)) ? "not-allowed" : "pointer",
                        }}
                    >
                        <ShoppingBag size={14} strokeWidth={1.5} />
                        {added ? "Added to Cart ✓" : adding ? "Adding…" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
                    </button>
                    <Link href={`/products/${product.slug}`} onClick={onClose}
                        className="block text-center text-[11px] underline transition-colors"
                        style={{ color: "#7A7167" }}
                    >
                        View full details →
                    </Link>
                </div>
            </div>
        </div>
    );
}
