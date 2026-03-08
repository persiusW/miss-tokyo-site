"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/store/useCart";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

export default function CheckoutPage() {
    const { items, totalAmount } = useCart();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Store Settings
    const [enablePickup, setEnablePickup] = useState(false);

    // Form State
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        deliveryMethod: "delivery" // 'delivery' or 'pickup'
    });

    useEffect(() => {
        setMounted(true);
        supabase.from("store_settings").select("enable_store_pickup").eq("id", "default").single()
            .then(({ data }) => {
                if (data) setEnablePickup(data.enable_store_pickup);
            });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                email: form.email,
                amount: totalAmount(),
                cartItems: items,
                metadata: {
                    fullName: form.fullName,
                    phone: form.phone,
                    address: form.address,
                    deliveryMethod: form.deliveryMethod,
                }
            };

            const res = await fetch("/api/paystack/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.authorizationUrl) {
                window.location.href = data.authorizationUrl;
            } else {
                toast.error("Failed to initialize checkout.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred during checkout.");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    if (items.length === 0) {
        return (
            <div className="pt-32 pb-32 px-6 flex flex-col justify-center items-center text-center">
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-4">Checkout</h1>
                <p className="text-neutral-500 mb-8 italic">Your cart is currently empty.</p>
                <a href="/shop" className="text-xs uppercase font-semibold tracking-widest border-b border-black pb-1 hover:text-neutral-500 transition-colors">Return to Shop</a>
            </div>
        );
    }

    return (
        <div className="pt-32 pb-32 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
                <header className="mb-12">
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Checkout</h1>
                    <p className="text-neutral-500">Please provide your details to complete the order.</p>
                </header>

                <form onSubmit={handleCheckout} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Full Name</label>
                            <input
                                required type="text" name="fullName" value={form.fullName} onChange={handleChange}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                                placeholder="Abena Mensah"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Email</label>
                            <input
                                required type="email" name="email" value={form.email} onChange={handleChange}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                                placeholder="abena@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Phone Number</label>
                        <input
                            required type="tel" name="phone" value={form.phone} onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                            placeholder="+233 ..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Delivery Method</label>
                        <div className="flex gap-4">
                            <label className="cursor-pointer">
                                <input type="radio" name="deliveryMethod" value="delivery" checked={form.deliveryMethod === 'delivery'} onChange={handleChange} className="sr-only peer" />
                                <span className="block px-6 py-3 text-xs uppercase tracking-widest border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors">
                                    Delivery
                                </span>
                            </label>
                            {enablePickup && (
                                <label className="cursor-pointer">
                                    <input type="radio" name="deliveryMethod" value="pickup" checked={form.deliveryMethod === 'pickup'} onChange={handleChange} className="sr-only peer" />
                                    <span className="block px-6 py-3 text-xs uppercase tracking-widest border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors">
                                        Store Pickup
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>

                    {form.deliveryMethod === 'delivery' && (
                        <div>
                            <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Shipping Address</label>
                            <input
                                required type="text" name="address" value={form.address} onChange={handleChange}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                                placeholder="123 Osu, Accra, Ghana"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8 disabled:opacity-50 mt-12 block text-center"
                    >
                        {loading ? "Processing..." : `Pay GHS ${totalAmount()}`}
                    </button>
                </form>
            </div>

            {/* Order Summary */}
            <div className="bg-neutral-50 p-8 md:p-12 border border-neutral-100 h-fit">
                <h2 className="font-serif text-xl tracking-widest uppercase mb-8">Order Summary</h2>
                <div className="space-y-6">
                    {items.map(item => (
                        <div key={item.id} className="flex gap-4 items-center">
                            <div className="w-16 h-16 bg-white overflow-hidden flex-shrink-0 border border-neutral-200">
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-sm text-neutral-900">{item.name}</h3>
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Size: {item.size} • Qty: {item.quantity}</p>
                            </div>
                            <p className="font-medium text-sm">GHS {item.price * item.quantity}</p>
                        </div>
                    ))}
                </div>
                <div className="border-t border-neutral-200 mt-8 pt-8 flex justify-between items-center">
                    <span className="font-serif tracking-widest uppercase">Total</span>
                    <span className="font-medium text-lg">GHS {totalAmount()}</span>
                </div>
            </div>
        </div>
    );
}
