"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AnimatedProductGrid } from "@/components/ui/badu/AnimatedProductGrid";
import { QuickViewModal } from "@/components/ui/badu/QuickViewModal";
import { ChevronDown, ChevronRight, X, Filter, Plus, Minus } from "lucide-react";

interface FilterSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = false }: FilterSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-neutral-100 last:border-0 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-5 group"
            >
                <span className="text-[11px] font-serif tracking-[0.3em] uppercase transition-colors group-hover:text-neutral-500">
                    {title}
                </span>
                {isOpen ? <Minus size={14} className="text-neutral-300" /> : <Plus size={14} className="text-neutral-300" />}
            </button>
            <div className={`transition-all duration-500 ease-in-out ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                {children}
            </div>
        </div>
    );
}

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
    ribbon?: string | null;
    isOnSale?: boolean;
    salePrice?: string | null;
}

interface ShopClientProps {
    products: Product[];
    categories: Category[];
    gridCols?: 2 | 3 | 4;
    mobileCols?: 1 | 2;
    itemsPerPage?: number;
    imageStretch?: boolean;
    defaultCategory?: string | null;
    defaultColor?: string | null;
    defaultSize?: string | null;
    defaultSort?: string;
}

export function ShopClient({
    products,
    categories,
    gridCols = 4,
    mobileCols = 2,
    itemsPerPage = 12,
    imageStretch = false,
    defaultCategory = null,
    defaultColor = null,
    defaultSize = null,
    defaultSort: initialSort = "newest"
}: ShopClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Filter states from URL with prop fallbacks
    const activeCategory = searchParams.get("category") || defaultCategory;
    const activeSort = searchParams.get("sort") || initialSort;
    const activePage = parseInt(searchParams.get("page") || "1");
    const activeColor = searchParams.get("color") || defaultColor;
    const activeSize = searchParams.get("size") || defaultSize;

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
    const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
    const paginatedProducts = filteredAndSorted.slice(
        (activePage - 1) * itemsPerPage,
        activePage * itemsPerPage
    );

    useEffect(() => {
        if (quickViewSlug) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [quickViewSlug]);

    return (
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 pt-2">
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

                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        <h2 className="text-sm font-serif tracking-[0.3em] uppercase mb-8 pb-4 border-b border-neutral-100 hidden lg:block">Filter By</h2>
                        
                        <div className="space-y-0 border-t border-neutral-100 lg:border-t-0">
                            {/* Categories */}
                            <FilterSection title="Category" defaultOpen={true}>
                                <div className="flex flex-col gap-3 py-4">
                                    <button
                                        onClick={() => updateParams({ category: null })}
                                        className={`text-[10px] uppercase tracking-[0.2em] text-left transition-all ${!activeCategory ? "text-black font-black translate-x-1" : "text-neutral-400 hover:text-black"}`}
                                    >
                                        All Collections
                                    </button>
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => updateParams({ category: cat.slug })}
                                            className={`text-[10px] uppercase tracking-[0.2em] text-left transition-all ${activeCategory === cat.slug ? "text-black font-black translate-x-1" : "text-neutral-400 hover:text-black"}`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </FilterSection>

                            {/* Price (Placeholder/Structure) */}
                            <FilterSection title="Price">
                                <div className="py-6">
                                    <div className="flex flex-col gap-3">
                                        {["Under 100 GHS", "100 - 500 GHS", "500 - 1000 GHS", "Over 1000 GHS"].map(range => (
                                            <button key={range} className="text-[10px] uppercase tracking-[0.2em] text-left text-neutral-400 hover:text-black transition-colors">
                                                {range}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </FilterSection>

                            {/* Colors */}
                            {allColors.length > 0 && (
                                <FilterSection title="Color">
                                    <div className="flex flex-col gap-3 py-6">
                                        {allColors.map(color => {
                                            const isActive = activeColor === color;
                                            // Handle basic color mapping for swatches
                                            const swatchColor = color.toLowerCase();
                                            
                                            return (
                                                <button
                                                    key={color}
                                                    onClick={() => updateParams({ color: isActive ? null : color })}
                                                    className="flex items-center gap-3 group text-left"
                                                >
                                                    <span 
                                                        className={`w-4 h-4 rounded-full border transition-all ${isActive ? "border-black scale-110" : "border-neutral-200 group-hover:border-black"}`}
                                                        style={{ backgroundColor: swatchColor }}
                                                    />
                                                    <span className={`text-[10px] uppercase tracking-[0.2em] transition-colors ${isActive ? "text-black font-black" : "text-neutral-400 group-hover:text-black"}`}>
                                                        {color}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </FilterSection>
                            )}

                            {/* Sizes */}
                            {allSizes.length > 0 && (
                                <FilterSection title="Size">
                                    <div className="grid grid-cols-4 gap-1 py-6">
                                        {allSizes.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => updateParams({ size: activeSize === size ? null : size })}
                                                className={`h-11 text-[10px] flex items-center justify-center border transition-all font-bold ${activeSize === size ? "bg-black text-white border-black" : "bg-white text-neutral-400 border-neutral-100 hover:border-black"}`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </FilterSection>
                            )}

                            {/* Choices (Placeholder/Structure) */}
                            <FilterSection title="Choices">
                                <div className="py-6">
                                    <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-300 italic">No specific choices available</p>
                                </div>
                            </FilterSection>
                        </div>
                    </div>

                    {/* Clear All */}
                    {(activeCategory || activeColor || activeSize) && (
                        <button 
                            onClick={() => updateParams({ category: null, color: null, size: null })}
                            className="mt-8 text-[9px] uppercase tracking-[0.3em] font-black text-red-500 hover:text-red-700 text-left border-b border-red-500/20 pb-1"
                        >
                            Clear Archive Filters
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
                    
                    <div className="w-full md:w-auto flex items-center justify-end">
                        <select 
                            value={activeSort}
                            onChange={(e) => updateParams({ sort: e.target.value })}
                            className="bg-transparent text-[10px] uppercase tracking-[0.2em] font-bold border border-neutral-200 px-6 py-4 pr-12 outline-none focus:ring-0 appearance-none cursor-pointer flex items-center justify-between min-w-[180px]"
                            style={{ 
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, 
                                backgroundRepeat: "no-repeat", 
                                backgroundPosition: "right 1.5rem center" 
                            }}
                        >
                            <option value="newest">Sort By: Newest</option>
                            <option value="price-low">Sort By: Price Low-High</option>
                            <option value="price-high">Sort By: Price High-Low</option>
                            <option value="name-asc">Sort By: A-Z</option>
                        </select>
                    </div>
                </div>

                {/* Grid */}
                {paginatedProducts.length > 0 ? (
                    <div className="space-y-16">
                        <AnimatedProductGrid products={paginatedProducts} onQuickAdd={setQuickViewSlug} gridCols={gridCols} mobileCols={mobileCols} imageStretch={imageStretch} />
                        
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
