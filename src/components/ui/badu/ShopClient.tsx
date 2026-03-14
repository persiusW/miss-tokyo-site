"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AnimatedProductGrid } from "@/components/ui/badu/AnimatedProductGrid";
import { QuickViewModal } from "@/components/ui/badu/QuickViewModal";
import { ChevronDown, ChevronRight, X, Filter } from "lucide-react";

interface Category {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
}

interface Product {
    slug: string;
    name: string;
    price: string;
    priceNum: number;
    imageUrl: string;
    hoverImageUrl?: string;
    category: string;
    colors: string[];
    sizes: string[];
    createdAt: string;
}

interface ShopClientProps {
    products: Product[];
    categories: Category[];
    gridCols?: 2 | 3 | 4;
}

const ITEMS_PER_PAGE = 8;

export function ShopClient({ products, categories, gridCols = 4 }: ShopClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Filter states from URL
    const activeCategory = searchParams.get("category") || null;
    const activeSort = searchParams.get("sort") || "newest";
    const activePage = parseInt(searchParams.get("page") || "1");
    const activeColor = searchParams.get("color") || null;
    const activeSize = searchParams.get("size") || null;

    // Helper to update URL
    const updateParams = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null) params.delete(key);
            else params.set(key, value);
        });
        // Reset to page 1 on filter change
        if (!newParams.page) params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Derived filters
    const allColors = useMemo(() => Array.from(new Set(products.flatMap(p => p.colors))), [products]);
    const allSizes = useMemo(() => Array.from(new Set(products.flatMap(p => p.sizes))).sort(), [products]);

    const filteredAndSorted = useMemo(() => {
        let result = [...products];

        // Filter
        if (activeCategory) result = result.filter(p => p.category === activeCategory);
        if (activeColor) result = result.filter(p => p.colors.includes(activeColor));
        if (activeSize) result = result.filter(p => p.sizes.includes(activeSize));

        // Sort
        if (activeSort === "newest") result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (activeSort === "price-low") result.sort((a, b) => a.priceNum - b.priceNum);
        if (activeSort === "price-high") result.sort((a, b) => b.priceNum - a.priceNum);
        if (activeSort === "name-asc") result.sort((a, b) => a.name.localeCompare(b.name));

        return result;
    }, [products, activeCategory, activeSort, activeColor, activeSize]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredAndSorted.slice(
        (activePage - 1) * ITEMS_PER_PAGE,
        activePage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        if (quickViewSlug) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [quickViewSlug]);

    return (
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 pt-8">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden flex justify-between items-center mb-6">
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold border border-black px-4 py-2"
                >
                    <Filter size={14} /> Filters
                </button>
                <div className="text-[10px] uppercase tracking-widest text-neutral-400">
                    {filteredAndSorted.length} Items
                </div>
            </div>

            {/* Sidebar (Left) */}
            <aside className={`
                fixed inset-0 z-[60] bg-white transform transition-transform duration-500 lg:relative lg:inset-auto lg:translate-x-0 lg:z-10 lg:w-64 lg:bg-transparent
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <div className="sticky top-24 h-full lg:h-[calc(100vh-8rem)] flex flex-col p-6 lg:p-0">
                    <div className="flex justify-between items-center lg:hidden mb-8">
                        <h2 className="text-xl font-serif tracking-widest uppercase">Filters</h2>
                        <button onClick={() => setSidebarOpen(false)}><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto hide-scrollbar space-y-10">
                        {/* Categories */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4">Category</h3>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => updateParams({ category: null })}
                                    className={`text-[11px] uppercase tracking-widest text-left transition-colors ${!activeCategory ? "text-black font-bold" : "text-neutral-400 hover:text-black"}`}
                                >
                                    All Collections
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => updateParams({ category: cat.slug })}
                                        className={`text-[11px] uppercase tracking-widest text-left transition-colors ${activeCategory === cat.slug ? "text-black font-bold underline underline-offset-4" : "text-neutral-400 hover:text-black"}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Colors */}
                        {allColors.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4">Color</h3>
                                <div className="flex flex-wrap gap-2">
                                    {allColors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => updateParams({ color: activeColor === color ? null : color })}
                                            className={`px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-all ${activeColor === color ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black"}`}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sizes */}
                        {allSizes.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4">Size</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {allSizes.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => updateParams({ size: activeSize === size ? null : size })}
                                            className={`h-10 text-[10px] flex items-center justify-center border transition-all ${activeSize === size ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black"}`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clear All */}
                    {(activeCategory || activeColor || activeSize) && (
                        <button 
                            onClick={() => updateParams({ category: null, color: null, size: null })}
                            className="mt-8 text-[10px] uppercase tracking-[0.2em] font-bold text-red-500 hover:text-red-700 text-left"
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content (Right) */}
            <main className="flex-1">
                {/* Top Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-baseline mb-12 gap-4">
                    <div className="hidden lg:block text-[11px] uppercase tracking-widest text-neutral-400">
                         {filteredAndSorted.length} results found
                    </div>
                    
                    <div className="w-full md:w-auto flex items-center justify-end gap-3">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400 mr-2">Sort by</span>
                        <select 
                            value={activeSort}
                            onChange={(e) => updateParams({ sort: e.target.value })}
                            className="bg-transparent text-[11px] uppercase tracking-widest font-bold border-b border-black py-1 pr-8 outline-none focus:ring-0 appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0 center" }}
                        >
                            <option value="newest">Newest First</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name-asc">Alphabetical</option>
                        </select>
                    </div>
                </div>

                {/* Grid */}
                {paginatedProducts.length > 0 ? (
                    <div className="space-y-16">
                        <AnimatedProductGrid products={paginatedProducts} onQuickAdd={setQuickViewSlug} gridCols={3} />
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-1 border-t border-neutral-100 pt-12">
                                <button
                                    disabled={activePage === 1}
                                    onClick={() => updateParams({ page: (activePage - 1).toString() })}
                                    className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold border border-neutral-200 disabled:opacity-30 hover:border-black transition-colors"
                                >
                                    Prev
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => updateParams({ page: page.toString() })}
                                        className={`w-10 h-10 text-[10px] font-bold border transition-colors ${activePage === page ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black"}`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    disabled={activePage === totalPages}
                                    onClick={() => updateParams({ page: (activePage + 1).toString() })}
                                    className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold border border-neutral-200 disabled:opacity-30 hover:border-black transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-32">
                        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400 mb-6 font-medium">
                            The archive holds no matches for your selection.
                        </p>
                        <button 
                            onClick={() => updateParams({ category: null, color: null, size: null })}
                            className="text-[10px] uppercase tracking-widest font-bold border-b border-black pb-1 hover:text-neutral-500 transition-colors"
                        >
                            Reset Collections
                        </button>
                    </div>
                )}
            </main>

            {quickViewSlug && (
                <QuickViewModal
                    slug={quickViewSlug}
                    onClose={() => setQuickViewSlug(null)}
                />
            )}
        </div>
    );
}
