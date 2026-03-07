"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function AnimatedProductView({ children }: { children: ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full flex flex-col md:flex-row gap-16"
        >
            {children}
        </motion.div>
    );
}
