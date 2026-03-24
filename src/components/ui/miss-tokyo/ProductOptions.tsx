"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/useCart";
import { toast } from "@/lib/toast";
import { resolveWholesalePrice, WholesaleTiers } from "@/lib/wholesale";

export interface ColorVariant { name: string; hex: string; in_stock: boolean; }
export interface SizeVariant { label: string; in_stock: boolean; }
export interface ProductVariant {
    size: string | null;
    color: string | null;
    stitching: string | null;
    inventory_count: number;
}

interface Props {
    productId: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    bundleLabel: string | null;
    colorVariants: ColorVariant[] | null;
    sizeVariants: SizeVariant[] | null;
    availableColors: string[] | null;
    availableSizes: string[] | null;
    inventoryCount: number;
    ratingAverage: number;
    reviewCount: number;
    imageUrl: string;
    isSale: boolean;
    discountValue: number;
    showTrustStrip?: boolean;
    isWholesaler?: boolean;
    wholesaleTiers?: WholesaleTiers;
    // Variant inventory
    trackVariantInventory?: boolean;
    productVariants?: ProductVariant[];
}

const COLOR_HEX: Record<string, string> = {
    Black: "#141210", White: "#FAFAFA", Red: "#E8485A", Pink: "#F5A7B3",
    Blue: "#3B82F6", Navy: "#1E3A5F", Green: "#10B981", Turquoise: "#14B8A6",
    Purple: "#8B5CF6", Yellow: "#FBBF24", Orange: "#F97316", Beige: "#E8D5C4",
    Brown: "#8B5E3C", Grey: "#9CA3AF", Maroon: "#7F1D1D", Gold: "#C9A96E",
};

const SIZE_TABLE = [
    { label: "XS-6",  uk: "6–8",   bust: "80–84",   waist: "62–66", hips: "88–92"   },
    { label: "S-8",   uk: "8–10",  bust: "84–88",   waist: "66–70", hips: "92–96"   },
    { label: "Free (8–14)", uk: "8–14", bust: "84–96", waist: "66–78", hips: "92–104" },
    { label: "M-10",  uk: "10–12", bust: "88–92",   waist: "70–74", hips: "96–100"  },
    { label: "L-12",  uk: "12–14", bust: "92–96",   waist: "74–78", hips: "100–104" },
    { label: "XL-14", uk: "14–16", bust: "96–100",  waist: "78–82", hips: "104–108" },
    { label: "XXL-16", uk: "18–20", bust: "104–108", waist: "86–90", hips: "112–116" },
];

// Canonical brand size labels: XS-6, S-8, M-10, L-12, XL-14, XXL-16
const SIZE_CANONICAL: Record<string, string> = {
    XS: "XS-6", S: "S-8", M: "M-10", L: "L-12", XL: "XL-14", XXL: "XXL-16",
};

/**
 * Normalizes any stored size format to the canonical brand label.
 * Handles: plain ("M"), em-dash ("M — 10"), hyphen ("M-10") → "M-10"
 * Unknown formats (e.g. "Free (8-14)") are returned as-is.
 */
function displaySizeLabel(raw: string): string {
    // Already canonical hyphen format
    if (/^(XXL|XL|XS|[SML])-\d+$/.test(raw)) return raw;
    // Em-dash format: "S — 8", "XL — 14"
    const emDash = raw.match(/^(XXL|XL|XS|[SML])\s*[—–]\s*\d+$/);
    if (emDash) return SIZE_CANONICAL[emDash[1]] ?? raw;
    // Plain format: "M", "XL"
    return SIZE_CANONICAL[raw] ?? raw;
}

function Stars({ rating }: { rating: number }) {
    return (
        <div style={{ display: "flex", gap: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ fontSize: 13, color: i <= Math.round(rating) ? "var(--gold, #C9A96E)" : "rgba(201,169,110,0.25)" }}>★</span>
            ))}
        </div>
    );
}

export function ProductOptions(props: Props) {
    const {
        productId, name, slug, price, compareAtPrice, bundleLabel,
        colorVariants, sizeVariants, availableColors, availableSizes,
        inventoryCount, ratingAverage, reviewCount, imageUrl, isSale, discountValue,
        showTrustStrip = true,
        isWholesaler = false,
        wholesaleTiers,
        trackVariantInventory = false,
        productVariants,
    } = props;

    const router = useRouter();
    const addItem = useCart(s => s.addItem);

    // Hydrate wholesale role client-side.
    // The layout no longer calls auth.getUser() server-side (restores ISR).
    // /api/me is private/no-store — one small fetch after mount, only affects
    // the ~1% of users with a wholesale account.
    const [isWholesalerState, setIsWholesalerState] = useState(isWholesaler);
    useEffect(() => {
        fetch("/api/me")
            .then(r => r.json())
            .then(({ role }: { role?: string | null }) => {
                const wholesale = !!(role && ["wholesale", "wholesaler"].includes(role.toLowerCase()));
                setIsWholesalerState(wholesale);
            })
            .catch(() => { /* silent — default false is correct for retail users */ });
    }, []);

    const colors: ColorVariant[] = colorVariants && colorVariants.length > 0
        ? colorVariants
        : (availableColors || []).map(n => ({ name: n, hex: COLOR_HEX[n] || "#E8D5C4", in_stock: true }));

    // available_sizes is the admin-managed source of truth.
    // Deduplicate by normalized display label so mixed-format DB arrays (e.g. both
    // "M — 10" and "M" in available_sizes) don't produce duplicate buttons.
    const sizes: SizeVariant[] = (() => {
        const raw = availableSizes && availableSizes.length > 0
            ? availableSizes.map(l => ({ label: l, in_stock: true }))
            : (sizeVariants || []);
        const seen = new Set<string>();
        return raw.filter(s => {
            const key = displaySizeLabel(s.label);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    })();

    const [selectedColor, setSelectedColor] = useState<string>(colors[0]?.name ?? "");
    const [selectedSize, setSelectedSize] = useState<string>(sizes.find(s => s.in_stock)?.label ?? "");
    const [qty, setQty] = useState(1);

    // ── Variant-aware availability ─────────────────────────────────────────────

    /**
     * Set of sizes that have at least one in-stock color variant.
     * null → variant inventory not tracked, fall back to sizeVariant.in_stock.
     */
    const sizesWithStock = useMemo<Set<string> | null>(() => {
        if (!trackVariantInventory || !productVariants?.length) return null;
        const result = new Set<string>();
        for (const v of productVariants) {
            if ((v.inventory_count ?? 0) > 0 && v.size != null) result.add(v.size);
        }
        return result;
    }, [trackVariantInventory, productVariants]);

    /**
     * Set of colors that have stock for the currently selected size.
     * When no size is chosen, checks across ALL sizes.
     * null → variant inventory not tracked, fall back to colorVariant.in_stock.
     */
    const colorsWithStock = useMemo<Set<string> | null>(() => {
        if (!trackVariantInventory || !productVariants?.length) return null;
        const result = new Set<string>();
        for (const v of productVariants) {
            const sizeMatch = selectedSize ? (v.size ?? "") === selectedSize : true;
            if (sizeMatch && (v.inventory_count ?? 0) > 0 && v.color != null) result.add(v.color);
        }
        return result;
    }, [trackVariantInventory, productVariants, selectedSize]);

    // When the selected size changes and the current color is no longer available
    // for that size, auto-advance to the first in-stock color.
    useEffect(() => {
        if (!colorsWithStock) return;
        if (selectedColor && !colorsWithStock.has(selectedColor)) {
            const first = colors.find(c => colorsWithStock.has(c.name));
            setSelectedColor(first?.name ?? "");
        }
        // Only run when the size changes — colorsWithStock is derived from selectedSize
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSize]);

    /** Effective stock for the currently selected size + color combo */
    const effectiveInventory = useMemo(() => {
        if (!trackVariantInventory || !productVariants?.length) return inventoryCount;
        const match = productVariants.find(v =>
            (v.size ?? "") === selectedSize &&
            (v.color ?? "") === selectedColor
        );
        return match?.inventory_count ?? 0;
    }, [trackVariantInventory, productVariants, selectedSize, selectedColor, inventoryCount]);

    // Out of stock when effectiveInventory is 0.
    // effectiveInventory already handles both cases:
    //   - variant tracking ON  → per-variant count for selected size+colour
    //   - variant tracking OFF → product-level inventoryCount
    // 9999 is the sentinel for "unlimited stock" and is never === 0.
    const isOutOfStock = effectiveInventory === 0;
    const [wishlisted, setWishlisted] = useState(false);
    const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
    const [addedToBag, setAddedToBag] = useState(false);
    const addedToBagTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const setCartOpen = useCart(s => s.setIsOpen);

    useEffect(() => {
        try {
            const wl: string[] = JSON.parse(localStorage.getItem("mt_wishlist") || "[]");
            setWishlisted(wl.includes(productId));
        } catch { /* noop */ }
    }, [productId]);

    useEffect(() => {
        return () => { if (addedToBagTimer.current) clearTimeout(addedToBagTimer.current); };
    }, []);

    const toggleWishlist = () => {
        try {
            const wl: string[] = JSON.parse(localStorage.getItem("mt_wishlist") || "[]");
            const next = wishlisted ? wl.filter(id => id !== productId) : [...wl, productId];
            localStorage.setItem("mt_wishlist", JSON.stringify(next));
            setWishlisted(!wishlisted);
            toast.success(wishlisted ? "Removed from wishlist" : "♥ Saved to wishlist");
        } catch { /* noop */ }
    };

    const copyLink = () => {
        navigator.clipboard?.writeText(window.location.href).catch(() => { });
        toast.success("Link copied to clipboard");
    };

    const baseProductPrice = isSale && discountValue > 0 ? price * (1 - discountValue / 100) : price;

    const unitPrice = (isWholesalerState && wholesaleTiers)
        ? resolveWholesalePrice(qty, baseProductPrice, wholesaleTiers)
        : baseProductPrice;

    const doAddToCart = (): boolean => {
        if (sizes.length > 0 && !selectedSize) {
            toast.error("Please select a size");
            return false;
        }
        if (isOutOfStock) {
            toast.error("This item is out of stock");
            return false;
        }
        addItem({
            id: `${productId}-${selectedSize}-${selectedColor}`,
            productId,
            name,
            slug,
            price: baseProductPrice, // store base price
            size: selectedSize || "One size",
            color: selectedColor || undefined,
            quantity: qty,
            imageUrl,
            inventoryCount: effectiveInventory,
            isWholesale: isWholesalerState,
            wholesaleTiers,
        });
        return true;
    };

    const handleAddToBag = () => {
        if (addedToBag) return;
        if (doAddToCart()) {
            setAddedToBag(true);
            setCartOpen(true);
            if (addedToBagTimer.current) clearTimeout(addedToBagTimer.current);
            addedToBagTimer.current = setTimeout(() => setAddedToBag(false), 2000);
        }
    };

    const handleBuyNow = () => {
        if (doAddToCart()) router.push("/checkout");
    };

    return (
        <>
            {/* Rating row */}
            {reviewCount > 0 && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    marginBottom: 20, paddingBottom: 20,
                    borderBottom: "1px solid rgba(20,18,16,0.1)",
                }}>
                    <Stars rating={ratingAverage} />
                    <button
                        onClick={() => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })}
                        style={{ fontSize: 12, color: "var(--muted, #7A7167)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
                    >
                        {ratingAverage.toFixed(1)} · {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                    </button>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#059669", fontWeight: 500, marginLeft: "auto" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
                        In stock
                    </span>
                </div>
            )}

            {/* Price row */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <span style={{
                    fontFamily: "var(--font-display, Georgia, serif)",
                    fontSize: 36, fontWeight: 400,
                    color: isSale ? "var(--accent, #E8485A)" : "var(--ink, #141210)",
                }}>
                    GH₵{unitPrice.toFixed(2)}
                </span>
                {compareAtPrice && compareAtPrice > unitPrice && (
                    <span style={{ fontSize: 18, color: "var(--muted, #7A7167)", textDecoration: "line-through", fontWeight: 300 }}>
                        GH₵{compareAtPrice.toFixed(2)}
                    </span>
                )}
                {isWholesalerState && (
                    <span style={{ fontSize: 10, color: "#059669", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: "auto" }}>
                        Wholesale Rate
                    </span>
                )}
            </div>

            {/* Volume Pricing Grid for Wholesalers */}
            {isWholesalerState && wholesaleTiers && (
                <div style={{
                    background: "rgba(5, 150, 105, 0.04)",
                    border: "1px solid rgba(5, 150, 105, 0.15)",
                    padding: "16px",
                    borderRadius: 4,
                    marginBottom: 24
                }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#059669", marginBottom: 12 }}>
                        Volume Pricing
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                        {[1, 2, 3].map(t => {
                            const tiers = wholesaleTiers as any;
                            const min: number = tiers[`tier${t}_min`];
                            const max: number = tiers[`tier${t}_max`];
                            const disc: number = tiers[`tier${t}_discount`];
                            const explicitPrice: number | null | undefined = tiers[`tier${t}_price`];
                            const isActive = qty >= min && (t === 3 || qty <= max);

                            return (
                                <div key={t} style={{
                                    padding: "10px 8px",
                                    background: isActive ? "#059669" : "transparent",
                                    border: isActive ? "1px solid #059669" : "1px solid rgba(5, 150, 105, 0.2)",
                                    textAlign: "center",
                                    borderRadius: 2,
                                    transition: "all 0.2s"
                                }}>
                                    <div style={{ fontSize: 9, fontWeight: 600, color: isActive ? "rgba(255,255,255,0.75)" : "rgba(5,150,105,0.7)", marginBottom: 3 }}>
                                        {min}{t === 3 ? "+" : `–${max}`} units
                                    </div>
                                    {explicitPrice != null ? (
                                        <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#fff" : "#059669" }}>
                                            GH₵{explicitPrice.toFixed(2)}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? "#fff" : "#059669" }}>
                                            {disc}% OFF
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bundle tag */}
            {bundleLabel && (
                <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#E8D5A3", color: "var(--ink, #141210)",
                    fontSize: 11, fontWeight: 500, padding: "5px 12px",
                    borderRadius: 2, marginBottom: 20,
                }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    {bundleLabel}
                </div>
            )}

            {/* Colour selector */}
            {colors.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted, #7A7167)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        Colour{" "}
                        <span style={{ fontWeight: 400, color: "var(--ink, #141210)", letterSpacing: 0, textTransform: "none", fontSize: 12 }}>
                            {selectedColor}
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {colors.map(c => {
                            // If variant inventory is tracked, use per-combo availability;
                            // otherwise fall back to the static colorVariant.in_stock flag.
                            const inStock = colorsWithStock !== null
                                ? colorsWithStock.has(c.name)
                                : c.in_stock;
                            const isSelected = selectedColor === c.name;
                            return (
                                <button
                                    key={c.name}
                                    title={inStock ? c.name : `${c.name} — out of stock`}
                                    onClick={() => { if (inStock) setSelectedColor(c.name); }}
                                    disabled={!inStock}
                                    style={{
                                        position: "relative",
                                        width: 32, height: 32, borderRadius: "50%",
                                        background: c.hex,
                                        border: "2px solid transparent",
                                        cursor: inStock ? "pointer" : "not-allowed",
                                        transition: "box-shadow 0.15s, opacity 0.15s",
                                        boxShadow: isSelected
                                            ? "0 0 0 2px #fff, 0 0 0 3.5px var(--ink, #141210)"
                                            : "none",
                                        opacity: inStock ? 1 : 0.3,
                                        outline: "none",
                                        overflow: "hidden",
                                    }}
                                >
                                    {/* Diagonal strike-through line for OOS colours */}
                                    {!inStock && (
                                        <span style={{
                                            position: "absolute", inset: 0,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            pointerEvents: "none",
                                        }}>
                                            <svg viewBox="0 0 32 32" width="32" height="32" style={{ position: "absolute", inset: 0 }}>
                                                <line x1="4" y1="28" x2="28" y2="4" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
                                                <line x1="4" y1="28" x2="28" y2="4" stroke="rgba(0,0,0,0.35)" strokeWidth="1" strokeLinecap="round" />
                                            </svg>
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Size selector */}
            {sizes.length === 0 && (
                <div style={{ marginBottom: 22, fontSize: 12, color: "var(--muted, #7A7167)" }}>
                    Contact us for sizing —{" "}
                    <a href="mailto:studio@misstokyo.shop" style={{ color: "var(--ink, #141210)", textDecoration: "underline" }}>
                        studio@misstokyo.shop
                    </a>
                </div>
            )}
            {sizes.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted, #7A7167)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        Size{" "}
                        <span style={{ fontWeight: 400, color: "var(--ink, #141210)", letterSpacing: 0, textTransform: "none", fontSize: 12 }}>
                            {selectedSize ? displaySizeLabel(selectedSize) : "Select a size"}
                        </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {sizes.map(s => {
                            // If variant inventory is tracked, derive availability from
                            // variant data; otherwise fall back to sizeVariant.in_stock.
                            const inStock = sizesWithStock !== null
                                ? sizesWithStock.has(s.label)
                                : s.in_stock;
                            const isActive = selectedSize === s.label;
                            return (
                                <button
                                    key={s.label}
                                    onClick={() => { if (inStock) setSelectedSize(s.label); }}
                                    disabled={!inStock}
                                    title={inStock ? s.label : `${s.label} — out of stock`}
                                    style={{
                                        position: "relative",
                                        padding: "9px 16px",
                                        border: `1px solid ${isActive
                                                ? "var(--ink, #141210)"
                                                : inStock
                                                    ? "rgba(20,18,16,0.15)"
                                                    : "rgba(20,18,16,0.08)"
                                            }`,
                                        borderRadius: 2, fontSize: 12, fontWeight: 400,
                                        color: isActive ? "#fff" : inStock ? "var(--muted, #7A7167)" : "rgba(20,18,16,0.3)",
                                        background: isActive ? "var(--ink, #141210)" : "transparent",
                                        cursor: inStock ? "pointer" : "not-allowed",
                                        transition: "all 0.15s",
                                        overflow: "hidden",
                                    }}
                                >
                                    {displaySizeLabel(s.label)}
                                    {/* Diagonal line overlay for OOS sizes */}
                                    {!inStock && (
                                        <span style={{
                                            position: "absolute", inset: 0,
                                            pointerEvents: "none",
                                            overflow: "hidden",
                                        }}>
                                            <svg
                                                width="100%" height="100%"
                                                preserveAspectRatio="none"
                                                style={{ position: "absolute", inset: 0 }}
                                            >
                                                <line x1="0" y1="100%" x2="100%" y2="0"
                                                    stroke="rgba(20,18,16,0.2)" strokeWidth="1" />
                                            </svg>
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => setSizeGuideOpen(true)}
                        style={{
                            fontSize: 11, color: "var(--muted, #7A7167)",
                            borderBottom: "1px solid rgba(20,18,16,0.15)",
                            cursor: "pointer", marginTop: 10,
                            transition: "color 0.15s", paddingBottom: 1,
                            background: "none", border: "none",
                            borderBottomWidth: 1, borderBottomStyle: "solid",
                            borderBottomColor: "rgba(20,18,16,0.15)",
                            display: "inline-block",
                        }}
                    >
                        Size guide →
                    </button>
                </div>
            )}

            {/* Quantity */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted, #7A7167)" }}>Qty</div>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(20,18,16,0.15)", borderRadius: 2, overflow: "hidden" }}>
                    <button
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        style={{ width: 36, height: 40, border: "none", background: "transparent", fontSize: 18, color: "var(--ink, #141210)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={qty}
                        readOnly
                        style={{ width: 44, height: 40, border: "none", textAlign: "center", fontSize: 14, fontWeight: 500, color: "var(--ink, #141210)", background: "transparent", outline: "none" }}
                    />
                    <button
                        onClick={() => setQty(q => effectiveInventory >= 9999 ? q + 1 : Math.min(effectiveInventory || 99, q + 1))}
                        style={{ width: 36, height: 40, border: "none", background: "transparent", fontSize: 18, color: "var(--ink, #141210)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        +
                    </button>
                </div>
                {effectiveInventory > 0 && effectiveInventory < 9999 && (
                    <span style={{ fontSize: 11, color: "var(--muted, #7A7167)" }}>{effectiveInventory} left in stock</span>
                )}
                {isOutOfStock && (
                    <span style={{ fontSize: 11, color: "#E8485A", fontWeight: 500 }}>Out of stock</span>
                )}
            </div>

            {/* CTA stack */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                <button
                    onClick={handleAddToBag}
                    disabled={addedToBag || isOutOfStock}
                    style={{
                        width: "100%", padding: "15px 24px",
                        background: addedToBag ? "#059669" : isOutOfStock ? "#D1D5DB" : "var(--ink, #141210)",
                        color: "#fff",
                        border: "none", borderRadius: 2,
                        fontSize: 12, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
                        cursor: addedToBag || isOutOfStock ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "background 0.25s",
                    }}
                >
                    {addedToBag ? (
                        <>
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Added to Bag ✓
                        </>
                    ) : isOutOfStock ? (
                        "Out of Stock"
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            Add to Cart
                        </>
                    )}
                </button>
                <button
                    onClick={handleBuyNow}
                    disabled={isOutOfStock}
                    style={{
                        width: "100%", padding: "15px 24px",
                        background: isOutOfStock ? "#D1D5DB" : "var(--gold, #C9A96E)",
                        color: isOutOfStock ? "#9CA3AF" : "var(--ink, #141210)",
                        border: "none", borderRadius: 2,
                        fontSize: 12, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
                        cursor: isOutOfStock ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "background 0.18s",
                    }}
                >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Buy Now
                </button>
            </div>

            {/* Actions: Wishlist + Share */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28 }}>
                <button
                    onClick={toggleWishlist}
                    style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 14px",
                        border: `1px solid ${wishlisted ? "var(--accent, #E8485A)" : "rgba(20,18,16,0.15)"}`,
                        borderRadius: 2, background: "transparent",
                        fontSize: 12, color: wishlisted ? "var(--accent, #E8485A)" : "var(--muted, #7A7167)",
                        cursor: "pointer", transition: "all 0.15s",
                    }}
                >
                    <svg viewBox="0 0 24 24" width="14" height="14"
                        fill={wishlisted ? "var(--accent, #E8485A)" : "none"}
                        stroke={wishlisted ? "var(--accent, #E8485A)" : "currentColor"}
                        strokeWidth="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {wishlisted ? "Saved to Wishlist" : "Save to Wishlist"}
                </button>
                <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                    <button
                        title="Share on Facebook"
                        onClick={() => toast.info("Sharing on Facebook…")}
                        style={{ width: 34, height: 34, border: "1px solid rgba(20,18,16,0.15)", borderRadius: 2, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted, #7A7167)" }}
                    >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                        </svg>
                    </button>
                    <button
                        title="Copy link"
                        onClick={copyLink}
                        style={{ width: 34, height: 34, border: "1px solid rgba(20,18,16,0.15)", borderRadius: 2, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted, #7A7167)" }}
                    >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Trust strip */}
            {showTrustStrip && <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", border: "1px solid rgba(20,18,16,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: 28 }}>
                {[
                    {
                        label: "Free Delivery", sub: "Orders GH₵1000+",
                        icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--gold, #C9A96E)" strokeWidth="1.3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
                    },
                    {
                        label: "Easy Returns", sub: "72-hour policy",
                        icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--gold, #C9A96E)" strokeWidth="1.3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
                    },
                    {
                        label: "Secure Payment", sub: "MoMo & card",
                        icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--gold, #C9A96E)" strokeWidth="1.3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
                    },
                ].map((t, i, arr) => (
                    <div key={i} style={{
                        padding: "14px 12px", display: "flex", flexDirection: "column",
                        alignItems: "center", textAlign: "center", gap: 6,
                        borderRight: i < arr.length - 1 ? "1px solid rgba(20,18,16,0.1)" : "none",
                        background: "#fff",
                    }}>
                        {t.icon}
                        <div style={{ fontSize: 10, fontWeight: 500, color: "var(--ink, #141210)", letterSpacing: "0.04em" }}>{t.label}</div>
                        <div style={{ fontSize: 9, color: "var(--muted, #7A7167)", letterSpacing: "0.02em" }}>{t.sub}</div>
                    </div>
                ))}
            </div>}

            {/* Size Guide Modal */}
            {sizeGuideOpen && createPortal(
                <div
                    onClick={e => { if (e.target === e.currentTarget) setSizeGuideOpen(false); }}
                    style={{
                        position: "fixed", inset: 0, background: "rgba(20,18,16,0.55)",
                        zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 20, backdropFilter: "blur(3px)",
                    }}
                >
                    <div style={{ background: "#fff", borderRadius: 6, width: "100%", maxWidth: 600, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(20,18,16,0.1)", flexShrink: 0 }}>
                            <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 22, fontWeight: 400 }}>Size Guide</span>
                            <button onClick={() => setSizeGuideOpen(false)} style={{ width: 32, height: 32, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%" }}>
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ink, #141210)" strokeWidth="1.8">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        {["Label", "UK Size", "Bust (cm)", "Waist (cm)", "Hips (cm)"].map(h => (
                                            <th key={h} style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted, #7A7167)", padding: "10px 14px", borderBottom: "2px solid rgba(20,18,16,0.1)", textAlign: "left" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {SIZE_TABLE.map((row, i) => (
                                        <tr key={i} style={{ background: i % 2 === 1 ? "var(--sand, #F7F2EC)" : "transparent" }}>
                                            <td style={{ padding: "11px 14px", borderBottom: "1px solid rgba(20,18,16,0.08)", fontWeight: 500 }}>{row.label}</td>
                                            <td style={{ padding: "11px 14px", borderBottom: "1px solid rgba(20,18,16,0.08)", color: "var(--muted, #7A7167)" }}>{row.uk}</td>
                                            <td style={{ padding: "11px 14px", borderBottom: "1px solid rgba(20,18,16,0.08)", color: "var(--muted, #7A7167)" }}>{row.bust}</td>
                                            <td style={{ padding: "11px 14px", borderBottom: "1px solid rgba(20,18,16,0.08)", color: "var(--muted, #7A7167)" }}>{row.waist}</td>
                                            <td style={{ padding: "11px 14px", borderBottom: "1px solid rgba(20,18,16,0.08)", color: "var(--muted, #7A7167)" }}>{row.hips}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p style={{ fontSize: 12, color: "var(--muted, #7A7167)", marginTop: 16, lineHeight: 1.6 }}>
                                Between sizes? We recommend sizing up for a more relaxed fit. Still unsure? Email us at orders@misstokyo.shop.
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
