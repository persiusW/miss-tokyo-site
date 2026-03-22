"use client";

import { useMemo, useEffect, useState } from "react";
import { useCart } from "@/store/useCart";
import { ShoppingBag } from "lucide-react";

export function CartButton() {
    const setIsOpen = useCart(s => s.setIsOpen);
    const items = useCart(s => s.items);
    // PERF-18: derive count from items selector — avoids re-render on unrelated store changes
    const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center justify-center hover:text-neutral-400 transition-colors rounded-none outline-none"
            aria-label={`View shopping bag, ${totalItems} items`}
        >
            <ShoppingBag size={20} className="stroke-[1.5px]" />
            {mounted && totalItems > 0 && (
                <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[14px] h-[14px] bg-white text-black text-[8px] font-bold px-1 rounded-none border border-black shadow-sm">
                    {totalItems}
                </span>
            )}
        </button>
    );
}
