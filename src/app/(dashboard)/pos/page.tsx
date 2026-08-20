// src/app/(dashboard)/pos/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { PosProduct, PosItem, PosDeliveryMethod, PosAppliedDiscount } from '@/types/pos';
import { GHANA_REGIONS, COUNTRIES, DEFAULT_COUNTRY, DEFAULT_REGION } from '@/lib/geo';
import {
    DELIVERY_DEFAULTS,
    parseDeliverySettings,
    resolveDeliveryFee,
    zoneForRegion,
    zoneLabel,
    type DeliveryFeeSettings,
    type DeliveryZone,
} from '@/lib/delivery';

type Contact = { id: string | null; name: string; email: string; phone: string | null };
type CustomerMode = 'search' | 'new';

function ProductCard({ product, onAdd }: { product: PosProduct; onAdd: (p: PosProduct, size: string | null, color: string | null) => void }) {
    const [selectedSize, setSelectedSize] = useState<string | null>(product.available_sizes?.[0] ?? null);
    const [selectedColor, setSelectedColor] = useState<string | null>(product.available_colors?.[0] ?? null);
    const unavailable = product.track_inventory && !product.track_variant_inventory && product.inventory_count <= 0;

    return (
        <div style={{ border: "1px solid var(--ac-line)", padding: 8, display: "flex", flexDirection: "column", gap: 6, opacity: unavailable ? 0.4 : 1, background: "var(--ac-panel)" }}>
            {product.image_urls?.[0] && (
                <div style={{ aspectRatio: "4/5", background: "var(--ac-panel-2)", overflow: "hidden" }}>
                    <img src={product.image_urls[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                </div>
            )}
            <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", lineHeight: 1.3, color: "var(--ac-ink)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.name}</p>
                <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 2 }}>GH₵{Number(product.price_ghs).toFixed(2)}</p>
                {product.track_inventory && !product.track_variant_inventory && (
                    <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 2, color: product.inventory_count > 0 ? "var(--ac-accent)" : "var(--ac-danger)" }}>
                        {product.inventory_count > 0 ? `${product.inventory_count} left` : 'Out of stock'}
                    </p>
                )}
            </div>
            {product.available_sizes && product.available_sizes.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {[...new Set(product.available_sizes)].map(s => (
                        <button key={s} onClick={() => setSelectedSize(s)}
                            style={{ padding: "2px 6px", fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", border: `1px solid ${selectedSize === s ? "var(--ac-accent)" : "var(--ac-line)"}`, background: selectedSize === s ? "var(--ac-accent)" : "transparent", color: selectedSize === s ? "#fff" : "var(--ac-ink-3)", cursor: "pointer" }}>
                            {s}
                        </button>
                    ))}
                </div>
            )}
            {product.available_colors && product.available_colors.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {[...new Set(product.available_colors)].map(c => (
                        <button key={c} onClick={() => setSelectedColor(c)}
                            style={{ padding: "2px 6px", fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", border: `1px solid ${selectedColor === c ? "var(--ac-accent)" : "var(--ac-line)"}`, background: selectedColor === c ? "var(--ac-accent)" : "transparent", color: selectedColor === c ? "#fff" : "var(--ac-ink-3)", cursor: "pointer" }}>
                            {c}
                        </button>
                    ))}
                </div>
            )}
            <button
                disabled={unavailable}
                onClick={() => !unavailable && onAdd(product, selectedSize, selectedColor)}
                style={{ width: "100%", padding: "6px 0", background: "var(--ac-ink)", color: "var(--ac-bg)", fontSize: 9, textTransform: "uppercase", letterSpacing: ".2em", fontWeight: 700, border: "none", cursor: unavailable ? "not-allowed" : "pointer", opacity: unavailable ? 0.3 : 1 }}>
                Add
            </button>
        </div>
    );
}

export default function POSPage() {
    const [query, setQuery] = useState('');
    const [products, setProducts] = useState<PosProduct[]>([]);
    const [cart, setCart] = useState<PosItem[]>([]);
    const [customerMode, setCustomerMode] = useState<CustomerMode>('search');
    const [contactSearch, setContactSearch] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '' });
    // Shared across both customer modes — the payment link goes out by SMS as
    // well as email, so a phone is needed even for an existing contact that
    // has none on file
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState<PosDeliveryMethod>('pickup');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryCountry, setDeliveryCountry] = useState(DEFAULT_COUNTRY);
    const [deliveryRegion, setDeliveryRegion] = useState(DEFAULT_REGION);
    const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>(zoneForRegion(DEFAULT_REGION));
    const [deliverySettings, setDeliverySettings] = useState<DeliveryFeeSettings>(DELIVERY_DEFAULTS);
    // Set once staff taps a zone button; from then on it survives region changes.
    const zoneTouched = useRef(false);
    const [discountInput, setDiscountInput] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState<PosAppliedDiscount | null>(null);
    const [checkingCode, setCheckingCode] = useState(false);
    const [notes, setNotes] = useState('');
    const [sending, setSending] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [completedOrderRef, setCompletedOrderRef] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const searchProducts = useCallback(async (q: string) => {
        let dbQuery = supabase
            .from('products')
            .select('id, name, slug, sku, price_ghs, image_urls, inventory_count, track_inventory, track_variant_inventory, available_sizes, available_colors')
            .eq('is_active', true)
            .limit(40);
        if (q.trim()) dbQuery = dbQuery.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
        const { data } = await dbQuery;
        const rows = (data ?? []).map((p: any) => ({ ...p, inventory_count: p.inventory_count ?? 0 }));

        // Show stock net of live holds. The raw count lets two tills each see
        // "2 left" for the same last-2 units and both promise them. One batched
        // call — per-product RPCs would be 40 round trips on every keystroke.
        const trackedIds = rows.filter((p: any) => p.track_inventory && !p.track_variant_inventory).map((p: any) => p.id);
        if (trackedIds.length > 0) {
            const { data: avail } = await supabase.rpc('fn_available_stock_bulk', { p_product_ids: trackedIds });
            if (Array.isArray(avail)) {
                const availMap = new Map(avail.map((a: any) => [a.product_id, a.available]));
                for (const p of rows) {
                    const net = availMap.get(p.id);
                    if (typeof net === 'number') p.inventory_count = net;
                }
            }
        }
        setProducts(rows);
    }, []);

    useEffect(() => { searchProducts(query); }, [query, searchProducts]);

    useEffect(() => {
        if (!contactSearch.trim()) { setContacts([]); return; }
        const t = setTimeout(async () => {
            const q = contactSearch.trim();
            const [contactsRes, ordersRes] = await Promise.all([
                supabase.from('contacts').select('id, name, email, phone')
                    .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`).limit(6),
                supabase.from('orders').select('customer_name, customer_email, customer_phone')
                    .or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`)
                    .order('created_at', { ascending: false }).limit(8),
            ]);
            const seen = new Set<string>();
            const results: Contact[] = [];
            for (const c of (contactsRes.data ?? [])) {
                if (!seen.has(c.email)) { seen.add(c.email); results.push(c); }
            }
            for (const o of (ordersRes.data ?? [])) {
                if (!seen.has(o.customer_email)) {
                    seen.add(o.customer_email);
                    results.push({ id: null, name: o.customer_name, email: o.customer_email, phone: o.customer_phone ?? null });
                }
            }
            setContacts(results.slice(0, 8));
        }, 300);
        return () => clearTimeout(t);
    }, [contactSearch]);

    // Own select, same reason as storefront checkout: a missing column must
    // not take any other till query down with it.
    useEffect(() => {
        supabase
            .from('store_settings')
            .select('delivery_fees_enabled, delivery_fee_accra, delivery_fee_outside')
            .eq('id', 'default')
            .maybeSingle()
            .then((res: { data: unknown }) => setDeliverySettings(parseDeliverySettings(res.data)));
    }, []);

    const addToCart = (product: PosProduct, size: string | null, color: string | null) => {
        setCart(prev => {
            const exists = prev.find(i => i.productId === product.id && i.size === size && i.color === color);
            if (exists) return prev.map(i => i.productId === product.id && i.size === size && i.color === color
                ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { productId: product.id, variantId: null, name: product.name, size, color, price: product.price_ghs, quantity: 1 }];
        });
        toast.success(`${product.name} added`);
    };

    const updateQty = (idx: number, delta: number) => {
        setCart(prev => prev.map((i, n) => n === idx ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
    };

    const removeItem = (idx: number) => setCart(prev => prev.filter((_, n) => n !== idx));
    const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const discountAmount = Math.min(appliedDiscount?.discount_amount ?? 0, cartTotal);
    const deliveryFee = resolveDeliveryFee({
        settings: deliverySettings,
        country: deliveryCountry,
        deliveryMethod,
        zone: deliveryZone,
    });
    // Delivery is charged on top of the discounted goods. Coupon lookups keep
    // using cartTotal below — a delivery charge must not enlarge what a coupon
    // is allowed to discount.
    const payableTotal = parseFloat(Math.max(0, cartTotal - discountAmount + deliveryFee).toFixed(2));
    const showZonePicker = deliverySettings.enabled
        && deliveryCountry === 'Ghana'
        && deliveryMethod === 'delivery';

    // Preview only — send-link recomputes the code's worth server-side and is
    // the value actually charged.
    const lookupCode = useCallback(async (code: string, subtotal: number): Promise<PosAppliedDiscount | string> => {
        const res = await fetch('/api/checkout/validate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, subtotal }),
        });
        const data = await res.json();
        if (!data.valid) return data.error ?? 'Code not found or invalid.';
        return {
            code: data.code,
            type: data.type,
            discount_type: data.discount_type,
            discount_amount: Number(data.discount_amount) || 0,
            label: data.label ?? 'Discount applied',
        };
    }, []);

    const applyCode = async () => {
        const code = discountInput.trim();
        if (!code) { toast.error('Enter a gift card or discount code'); return; }
        if (cart.length === 0) { toast.error('Add items before applying a code'); return; }
        setCheckingCode(true);
        try {
            const result = await lookupCode(code, cartTotal);
            if (typeof result === 'string') { toast.error(result); return; }
            setAppliedDiscount(result);
            setDiscountInput('');
            toast.success(`${result.code} applied — ${result.label}`);
        } catch {
            toast.error('Could not check that code. Try again.');
        } finally {
            setCheckingCode(false);
        }
    };

    const removeCode = () => {
        setAppliedDiscount(null);
        setDiscountInput('');
    };

    // A percentage coupon or partly-consuming gift card is worth a different
    // amount once the basket changes — re-price it instead of showing a stale figure.
    useEffect(() => {
        if (!appliedDiscount) return;
        if (cart.length === 0) { setAppliedDiscount(null); return; }
        const t = setTimeout(async () => {
            try {
                const result = await lookupCode(appliedDiscount.code, cartTotal);
                if (typeof result === 'string') {
                    setAppliedDiscount(null);
                    toast.error(`${appliedDiscount.code} no longer applies: ${result}`);
                    return;
                }
                setAppliedDiscount(prev => (prev && prev.code === result.code ? result : prev));
            } catch {
                // Leave the current preview in place — send-link is the authority
            }
        }, 400);
        return () => clearTimeout(t);
        // Re-price on basket value only; appliedDiscount.code identifies the code in play
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartTotal, appliedDiscount?.code, cart.length, lookupCode]);

    const handleSend = async () => {
        if (cart.length === 0) { toast.error('Cart is empty'); return; }
        if (customerMode === 'search') {
            if (!selectedContact) { toast.error('Please select a customer'); return; }
        } else {
            if (!newCustomer.name.trim()) { toast.error('Customer name is required'); return; }
        }
        // Phone is the one channel every sale must have: email is optional, so
        // for a walk-in without one the SMS is the only way the link travels.
        if (!customerPhone.trim()) { toast.error('Customer phone is required — the link is sent by SMS'); return; }
        if (customerPhone.replace(/\D/g, '').length < 9) { toast.error('That phone number looks incomplete'); return; }
        if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
            toast.error('Delivery address is required');
            return;
        }
        const customer = customerMode === 'search' ? selectedContact! : newCustomer;
        setSending(true);
        try {
            // Same real-time stock gate the storefront runs before payment, so a
            // till and a customer can't both be promised the last unit. Nets off
            // live holds; pre-order items are exempt.
            const checkItems = cart.map(i => ({
                productId: i.productId,
                variantId: i.variantId,
                size: i.size ?? undefined,
                color: i.color ?? undefined,
                quantity: i.quantity,
            }));
            const stockRes = await fetch(`/api/inventory/check?items=${encodeURIComponent(JSON.stringify(checkItems))}`);
            const stockData = await stockRes.json();
            if (Array.isArray(stockData?.results)) {
                const issues: string[] = [];
                stockData.results.forEach((result: any, idx: number) => {
                    const line = cart[idx];
                    if (!line) return;
                    if (!result.isActive) {
                        issues.push(`"${line.name}" is no longer available.`);
                    } else if (!result.preorderEnabled && result.available < line.quantity) {
                        issues.push(result.available === 0
                            ? `"${line.name}"${line.size ? ` (${line.size})` : ''} is sold out.`
                            : `"${line.name}"${line.size ? ` (${line.size})` : ''} only has ${result.available} left.`);
                    }
                });
                if (issues.length > 0) {
                    toast.error(issues.join(' '));
                    setSending(false);
                    return;
                }
            }

            const sessionRes = await fetch('/api/pos/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: customer.name,
                    customer_email: customer.email?.trim() || null,
                    customer_phone: customerPhone.trim(),
                    customer_address: deliveryMethod === 'delivery' ? deliveryAddress.trim() : null,
                    customer_country: deliveryMethod === 'delivery' ? deliveryCountry : null,
                    customer_region: deliveryMethod === 'delivery' ? deliveryRegion.trim() : null,
                    contact_id: customerMode === 'search' ? (selectedContact?.id ?? undefined) : undefined,
                    delivery_method: deliveryMethod,
                    delivery_zone: deliveryMethod === 'delivery' ? deliveryZone : null,
                    discount_code: appliedDiscount?.code ?? null,
                    items: cart,
                    notes,
                }),
            });
            const { sessionId, error: sessionError } = await sessionRes.json();
            if (!sessionRes.ok || !sessionId) throw new Error(sessionError ?? 'Failed to create session');

            const sendRes = await fetch('/api/pos/send-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            const { paymentUrl: url, error: sendError, delivery, completed, orderRef } = await sendRes.json();
            if (!sendRes.ok || !url) throw new Error(sendError ?? 'Failed to send link');

            setPaymentUrl(url);

            // Gift card covered the basket — the sale is already done, no link to chase
            if (completed) {
                setCompletedOrderRef(orderRef ?? null);
                toast.success(`Paid in full by gift card — order ${orderRef ?? ''} created`);
                return;
            }

            // Report what actually reached the customer. A failed SMS still leaves
            // a usable link on screen for staff to share manually.
            const emailStatus = delivery?.email as 'sent' | 'failed' | 'no_email' | undefined;
            const smsOk = delivery?.sms === 'sent';
            // A walk-in with no address is not a failed send — SMS is the whole
            // delivery in that case, so don't cry about an email nobody asked for.
            if (emailStatus === 'no_email') {
                if (smsOk) {
                    toast.success('Payment link sent by SMS');
                } else {
                    toast.error(`No email on file and the SMS failed${delivery?.smsError ? `: ${delivery.smsError}` : ''}. Share the link below.`);
                }
            } else if (emailStatus === 'sent' && smsOk) {
                toast.success('Payment link sent by email and SMS');
            } else if (emailStatus === 'sent' && !smsOk) {
                toast.error(`Email sent, but SMS failed${delivery?.smsError ? `: ${delivery.smsError}` : ''}. Share the link below.`);
            } else if (emailStatus !== 'sent' && smsOk) {
                toast.error(`SMS sent, but email failed${delivery?.emailError ? `: ${delivery.emailError}` : ''}.`);
            } else {
                toast.error('Link created but neither email nor SMS went out. Share the link below.');
            }
        } catch (e: any) {
            toast.error(e.message ?? 'Something went wrong');
        } finally {
            setSending(false);
        }
    };

    const copyUrl = () => {
        if (!paymentUrl) return;
        navigator.clipboard.writeText(paymentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setCart([]); setPaymentUrl(null); setCompletedOrderRef(null); setSelectedContact(null);
        setNewCustomer({ name: '', email: '' });
        setCustomerPhone('');
        setDeliveryMethod('pickup'); setDeliveryAddress('');
        setDeliveryCountry(DEFAULT_COUNTRY); setDeliveryRegion(DEFAULT_REGION);
        zoneTouched.current = false; setDeliveryZone(zoneForRegion(DEFAULT_REGION));
        setAppliedDiscount(null); setDiscountInput('');
        setNotes(''); setContactSearch('');
    };

    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", background: "var(--ac-panel)", color: "var(--ac-ink)", outline: "none", boxSizing: "border-box",
    };
    const modeActive: React.CSSProperties = { background: "var(--ac-ink)", color: "var(--ac-bg)", border: "1px solid var(--ac-ink)" };
    const modeInactive: React.CSSProperties = { background: "transparent", color: "var(--ac-ink-3)", border: "1px solid var(--ac-line)" };

    return (
        <div style={{ margin: "-80px -48px 0", height: "100vh", overflow: "hidden", display: "flex" }}>
            {/* LEFT: Product Browser */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid var(--ac-line)", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--ac-line)", flexShrink: 0, background: "var(--ac-panel)" }}>
                    <h1 style={{ fontFamily: "var(--f-display)", fontSize: 16, fontWeight: 600, color: "var(--ac-ink)", textTransform: "uppercase", letterSpacing: ".2em", marginBottom: 10 }}>Point of Sale</h1>
                    <div style={{ position: "relative" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ac-ink-4)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" placeholder="Search by name or SKU..." value={query}
                            onChange={e => setQuery(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: 34 }} />
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, alignContent: "start", background: "var(--ac-bg)" }}>
                    {products.map(p => (
                        <ProductCard key={p.id} product={p} onAdd={addToCart} />
                    ))}
                    {products.length === 0 && (
                        <p style={{ gridColumn: "1/-1", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ac-ink-4)", textAlign: "center", padding: "48px 0" }}>No products found</p>
                    )}
                </div>
            </div>

            {/* RIGHT: Cart + Customer */}
            <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--ac-panel)", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".2em", fontWeight: 700, color: "var(--ac-ink-4)", marginBottom: 4 }}>Cart</p>
                    {cart.length === 0 && (
                        <p style={{ fontSize: 10, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".08em", textAlign: "center", padding: "32px 0" }}>Add products from the left</p>
                    )}
                    {cart.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, paddingBottom: 8, borderBottom: "1px solid var(--ac-line)" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ac-ink)" }}>{item.name}</p>
                                {(item.size || item.color) && (
                                    <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 2 }}>{[item.size, item.color].filter(Boolean).join(' / ')}</p>
                                )}
                                <p style={{ fontSize: 11, color: "var(--ac-ink-3)", marginTop: 2 }}>GH₵{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                                <button onClick={() => updateQty(idx, -1)} style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--ac-line)", background: "transparent", cursor: "pointer", borderRadius: "var(--r-sm)", color: "var(--ac-ink-3)" }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </button>
                                <span style={{ fontSize: 11, width: 22, textAlign: "center", color: "var(--ac-ink)" }}>{item.quantity}</span>
                                <button onClick={() => updateQty(idx, 1)} style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--ac-line)", background: "transparent", cursor: "pointer", borderRadius: "var(--r-sm)", color: "var(--ac-ink-3)" }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </button>
                                <button onClick={() => removeItem(idx)} style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", color: "var(--ac-danger)", marginLeft: 2 }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {cart.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 6 }}>
                            {discountAmount > 0 && (
                                <>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>Subtotal</span>
                                        <span style={{ fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--ac-ink-3)" }}>GH₵{cartTotal.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>Discount ({appliedDiscount?.code})</span>
                                        <span style={{ fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--ac-accent)" }}>-GH₵{discountAmount.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            {deliveryFee > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>Delivery ({zoneLabel(deliveryZone)})</span>
                                    <span style={{ fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--ac-ink-3)" }}>GH₵{deliveryFee.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, color: "var(--ac-ink)" }}>Total</span>
                                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--f-mono)", color: "var(--ac-ink)" }}>GH₵{payableTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky bottom */}
                <div style={{ padding: "14px 18px", borderTop: "1px solid var(--ac-line)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, background: "var(--ac-panel)" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setCustomerMode('search')} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", cursor: "pointer", borderRadius: "var(--r-sm)", ...(customerMode === 'search' ? modeActive : modeInactive) }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            Existing
                        </button>
                        <button onClick={() => setCustomerMode('new')} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", cursor: "pointer", borderRadius: "var(--r-sm)", ...(customerMode === 'new' ? modeActive : modeInactive) }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                            New
                        </button>
                    </div>

                    {customerMode === 'search' ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <input type="text" placeholder="Search by name, email or phone..."
                                value={contactSearch}
                                onChange={e => {
                                    const val = e.target.value;
                                    setContactSearch(val);
                                    if (selectedContact && val !== selectedContact.name) setSelectedContact(null);
                                }}
                                style={inputStyle} />
                            {contacts.length > 0 && !selectedContact && (
                                <div style={{ border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", overflow: "hidden", maxHeight: 120, overflowY: "auto" }}>
                                    {contacts.map(c => (
                                        <button key={c.email} onClick={() => { setSelectedContact(c); setContactSearch(c.name); setContacts([]); setCustomerPhone(c.phone ?? ''); }}
                                            style={{ width: "100%", textAlign: "left", padding: "8px 10px", background: "var(--ac-panel-2)", border: "none", borderBottom: "1px solid var(--ac-line)", cursor: "pointer" }}>
                                            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ac-ink)" }}>{c.name}</p>
                                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>{c.email}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedContact && (
                                <div style={{ padding: "8px 10px", background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)" }}>
                                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ac-ink)" }}>{selectedContact.name}</p>
                                    <p style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>{selectedContact.email}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {[
                                { key: 'name', placeholder: 'Full Name *', type: 'text' },
                                { key: 'email', placeholder: 'Email (optional)', type: 'email' },
                            ].map(f => (
                                <input key={f.key} type={f.type} placeholder={f.placeholder}
                                    value={(newCustomer as any)[f.key]}
                                    onChange={e => setNewCustomer(p => ({ ...p, [f.key]: e.target.value }))}
                                    style={inputStyle} />
                            ))}
                        </div>
                    )}

                    {/* Phone applies to both modes — the payment link is texted as well as emailed */}
                    <input type="tel" placeholder="Phone * (link is sent by SMS)"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        style={inputStyle} />

                    {/* Gift card / discount code — same codes a customer can use at checkout */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".2em", fontWeight: 700, color: "var(--ac-ink-4)" }}>Gift Card / Discount</p>
                        {appliedDiscount ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", background: "color-mix(in srgb, var(--ac-accent) 10%, transparent)", border: "1px solid var(--ac-accent)", borderRadius: "var(--r-sm)" }}>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appliedDiscount.code}</p>
                                    <p style={{ fontSize: 10, color: "var(--ac-ink-3)", marginTop: 1 }}>{appliedDiscount.label}</p>
                                </div>
                                <button onClick={removeCode} style={{ flexShrink: 0, padding: "4px 8px", fontSize: 9, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, border: "1px solid var(--ac-line)", background: "transparent", color: "var(--ac-ink-4)", cursor: "pointer", borderRadius: "var(--r-sm)" }}>
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: "flex", gap: 6 }}>
                                <input type="text" placeholder="Enter code" value={discountInput}
                                    onChange={e => setDiscountInput(e.target.value.toUpperCase())}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCode(); } }}
                                    style={{ ...inputStyle, flex: 1, textTransform: "uppercase" }} />
                                <button onClick={applyCode} disabled={checkingCode || !discountInput.trim()}
                                    style={{ flexShrink: 0, padding: "0 14px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, border: "1px solid var(--ac-ink)", background: "transparent", color: "var(--ac-ink)", cursor: (checkingCode || !discountInput.trim()) ? "not-allowed" : "pointer", opacity: (checkingCode || !discountInput.trim()) ? 0.4 : 1, borderRadius: "var(--r-sm)" }}>
                                    {checkingCode ? '...' : 'Apply'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Fulfilment: staff picks how the customer receives the order */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".2em", fontWeight: 700, color: "var(--ac-ink-4)" }}>Fulfilment</p>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setDeliveryMethod('pickup')} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", cursor: "pointer", borderRadius: "var(--r-sm)", ...(deliveryMethod === 'pickup' ? modeActive : modeInactive) }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>
                                Store Pickup
                            </button>
                            <button onClick={() => setDeliveryMethod('delivery')} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", cursor: "pointer", borderRadius: "var(--r-sm)", ...(deliveryMethod === 'delivery' ? modeActive : modeInactive) }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                Delivery
                            </button>
                        </div>
                        {deliveryMethod === 'delivery' && (
                            <>
                                <textarea placeholder="Delivery address *" value={deliveryAddress}
                                    onChange={e => setDeliveryAddress(e.target.value)} rows={2}
                                    style={{ ...inputStyle, resize: "none" }} />
                                <select value={deliveryCountry}
                                    onChange={e => {
                                        const next = e.target.value;
                                        setDeliveryCountry(next);
                                        // Ghana picks from a fixed list; elsewhere it is free text
                                        const nextRegion = next === 'Ghana' ? DEFAULT_REGION : '';
                                        setDeliveryRegion(nextRegion);
                                        if (!zoneTouched.current) setDeliveryZone(zoneForRegion(nextRegion));
                                    }}
                                    style={inputStyle}>
                                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {deliveryCountry === 'Ghana' ? (
                                    <select value={deliveryRegion}
                                        onChange={e => {
                                            setDeliveryRegion(e.target.value);
                                            if (!zoneTouched.current) setDeliveryZone(zoneForRegion(e.target.value));
                                        }}
                                        style={inputStyle}>
                                        {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" placeholder="State / Region"
                                        value={deliveryRegion}
                                        onChange={e => setDeliveryRegion(e.target.value)}
                                        style={inputStyle} />
                                )}
                                {showZonePicker && (
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => { zoneTouched.current = true; setDeliveryZone('accra'); }}
                                            style={{ flex: 1, padding: "6px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", cursor: "pointer", borderRadius: "var(--r-sm)", ...(deliveryZone === 'accra' ? modeActive : modeInactive) }}>
                                            Within Accra · GH₵{deliverySettings.accra.toFixed(2)}
                                        </button>
                                        <button onClick={() => { zoneTouched.current = true; setDeliveryZone('outside'); }}
                                            style={{ flex: 1, padding: "6px 10px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", cursor: "pointer", borderRadius: "var(--r-sm)", ...(deliveryZone === 'outside' ? modeActive : modeInactive) }}>
                                            Outside Accra · GH₵{deliverySettings.outside.toFixed(2)}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <textarea placeholder="Staff notes (optional)" value={notes}
                        onChange={e => setNotes(e.target.value)} rows={2}
                        style={{ ...inputStyle, resize: "none" }} />

                    {completedOrderRef ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ padding: "10px 12px", background: "color-mix(in srgb, var(--ac-accent) 14%, transparent)", border: "1px solid var(--ac-accent)", borderRadius: "var(--r-sm)" }}>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-accent)", fontWeight: 700, marginBottom: 4 }}>Paid in full by gift card</p>
                                <p style={{ fontSize: 11, color: "var(--ac-ink)", fontWeight: 600 }}>Order #{completedOrderRef}</p>
                                <p style={{ fontSize: 10, color: "var(--ac-ink-3)", marginTop: 2 }}>Nothing to collect. Receipt sent to the customer.</p>
                            </div>
                            <button onClick={reset} style={{ width: "100%", padding: "10px 0", border: "1px solid var(--ac-ink)", background: "transparent", color: "var(--ac-ink)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700, cursor: "pointer", borderRadius: "var(--r-sm)" }}>
                                New Order
                            </button>
                        </div>
                    ) : paymentUrl ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ padding: "10px 12px", background: "color-mix(in srgb, var(--ac-accent) 10%, transparent)", border: "1px solid var(--ac-accent)", borderRadius: "var(--r-sm)" }}>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-accent)", fontWeight: 700, marginBottom: 4 }}>Link Sent!</p>
                                <p style={{ fontSize: 10, color: "var(--ac-ink-3)", wordBreak: "break-all", fontFamily: "var(--f-mono)" }}>{paymentUrl}</p>
                            </div>
                            <button onClick={copyUrl} style={{ width: "100%", padding: "10px 0", border: "1px solid var(--ac-ink)", background: "transparent", color: "var(--ac-ink)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: "var(--r-sm)" }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                            <button onClick={reset} style={{ width: "100%", padding: "8px 0", border: "none", background: "transparent", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700, color: "var(--ac-ink-4)", cursor: "pointer" }}>
                                New Order
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleSend} disabled={sending || cart.length === 0}
                            style={{ width: "100%", padding: "14px 0", background: "var(--ac-ink)", color: "var(--ac-bg)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".2em", fontWeight: 900, border: "none", cursor: (sending || cart.length === 0) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (sending || cart.length === 0) ? 0.4 : 1, borderRadius: "var(--r-sm)" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            {sending ? 'Sending...' : `Send Link — GH₵${payableTotal.toFixed(2)}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
