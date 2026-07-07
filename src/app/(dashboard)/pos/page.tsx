// src/app/(dashboard)/pos/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { PosProduct, PosItem } from '@/types/pos';

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
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' });
    const [notes, setNotes] = useState('');
    const [sending, setSending] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const searchProducts = useCallback(async (q: string) => {
        let dbQuery = supabase
            .from('products')
            .select('id, name, slug, sku, price_ghs, image_urls, inventory_count, track_inventory, track_variant_inventory, available_sizes, available_colors')
            .eq('is_active', true)
            .limit(40);
        if (q.trim()) dbQuery = dbQuery.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
        const { data } = await dbQuery;
        setProducts((data ?? []).map((p: any) => ({ ...p, inventory_count: p.inventory_count ?? 0 })));
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

    const handleSend = async () => {
        if (cart.length === 0) { toast.error('Cart is empty'); return; }
        if (customerMode === 'search') {
            if (!selectedContact) { toast.error('Please select a customer'); return; }
        } else {
            if (!newCustomer.name.trim()) { toast.error('Customer name is required'); return; }
            if (!newCustomer.email.trim()) { toast.error('Customer email is required'); return; }
        }
        const customer = customerMode === 'search' ? selectedContact! : newCustomer;
        setSending(true);
        try {
            const sessionRes = await fetch('/api/pos/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: customer.name,
                    customer_email: customer.email,
                    customer_phone: ('phone' in customer ? customer.phone : null) || null,
                    customer_address: ('address' in customer ? customer.address : null) || null,
                    contact_id: customerMode === 'search' ? (selectedContact?.id ?? undefined) : undefined,
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
            const { paymentUrl: url, error: sendError } = await sendRes.json();
            if (!sendRes.ok || !url) throw new Error(sendError ?? 'Failed to send link');

            setPaymentUrl(url);
            toast.success('Payment link sent!');
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
        setCart([]); setPaymentUrl(null); setSelectedContact(null);
        setNewCustomer({ name: '', email: '', phone: '', address: '' });
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6 }}>
                            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, color: "var(--ac-ink)" }}>Total</span>
                            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--f-mono)", color: "var(--ac-ink)" }}>GH₵{cartTotal.toFixed(2)}</span>
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
                                        <button key={c.email} onClick={() => { setSelectedContact(c); setContactSearch(c.name); setContacts([]); }}
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
                                    {selectedContact.phone && <p style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>{selectedContact.phone}</p>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {[
                                { key: 'name', placeholder: 'Full Name *', type: 'text' },
                                { key: 'email', placeholder: 'Email *', type: 'email' },
                                { key: 'phone', placeholder: 'Phone', type: 'tel' },
                                { key: 'address', placeholder: 'Address', type: 'text' },
                            ].map(f => (
                                <input key={f.key} type={f.type} placeholder={f.placeholder}
                                    value={(newCustomer as any)[f.key]}
                                    onChange={e => setNewCustomer(p => ({ ...p, [f.key]: e.target.value }))}
                                    style={inputStyle} />
                            ))}
                        </div>
                    )}

                    <textarea placeholder="Staff notes (optional)" value={notes}
                        onChange={e => setNotes(e.target.value)} rows={2}
                        style={{ ...inputStyle, resize: "none" }} />

                    {paymentUrl ? (
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
                            {sending ? 'Sending...' : `Send Link — GH₵${cartTotal.toFixed(2)}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
