"use client";

import { motion } from "framer-motion";
import { ProductCard } from "@/components/ui/badu/ProductCard";

interface Product {
    slug: string;
    name: string;
    price: string;
    imageUrl: string;
    category?: string;
}

export function AnimatedProductGrid({ products }: { products: Product[] }) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    return (
        <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
        >
            {products.map((product) => (
                <motion.div key={product.slug} variants={item}>
                    <ProductCard
                        slug={product.slug}
                        name={product.name}
                        price={product.price}
                        imageUrl={product.imageUrl}
                        category={product.category}
                    />
                </motion.div>
            ))}
        </motion.div>
    );
}
