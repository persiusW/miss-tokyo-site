"use client";

import { useState } from "react";

interface ProductCheckoutFormProps {
    productId: string;
    price: string;
    colors: string[];
    stitching: string[];
    sizes: string[];
}

export function ProductCheckoutForm({ productId, price, colors, stitching, sizes }: ProductCheckoutFormProps) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");

    const handleCheckout = async () => {
        if (!email) {
            alert("Please enter your email to proceed to checkout.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/paystack/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, email }),
            });
            const data = await res.json();
            if (data.authorizationUrl) {
                window.location.href = data.authorizationUrl;
            } else {
                alert("Failed to initialize checkout.");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred during checkout.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 mb-12">
            {/* Email Input */}
            <div>
                <label htmlFor="checkout-email" className="block text-xs uppercase tracking-widest font-semibold mb-3">Email</label>
                <input
                    type="email"
                    id="checkout-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full border-b border-black bg-transparent py-2 outline-none focus:border-neutral-400 transition-colors rounded-none mb-4"
                    required
                />
            </div>

            {/* Color Selection */}
            <div>
                <span className="block text-xs uppercase tracking-widest font-semibold mb-4">Color</span>
                <div className="flex gap-4 flex-wrap">
                    {colors.map(color => (
                        <label key={color} className="cursor-pointer">
                            <input type="radio" name="color" className="sr-only peer" defaultChecked={color === colors[0]} />
                            <span className="block px-4 py-2 text-sm border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors uppercase tracking-widest">
                                {color}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Stitching Selection */}
            <div>
                <span className="block text-xs uppercase tracking-widest font-semibold mb-4">Stitching</span>
                <div className="flex gap-4 flex-wrap">
                    {stitching.map(style => (
                        <label key={style} className="cursor-pointer">
                            <input type="radio" name="stitching" className="sr-only peer" defaultChecked={style === stitching[0]} />
                            <span className="block px-4 py-2 text-sm border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors uppercase tracking-widest">
                                {style}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Size Selection */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <span className="block text-xs uppercase tracking-widest font-semibold">Size (EU)</span>
                    <button type="button" className="text-xs uppercase tracking-widest text-neutral-500 underline">Size Guide</button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {sizes.map(size => (
                        <label key={size} className="cursor-pointer">
                            <input type="radio" name="size" className="sr-only peer" defaultChecked={size === sizes[0]} />
                            <span className="block py-3 text-center text-sm border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors uppercase tracking-widest">
                                {size}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <button
                type="button"
                onClick={handleCheckout}
                disabled={loading}
                className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8 disabled:opacity-50"
            >
                {loading ? "Processing..." : `Buy Now — ${price}`}
            </button>
        </div>
    );
}
