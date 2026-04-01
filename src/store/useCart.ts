import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { resolveWholesalePrice, WholesaleTiers } from '@/lib/wholesale';
import { toast } from '@/lib/toast';

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
    inventoryCount?: number; // max purchasable quantity (undefined = unlimited)
    // Wholesale fields — only present for wholesale users
    isWholesale?: boolean;
    wholesaleTiers?: WholesaleTiers;
};

/** Computes the effective per-unit price for a cart item (wholesale-aware). */
export function getEffectivePrice(item: CartItem): number {
    if (item.isWholesale && item.wholesaleTiers) {
        return resolveWholesalePrice(
            item.quantity,
            item.price,
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
                // Block if inventory is tracked (inventoryCount defined) and stock is zero
                if (item.inventoryCount !== undefined && item.inventoryCount <= 0) {
                    toast.error(`${item.name} is out of stock`);
                    return;
                }
                set((state) => {
                    const existingItem = state.items.find(i => i.id === item.id);
                    if (existingItem) {
                        const max = existingItem.inventoryCount ?? Infinity;
                        const newQty = Math.min(existingItem.quantity + item.quantity, max);
                        return {
                            items: state.items.map(i =>
                                i.id === item.id ? { ...i, quantity: newQty } : i
                            ),
                            isOpen: openDrawer ? true : state.isOpen,
                        };
                    }
                    const max = item.inventoryCount ?? Infinity;
                    const clampedItem = { ...item, quantity: Math.min(item.quantity, max) };
                    return { items: [...state.items, clampedItem], isOpen: openDrawer ? true : state.isOpen };
                });
            },
            removeItem: (id) => set((state) => ({
                items: state.items.filter(i => i.id !== id),
            })),
            updateQuantity: (id, quantity) => set((state) => ({
                items: state.items.map(i => {
                    if (i.id !== id) return i;
                    const max = i.inventoryCount ?? Infinity;
                    return { ...i, quantity: Math.min(Math.max(1, quantity), max) };
                }),
            })),
            clearCart: () => set({ items: [] }),
            totalAmount: () => {
                const raw = get().items.reduce((total, item) => {
                    return total + getEffectivePrice(item) * item.quantity;
                }, 0);
                return parseFloat(raw.toFixed(2));
            },
            totalItems: () => {
                return get().items.reduce((total, item) => total + item.quantity, 0);
            },
        }),
        { name: 'miss-tokyo-cart-storage' }
    )
);
