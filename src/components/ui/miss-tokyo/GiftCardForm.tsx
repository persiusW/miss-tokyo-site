"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const GIFT_AMOUNTS = [500, 1000, 1500, 2000];

export function GiftCardForm() {
    const [amount, setAmount] = useState<number>(500);
    const [customAmount, setCustomAmount] = useState<string>("");
    const [isCustom, setIsCustom] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [isForSomeoneElse, setIsForSomeoneElse] = useState(true);

    const handleAmountClick = (val: number) => {
        setAmount(val);
        setIsCustom(false);
    };

    const handleCustomClick = () => {
        setIsCustom(true);
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <p className="font-serif text-2xl mb-4 tracking-wide text-neutral-800">GH₵{amount}</p>
                <p className="text-sm text-neutral-500 leading-relaxed uppercase tracking-widest font-light mb-8 max-w-md">
                    You can't go wrong with a gift card. Choose an amount and write a personalized message to make this gift your own.
                </p>
            </div>

            {/* Amount Selection */}
            <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-4 font-medium">Amount</label>
                <div className="flex flex-wrap gap-2">
                    {GIFT_AMOUNTS.map((val) => (
                        <button
                            key={val}
                            onClick={() => handleAmountClick(val)}
                            className={`uppercase text-[10px] tracking-widest rounded-none py-3 px-6 border transition-all duration-300 ${
                                !isCustom && amount === val
                                    ? "bg-black text-white border-black shadow-md"
                                    : "bg-white text-black border-gray-200 hover:border-black"
                            }`}
                        >
                            GH₵{val.toLocaleString()}
                        </button>
                    ))}
                    <button
                        onClick={handleCustomClick}
                        className={`uppercase text-[10px] tracking-widest rounded-none py-3 px-6 border transition-all duration-300 ${
                            isCustom
                                ? "bg-black text-white border-black shadow-md"
                                : "bg-white text-black border-gray-200 hover:border-black"
                        }`}
                    >
                        Other Amount
                    </button>
                </div>
                {isCustom && (
                    <input
                        type="number"
                        placeholder="Enter Amount"
                        value={customAmount}
                        onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setAmount(Number(e.target.value) || 0);
                        }}
                        className="mt-4 w-full bg-white border border-gray-300 text-black text-sm p-3 focus:outline-none focus:ring-1 focus:ring-black focus:border-black rounded-none animate-in fade-in slide-in-from-top-1"
                    />
                )}
            </div>

            {/* Quantity */}
            <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-4 font-medium">Quantity</label>
                <div className="flex items-center w-max border border-gray-200 rounded-none bg-white">
                    <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-3 hover:bg-neutral-50 transition-colors"
                        aria-label="Decrease quantity"
                    >
                        <Minus size={14} />
                    </button>
                    <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                    <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-3 hover:bg-neutral-50 transition-colors"
                        aria-label="Increase quantity"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            </div>

            {/* Recipient Toggles */}
            <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-4 font-medium">Who is the gift card for?</label>
                <div className="grid grid-cols-2">
                    <button
                        onClick={() => setIsForSomeoneElse(true)}
                        className={`uppercase text-[10px] tracking-widest rounded-none py-4 border transition-all duration-300 ${
                            isForSomeoneElse
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-gray-200 hover:border-black"
                        }`}
                    >
                        For Someone Else
                    </button>
                    <button
                        onClick={() => setIsForSomeoneElse(false)}
                        className={`uppercase text-[10px] tracking-widest rounded-none py-4 border border-l-0 transition-all duration-300 ${
                            !isForSomeoneElse
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-gray-200 hover:border-black"
                        }`}
                    >
                        For Myself
                    </button>
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
                {isForSomeoneElse && (
                    <>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-medium">Recipient Email *</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-white border border-gray-300 text-black text-sm p-4 focus:outline-none focus:ring-1 focus:ring-black focus:border-black rounded-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-medium">Recipient Name</label>
                            <input
                                type="text"
                                className="w-full bg-white border border-gray-300 text-black text-sm p-4 focus:outline-none focus:ring-1 focus:ring-black focus:border-black rounded-none"
                            />
                        </div>
                    </>
                )}
                
                <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-medium">Delivery Date</label>
                    <input
                        type="date"
                        className="w-full bg-white border border-gray-300 text-black text-sm p-4 focus:outline-none focus:ring-1 focus:ring-black focus:border-black rounded-none"
                    />
                    <p className="text-[9px] uppercase tracking-widest text-neutral-400 mt-2">Gift card never expires.</p>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-medium">Message</label>
                    <textarea
                        rows={4}
                        className="w-full bg-white border border-gray-300 text-black text-sm p-4 focus:outline-none focus:ring-1 focus:ring-black focus:border-black rounded-none resize-none"
                        placeholder="Write your personal message here..."
                    ></textarea>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 space-y-4">
                <button
                    className="w-full bg-white text-black border border-black uppercase text-[10px] font-bold tracking-[0.3em] py-5 hover:bg-black hover:text-white transition-all duration-500 rounded-none shadow-sm"
                >
                    Add to Cart
                </button>
                <button
                    className="w-full bg-black text-white border border-black uppercase text-[10px] font-bold tracking-[0.3em] py-5 hover:bg-neutral-900 transition-all duration-500 rounded-none shadow-xl"
                >
                    Buy Now
                </button>
            </div>
        </div>
    );
}
