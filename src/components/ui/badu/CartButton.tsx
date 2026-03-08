"use client";

import { useCart } from "@/store/useCart";
import { useEffect, useState } from "react";

export function CartButton() {
    const { setIsOpen, totalItems } = useCart();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <button
            onClick={() => setIsOpen(true)}
            className="tracking-widest uppercase text-sm hover:text-neutral-500 transition-colors"
        >
            Cart {mounted && totalItems() > 0 && `(${totalItems()})`}
        </button>
    );
}
