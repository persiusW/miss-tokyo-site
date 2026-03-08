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

export function HomepageGrid({ products }: { products: Product[] }) {
    const [quickViewSlug, setQuickViewSlug] = useState<string | null>(null);

    useEffect(() => {
        document.body.style.overflow = quickViewSlug ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [quickViewSlug]);

    return (
        <>
            <AnimatedProductGrid products={products} onQuickAdd={setQuickViewSlug} />
            {quickViewSlug && (
                <QuickViewModal slug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />
            )}
        </>
    );
}
