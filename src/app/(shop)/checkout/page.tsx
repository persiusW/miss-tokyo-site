"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCart, getEffectivePrice, type CartItem } from "@/store/useCart";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { evaluateAutoDiscounts, type AutoDiscountResult } from "@/lib/autoDiscount";
import { GHANA_REGIONS, COUNTRIES } from "@/lib/geo";
import { computeDiscountSplit } from "@/lib/discountSplit";
import {
    DELIVERY_DEFAULTS,
    parseDeliverySettings,
    resolveDeliveryFee,
    zoneForRegion,
    zoneLabel,
    type DeliveryFeeSettings,
    type DeliveryZone,
} from "@/lib/delivery";
import Image from "next/image";

// ── Static data ───────────────────────────────────────────────────────────────
// Country/region lists live in @/lib/geo so the POS till offers exactly the same
// options and writes the same address shape.

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
    /** Percent for a percentage coupon, GHS for every other type. Kept so the
     *  split can be recomputed when the customer changes region after applying. */
    raw_value?: number;
    label: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

const PENDING_ORDER_KEY = "miss-tokyo-pending-order";

export default function CheckoutPage() {
    const items = useCart(s => s.items);
    const totalAmount = useCart(s => s.totalAmount);
    const removeItem = useCart(s => s.removeItem);
    const updateQuantity = useCart(s => s.updateQuantity);
    const addItem = useCart(s => s.addItem);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [stockChecking, setStockChecking] = useState(false);
    const [stockError, setStockError] = useState<string | null>(null);
    const [stockIssueIds, setStockIssueIds] = useState<Set<string>>(new Set());

    // Store Settings
    const [enablePickup, setEnablePickup] = useState(false);
    const [pickupDetails, setPickupDetails] = useState<{ instructions: string; address: string; phone: string; wait: string } | null>(null);
    const [pickupExpanded, setPickupExpanded] = useState(false);
    const [feeSettings, setFeeSettings] = useState<FeeSettings>({
        platform_fee_percentage: 0,
        platform_fee_label: "Service Charge",
        show_fee_at_checkout: false,
    });
    const [deliverySettings, setDeliverySettings] = useState<DeliveryFeeSettings>(DELIVERY_DEFAULTS);

    // Form State
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        country: "Ghana",
        region: "Greater Accra",
        address: "",
        deliveryMethod: "delivery" as "delivery" | "pickup",
        deliveryZone: "accra" as DeliveryZone,
        whatsappSameAsPhone: true,
        whatsapp: "",
        instagram: "",
        snapchat: "",
    });

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Set once the customer taps a zone button. From then on their choice
    // survives region changes — otherwise picking a region would silently
    // overwrite a deliberate selection.
    const zoneTouched = useRef(false);

    // Automatic discounts
    const [autoDiscountResult, setAutoDiscountResult] = useState<AutoDiscountResult | null>(null);

    // Discount / Gift Card
    const [discountInput, setDiscountInput] = useState("");
    const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeError, setCodeError] = useState("");

    // What the last availability check said each cart line can still have, so
    // the + button clamps instead of letting someone ask for stock that is gone.
    const [availableById, setAvailableById] = useState<Record<string, number>>({});
    // Lines checkout took out of the cart for the customer. They are no longer
    // in `items`, so the summary renders them from here; they do not survive a
    // refresh, which is intended — the cart is the record, this is the notice.
    const [removedLines, setRemovedLines] = useState<Array<{
        id: string; name: string; size?: string; imageUrl?: string;
        quantity: number; reason: "sold_out" | "unavailable";
        item: CartItem;
    }>>([]);
    // Lines whose quantity was cut down to what is actually in stock.
    const [clampedLines, setClampedLines] = useState<Record<string, { from: number; to: number }>>({});
    const [undoEnabled, setUndoEnabled] = useState(false);
    const [discountNeedsRecheck, setDiscountNeedsRecheck] = useState(false);
    // One reconcile per cart signature — removing an item changes `items`, which
    // re-runs the check, which must not act on the same line twice.
    const reconciledKey = useRef<string>("");

    useEffect(() => {
        setMounted(true);
        Promise.all([
            supabase.from("store_settings").select("enable_store_pickup, platform_fee_percentage, platform_fee_label, show_fee_at_checkout").eq("id", "default").single(),
            supabase.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").single(),
            // Own select on purpose — if these columns do not exist yet this
            // one query returns an error and the rest of checkout is unharmed.
            supabase.from("store_settings").select("delivery_fees_enabled, delivery_fee_accra, delivery_fee_outside").eq("id", "default").maybeSingle(),
            // Own select again: this column may not be migrated in yet, and a
            // missing one must not take the rest of checkout down.
            supabase.from("store_settings").select("checkout_undo_removed_enabled").eq("id", "default").maybeSingle(),
        ]).then(([{ data: store }, { data: ss }, { data: deliveryRow }, { data: undoRow }]) => {
            setDeliverySettings(parseDeliverySettings(deliveryRow));
            setUndoEnabled(undoRow?.checkout_undo_removed_enabled === true);
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
                supabase.from('orders').select('shipping_address, customer_phone, customer_metadata').eq('customer_email', user.email ?? '').order('created_at', { ascending: false }).limit(1),
            ]);
            const lastOrder = lastOrders?.[0];
            const lastAddress = lastOrder?.shipping_address;
            const meta = lastOrder?.customer_metadata ?? {};
            const savedPhone = profile?.phone || lastOrder?.customer_phone || "";
            const savedWhatsapp = meta.whatsapp || "";
            const whatsappSame = !savedWhatsapp || savedWhatsapp === savedPhone;
            setForm(prev => ({
                ...prev,
                fullName:           profile?.full_name    || prev.fullName,
                email:              profile?.email        || user.email || prev.email,
                phone:              savedPhone            || prev.phone,
                address:            lastAddress?.text     || prev.address,
                country:            lastAddress?.country  || prev.country,
                region:             lastAddress?.region   || prev.region,
                whatsappSameAsPhone: whatsappSame,
                whatsapp:           whatsappSame ? "" : savedWhatsapp,
                instagram:          meta.instagram        || prev.instagram,
                snapchat:           meta.snapchat         || prev.snapchat,
            }));
        });
    }, []);

    useEffect(() => {
        if (!items.length) return;

        setStockChecking(true);
        setStockError(null);

        const checkItems = items.map(i => ({
            productId: i.productId,
            variantId: null,
            size: i.size,
            color: i.color,
            brand: (i as { brand?: string }).brand ?? null,
            quantity: i.quantity,
        }));

        // Signature of what we are about to reconcile. Acting on a line changes
        // `items`, which re-runs this effect — without the guard a removal would
        // be reconsidered against the stale result that caused it.
        const key = items.map(i => `${i.id}:${i.quantity}`).join("|");

        // Exclude this customer's own pending hold, if they have just come back
        // from Paystack without completing payment.
        const pendingOrderId = typeof window !== "undefined"
            ? sessionStorage.getItem(PENDING_ORDER_KEY)
            : null;
        const excludeParam = pendingOrderId ? `&excludeOrderId=${encodeURIComponent(pendingOrderId)}` : "";

        fetch(`/api/inventory/check?items=${encodeURIComponent(JSON.stringify(checkItems))}${excludeParam}`)
            .then(r => r.json())
            .then(data => {
                if (!data.results) return;

                const availability: Record<string, number> = {};
                const toRemove: typeof removedLines = [];
                const toClamp: Record<string, { from: number; to: number }> = {};
                const issues: string[] = [];
                const issueIds = new Set<string>();

                // results are returned in the same order as checkItems / items
                data.results.forEach((result: any, idx: number) => {
                    const cartItem = items[idx];
                    if (!cartItem) return;

                    // Pre-orders are sold ahead of stock, so no cap applies.
                    availability[cartItem.id] = cartItem.isPreOrder
                        ? Number.MAX_SAFE_INTEGER
                        : Math.max(0, Number(result.available) || 0);

                    if (cartItem.isPreOrder) return;

                    if (!result.isActive || availability[cartItem.id] === 0) {
                        // Nothing to sell: take it out rather than leaving a
                        // total the customer cannot actually pay.
                        toRemove.push({
                            id: cartItem.id,
                            name: cartItem.name,
                            size: cartItem.size,
                            imageUrl: cartItem.imageUrl,
                            quantity: cartItem.quantity,
                            reason: result.isActive ? "sold_out" : "unavailable",
                            item: cartItem,
                        });
                    } else if (availability[cartItem.id] < cartItem.quantity) {
                        // Part of the line is still sellable — keep that part.
                        toClamp[cartItem.id] = { from: cartItem.quantity, to: availability[cartItem.id] };
                    }
                });

                setAvailableById(availability);

                if (reconciledKey.current !== key && (toRemove.length > 0 || Object.keys(toClamp).length > 0)) {
                    reconciledKey.current = key;

                    toRemove.forEach(line => removeItem(line.id));
                    Object.entries(toClamp).forEach(([id, { to }]) => updateQuantity(id, to));

                    setRemovedLines(prev => [
                        ...prev.filter(p => !toRemove.some(r => r.id === p.id)),
                        ...toRemove,
                    ]);
                    setClampedLines(prev => ({ ...prev, ...toClamp }));

                    const notices: string[] = [];
                    if (toRemove.length === 1) notices.push(`"${toRemove[0].name}" is no longer available and has been removed.`);
                    else if (toRemove.length > 1) notices.push(`${toRemove.length} items are no longer available and have been removed.`);
                    for (const [, { to }] of Object.entries(toClamp)) {
                        notices.push(`Another item was reduced to ${to} — that is all we have left.`);
                    }
                    if (notices.length > 0) toast.error(notices.join(" "));

                    // The cart total just moved, so a code with a minimum spend
                    // may no longer qualify. Say so now rather than at Paystack.
                    setDiscountNeedsRecheck(true);
                }

                // Anything still short after reconciling (pre-orders aside) is
                // reported the old way rather than silently altered.
                if (issues.length > 0) { setStockError(issues.join(" ")); setStockIssueIds(issueIds); }
                else { setStockError(null); setStockIssueIds(new Set()); }
            })
            .catch(() => {
                // Don't block checkout on network failure — server catches it at reserve time
            })
            .finally(() => setStockChecking(false));
    }, [items]);

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
        if (name === "deliveryZone") zoneTouched.current = true;
        setForm(p => {
            const next = { ...p, [name]: type === "checkbox" ? checked : value };
            // A region change re-derives the zone, unless the customer has
            // already chosen one by hand.
            if (name === "region" && !zoneTouched.current) {
                next.deliveryZone = zoneForRegion(value);
            }
            return next;
        });
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
                body: JSON.stringify({ code: discountInput.trim(), subtotal: remainingSubtotal, deliveryFee }),
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

    // A code validated against the old subtotal may no longer qualify once
    // items are removed or reduced — a minimum-spend coupon being the usual
    // case. Re-check immediately and say so, rather than letting Paystack be
    // the one to break the news.
    useEffect(() => {
        if (!discountNeedsRecheck) return;
        setDiscountNeedsRecheck(false);
        if (!appliedDiscount) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/checkout/validate-code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code: appliedDiscount.code, subtotal: remainingSubtotal, deliveryFee }),
                });
                const data = await res.json();
                if (cancelled) return;
                if (data.valid) {
                    setAppliedDiscount(data as AppliedDiscount);
                } else {
                    setAppliedDiscount(null);
                    setCodeError(data.error || `"${appliedDiscount.code}" no longer applies to your updated cart.`);
                    toast.error(`"${appliedDiscount.code}" no longer applies to your updated cart.`);
                }
            } catch {
                // Leave the code in place; the server revalidates at payment.
            }
        })();
        return () => { cancelled = true; };
    }, [discountNeedsRecheck, appliedDiscount, remainingSubtotal]);

    // ── Fee calculations ───────────────────────────────────────────────────────

    const subtotal = mounted ? totalAmount() : 0;
    // autoDiscount, allItemsCovered, remainingSubtotal computed above (after fetchAutoDiscounts)
    const afterAutoDiscount = Math.max(0, subtotal - autoDiscount);

    // Delivery is priced BEFORE the code is applied, because a gift card or a
    // fixed coupon now spends against it. Mirrors /api/paystack/initialize
    // exactly: the zone the customer picked and the zone derived from their
    // region are both priced, and the dearer of the two is what's quoted here
    // AND what the server will actually charge — so the summary and the Pay
    // button never show a figure Paystack won't honour.
    const deliveryFeeArgs = {
        settings: deliverySettings,
        country: form.country,
        deliveryMethod: form.deliveryMethod,
    };
    const regionZone = zoneForRegion(form.region);
    const claimedFee = resolveDeliveryFee({ ...deliveryFeeArgs, zone: form.deliveryZone });
    const regionFee = resolveDeliveryFee({ ...deliveryFeeArgs, zone: regionZone });
    const deliveryFee = Math.max(claimedFee, regionFee);
    const chargedZone: DeliveryZone = claimedFee >= regionFee ? form.deliveryZone : regionZone;

    // Same rule the server charges by — one shared function, so this preview
    // cannot drift from the amount Paystack is asked for. Recomputed here rather
    // than trusting the figure the code was validated at, because the customer
    // can change region afterwards and move the delivery fee under it.
    const discountSplit = appliedDiscount
        ? computeDiscountSplit({
            discountType: appliedDiscount.discount_type,
            value: appliedDiscount.raw_value ?? appliedDiscount.discount_amount,
            subtotal: afterAutoDiscount,
            deliveryFee,
        })
        : { amount: 0, subtotalAmount: 0, deliveryAmount: 0 };

    const discountAmount = discountSplit.amount;
    const discountedSubtotal = Math.max(0, afterAutoDiscount - discountSplit.subtotalAmount);
    const feeAmount = parseFloat((discountedSubtotal * (feeSettings.platform_fee_percentage / 100)).toFixed(2));
    const payableDelivery = parseFloat(Math.max(0, deliveryFee - discountSplit.deliveryAmount).toFixed(2));
    // Delivery is added after the platform-fee percentage, so the percentage is
    // never levied on the delivery charge.
    const finalTotal = parseFloat((discountedSubtotal + feeAmount + payableDelivery).toFixed(2));
    const showZonePicker = deliverySettings.enabled
        && form.country === "Ghana"
        && form.deliveryMethod === "delivery";

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        // Fresh real-time stock check right before payment — catches inventory
        // changes that happened after the page initially loaded.
        setStockChecking(true);
        setStockError(null);
        try {
            const checkItems = items.map(i => ({
                productId: i.productId,
                variantId: null,
                size: i.size,
                color: i.color,
                brand: (i as { brand?: string }).brand ?? null,
                quantity: i.quantity,
            }));
            // Same exclusion as the on-load check: a retry after backing out of
            // Paystack must not be blocked by the hold that first attempt left.
            const retryOrderId = sessionStorage.getItem(PENDING_ORDER_KEY);
            const retryParam = retryOrderId ? `&excludeOrderId=${encodeURIComponent(retryOrderId)}` : "";
            const stockRes = await fetch(`/api/inventory/check?items=${encodeURIComponent(JSON.stringify(checkItems))}${retryParam}`);
            const stockData = await stockRes.json();
            if (stockData.results) {
                const issues: string[] = [];
                const issueIds = new Set<string>();
                // results are in the same order as checkItems / items
                stockData.results.forEach((result: any, idx: number) => {
                    const cartItem = items[idx];
                    if (!cartItem) return;
                    if (!result.isActive) {
                        issues.push(`"${cartItem.name}" is no longer available.`);
                        issueIds.add(cartItem.id);
                    } else if (!cartItem.isPreOrder && result.available < cartItem.quantity) {
                        issues.push(result.available === 0
                            ? `"${cartItem.name}" (${cartItem.size}) just sold out. Please remove it from your cart.`
                            : `"${cartItem.name}" (${cartItem.size}) only has ${result.available} left. Please update your cart.`
                        );
                        issueIds.add(cartItem.id);
                    }
                });
                if (issues.length > 0) {
                    setStockError(issues.join(" "));
                    setStockIssueIds(issueIds);
                    setStockChecking(false);
                    return;
                }
            }
        } catch {
            // Network failure — let the server catch it at reserve time
        } finally {
            setStockChecking(false);
        }

        setLoading(true);
        try {
            const payload = {
                // Which attempt this one supersedes, so its hold can be freed
                // before the new reservation is taken.
                previousOrderId: sessionStorage.getItem(PENDING_ORDER_KEY) || undefined,
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
                    // The zone only. /api/paystack/initialize resolves the
                    // amount itself — a client-supplied fee is never trusted.
                    delivery_zone: form.deliveryZone,
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
                // Remember which order is holding this customer's stock. Coming
                // back from Paystack without paying, that hold would otherwise
                // net their own items down to zero and read as "sold out".
                if (data.orderId) {
                    sessionStorage.setItem(PENDING_ORDER_KEY, data.orderId);
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
        // Reconciling can empty the cart. Falling through to the plain "your
        // cart is empty" page would drop the one thing the customer needs to
        // know: their items were taken out, and why.
        const emptiedByUs = removedLines.length > 0;
        return (
            <div className="pt-32 pb-32 px-6 flex flex-col justify-center items-center text-center">
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-4">Checkout</h1>
                {emptiedByUs ? (
                    <>
                        <p className="text-neutral-700 mb-2 max-w-md">
                            {removedLines.length === 1
                                ? `"${removedLines[0].name}" sold out while it was in your cart, so it has been removed.`
                                : `${removedLines.length} items sold out while they were in your cart and have been removed.`}
                        </p>
                        <p className="text-neutral-500 mb-8 italic">Your cart is now empty. Nothing has been charged.</p>
                        <div className="w-full max-w-md space-y-3 mb-8">
                            {removedLines.map(line => (
                                <div key={line.id} className="flex items-center gap-3 bg-red-50 border border-red-200 p-3 text-left">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-red-700 line-through">{line.name}</p>
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Size: {line.size} · Qty: {line.quantity}</p>
                                    </div>
                                    <span className="text-[10px] text-red-600 uppercase tracking-widest">
                                        {line.reason === "sold_out" ? "Sold out" : "Unavailable"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-neutral-500 mb-8 italic">Your cart is currently empty.</p>
                )}
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

                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-8">

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
                        {showZonePicker && (
                            <div className="mt-5">
                                <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Delivery Zone</label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="cursor-pointer">
                                        <input type="radio" name="deliveryZone" value="accra" checked={form.deliveryZone === "accra"} onChange={handleChange} className="sr-only peer" />
                                        <span className="block px-6 py-3 text-xs uppercase tracking-widest border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors">
                                            Within Accra · GHS {deliverySettings.accra.toFixed(2)}
                                        </span>
                                    </label>
                                    <label className="cursor-pointer">
                                        <input type="radio" name="deliveryZone" value="outside" checked={form.deliveryZone === "outside"} onChange={handleChange} className="sr-only peer" />
                                        <span className="block px-6 py-3 text-xs uppercase tracking-widest border border-neutral-200 peer-checked:border-black peer-checked:bg-black peer-checked:text-white transition-colors">
                                            Outside Accra · GHS {deliverySettings.outside.toFixed(2)}
                                        </span>
                                    </label>
                                </div>
                                <p className="mt-2 text-[11px] text-neutral-500">
                                    Outside Accra covers Kumasi, Takoradi, Akosombo and every other region.
                                </p>
                            </div>
                        )}
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

                </form>
            </div>

            {/* ── Pay: after the summary in the DOM so a phone shows the
                 summary first. The button submits the form above through its
                 `form` attribute, so it needs no wrapper of its own. ── */}
            {/* ── RIGHT: Order Summary ── */}
            <div className="bg-neutral-50 p-8 md:p-12 border border-neutral-100 h-fit space-y-8">
                <h2 className="font-serif text-xl tracking-widest uppercase">Order Summary</h2>

                {/* Regular Items */}
                {items.filter(i => !i.isPreOrder).length > 0 && (
                    <div className="space-y-6">
                        {items.filter(i => !i.isPreOrder).map(item => {
                            const hasIssue = stockIssueIds.has(item.id);
                            return (
                                <div key={item.id} className={`flex gap-4 items-center rounded-sm transition-colors ${hasIssue ? "bg-red-50 border border-red-200 p-2 -mx-2" : ""}`}>
                                    <div className={`w-16 h-16 bg-white overflow-hidden flex-shrink-0 border relative ${hasIssue ? "border-red-300" : "border-neutral-200"}`}>
                                        {item.imageUrl ? (
                                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-100" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-medium text-sm ${hasIssue ? "text-red-700" : "text-neutral-900"}`}>{item.name}</h3>
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Size: {item.size}</p>

                                        {/* Quantity controls — every change re-runs the
                                            availability check, the discounts and the total. */}
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <button
                                                type="button"
                                                aria-label={`Reduce quantity of ${item.name}`}
                                                onClick={() => item.quantity > 1
                                                    ? updateQuantity(item.id, item.quantity - 1)
                                                    : removeItem(item.id)}
                                                className="w-6 h-6 border border-neutral-300 text-neutral-600 text-xs leading-none hover:border-black hover:text-black transition-colors"
                                            >−</button>
                                            <span className="text-xs tabular-nums w-5 text-center">{item.quantity}</span>
                                            <button
                                                type="button"
                                                aria-label={`Increase quantity of ${item.name}`}
                                                disabled={item.quantity >= (availableById[item.id] ?? Number.MAX_SAFE_INTEGER)}
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-6 h-6 border border-neutral-300 text-neutral-600 text-xs leading-none hover:border-black hover:text-black transition-colors disabled:opacity-30 disabled:hover:border-neutral-300"
                                            >+</button>
                                            <button
                                                type="button"
                                                aria-label={`Remove ${item.name} from cart`}
                                                onClick={() => removeItem(item.id)}
                                                className="ml-auto text-[10px] uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors"
                                            >Remove</button>
                                        </div>

                                        {clampedLines[item.id] && (
                                            <p className="text-[10px] text-amber-600 mt-1 font-medium">
                                                Reduced from {clampedLines[item.id].from} — only {clampedLines[item.id].to} left
                                            </p>
                                        )}
                                        {item.quantity >= (availableById[item.id] ?? Number.MAX_SAFE_INTEGER) && !clampedLines[item.id] && !item.isPreOrder && (
                                            <p className="text-[10px] text-neutral-400 mt-1">That is all we have in stock</p>
                                        )}
                                        {hasIssue && <p className="text-[10px] text-red-500 mt-0.5 font-medium">Out of stock</p>}
                                    </div>
                                    <p className={`font-medium text-sm ${hasIssue ? "text-red-400 line-through" : ""}`}>GHS {(getEffectivePrice(item) * item.quantity).toFixed(2)}</p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Removed for unavailability — shown so the total is never
                    seen to change without explanation. */}
                {removedLines.length > 0 && (
                    <div className="space-y-4">
                        {removedLines.map(line => (
                            <div key={line.id} className="flex gap-4 items-center rounded-sm bg-red-50 border border-red-200 p-3">
                                <div className="w-16 h-16 bg-white overflow-hidden flex-shrink-0 border border-red-200 relative opacity-60">
                                    {line.imageUrl ? (
                                        <Image src={line.imageUrl} alt={line.name} fill className="object-cover grayscale" sizes="64px" />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-100" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-sm text-red-700 line-through">{line.name}</h3>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Size: {line.size} · Qty: {line.quantity}</p>
                                    <p className="text-[10px] text-red-600 mt-0.5 font-medium">
                                        {line.reason === "sold_out" ? "Removed — just sold out" : "Removed — no longer available"}
                                    </p>
                                    {undoEnabled ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Re-adding re-runs the availability check, so this
                                                // can never restore something genuinely sold out.
                                                addItem(line.item);
                                                setRemovedLines(prev => prev.filter(l => l.id !== line.id));
                                                reconciledKey.current = "";
                                            }}
                                            className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-black transition-colors mt-1 underline"
                                        >Undo</button>
                                    ) : (
                                        <p className="text-[10px] text-neutral-400 mt-1">You can add it again from the product page if it returns.</p>
                                    )}
                                </div>
                                <p className="font-medium text-sm text-red-400 line-through">
                                    GHS {(getEffectivePrice(line.item) * line.quantity).toFixed(2)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pre-Order Items */}
                {items.some(i => i.isPreOrder) && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-t border-amber-200 pt-4">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                                Pre-Order Items
                            </span>
                            <span className="text-[10px] text-amber-500">· Ships when available</span>
                        </div>
                        {items.filter(i => i.isPreOrder).map(item => (
                            <div key={item.id} className="flex gap-4 items-center">
                                <div className="w-16 h-16 bg-white overflow-hidden flex-shrink-0 border border-amber-200 relative">
                                    {item.imageUrl ? (
                                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                                    ) : (
                                        <div className="w-full h-full bg-amber-50" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-medium text-sm text-neutral-900">{item.name}</h3>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Size: {item.size} · Qty: {item.quantity}</p>
                                    {item.estimatedAvailability && (
                                        <p className="text-[10px] text-amber-600 mt-0.5">
                                            Est. {new Date(item.estimatedAvailability).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                        </p>
                                    )}
                                </div>
                                <p className="font-medium text-sm">GHS {(getEffectivePrice(item) * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                )}

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

                    {deliveryFee > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-neutral-500 uppercase tracking-widest text-xs">Delivery ({zoneLabel(chargedZone)})</span>
                            {/* A code that reaches the delivery fee shows the fee
                                struck through, so the customer can see what their
                                gift card or free-shipping coupon actually did. */}
                            {discountSplit.deliveryAmount > 0 ? (
                                <span>
                                    <span className="line-through text-neutral-400 mr-2">GHS {deliveryFee.toFixed(2)}</span>
                                    <span>{payableDelivery > 0 ? `GHS ${payableDelivery.toFixed(2)}` : "Free"}</span>
                                </span>
                            ) : (
                                <span>GHS {deliveryFee.toFixed(2)}</span>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-neutral-200">
                        <span className="font-serif tracking-widest uppercase">Total</span>
                        <span className="font-medium text-lg">GHS {finalTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* ── Pay ── */}
            <div className="lg:col-start-1">
                {stockError && (
                    <p className="text-xs text-red-600 text-center font-medium py-2">{stockError}</p>
                )}
                {stockChecking && (
                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest text-center">Checking stock availability...</p>
                )}

                <button
                    type="submit"
                    form="checkout-form"
                    disabled={loading || stockChecking || !!stockError}
                    className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 block text-center"
                >
                    {loading ? "Processing..." : stockChecking ? "Checking availability..." : `Pay GHS ${finalTotal.toFixed(2)}`}
                </button>
            </div>
        </div>
    );
}
