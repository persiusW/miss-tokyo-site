"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCart, getEffectivePrice } from "@/store/useCart";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { evaluateAutoDiscounts, type AutoDiscountResult } from "@/lib/autoDiscount";
import Image from "next/image";

// ── Static data ───────────────────────────────────────────────────────────────

const GHANA_REGIONS = [
    "Greater Accra", "Ashanti", "Western", "Central", "Eastern",
    "Volta", "Oti", "Bono", "Bono East", "Ahafo",
    "Northern", "Savannah", "North East", "Upper East", "Upper West", "Western North",
];

const COUNTRIES = [
    "Ghana",
    "Nigeria", "Côte d'Ivoire", "Togo", "Benin", "Burkina Faso",
    "Senegal", "Gambia", "Guinea", "Sierra Leone", "Liberia", "Mali", "Niger",
    "Cameroon", "Kenya", "Uganda", "Tanzania", "South Africa", "Ethiopia",
    "Egypt", "Morocco", "Tunisia", "Algeria",
    "United Kingdom", "United States", "Canada", "France", "Germany",
    "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Sweden", "Norway",
    "Australia", "New Zealand", "India", "China", "Japan", "South Korea",
    "Brazil", "Mexico", "Argentina",
    "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman",
    "Other",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type FeeSettings = {
    platform_fee_percentage: number;
    platform_fee_label: string;
    show_fee_at_checkout: boolean;
};

type AppliedDiscount = {
    code: string;
    type: "coupon" | "gift_card";
    discount_type: string;
    discount_amount: number;
    label: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
    const items = useCart(s => s.items);
    const totalAmount = useCart(s => s.totalAmount);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Store Settings
    const [enablePickup, setEnablePickup] = useState(false);
    const [pickupDetails, setPickupDetails] = useState<{ instructions: string; address: string; phone: string; wait: string } | null>(null);
    const [pickupExpanded, setPickupExpanded] = useState(false);
    const [feeSettings, setFeeSettings] = useState<FeeSettings>({
        platform_fee_percentage: 0,
        platform_fee_label: "Service Charge",
        show_fee_at_checkout: false,
    });

    // Form State
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        country: "Ghana",
        region: "Greater Accra",
        address: "",
        deliveryMethod: "delivery" as "delivery" | "pickup",
        whatsappSameAsPhone: true,
        whatsapp: "",
        instagram: "",
        snapchat: "",
    });

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Automatic discounts
    const [autoDiscountResult, setAutoDiscountResult] = useState<AutoDiscountResult | null>(null);

    // Discount / Gift Card
    const [discountInput, setDiscountInput] = useState("");
    const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeError, setCodeError] = useState("");

    useEffect(() => {
        setMounted(true);
        Promise.all([
            supabase.from("store_settings").select("enable_store_pickup, platform_fee_percentage, platform_fee_label, show_fee_at_checkout").eq("id", "default").single(),
            supabase.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").single(),
        ]).then(([{ data: store }, { data: ss }]) => {
            if (store) {
                // pickup enabled if BOTH store_settings toggle AND site_settings.pickup_enabled are true
                const pickupOn = (store.enable_store_pickup || false) && (ss?.pickup_enabled ?? true);
                setEnablePickup(pickupOn);
                setFeeSettings({
                    platform_fee_percentage: Number(store.platform_fee_percentage) || 0,
                    platform_fee_label: store.platform_fee_label || "Service Charge",
                    show_fee_at_checkout: store.show_fee_at_checkout ?? false,
                });
            }
            if (ss && ss.pickup_enabled) {
                setPickupDetails({
                    instructions: ss.pickup_instructions || "",
                    address: ss.pickup_address || "",
                    phone: ss.pickup_contact_phone || "",
                    wait: ss.pickup_estimated_wait || "24 hours",
                });
            }
        });

        // Auto-fill for logged-in users
        supabase.auth.getUser().then(async ({ data }: { data: { user: import('@supabase/supabase-js').User | null } }) => {
            const user = data.user;
            if (!user) return;
            const [{ data: profile }, { data: lastOrders }] = await Promise.all([
                supabase.from('profiles').select('full_name, email, phone').eq('id', user.id).single(),
                supabase.from('orders').select('shipping_address, customer_phone').eq('customer_email', user.email ?? '').order('created_at', { ascending: false }).limit(1),
            ]);
            const lastOrder = lastOrders?.[0];
            const lastAddress = lastOrder?.shipping_address;
            setForm(prev => ({
                ...prev,
                fullName: profile?.full_name || prev.fullName,
                email:    profile?.email     || user.email || prev.email,
                phone:    profile?.phone     || lastOrder?.customer_phone || prev.phone,
                address:  lastAddress?.text  || prev.address,
                country:  lastAddress?.country || prev.country,
                region:   lastAddress?.region  || prev.region,
            }));
        });
    }, []);

    const lastFetchedKey = useRef<string>("");

    // Fetch automatic discount rules — skips if cart contents haven't changed
    const fetchAutoDiscounts = useCallback(async () => {
        if (!items.length) { setAutoDiscountResult(null); lastFetchedKey.current = ""; return; }
        const key = items.map(i => `${i.productId}:${i.quantity}`).sort().join(",");
        if (key === lastFetchedKey.current) return;
        lastFetchedKey.current = key;
        const productIds = [...new Set(items.map(i => i.productId))].join(",");
        try {
            const res = await fetch(`/api/checkout/auto-discount?productIds=${productIds}`);
            if (!res.ok) return;
            const { rules, productCategoryMap } = await res.json();
            setAutoDiscountResult(evaluateAutoDiscounts(items, rules, productCategoryMap));
        } catch {
            // Non-fatal — auto discounts simply won't show
        }
    }, [items]);

    useEffect(() => { fetchAutoDiscounts(); }, [fetchAutoDiscounts]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setForm(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
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
        if (!form.whatsappSameAsPhone && !form.whatsapp.trim()) {
            newErrors.whatsapp = "Please enter a WhatsApp number or check the box above.";
        }
        if (form.deliveryMethod === "delivery" && !form.address.trim()) {
            newErrors.address = "Street address is required for delivery.";
        }
        return newErrors;
    };

    // ── Auto discount helpers ──────────────────────────────────────────────────

    const autoDiscount = autoDiscountResult?.totalAutoDiscount ?? 0;
    const coveredProductIds = autoDiscountResult?.coveredProductIds ?? new Set<string>();
    const allItemsCovered = items.length > 0 && items.every(i => coveredProductIds.has(i.productId));

    // Subtotal of items NOT covered by an automatic discount (coupon applies to these only)
    const remainingSubtotal = mounted
        ? items.reduce((s, i) => {
              if (coveredProductIds.has(i.productId)) return s;
              return s + getEffectivePrice(i) * i.quantity;
          }, 0)
        : 0;

    // ── Discount code logic ────────────────────────────────────────────────────

    const applyCode = async () => {
        if (!discountInput.trim()) return;
        // Gate: if every cart item is already auto-discounted, block manual codes
        if (allItemsCovered) {
            setCodeError("Discounts can't be stacked — your cart already has an automatic discount applied.");
            return;
        }
        setCodeLoading(true);
        setCodeError("");
        try {
            const res = await fetch("/api/checkout/validate-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Validate against the uncovered portion of the cart only
                body: JSON.stringify({ code: discountInput.trim(), subtotal: remainingSubtotal }),
            });
            const data = await res.json();
            if (data.valid) {
                setAppliedDiscount(data as AppliedDiscount);
                setDiscountInput("");
            } else {
                setCodeError(data.error || "Invalid code.");
            }
        } catch {
            setCodeError("Could not validate code. Please try again.");
        } finally {
            setCodeLoading(false);
        }
    };

    const removeCode = () => {
        setAppliedDiscount(null);
        setCodeError("");
    };

    // ── Fee calculations ───────────────────────────────────────────────────────

    const subtotal = mounted ? totalAmount() : 0;
    const discountAmount = appliedDiscount?.discount_amount ?? 0;
    // autoDiscount, allItemsCovered, remainingSubtotal computed above (after fetchAutoDiscounts)
    const afterAutoDiscount = Math.max(0, subtotal - autoDiscount);
    const discountedSubtotal = Math.max(0, afterAutoDiscount - discountAmount);
    const feeAmount = parseFloat((discountedSubtotal * (feeSettings.platform_fee_percentage / 100)).toFixed(2));
    const finalTotal = parseFloat((discountedSubtotal + feeAmount).toFixed(2));

    // ── Submit ─────────────────────────────────────────────────────────────────

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
                amount: finalTotal,
                cartItems: items,
                metadata: {
                    fullName: form.fullName,
                    phone: form.phone,
                    address: form.deliveryMethod === "delivery" ? form.address : "",
                    country: form.country,
                    region: form.region,
                    whatsapp: form.whatsappSameAsPhone ? form.phone : form.whatsapp,
                    ...(form.instagram.trim() ? { instagram: form.instagram.trim() } : {}),
                    ...(form.snapchat.trim() ? { snapchat: form.snapchat.trim() } : {}),
                    deliveryMethod: form.deliveryMethod,
                    platform_fee_amount: feeAmount,
                    platform_fee_label: feeSettings.platform_fee_label,
                    ...(appliedDiscount && !allItemsCovered ? {
                        discount_code: appliedDiscount.code,
                        discount_amount: appliedDiscount.discount_amount,
                        discount_tag: appliedDiscount.type,
                    } : {}),
                    ...(autoDiscountResult && autoDiscountResult.appliedRules.length > 0 ? {
                        auto_discount_ids: autoDiscountResult.appliedRules.map(r => r.id),
                        auto_discount_amount: autoDiscountResult.totalAutoDiscount,
                        auto_discount_label: autoDiscountResult.label,
                    } : {}),
                },
            };

            const res = await fetch("/api/paystack/initialize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.authorizationUrl) {
                // Store any OOS-excluded items so the success page can display them
                if (data.oosItems?.length) {
                    sessionStorage.setItem("checkout_oos", JSON.stringify(data.oosItems));
                }
                window.location.href = data.authorizationUrl;
            } else if (res.status === 409) {
                toast.error(data.error || "An item in your cart is out of stock. Please update your cart.");
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

    const { show_fee_at_checkout, platform_fee_label } = feeSettings;
    const hasFee = feeAmount > 0;
    const inputClass = (field: string) =>
        `w-full border-b bg-transparent py-2 outline-none transition-colors rounded-none ${errors[field] ? "border-red-400" : "border-neutral-300 focus:border-black"}`;

    return (
        <div className="pt-32 pb-32 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">

            {/* ── LEFT: Form ── */}
            <div>
                <header className="mb-12">
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Checkout</h1>
                    <p className="text-neutral-500">Please provide your details to complete the order.</p>
                </header>

                <form onSubmit={handleCheckout} className="space-y-8">

                    {/* Name + Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Full Name</label>
                            <input type="text" name="fullName" value={form.fullName} onChange={handleChange}
                                className={inputClass("fullName")} placeholder="Abena Mensah" />
                            {errors.fullName && <p className="mt-1 text-[11px] text-red-500">{errors.fullName}</p>}
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Email</label>
                            <input type="email" name="email" value={form.email} onChange={handleChange}
                                className={inputClass("email")} placeholder="abena@example.com" />
                            {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Phone Number</label>
                        <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                            className={inputClass("phone")} placeholder="+233 ..." />
                        {errors.phone && <p className="mt-1 text-[11px] text-red-500">{errors.phone}</p>}
                    </div>

                    {/* Country + Region */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Country</label>
                            <select name="country" value={form.country} onChange={handleChange}
                                className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none transition-colors rounded-none">
                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-widest font-semibold mb-3">
                                {form.country === "Ghana" ? "Region" : "State / Region"}
                            </label>
                            {form.country === "Ghana" ? (
                                <select name="region" value={form.region} onChange={handleChange}
                                    className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none transition-colors rounded-none">
                                    {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            ) : (
                                <input type="text" name="region" value={form.region} onChange={handleChange}
                                    className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none transition-colors rounded-none"
                                    placeholder="Enter your state or region" />
                            )}
                        </div>
                    </div>

                    {/* Delivery Method */}
                    <div>
                        <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Delivery Method</label>
                        <div className="flex gap-4">
                            <label className="cursor-pointer">
                                <input type="radio" name="deliveryMethod" value="delivery" checked={form.deliveryMethod === "delivery"} onChange={handleChange} className="sr-only peer" />
                                <span className="block px-6 py-3 text-xs uppercase tracking-widest border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors">
                                    Delivery
                                </span>
                            </label>
                            {enablePickup && (
                                <label className="cursor-pointer">
                                    <input type="radio" name="deliveryMethod" value="pickup" checked={form.deliveryMethod === "pickup"} onChange={handleChange} className="sr-only peer" />
                                    <span className="block px-6 py-3 text-xs uppercase tracking-widest border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors">
                                        Store Pickup
                                    </span>
                                </label>
                            )}
                        </div>
                        {/* Inline pickup instructions — shown when pickup is selected */}
                        {form.deliveryMethod === "pickup" && pickupDetails && pickupDetails.instructions && (
                            <div className="mt-3 bg-neutral-50 border border-neutral-200 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-700 mb-2">Pickup Instructions</p>
                                <p className={`text-xs text-neutral-600 leading-relaxed ${pickupExpanded ? "" : "line-clamp-2"}`}
                                   style={{ whiteSpace: "pre-wrap" }}>
                                    {pickupDetails.instructions}
                                </p>
                                {pickupDetails.instructions.length > 120 && (
                                    <button type="button" onClick={() => setPickupExpanded(v => !v)}
                                        className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-black mt-1 transition-colors">
                                        {pickupExpanded ? "Show less" : "Read more"}
                                    </button>
                                )}
                                {(pickupDetails.address || pickupDetails.phone || pickupDetails.wait) && (
                                    <div className="mt-2 pt-2 border-t border-neutral-200 text-[11px] text-neutral-500 space-y-0.5">
                                        {pickupDetails.address && <p>📍 {pickupDetails.address}</p>}
                                        {pickupDetails.phone && <p>📞 {pickupDetails.phone}</p>}
                                        {pickupDetails.wait && <p>⏱ Ready in: {pickupDetails.wait}</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Street Address */}
                    {form.deliveryMethod === "delivery" && (
                        <div>
                            <label className="block text-xs uppercase tracking-widest font-semibold mb-3">City</label>
                            <input type="text" name="address" value={form.address} onChange={handleChange}
                                className={inputClass("address")} placeholder="Dome / East Legon" />
                            {errors.address && <p className="mt-1 text-[11px] text-red-500">{errors.address}</p>}
                        </div>
                    )}

                    {/* ── Social Contact ── */}
                    <div className="space-y-5 pt-2">
                        <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-700">
                            Social Contact <span className="text-neutral-400 normal-case tracking-normal font-normal">(Optional)</span>
                        </h2>

                        {/* WhatsApp same-as-phone toggle */}
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                name="whatsappSameAsPhone"
                                checked={form.whatsappSameAsPhone}
                                onChange={handleChange}
                                className="w-4 h-4 accent-black"
                            />
                            <span className="text-[11px] uppercase tracking-widest text-neutral-600 font-medium">
                                WhatsApp number is the same as my phone number
                            </span>
                        </label>

                        {/* WhatsApp input — shown when unchecked */}
                        {!form.whatsappSameAsPhone && (
                            <div>
                                <label className="block text-xs uppercase tracking-widest font-semibold mb-3">WhatsApp Number</label>
                                <input type="tel" name="whatsapp" value={form.whatsapp} onChange={handleChange}
                                    className={inputClass("whatsapp")} placeholder="+233 ..." />
                                {errors.whatsapp && <p className="mt-1 text-[11px] text-red-500">{errors.whatsapp}</p>}
                            </div>
                        )}

                        {/* Instagram + Snapchat */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Instagram Handle</label>
                                <input type="text" name="instagram" value={form.instagram} onChange={handleChange}
                                    className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none transition-colors rounded-none"
                                    placeholder="@yourhandle" />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Snapchat Handle</label>
                                <input type="text" name="snapchat" value={form.snapchat} onChange={handleChange}
                                    className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none transition-colors rounded-none"
                                    placeholder="@yourhandle" />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8 disabled:opacity-50 mt-12 block text-center"
                    >
                        {loading ? "Processing..." : `Pay GHS ${finalTotal.toFixed(2)}`}
                    </button>
                </form>
            </div>

            {/* ── RIGHT: Order Summary ── */}
            <div className="bg-neutral-50 p-8 md:p-12 border border-neutral-100 h-fit space-y-8">
                <h2 className="font-serif text-xl tracking-widest uppercase">Order Summary</h2>

                {/* Items */}
                <div className="space-y-6">
                    {items.map(item => (
                        <div key={item.id} className="flex gap-4 items-center">
                            <div className="w-16 h-16 bg-white overflow-hidden flex-shrink-0 border border-neutral-200 relative">
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-sm text-neutral-900">{item.name}</h3>
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Size: {item.size} · Qty: {item.quantity}</p>
                            </div>
                            <p className="font-medium text-sm">GHS {(getEffectivePrice(item) * item.quantity).toFixed(2)}</p>
                        </div>
                    ))}
                </div>

                {/* Automatic discount badges */}
                {autoDiscountResult && autoDiscountResult.appliedRules.length > 0 && (
                    <div className="space-y-2">
                        {autoDiscountResult.appliedRules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between bg-green-50 border border-green-200 px-4 py-2.5">
                                <div>
                                    <p className="text-[10px] font-semibold text-green-700 uppercase tracking-widest">Auto Discount</p>
                                    <p className="text-xs text-green-600 mt-0.5">{rule.title}</p>
                                </div>
                                <span className="text-sm font-medium text-green-700">−GHS {rule.discountAmount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Discount / Gift Card input */}
                <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Gift Card or Discount Code</p>

                    {appliedDiscount ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 px-4 py-3">
                            <div>
                                <p className="text-xs font-semibold text-green-700 uppercase tracking-widest">{appliedDiscount.code}</p>
                                <p className="text-[11px] text-green-600 mt-0.5">{appliedDiscount.label}</p>
                            </div>
                            <button onClick={removeCode} className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors ml-4">
                                Remove
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={discountInput}
                                onChange={e => { setDiscountInput(e.target.value); setCodeError(""); }}
                                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), applyCode())}
                                className="flex-1 border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none text-sm transition-colors rounded-none"
                                placeholder="Enter code"
                            />
                            <button
                                type="button"
                                onClick={applyCode}
                                disabled={codeLoading || !discountInput.trim()}
                                className="px-5 py-2 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                            >
                                {codeLoading ? "..." : "Apply"}
                            </button>
                        </div>
                    )}

                    {codeError && <p className="text-[11px] text-red-500">{codeError}</p>}
                </div>

                {/* Totals breakdown */}
                <div className="border-t border-neutral-200 pt-6 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500 uppercase tracking-widest text-xs">Subtotal</span>
                        <span>GHS {subtotal.toFixed(2)}</span>
                    </div>

                    {autoDiscount > 0 && (
                        <div className="flex justify-between items-center text-sm text-green-600">
                            <span className="uppercase tracking-widest text-xs">Auto Discount</span>
                            <span>−GHS {autoDiscount.toFixed(2)}</span>
                        </div>
                    )}

                    {appliedDiscount && discountAmount > 0 && (
                        <div className="flex justify-between items-center text-sm text-green-600">
                            <span className="uppercase tracking-widest text-xs">Discount ({appliedDiscount.code})</span>
                            <span>−GHS {discountAmount.toFixed(2)}</span>
                        </div>
                    )}

                    {hasFee && show_fee_at_checkout && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-neutral-500 uppercase tracking-widest text-xs">{platform_fee_label}</span>
                            <span>GHS {feeAmount.toFixed(2)}</span>
                        </div>
                    )}

                    {hasFee && !show_fee_at_checkout && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-neutral-500 uppercase tracking-widest text-xs">Shipping &amp; Handling</span>
                            <span>GHS {feeAmount.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-neutral-200">
                        <span className="font-serif tracking-widest uppercase">Total</span>
                        <span className="font-medium text-lg">GHS {finalTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
