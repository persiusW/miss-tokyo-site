import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { resolveWholesalePrice, WholesalePrices, WholesaleTiers } from '@/lib/wholesale';

export type CartItem = {
    id: string; // productId + "-" + size + "-" + color
    productId: string;
    name: string;
    slug: string;
    price: number; // always the retail price (source of truth)
    size: string;
    color?: string;
    stitching?: string;
    quantity: number;
    imageUrl: string;
    // Wholesale fields — only present for wholesale users
    isWholesale?: boolean;
    wholesalePrices?: WholesalePrices;
    wholesaleTiers?: WholesaleTiers;
};

/** Computes the effective per-unit price for a cart item (wholesale-aware). */
export function getEffectivePrice(item: CartItem): number {
    if (item.isWholesale && item.wholesalePrices && item.wholesaleTiers) {
        return resolveWholesalePrice(
            item.quantity,
            item.price,
            item.wholesalePrices,
            item.wholesaleTiers
        );
    }
    return item.price;
}

type CartState = {
    items: CartItem[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    addItem: (item: CartItem, openDrawer?: boolean) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    totalAmount: () => number;
    totalItems: () => number;
};

export const useCart = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            setIsOpen: (isOpen) => set({ isOpen }),
            addItem: (item, openDrawer = true) => {
                set((state) => {
                    const existingItem = state.items.find(i => i.id === item.id);
                    if (existingItem) {
                        return {
                            items: state.items.map(i =>
                                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
                            ),
                            isOpen: openDrawer ? true : state.isOpen,
                        };
                    }
                    return { items: [...state.items, item], isOpen: openDrawer ? true : state.isOpen };
                });
            },
            removeItem: (id) => set((state) => ({
                items: state.items.filter(i => i.id !== id),
            })),
            updateQuantity: (id, quantity) => set((state) => ({
                items: state.items.map(i =>
                    i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
                ),
            })),
            clearCart: () => set({ items: [] }),
            totalAmount: () => {
                return get().items.reduce((total, item) => {
                    return total + getEffectivePrice(item) * item.quantity;
                }, 0);
            },
            totalItems: () => {
                return get().items.reduce((total, item) => total + item.quantity, 0);
            },
        }),
        { name: 'miss-tokyo-cart-storage' }
    )
);
