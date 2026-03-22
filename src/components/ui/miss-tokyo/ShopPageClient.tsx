"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Heart, X, ChevronDown, SlidersHorizontal, Check } from "lucide-react";
import { useCart } from "@/store/useCart";
import type { ShopProduct, ShopCategory } from "@/lib/products";

// ── Constants ─────────────────────────────────────────────────────────────────
const COLOR_HEX: Record<string, string> = {
    Black:"#0f0f0f", White:"#f5f5f5", Red:"#e8485a", Pink:"#f4a0b5",
    Purple:"#8b5cf6", Blue:"#3b82f6", Green:"#22c55e", Orange:"#f97316",
    Yellow:"#eab308", Brown:"#92400e", Beige:"#d4b896", Grey:"#6b7280",
    Gray:"#6b7280", Navy:"#1e3a5f", Khaki:"#c3b091", Teal:"#0d9488",
    Nude:"#d4a574", Camel:"#c19a6b", Cream:"#f5f0e8", Ivory:"#f8f4e8",
    Maroon:"#800000", Wine:"#722f37", Gold:"#c9a84c", Silver:"#c0c0c0",
    Lilac:"#c8a2c8", Peach:"#ffcba4", Sage:"#bcceab", Mint:"#98d8c8",
    Chocolate:"#3d1c02", Mustard:"#e1ad01",
};

const getHex = (c: string) => COLOR_HEX[c] ?? COLOR_HEX[c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()] ?? "#ccc";

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='133'%3E%3Crect width='100' height='133' fill='%23E8D5C4'/%3E%3C/svg%3E";
const PAGE_SIZE = 24;

function getBadge(p: ShopProduct): { label: string; type: "new" | "sale" | "bundle" } | null {
    if (p.badge === "bundle" || p.bundle_label) return { label: p.bundle_label || "Bundle", type: "bundle" };
    if (p.badge === "sale" || p.is_sale || (p.compare_at_price_ghs && p.compare_at_price_ghs > p.price_ghs))
        return { label: "Sale", type: "sale" };
    if (p.badge === "new" || (Date.now() - new Date(p.created_at).getTime() < 14 * 86400000))
        return { label: "New", type: "new" };
    return null;
}

// ── ShopProductCard ───────────────────────────────────────────────────────────
function ShopProductCard({
    product, onQuickAdd, priority = false,
}: {
    product: ShopProduct; onQuickAdd: (p: ShopProduct) => void; priority?: boolean;
}) {
    const [wishlist, setWishlist] = useState(false);
    const [imgSrc, setImgSrc] = useState(product.image_urls?.[0] || FALLBACK_IMG);
    const [hoverSrc, setHoverSrc] = useState<string | undefined>(product.image_urls?.[1] || undefined);
    const [addState, setAddState] = useState<"idle" | "added">("idle");
    const { addItem } = useCart();
    const badge = getBadge(product);
    // Mirror the "You May Also Like" logic from the PDP:
    // Prefer compare_at_price_ghs; fall back to is_sale + discount_value percentage.
    const hasSaleFromCompare = !!(product.compare_at_price_ghs && product.compare_at_price_ghs > product.price_ghs);
    const hasSaleFromDiscount = !!(product.is_sale && (product.discount_value ?? 0) > 0);
    const isOnSale = hasSaleFromCompare || hasSaleFromDiscount;
    const displayPrice = hasSaleFromDiscount && !hasSaleFromCompare
        ? product.price_ghs * (1 - (product.discount_value ?? 0) / 100)
        : product.price_ghs;
    const origPrice = hasSaleFromCompare
        ? product.compare_at_price_ghs!
        : hasSaleFromDiscount
            ? product.price_ghs
            : null;
    const colors = product.available_colors ?? [];

    useEffect(() => {
        try {
            const wl = JSON.parse(localStorage.getItem("mt_wishlist") || "[]") as string[];
            setWishlist(wl.includes(product.id));
        } catch {}
    }, [product.id]);

    const toggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const wl = JSON.parse(localStorage.getItem("mt_wishlist") || "[]") as string[];
            const next = wl.includes(product.id) ? wl.filter(id => id !== product.id) : [...wl, product.id];
            localStorage.setItem("mt_wishlist", JSON.stringify(next));
            setWishlist(!wishlist);
        } catch {}
    };

    return (
        <div className="group relative">
            {/* Image */}
            <Link href={`/products/${product.slug}`} className="block">
                <div className="relative overflow-hidden mb-[11px]" style={{ aspectRatio: "3/4", borderRadius: 4, background: "#E8D5C4" }}>
                    <Image
                        src={imgSrc}
                        alt={product.name}
                        fill
                        priority={priority}
                        sizes="(max-width: 768px) 50vw, (max-width: 1100px) 33vw, 25vw"
                        className={`object-cover transition-all duration-700 ease-in-out ${hoverSrc ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"}`}
                        onError={() => setImgSrc(FALLBACK_IMG)}
                    />
                    {hoverSrc && (
                        <Image
                            src={hoverSrc}
                            alt={`${product.name} alternate view`}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1100px) 33vw, 25vw"
                            className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out"
                            onError={() => setHoverSrc(undefined)}
                        />
                    )}

                    {/* Badge */}
                    {badge && (
                        <span
                            className="absolute top-[10px] left-[10px] z-10 text-[9px] font-medium tracking-[0.1em] uppercase px-2 py-[3px]"
                            style={{
                                borderRadius: 2,
                                background: badge.type === "sale" ? "#E8485A" : badge.type === "bundle" ? "#C9A96E" : "#141210",
                                color: badge.type === "bundle" ? "#141210" : "#fff",
                            }}
                        >
                            {badge.label}
                        </span>
                    )}

                    {/* Wishlist */}
                    <button
                        onClick={toggleWishlist}
                        className="absolute top-[10px] right-[10px] z-10 w-[30px] h-[30px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(255,255,255,0.92)", borderRadius: 2, border: "none" }}
                        aria-label="Add to wishlist"
                    >
                        <Heart size={15} fill={wishlist ? "#E8485A" : "none"} stroke={wishlist ? "#E8485A" : "#141210"} strokeWidth={1.5} />
                    </button>

                    {/* Quick Add — always visible on mobile, hover-only on desktop */}
                    <div className="absolute bottom-[10px] left-[10px] right-[10px] flex gap-[6px] z-10 md:opacity-0 md:translate-y-[6px] md:group-hover:opacity-100 md:group-hover:translate-y-0 md:transition-all md:duration-200">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const hasVariants = (product.available_sizes?.length ?? 0) > 0 || (product.available_colors?.length ?? 0) > 0;
                                if (hasVariants) { onQuickAdd(product); return; }
                                addItem({
                                    id: `${product.id}-default`,
                                    productId: product.id,
                                    name: product.name,
                                    slug: product.slug,
                                    price: product.price_ghs,
                                    size: "One Size",
                                    quantity: 1,
                                    imageUrl: product.image_urls?.[0] || "",
                                }, false);
                                setAddState("added");
                                setTimeout(() => setAddState("idle"), 1500);
                            }}
                            className="flex-1 flex items-center justify-center gap-[5px] text-[11px] font-medium tracking-[0.06em] uppercase py-[9px] transition-colors duration-150"
                            style={{
                                background: addState === "added" ? "#22c55e" : "#fff",
                                color: addState === "added" ? "#fff" : "#141210",
                                borderRadius: 2,
                                border: "none",
                            }}
                            onMouseEnter={e => { if (addState === "idle") { (e.currentTarget as HTMLElement).style.background = "#141210"; (e.currentTarget as HTMLElement).style.color = "#fff"; } }}
                            onMouseLeave={e => { if (addState === "idle") { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#141210"; } }}
                        >
                            {addState === "added"
                                ? <><Check size={12} strokeWidth={2.5} /> Added</>
                                : <><ShoppingBag size={12} strokeWidth={1.8} /> Quick Add</>
                            }
                        </button>
                    </div>
                </div>
            </Link>

            {/* Info */}
            <Link href={`/products/${product.slug}`} className="block">
                <p className="text-[10px] tracking-[0.1em] uppercase mb-1" style={{ color: "#7A7167" }}>
                    {product.category_name || ""}
                </p>
                <p className="text-[13px] mb-[5px]" style={{ color: "#141210" }}>{product.name}</p>
                <div className="flex items-center gap-[6px] flex-wrap text-[13px] font-medium">
                    {isOnSale ? (
                        <>
                            <span className="line-through text-[12px] font-normal" style={{ color: "#7A7167" }}>
                                GH₵{origPrice!.toFixed(2)}
                            </span>
                            <span style={{ color: "#E8485A" }}>GH₵{displayPrice.toFixed(2)}</span>
                        </>
                    ) : (
                        <span style={{ color: "#141210" }}>GH₵{displayPrice.toFixed(2)}</span>
                    )}
                </div>
                {product.bundle_label && (
                    <p className="text-[10px] font-medium tracking-[0.05em] mt-[2px]" style={{ color: "#C9A96E" }}>
                        {product.bundle_label}
                    </p>
                )}
                {colors.length > 0 && (
                    <div className="flex gap-[5px] mt-[7px]">
                        {colors.slice(0, 6).map(c => (
                            <span key={c} className="w-[11px] h-[11px] rounded-full flex-shrink-0"
                                style={{ background: getHex(c), border: "1px solid rgba(20,18,16,0.15)" }}
                                title={c}
                            />
                        ))}
                    </div>
                )}
            </Link>
        </div>
    );
}

// ── Quick Add Modal ───────────────────────────────────────────────────────────
function QuickAddModal({ product, onClose }: { product: ShopProduct; onClose: () => void }) {
    const { addItem } = useCart();
    const [selectedColor, setSelectedColor] = useState(product.available_colors?.[0] || "");
    const [selectedSize, setSelectedSize] = useState("");
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const colors = product.available_colors ?? [];
    const sizes = product.available_sizes ?? [];
    const isOnSale = !!(product.compare_at_price_ghs && product.compare_at_price_ghs > product.price_ghs);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
    }, [onClose]);

    const handleAdd = () => {
        if (sizes.length > 0 && !selectedSize) return;
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
            <div className="bg-white w-full max-w-[780px] max-h-[90vh] flex overflow-hidden" style={{ borderRadius: 6, transform: "scale(1)" }}>
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
                                {colors.map(c => (
                                    <button key={c} onClick={() => setSelectedColor(c)}
                                        className="w-7 h-7 rounded-full transition-all"
                                        style={{
                                            background: getHex(c),
                                            border: "2px solid transparent",
                                            boxShadow: selectedColor === c ? "0 0 0 2px #fff, 0 0 0 3.5px #141210" : "none",
                                        }}
                                        title={c}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {sizes.length > 0 && (
                        <div className="mb-[22px]">
                            <p className="text-[10px] font-medium tracking-[0.12em] uppercase mb-2" style={{ color: "#7A7167" }}>Size</p>
                            <div className="flex flex-wrap gap-[7px]">
                                {sizes.map(s => (
                                    <button key={s} onClick={() => setSelectedSize(s)}
                                        className="px-[14px] py-[7px] text-[12px] transition-all"
                                        style={{
                                            borderRadius: 2,
                                            border: `1px solid ${selectedSize === s ? "#141210" : "rgba(20,18,16,0.15)"}`,
                                            background: selectedSize === s ? "#141210" : "transparent",
                                            color: selectedSize === s ? "#fff" : "#141210",
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <Link href="/size-guide" className="block mt-2 text-[11px] underline" style={{ color: "#7A7167" }}>
                                Size guide →
                            </Link>
                        </div>
                    )}

                    <button
                        onClick={handleAdd}
                        disabled={adding || (sizes.length > 0 && !selectedSize)}
                        className="w-full py-[13px] flex items-center justify-center gap-2 text-[12px] font-medium tracking-[0.1em] uppercase mb-[10px] transition-colors"
                        style={{
                            borderRadius: 2, border: "none",
                            background: added ? "#16a34a" : (sizes.length > 0 && !selectedSize) ? "#999" : "#141210",
                            color: "#fff",
                            cursor: (sizes.length > 0 && !selectedSize) ? "not-allowed" : "pointer",
                        }}
                    >
                        <ShoppingBag size={14} strokeWidth={1.5} />
                        {added ? "Added to Bag ✓" : adding ? "Adding…" : "Add to Bag"}
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

// ── Price Range Slider ────────────────────────────────────────────────────────
function PriceRangeSlider({ min, max, valueMin, valueMax, onChange }: {
    min: number; max: number; valueMin: number; valueMax: number;
    onChange: (min: number, max: number) => void;
}) {
    const range = max - min || 1;
    const leftPct  = ((valueMin - min) / range) * 100;
    const rightPct = ((valueMax - min) / range) * 100;

    return (
        <div className="pt-1 pb-2">
            <div className="relative h-[2px] mx-1 my-4" style={{ background: "rgba(20,18,16,0.15)" }}>
                <div className="absolute h-full" style={{ background: "#141210", left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
                {/* Two overlapping range inputs */}
                <input type="range" min={min} max={max} value={valueMin}
                    onChange={e => onChange(Math.min(Number(e.target.value), valueMax - 1), valueMax)}
                    className="absolute w-full h-full opacity-0 cursor-pointer" style={{ top: 0, left: 0 }}
                />
                <input type="range" min={min} max={max} value={valueMax}
                    onChange={e => onChange(valueMin, Math.max(Number(e.target.value), valueMin + 1))}
                    className="absolute w-full h-full opacity-0 cursor-pointer" style={{ top: 0, left: 0 }}
                />
                <div className="absolute w-4 h-4 rounded-full bg-white border-2 border-[#141210] -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${leftPct}%`, top: "50%" }} />
                <div className="absolute w-4 h-4 rounded-full bg-white border-2 border-[#141210] -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${rightPct}%`, top: "50%" }} />
            </div>
            <div className="flex justify-between text-[12px] mb-[10px]" style={{ color: "#7A7167" }}>
                <span>GH₵{valueMin}</span><span>GH₵{valueMax}</span>
            </div>
            <div className="flex gap-2">
                {[{ label: "Min", val: valueMin, set: (v: number) => onChange(Math.min(v, valueMax - 1), valueMax) },
                  { label: "Max", val: valueMax, set: (v: number) => onChange(valueMin, Math.max(v, valueMin + 1)) }
                ].map(({ label, val, set }) => (
                    <input key={label} type="number" value={val} placeholder={label}
                        onChange={e => set(Number(e.target.value))}
                        className="flex-1 py-[7px] px-[10px] text-[12px] outline-none transition-colors"
                        style={{ border: "1px solid rgba(20,18,16,0.15)", borderRadius: 2, fontFamily: "inherit", color: "#141210", background: "#fff" }}
                    />
                ))}
            </div>
        </div>
    );
}

// ── Collapsible sidebar section ───────────────────────────────────────────────
function SidebarSection({ title, children, hasFilter, onClear, defaultOpen = false }: {
    title: string; children: React.ReactNode; hasFilter?: boolean; onClear?: () => void; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="pb-5 mb-5" style={{ borderBottom: "1px solid rgba(20,18,16,0.1)" }}>
            <div className="flex items-center justify-between mb-[14px] cursor-pointer" onClick={() => setOpen(o => !o)}>
                <span className="text-[10px] font-medium tracking-[0.15em] uppercase" style={{ color: "#7A7167" }}>{title}</span>
                <div className="flex items-center gap-2">
                    {hasFilter && onClear && (
                        <button onClick={e => { e.stopPropagation(); onClear(); }}
                            className="text-[10px] tracking-[0.06em]" style={{ color: "#E8485A", background: "none", border: "none", cursor: "pointer" }}>
                            Clear
                        </button>
                    )}
                    <ChevronDown size={12} stroke="#7A7167" strokeWidth={2} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
                </div>
            </div>
            {open && children}
        </div>
    );
}

// ── Main ShopPageClient ───────────────────────────────────────────────────────
interface ShopPageClientProps {
    initialProducts: ShopProduct[];
    categories: ShopCategory[];
    allColors: string[];
    allSizes: string[];
    total: number;
    minPrice: number;
    maxPrice: number;
    paginationType: "load_more" | "pagination";
    mobileCols?: 1 | 2;
}

export function ShopPageClient({
    initialProducts, categories, allColors, allSizes,
    total, minPrice, maxPrice, paginationType, mobileCols = 2,
}: ShopPageClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const activeCategory = searchParams.get("category");
    const activeSort     = searchParams.get("sort") || "newest";
    const activeColor    = searchParams.get("color");
    const activeSize     = searchParams.get("size");
    const activeMin      = searchParams.get("min");
    const activeMax      = searchParams.get("max");
    const activeQ        = searchParams.get("q");
    const activeSale     = searchParams.get("sale") === "true";

    const [products, setProducts]         = useState(initialProducts);
    const [totalCount, setTotalCount]     = useState(total);
    const [loadPage, setLoadPage]         = useState(1);
    const [loadingMore, setLoadingMore]   = useState(false);
    const [hasMore, setHasMore]           = useState(initialProducts.length < total);
    const [gridCols, setGridCols]         = useState<2 | 3 | 4>(4);
    const [drawerOpen, setDrawerOpen]     = useState(false);
    const [quickAddProduct, setQuickAddProduct] = useState<ShopProduct | null>(null);

    // Price slider local state (debounced → URL)
    const [priceMin, setPriceMin] = useState(activeMin ? parseInt(activeMin) : minPrice);
    const [priceMax, setPriceMax] = useState(activeMax ? parseInt(activeMax) : maxPrice);
    const priceDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Grid pref from localStorage
    useEffect(() => {
        try { const g = localStorage.getItem("mt_grid"); if (g) setGridCols(Number(g) as 2 | 3 | 4); } catch {}
    }, []);

    // Sync products when server re-renders (URL change)
    useEffect(() => {
        setProducts(initialProducts);
        setTotalCount(total);
        setLoadPage(1);
        setHasMore(initialProducts.length < total);
        setPriceMin(activeMin ? parseInt(activeMin) : minPrice);
        setPriceMax(activeMax ? parseInt(activeMax) : maxPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString()]);

    const updateParams = useCallback((updates: Record<string, string | null>) => {
        const p = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([k, v]) => v === null ? p.delete(k) : p.set(k, v));
        p.delete("page");
        router.push(`${pathname}?${p.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    const handlePriceChange = (lo: number, hi: number) => {
        setPriceMin(lo); setPriceMax(hi);
        clearTimeout(priceDebounce.current);
        priceDebounce.current = setTimeout(() => {
            updateParams({ min: lo === minPrice ? null : String(lo), max: hi === maxPrice ? null : String(hi) });
        }, 500);
    };

    const setGrid = (n: 2 | 3 | 4) => {
        setGridCols(n);
        try { localStorage.setItem("mt_grid", String(n)); } catch {}
    };

    const loadMore = async () => {
        setLoadingMore(true);
        const nextPage = loadPage + 1;

        try {
            const qs = new URLSearchParams();
            qs.set("page", String(nextPage));
            if (activeCategory) qs.set("category", activeCategory);
            if (activeSort)     qs.set("sort", activeSort);
            if (activeColor)    qs.set("color", activeColor);
            if (activeSize)     qs.set("size", activeSize);
            if (activeMin)      qs.set("min", activeMin);
            if (activeMax)      qs.set("max", activeMax);
            if (activeQ)        qs.set("q", activeQ);
            if (activeSale)     qs.set("sale", "true");

            const res = await fetch(`/api/products?${qs.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { products: newProds, total: newTotal }: { products: ShopProduct[]; total: number } = await res.json();

            const updatedCount = products.length + newProds.length;
            setProducts(prev => [...prev, ...newProds]);
            setLoadPage(nextPage);
            setTotalCount(newTotal);
            setHasMore(updatedCount < newTotal);
        } catch (err) {
            console.error("[loadMore] failed:", err);
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    };

    // Active filter count
    const activeFilterCount = [activeCategory, activeColor, activeSize,
        (activeMin && activeMin !== String(minPrice)) ? "min" : null,
        (activeMax && activeMax !== String(maxPrice)) ? "max" : null,
    ].filter(Boolean).length;

    // Active filter chips
    const chips = [
        activeCategory && { key: "category", label: categories.find(c => c.slug === activeCategory)?.name || activeCategory },
        activeColor    && { key: "color",    label: activeColor },
        activeSize     && { key: "size",     label: activeSize },
        (activeMin && activeMin !== String(minPrice)) && { key: "min", label: `Min GH₵${activeMin}` },
        (activeMax && activeMax !== String(maxPrice)) && { key: "max", label: `Max GH₵${activeMax}` },
        activeQ        && { key: "q",        label: `"${activeQ}"` },
    ].filter(Boolean) as { key: string; label: string }[];

    const clearAll = () => updateParams({ category: null, color: null, size: null, min: null, max: null, q: null, sort: null });

    const mobileColClass = mobileCols === 1 ? "grid-cols-1" : "grid-cols-2";
    const gridClass = gridCols === 2 ? mobileColClass : gridCols === 3 ? `${mobileColClass} md:grid-cols-3` : `${mobileColClass} md:grid-cols-2 xl:grid-cols-4`;

    // Sidebar content (shared between desktop + drawer)
    const SidebarContent = () => (
        <>
            <SidebarSection title="Price" hasFilter={!!(activeMin || activeMax)} onClear={() => updateParams({ min: null, max: null })}>
                <PriceRangeSlider min={minPrice} max={maxPrice} valueMin={priceMin} valueMax={priceMax} onChange={handlePriceChange} />
            </SidebarSection>

            <SidebarSection title="Category" hasFilter={!!activeCategory} onClear={() => updateParams({ category: null })} defaultOpen>
                <div className="flex flex-col gap-[9px]">
                    {categories.map(cat => (
                        <label key={cat.id} className="flex items-center gap-[9px] cursor-pointer">
                            <input type="checkbox" checked={activeCategory === cat.slug}
                                onChange={() => updateParams({ category: activeCategory === cat.slug ? null : cat.slug })}
                                className="hidden" />
                            <span className="w-[15px] h-[15px] flex items-center justify-center flex-shrink-0 transition-all"
                                style={{ border: `1px solid ${activeCategory === cat.slug ? "#141210" : "rgba(20,18,16,0.15)"}`, borderRadius: 2, background: activeCategory === cat.slug ? "#141210" : "transparent" }}>
                                {activeCategory === cat.slug && (
                                    <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 2l2.5 2.5L7 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                )}
                            </span>
                            <span className="flex items-center justify-between flex-1 text-[12px]" style={{ color: "#141210" }}>
                                {cat.name}
                                <span className="text-[10px]" style={{ color: "#7A7167" }}>{cat.product_count}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </SidebarSection>

            {allColors.length > 0 && (
                <SidebarSection title="Colour" hasFilter={!!activeColor} onClear={() => updateParams({ color: null })}>
                    <div className="flex flex-wrap gap-2">
                        {allColors.map(c => (
                            <button key={c} onClick={() => updateParams({ color: activeColor === c ? null : c })}
                                className="w-6 h-6 rounded-full transition-all hover:scale-110"
                                style={{
                                    background: getHex(c),
                                    border: "2px solid transparent",
                                    boxShadow: activeColor === c ? "0 0 0 2px #fff, 0 0 0 3.5px #141210" : "none",
                                }}
                                title={c}
                            />
                        ))}
                    </div>
                </SidebarSection>
            )}

            {allSizes.length > 0 && (
                <SidebarSection title="Size" hasFilter={!!activeSize} onClear={() => updateParams({ size: null })}>
                    <div className="flex flex-wrap gap-[6px]">
                        {allSizes.map(s => (
                            <button key={s} onClick={() => updateParams({ size: activeSize === s ? null : s })}
                                className="px-[11px] py-[5px] text-[11px] transition-all"
                                style={{
                                    borderRadius: 2,
                                    border: `1px solid ${activeSize === s ? "#141210" : "rgba(20,18,16,0.15)"}`,
                                    background: activeSize === s ? "#141210" : "transparent",
                                    color: activeSize === s ? "#fff" : "#7A7167",
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </SidebarSection>
            )}
        </>
    );

    return (
        <div style={{ background: "#F7F2EC", minHeight: "100vh" }}>
            {/* Page Header */}
            <div className="relative overflow-hidden py-10 px-6" style={{ background: "#141210" }}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <span style={{ fontFamily: "Georgia, serif", fontSize: "clamp(80px,14vw,160px)", fontWeight: 300, color: "rgba(255,255,255,0.03)", letterSpacing: "0.15em", whiteSpace: "nowrap" }}>
                        SHOP
                    </span>
                </div>
                <div className="max-w-[1440px] mx-auto relative">
                    <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(40px,6vw,68px)", fontWeight: 300, color: "#fff", lineHeight: 1, marginBottom: 10 }}>
                        All <em style={{ fontStyle: "italic", color: "#E8D5A3" }}>Products</em>
                    </h1>
                    <p className="text-[12px] tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {totalCount} styles &nbsp;·&nbsp; New drops weekly
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="sticky z-[50]" style={{ top: "var(--nav-h, 80px)", transition: "top 300ms ease-in-out", background: "#F7F2EC", borderBottom: "1px solid rgba(20,18,16,0.1)" }}>
                <div className="max-w-[1440px] mx-auto px-6 h-[52px] flex items-center gap-2">
                    {/* Mobile filter button */}
                    <button onClick={() => setDrawerOpen(true)}
                        className="xl:hidden flex items-center gap-[6px] flex-shrink-0 text-[12px]"
                        style={{ padding: "7px 14px", borderRadius: 2, border: "1px solid rgba(20,18,16,0.15)", background: "transparent", color: "#141210" }}>
                        <SlidersHorizontal size={13} strokeWidth={1.5} />
                        Filter
                        {activeFilterCount > 0 && (
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold" style={{ background: "#E8485A", color: "#fff" }}>
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Category pills */}
                    <div className="flex-1 flex items-center gap-[6px] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                        <button onClick={() => updateParams({ category: null })}
                            className="flex-shrink-0 text-[12px] transition-all"
                            style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(20,18,16,0.15)", background: !activeCategory ? "#141210" : "transparent", color: !activeCategory ? "#fff" : "#7A7167", whiteSpace: "nowrap" }}>
                            All
                        </button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => updateParams({ category: cat.slug })}
                                className="flex-shrink-0 text-[12px] transition-all"
                                style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(20,18,16,0.15)", background: activeCategory === cat.slug ? "#141210" : "transparent", color: activeCategory === cat.slug ? "#fff" : "#7A7167", whiteSpace: "nowrap" }}>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="hidden xl:block w-px h-5 flex-shrink-0" style={{ background: "rgba(20,18,16,0.15)" }} />

                    {/* Sort */}
                    <div className="hidden xl:block relative flex-shrink-0">
                        <select value={activeSort} onChange={e => updateParams({ sort: e.target.value })}
                            className="appearance-none text-[12px] outline-none cursor-pointer pr-7"
                            style={{ padding: "7px 28px 7px 12px", borderRadius: 2, border: "1px solid rgba(20,18,16,0.15)", background: "transparent", fontFamily: "inherit", color: "#141210" }}>
                            <option value="newest">Newest</option>
                            <option value="price-asc">Price: Low → High</option>
                            <option value="price-desc">Price: High → Low</option>
                            <option value="name-asc">Name A–Z</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" stroke="#7A7167" strokeWidth={2} />
                    </div>

                    {/* Grid toggle */}
                    <div className="hidden xl:flex gap-[2px] flex-shrink-0">
                        {([2, 3, 4] as const).map(n => (
                            <button key={n} onClick={() => setGrid(n)}
                                className="w-8 h-8 flex items-center justify-center transition-all"
                                style={{ borderRadius: 2, border: "1px solid rgba(20,18,16,0.15)", background: gridCols === n ? "#141210" : "transparent" }}
                                title={`${n} columns`}>
                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                    {n === 2 && <><rect x="0" y="0" width="6" height="6" rx="1" fill={gridCols===2?"#fff":"#7A7167"}/><rect x="8" y="0" width="6" height="6" rx="1" fill={gridCols===2?"#fff":"#7A7167"}/><rect x="0" y="8" width="6" height="6" rx="1" fill={gridCols===2?"#fff":"#7A7167"}/><rect x="8" y="8" width="6" height="6" rx="1" fill={gridCols===2?"#fff":"#7A7167"}/></>}
                                    {n === 3 && <><rect x="0" y="0" width="3.5" height="6" rx="1" fill={gridCols===3?"#fff":"#7A7167"}/><rect x="5" y="0" width="3.5" height="6" rx="1" fill={gridCols===3?"#fff":"#7A7167"}/><rect x="10" y="0" width="3.5" height="6" rx="1" fill={gridCols===3?"#fff":"#7A7167"}/><rect x="0" y="8" width="3.5" height="6" rx="1" fill={gridCols===3?"#fff":"#7A7167"}/><rect x="5" y="8" width="3.5" height="6" rx="1" fill={gridCols===3?"#fff":"#7A7167"}/><rect x="10" y="8" width="3.5" height="6" rx="1" fill={gridCols===3?"#fff":"#7A7167"}/></>}
                                    {n === 4 && <><rect x="0" y="0" width="2.5" height="6" rx="1" fill={gridCols===4?"#fff":"#7A7167"}/><rect x="3.8" y="0" width="2.5" height="6" rx="1" fill={gridCols===4?"#fff":"#7A7167"}/><rect x="7.5" y="0" width="2.5" height="6" rx="1" fill={gridCols===4?"#fff":"#7A7167"}/><rect x="11.2" y="0" width="2.5" height="6" rx="1" fill={gridCols===4?"#fff":"#7A7167"}/><rect x="0" y="8" width="2.5" height="6" rx="1" fill={gridCols===4?"#fff":"#7A7167"}/><rect x="3.8" y="8" width="2.5" height="6" rx="1" fill={gridCols===4?"#fff":"#7A7167"}/><rect x="7.5" y="8" width="2.5" height="6" rx="1" fill={gridCols===4?"#fff":"#7A7167"}/><rect x="11.2" y="8" width="2.5" height="6" rx="1" fill={gridCols===4?"#fff":"#7A7167"}/></>}
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Shop Layout */}
            <div className="max-w-[1440px] mx-auto px-6 pb-20 flex gap-8 items-start">
                {/* Desktop Sidebar */}
                <aside className="hidden xl:block flex-shrink-0 pt-7" style={{ width: 268, position: "sticky", top: "calc(var(--nav-h, 80px) + 52px)", transition: "top 300ms ease-in-out", maxHeight: "calc(100vh - var(--nav-h, 80px) - 72px)", overflowY: "auto" }}>
                    <SidebarContent />
                </aside>

                {/* Products Area */}
                <main className="flex-1 min-w-0 pt-7">
                    {/* Active filter chips */}
                    {chips.length > 0 && (
                        <div className="flex flex-wrap gap-[6px] mb-4">
                            {chips.map(chip => (
                                <span key={chip.key} className="flex items-center gap-[5px] text-[11px]"
                                    style={{ padding: "4px 10px", borderRadius: 20, background: "#141210", color: "#fff" }}>
                                    {chip.label}
                                    <button onClick={() => updateParams({ [chip.key]: null })} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
                                </span>
                            ))}
                            {chips.length > 1 && (
                                <button onClick={clearAll} className="text-[11px] underline px-[6px] py-1" style={{ color: "#E8485A", background: "none", border: "none", cursor: "pointer" }}>
                                    Clear all
                                </button>
                            )}
                        </div>
                    )}

                    {/* Results count */}
                    <p className="text-[12px] mb-5" style={{ color: "#7A7167" }}>
                        <strong style={{ color: "#141210" }}>{totalCount}</strong> products
                    </p>

                    {/* Grid */}
                    {products.length > 0 ? (
                        <>
                            <div key={searchParams.toString()} className={`grid gap-[20px_16px] ${gridClass} shop-grid-animate`}>
                                {products.map((p, i) => (
                                    <ShopProductCard key={p.id} product={p} onQuickAdd={setQuickAddProduct} priority={i < 4} />
                                ))}
                            </div>

                            {/* Load more / Pagination */}
                            {hasMore && paginationType === "load_more" && (
                                <div className="flex justify-center mt-12 pt-8" style={{ borderTop: "1px solid rgba(20,18,16,0.1)" }}>
                                    <button onClick={loadMore} disabled={loadingMore}
                                        className="text-[12px] font-medium tracking-[0.1em] uppercase transition-all"
                                        style={{ padding: "12px 40px", border: "1px solid rgba(20,18,16,0.15)", borderRadius: 2, background: "transparent", color: "#141210", cursor: loadingMore ? "not-allowed" : "pointer" }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#141210"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#141210"; }}
                                    >
                                        {loadingMore ? "Loading…" : "Load More Products"}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E8D5C4" strokeWidth="1" className="mx-auto mb-4">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                            <h3 className="mb-2" style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 300, color: "#141210" }}>No products found</h3>
                            <p className="text-[13px] mb-5" style={{ color: "#7A7167" }}>Try adjusting your filters</p>
                            <button onClick={clearAll}
                                className="text-[12px] tracking-[0.08em] uppercase"
                                style={{ padding: "10px 24px", background: "#141210", color: "#fff", border: "none", borderRadius: 2, cursor: "pointer" }}>
                                Clear all filters
                            </button>
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile Filter Drawer */}
            {drawerOpen && (
                <>
                    <div className="fixed inset-0 z-[250]" style={{ background: "rgba(20,18,16,0.5)", backdropFilter: "blur(2px)" }}
                        onClick={() => setDrawerOpen(false)} />
                    <div className="fixed inset-0 z-[260] flex flex-col"
                        style={{ background: "#F7F2EC", transition: "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
                        <div className="flex items-center justify-between px-5 py-[18px] flex-shrink-0" style={{ borderBottom: "1px solid rgba(20,18,16,0.1)" }}>
                            <span className="text-[13px] font-medium tracking-[0.08em] uppercase" style={{ color: "#141210" }}>Filters</span>
                            <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center" style={{ border: "none", background: "none", cursor: "pointer" }}>
                                <X size={16} stroke="#141210" strokeWidth={1.5} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {/* Sort (mobile only) */}
                            <div className="pb-4 mb-4" style={{ borderBottom: "1px solid rgba(20,18,16,0.1)" }}>
                                <p className="text-[10px] font-medium tracking-[0.15em] uppercase mb-3" style={{ color: "#7A7167" }}>Sort By</p>
                                {["newest", "price-asc", "price-desc", "name-asc"].map(s => (
                                    <label key={s} className="flex items-center gap-3 mb-2 cursor-pointer">
                                        <input type="radio" name="mob-sort" value={s} checked={activeSort === s}
                                            onChange={() => { updateParams({ sort: s }); setDrawerOpen(false); }} className="accent-[#141210]" />
                                        <span className="text-[12px]" style={{ color: "#141210" }}>
                                            {s === "newest" ? "Newest" : s === "price-asc" ? "Price: Low → High" : s === "price-desc" ? "Price: High → Low" : "Name A–Z"}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <SidebarContent />
                        </div>
                        <div className="flex gap-2 px-5 py-[14px] flex-shrink-0" style={{ borderTop: "1px solid rgba(20,18,16,0.1)" }}>
                            <button onClick={clearAll}
                                className="flex-1 py-[11px] text-[12px] font-medium tracking-[0.06em] uppercase transition-colors"
                                style={{ border: "1px solid rgba(20,18,16,0.15)", borderRadius: 2, background: "none", color: "#7A7167", cursor: "pointer" }}>
                                Reset
                            </button>
                            <button onClick={() => setDrawerOpen(false)}
                                className="flex-[2] py-[11px] text-[12px] font-medium tracking-[0.06em] uppercase"
                                style={{ border: "none", borderRadius: 2, background: "#141210", color: "#fff", cursor: "pointer" }}>
                                Show {totalCount} products
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Quick Add Modal */}
            {quickAddProduct && (
                <QuickAddModal product={quickAddProduct} onClose={() => setQuickAddProduct(null)} />
            )}
        </div>
    );
}
