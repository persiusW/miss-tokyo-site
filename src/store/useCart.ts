import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
    id: string; // productId + "-" + size + "-" + color
    productId: string;
    name: string;
    slug: string;
    price: number;
    size: string;
    color?: string;
    stitching?: string;
    quantity: number;
    imageUrl: string;
};

type CartState = {
    items: CartItem[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    addItem: (item: CartItem) => void;
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
            addItem: (item) => {
                set((state) => {
                    const existingItem = state.items.find(i => i.id === item.id);
                    if (existingItem) {
                        return {
                            items: state.items.map(i =>
                                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
                            ),
                            isOpen: true
                        };
                    }
                    return { items: [...state.items, item], isOpen: true }; // Open cart on add
                });
            },
            removeItem: (id) => set((state) => ({
                items: state.items.filter(i => i.id !== id)
            })),
            updateQuantity: (id, quantity) => set((state) => ({
                items: state.items.map(i =>
                    i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
                )
            })),
            clearCart: () => set({ items: [] }),
            totalAmount: () => {
                return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
            },
            totalItems: () => {
                return get().items.reduce((total, item) => total + item.quantity, 0);
            }
        }),
        {
            name: 'miss-tokyo-cart-storage'
        }
    )
);
