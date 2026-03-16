"use client";

import { motion, Variants } from "framer-motion";
import { ProductCard } from "@/components/ui/badu/ProductCard";

interface Product {
    slug: string;
    name: string;
    price: string;
    imageUrl: string;
    hoverImageUrl?: string;
    category?: string;
    ribbon?: string | null;
    isOnSale?: boolean;
    salePrice?: string | null;
}

const GRID_COLS_MAP: Record<2 | 3 | 4 | 5, string> = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
};

const MOBILE_COLS_MAP: Record<1 | 2, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
};

export function AnimatedProductGrid({ products, onQuickAdd, gridCols = 4, mobileCols = 2, imageStretch = false, showDividers = false }: { products: Product[], onQuickAdd?: (slug: string) => void, gridCols?: 2 | 3 | 4 | 5, mobileCols?: 1 | 2, imageStretch?: boolean, showDividers?: boolean }) {
    const container: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const item: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
    };

    return (
        <motion.div
            className={`grid ${MOBILE_COLS_MAP[mobileCols]} md:grid-cols-2 ${GRID_COLS_MAP[gridCols]} ${showDividers ? "gap-0 divide-x divide-neutral-200 border-t border-b border-neutral-200" : "gap-4 md:gap-8"}`}
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
        >
            {products.map((product) => (
                <motion.div key={product.slug} variants={item} className={showDividers ? "pb-5" : ""}>
                    <ProductCard
                        slug={product.slug}
                        name={product.name}
                        price={product.price}
                        imageUrl={product.imageUrl}
                        hoverImageUrl={product.hoverImageUrl}
                        category={product.category}
                        ribbon={product.ribbon}
                        isOnSale={product.isOnSale}
                        salePrice={product.salePrice}
                        imageStretch={imageStretch}
                        onQuickAdd={onQuickAdd ? (e) => { e.preventDefault(); e.stopPropagation(); onQuickAdd(product.slug); } : undefined}
                    />
                </motion.div>
            ))}
        </motion.div>
    );
}
