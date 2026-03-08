"use client";

import { useState, useEffect } from "react";
import { AnimatedProductGrid } from "@/components/ui/badu/AnimatedProductGrid";
import { QuickViewModal } from "@/components/ui/badu/QuickViewModal";

interface Product {
    slug: string;
    name: string;
    price: string;
    imageUrl: string;
    hoverImageUrl?: string;
    category?: string;
}

export function HomepageGrid({ products, gridCols = 4 }: { products: Product[], gridCols?: 2 | 3 | 4 }) {
    const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

    useEffect(() => {
        document.body.style.overflow = quickViewSlug ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [quickViewSlug]);

    return (
        <>
            <AnimatedProductGrid products={products} onQuickAdd={setQuickViewSlug} gridCols={gridCols} />
            {quickViewSlug && (
                <QuickViewModal slug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />
            )}
        </>
    );
}
