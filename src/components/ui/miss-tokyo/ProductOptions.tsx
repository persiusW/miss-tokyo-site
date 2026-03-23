"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/useCart";
import { toast } from "@/lib/toast";
import { resolveWholesalePrice, WholesaleTiers } from "@/lib/wholesale";

export interface ColorVariant { name: string; hex: string; in_stock: boolean; }
export interface SizeVariant { label: string; in_stock: boolean; }

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
}

const COLOR_HEX: Record<string, string> = {
    Black: "#141210", White: "#FAFAFA", Red: "#E8485A", Pink: "#F5A7B3",
    Blue: "#3B82F6", Navy: "#1E3A5F", Green: "#10B981", Turquoise: "#14B8A6",
    Purple: "#8B5CF6", Yellow: "#FBBF24", Orange: "#F97316", Beige: "#E8D5C4",
    Brown: "#8B5E3C", Grey: "#9CA3AF", Maroon: "#7F1D1D", Gold: "#C9A96E",
};

const SIZE_TABLE = [
    { label: "XS",        uk: "6–8",   bust: "80–84", waist: "62–66", hips: "88–92"   },
    { label: "S",         uk: "8–10",  bust: "84–88", waist: "66–70", hips: "92–96"   },
    { label: "Free (8–14)",uk:"8–14",  bust: "84–96", waist: "66–78", hips: "92–104"  },
    { label: "M",         uk: "10–12", bust: "88–92", waist: "70–74", hips: "96–100"  },
    { label: "L",         uk: "12–14", bust: "92–96", waist: "74–78", hips: "100–104" },
    { label: "XL",        uk: "14–16", bust: "96–100",waist: "78–82", hips: "104–108" },
    { label: "2XL",       uk: "18–20", bust: "104–108",waist:"86–90", hips: "112–116" },
];

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
    } = props;

    const router = useRouter();
    const addItem = useCart(s => s.addItem);

    const colors: ColorVariant[] = colorVariants && colorVariants.length > 0
        ? colorVariants
        : (availableColors || []).map(n => ({ name: n, hex: COLOR_HEX[n] || "#E8D5C4", in_stock: true }));

    const sizes: SizeVariant[] = sizeVariants && sizeVariants.length > 0
        ? sizeVariants
        : (availableSizes || []).map(l => ({ label: l, in_stock: true }));

    const [selectedColor, setSelectedColor] = useState<string>(colors[0]?.name ?? "");
    const [selectedSize, setSelectedSize] = useState<string>(sizes.find(s => s.in_stock)?.label ?? "");
    const [qty, setQty] = useState(1);
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
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
        toast.success("Link copied to clipboard");
    };

    const baseProductPrice = isSale && discountValue > 0 ? price * (1 - discountValue / 100) : price;

    const unitPrice = (isWholesaler && wholesaleTiers)
        ? resolveWholesalePrice(qty, baseProductPrice, wholesaleTiers)
        : baseProductPrice;

    const doAddToCart = (): boolean => {
        if (sizes.length > 0 && !selectedSize) {
            toast.error("Please select a size");
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
            isWholesale: isWholesaler,
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
                {isWholesaler && (
                    <span style={{ fontSize: 10, color: "#059669", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: "auto" }}>
                        Wholesale Rate
                    </span>
                )}
            </div>

            {/* Volume Pricing Grid for Wholesalers */}
            {isWholesaler && wholesaleTiers && (
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
                        {colors.map(c => (
                            <button
                                key={c.name}
                                title={c.name}
                                onClick={() => { if (c.in_stock) setSelectedColor(c.name); }}
                                style={{
                                    width: 32, height: 32, borderRadius: "50%",
                                    background: c.hex,
                                    border: "2px solid transparent",
                                    cursor: c.in_stock ? "pointer" : "not-allowed",
                                    transition: "box-shadow 0.15s",
                                    boxShadow: selectedColor === c.name
                                        ? "0 0 0 2px #fff, 0 0 0 3.5px var(--ink, #141210)"
                                        : "none",
                                    opacity: c.in_stock ? 1 : 0.35,
                                    outline: "none",
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Size selector */}
            {sizes.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted, #7A7167)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        Size{" "}
                        <span style={{ fontWeight: 400, color: "var(--ink, #141210)", letterSpacing: 0, textTransform: "none", fontSize: 12 }}>
                            {selectedSize || "Select a size"}
                        </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {sizes.map(s => {
                            const isActive = selectedSize === s.label;
                            return (
                                <button
                                    key={s.label}
                                    onClick={() => { if (s.in_stock) setSelectedSize(s.label); }}
                                    disabled={!s.in_stock}
                                    style={{
                                        padding: "9px 16px",
                                        border: `1px solid ${isActive ? "var(--ink, #141210)" : "rgba(20,18,16,0.15)"}`,
                                        borderRadius: 2, fontSize: 12, fontWeight: 400,
                                        color: isActive ? "#fff" : "var(--muted, #7A7167)",
                                        background: isActive ? "var(--ink, #141210)" : "transparent",
                                        cursor: s.in_stock ? "pointer" : "not-allowed",
                                        transition: "all 0.15s",
                                        opacity: s.in_stock ? 1 : 0.35,
                                        textDecoration: s.in_stock ? "none" : "line-through",
                                    }}
                                >
                                    {s.label}
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
                        onClick={() => setQty(q => inventoryCount >= 9999 ? q + 1 : Math.min(inventoryCount || 99, q + 1))}
                        style={{ width: 36, height: 40, border: "none", background: "transparent", fontSize: 18, color: "var(--ink, #141210)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        +
                    </button>
                </div>
                {inventoryCount > 0 && inventoryCount < 9999 && (
                    <span style={{ fontSize: 11, color: "var(--muted, #7A7167)" }}>{inventoryCount} left in stock</span>
                )}
            </div>

            {/* CTA stack */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                <button
                    onClick={handleAddToBag}
                    disabled={addedToBag}
                    style={{
                        width: "100%", padding: "15px 24px",
                        background: addedToBag ? "#059669" : "var(--ink, #141210)",
                        color: "#fff",
                        border: "none", borderRadius: 2,
                        fontSize: 12, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
                        cursor: addedToBag ? "default" : "pointer",
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
                    style={{
                        width: "100%", padding: "15px 24px",
                        background: "var(--gold, #C9A96E)", color: "var(--ink, #141210)",
                        border: "none", borderRadius: 2,
                        fontSize: 12, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
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
                        label: "Free Delivery", sub: "Orders GH₵150+",
                        icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--gold, #C9A96E)" strokeWidth="1.3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
                    },
                    {
                        label: "Easy Returns", sub: "7-day policy",
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
            {sizeGuideOpen && (
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
                </div>
            )}
        </>
    );
}
