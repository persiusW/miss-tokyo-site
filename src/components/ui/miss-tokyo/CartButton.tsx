"use client";

import { useCart } from "@/store/useCart";
import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";

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
