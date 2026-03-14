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

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setMounted(true);
        
        // 1. Fetch Store Settings
        supabase.from("store_settings").select("enable_store_pickup").eq("id", "default").single()
            .then(({ data }) => {
                if (data) setEnablePickup(data.enable_store_pickup);
            });

        // 2. Role-Based Auto-Fill
        const autoFill = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role, full_name, email, phone, address")
                    .eq("id", user.id)
                    .single();
                
                // Only auto-fill if they are a 'customer' (staff should not auto-fill their own details for orders)
                if (profile && profile.role === "customer") {
                    setForm(prev => ({
                        ...prev,
                        fullName: profile.full_name || prev.fullName,
                        email: profile.email || prev.email,
                        phone: profile.phone || prev.phone,
                        address: profile.address || prev.address
                    }));
                }
            }
        };
        autoFill();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
        // Clear error on change
        if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.fullName.trim()) newErrors.fullName = "Full name is required.";
        if (!form.email.trim()) {
            newErrors.email = "Email address is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = "Please enter a valid email address.";
        }
        if (!form.phone.trim()) {
            newErrors.phone = "Phone number is required.";
        } else if (form.phone.trim().length < 7) {
            newErrors.phone = "Please enter a valid phone number.";
        }
        if (form.deliveryMethod === "delivery" && !form.address.trim()) {
            newErrors.address = "Shipping address is required for delivery.";
        }
        return newErrors;
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
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
                toast.error(data.error || "Failed to initialize checkout. Please try again.");
            }
        } catch (err) {
            console.error(err);
            toast.error("A network error occurred. Please check your connection and try again.");
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
                    <p className="text-neutral-500 text-sm">Please provide your details to complete the order.</p>
                </header>

                <form onSubmit={handleCheckout} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">Full Name</label>
                            <input
                                type="text" name="fullName" value={form.fullName} onChange={handleChange}
                                className={`w-full border-b bg-transparent py-2 text-xs outline-none transition-colors rounded-none ${errors.fullName ? "border-red-400" : "border-neutral-200 focus:border-black"}`}
                                placeholder="Abena Mensah"
                            />
                            {errors.fullName && <p className="mt-1 text-[11px] text-red-500">{errors.fullName}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">Email</label>
                            <input
                                type="email" name="email" value={form.email} onChange={handleChange}
                                className={`w-full border-b bg-transparent py-2 text-xs outline-none transition-colors rounded-none ${errors.email ? "border-red-400" : "border-neutral-200 focus:border-black"}`}
                                placeholder="abena@example.com"
                            />
                            {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">Phone Number</label>
                        <input
                            type="tel" name="phone" value={form.phone} onChange={handleChange}
                            className={`w-full border-b bg-transparent py-2 text-xs outline-none transition-colors rounded-none ${errors.phone ? "border-red-400" : "border-neutral-200 focus:border-black"}`}
                            placeholder="+233 ..."
                        />
                        {errors.phone && <p className="mt-1 text-[11px] text-red-500">{errors.phone}</p>}
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">Delivery Method</label>
                        <div className="flex gap-4">
                            <label className="cursor-pointer">
                                <input type="radio" name="deliveryMethod" value="delivery" checked={form.deliveryMethod === 'delivery'} onChange={handleChange} className="sr-only peer" />
                                <span className="block px-6 py-3 text-[10px] uppercase tracking-widest border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors">
                                    Delivery
                                </span>
                            </label>
                            {enablePickup && (
                                <label className="cursor-pointer">
                                    <input type="radio" name="deliveryMethod" value="pickup" checked={form.deliveryMethod === 'pickup'} onChange={handleChange} className="sr-only peer" />
                                    <span className="block px-6 py-3 text-[10px] uppercase tracking-widest border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors">
                                        Store Pickup
                                    </span>
                                </label>
                            )}
                        </div>
                    </div>

                    {form.deliveryMethod === 'delivery' && (
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-3">Shipping Address</label>
                            <input
                                type="text" name="address" value={form.address} onChange={handleChange}
                                className={`w-full border-b bg-transparent py-2 text-xs outline-none transition-colors rounded-none ${errors.address ? "border-red-400" : "border-neutral-200 focus:border-black"}`}
                                placeholder="123 Osu, Accra, Ghana"
                            />
                            {errors.address && <p className="mt-1 text-[11px] text-red-500">{errors.address}</p>}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8 disabled:opacity-50 mt-12 block text-center"
                    >
                        {loading ? "Processing Transaction..." : `Authorize GHS ${totalAmount()}`}
                    </button>
                </form>
            </div>

            {/* Order Summary */}
            <div className="bg-neutral-50 p-8 md:p-12 border border-neutral-100 h-fit">
                <h2 className="font-serif text-xl tracking-widest uppercase mb-8">Purchase Summary</h2>
                <div className="space-y-6">
                    {items.map(item => (
                        <div key={item.id} className="flex gap-4 items-center">
                            <div className="w-16 h-16 bg-white overflow-hidden flex-shrink-0 border border-neutral-200">
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-sm text-neutral-900 font-serif">{item.name}</h3>
                                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-sans">Size: {item.size} • Qty: {item.quantity}</p>
                            </div>
                            <p className="font-medium text-sm font-sans">GHS {item.price * item.quantity}</p>
                        </div>
                    ))}
                </div>
                <div className="border-t border-neutral-200 mt-8 pt-8 flex justify-between items-center">
                    <span className="font-serif tracking-widest uppercase text-xs">Gross Total</span>
                    <span className="font-medium text-lg font-sans">GHS {totalAmount()}</span>
                </div>
            </div>
        </div>
    );
}
