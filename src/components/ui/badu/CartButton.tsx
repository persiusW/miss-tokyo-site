"use client";

import { useCart } from "@/store/useCart";
import { useEffect, useState } from "react";

export function CartButton() {
    const { setIsOpen, items } = useCart();
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <button
            onClick={() => setIsOpen(true)}
            className="text-[10px] md:text-xs tracking-[0.3em] uppercase hover:text-neutral-400 transition-colors rounded-none outline-none"
        >
            Bag {mounted && totalItems > 0 && `[${totalItems}]`}
        </button>
    );
}
