"use client";

import { useState } from "react";

const PRESET_AMOUNTS = [
    { label: "GH₵500", value: 500 },
    { label: "GH₵1,000", value: 1000 },
    { label: "GH₵1,500", value: 1500 },
    { label: "GH₵2,000", value: 2000 },
    { label: "Other Amount", value: 0 },
];

export default function GiftCardPage() {
    const [selectedAmount, setSelectedAmount] = useState(500);
    const [qty, setQty] = useState(1);
    const [recipient, setRecipient] = useState<"someone" | "myself">("someone");
    const [recipientEmail, setRecipientEmail] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [deliveryDate, setDeliveryDate] = useState("");
    const [message, setMessage] = useState("");

    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 py-14">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">

                {/* Left — Gift Card Image (portrait, fills height) */}
                <div className="sticky top-24 w-full">
                    <div className="relative w-full aspect-[3/4] bg-black overflow-hidden rounded-lg shadow-lg">
                        {/* Background fashion image */}
                        <img
                            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
                            alt="Miss Tokyo Gift Card"
                            className="absolute inset-0 w-full h-full object-cover opacity-50"
                        />
                        {/* Overlay content */}
                        <div className="relative z-10 h-full flex flex-col justify-between p-8">
                            {/* Top — branding */}
                            <div>
                                <p className="text-white text-xs uppercase tracking-[0.3em] font-light opacity-70">
                                    Miss Tokyo
                                </p>
                                <div className="mt-1 w-8 h-px bg-white/40" />
                            </div>
                            {/* Middle — big amount */}
                            <div className="text-center">
                                <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Gift Card Value</p>
                                <p className="text-white text-5xl font-light tracking-wide">
                                    GH₵{selectedAmount > 0 ? selectedAmount.toLocaleString() : "–"}
                                </p>
                            </div>
                            {/* Bottom — card label */}
                            <div className="flex items-end justify-between">
                                <p className="text-white/50 text-[10px] uppercase tracking-widest">
                                    eGift Card
                                </p>
                                <p className="text-white/50 text-[10px] uppercase tracking-widest">
                                    Never Expires
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right — Form */}
                <div>
                    <h1 className="text-3xl md:text-4xl text-gray-900 mb-1">
                        eGift Card
                    </h1>
                    <p className="text-sm text-gray-500 mb-1">GH₵{selectedAmount > 0 ? selectedAmount.toLocaleString() : "–"}.00</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide leading-relaxed mb-6 max-w-sm"
                        style={{ fontFamily: "Arial, sans-serif" }}>
                        You can't go wrong with a gift card. Choose an amount and write a
                        personalised message to make this gift your own.
                    </p>

                    {/* Amount */}
                    <div className="mb-5">
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2"
                            style={{ fontFamily: "Arial, sans-serif" }}>
                            Amount
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_AMOUNTS.map((a, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedAmount(a.value || 500)}
                                    className={`px-4 py-2 text-[11px] uppercase tracking-wide border transition-colors rounded-full ${
                                        selectedAmount === a.value && a.value !== 0
                                            ? "bg-black text-white border-black"
                                            : "bg-white text-gray-700 border-gray-300 hover:border-black"
                                    }`}
                                    style={{ fontFamily: "Arial, sans-serif" }}
                                >
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="mb-5">
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2"
                            style={{ fontFamily: "Arial, sans-serif" }}>
                            Quantity
                        </label>
                        <div className="flex items-center border border-gray-300 w-fit rounded-md overflow-hidden">
                            <button
                                onClick={() => setQty(Math.max(1, qty - 1))}
                                className="px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            >
                                −
                            </button>
                            <span className="px-5 py-2 text-sm border-x border-gray-300 min-w-[3rem] text-center">
                                {qty}
                            </span>
                            <button
                                onClick={() => setQty(qty + 1)}
                                className="px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Who is it for */}
                    <div className="mb-5">
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2"
                            style={{ fontFamily: "Arial, sans-serif" }}>
                            Who is the gift card for?
                        </label>
                        <div className="grid grid-cols-2 gap-0 border border-gray-300 w-full max-w-xs rounded-md overflow-hidden">
                            <button
                                onClick={() => setRecipient("someone")}
                                className={`py-2.5 text-[11px] uppercase tracking-wide transition-colors ${
                                    recipient === "someone"
                                        ? "bg-black text-white"
                                        : "text-gray-600 border-r border-gray-300 hover:bg-gray-50"
                                }`}
                                style={{ fontFamily: "Arial, sans-serif" }}
                            >
                                For Someone Else
                            </button>
                            <button
                                onClick={() => setRecipient("myself")}
                                className={`py-2.5 text-[11px] uppercase tracking-wide transition-colors ${
                                    recipient === "myself"
                                        ? "bg-black text-white"
                                        : "text-gray-600 hover:bg-gray-50"
                                }`}
                                style={{ fontFamily: "Arial, sans-serif" }}
                            >
                                For Myself
                            </button>
                        </div>
                    </div>

                    {/* Recipient fields */}
                    {recipient === "someone" && (
                        <>
                            <div className="mb-4">
                                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5"
                                    style={{ fontFamily: "Arial, sans-serif" }}>
                                    Recipient Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black transition-colors rounded-md"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5"
                                    style={{ fontFamily: "Arial, sans-serif" }}>
                                    Recipient Name
                                </label>
                                <input
                                    type="text"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black transition-colors rounded-md"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5"
                                    style={{ fontFamily: "Arial, sans-serif" }}>
                                    Delivery Date
                                </label>
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    className="w-full border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black transition-colors rounded-md"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide"
                                    style={{ fontFamily: "Arial, sans-serif" }}>
                                    Gift card never expires.
                                </p>
                            </div>
                        </>
                    )}

                    {/* Message */}
                    <div className="mb-6">
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5"
                            style={{ fontFamily: "Arial, sans-serif" }}>
                            Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            className="w-full border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black transition-colors resize-none rounded-md"
                        />
                    </div>

                    {/* CTAs */}
                    <div className="space-y-3">
                        <button
                            className="w-full bg-red-600 text-white text-[11px] uppercase tracking-widest py-4 hover:bg-red-700 transition-colors rounded-md"
                            style={{ fontFamily: "Arial, sans-serif" }}
                        >
                            Add to Cart
                        </button>
                        <button
                            className="w-full bg-black text-white text-[11px] uppercase tracking-widest py-4 hover:bg-gray-900 transition-colors rounded-md"
                            style={{ fontFamily: "Arial, sans-serif" }}
                        >
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
