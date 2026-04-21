// src/app/(dashboard)/pos/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Search, Plus, Minus, Trash2, Send, Copy, Check, UserPlus, Users } from 'lucide-react';
import type { PosProduct, PosItem } from '@/types/pos';

type Contact = { id: string | null; name: string; email: string; phone: string | null };
type CustomerMode = 'search' | 'new';

function ProductCard({ product, onAdd }: { product: PosProduct; onAdd: (p: PosProduct, size: string | null, color: string | null) => void }) {
    const [selectedSize, setSelectedSize] = useState<string | null>(product.available_sizes?.[0] ?? null);
    const [selectedColor, setSelectedColor] = useState<string | null>(product.available_colors?.[0] ?? null);
    // For variant-tracked products we can't determine availability without a variant; treat as available
    const unavailable = product.track_inventory && !product.track_variant_inventory && product.inventory_count <= 0;

    return (
        <div className={`border border-neutral-100 p-2 space-y-2 ${unavailable ? 'opacity-40' : ''}`}>
            {product.image_urls?.[0] && (
                <div className="aspect-[4/5] bg-neutral-50 overflow-hidden">
                    <img src={product.image_urls[0]} alt={product.name} className="w-full h-full object-cover object-top" />
                </div>
            )}
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider line-clamp-2 leading-tight">{product.name}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">GH&#8373;{Number(product.price_ghs).toFixed(2)}</p>
                {product.track_inventory && !product.track_variant_inventory && (
                    <p className={`text-[9px] uppercase tracking-widest mt-0.5 ${product.inventory_count > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {product.inventory_count > 0 ? `${product.inventory_count} left` : 'Out of stock'}
                    </p>
                )}
            </div>
            {product.available_sizes && product.available_sizes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {[...new Set(product.available_sizes)].map(s => (
                        <button key={s} onClick={() => setSelectedSize(s)}
                            className={`px-1.5 py-0.5 text-[9px] uppercase tracking-widest border transition-colors ${selectedSize === s ? 'bg-black text-white border-black' : 'border-neutral-200 text-neutral-600 hover:border-black'}`}>
                            {s}
                        </button>
                    ))}
                </div>
            )}
            {product.available_colors && product.available_colors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {[...new Set(product.available_colors)].map(c => (
                        <button key={c} onClick={() => setSelectedColor(c)}
                            className={`px-1.5 py-0.5 text-[9px] uppercase tracking-widest border transition-colors ${selectedColor === c ? 'bg-black text-white border-black' : 'border-neutral-200 text-neutral-600 hover:border-black'}`}>
                            {c}
                        </button>
                    ))}
                </div>
            )}
            <button
                disabled={unavailable}
                onClick={() => !unavailable && onAdd(product, selectedSize, selectedColor)}
                className="w-full py-1.5 bg-black text-white text-[9px] uppercase tracking-[0.2em] font-bold hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
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
        setProducts((data ?? []).map((p: any) => ({
            ...p,
            inventory_count: p.inventory_count ?? 0,
        })));
    }, []);

    useEffect(() => { searchProducts(query); }, [query, searchProducts]);

    useEffect(() => {
        if (!contactSearch.trim()) { setContacts([]); return; }
        const t = setTimeout(async () => {
            const q = contactSearch.trim();
            // Search contacts table AND orders (order customers aren't always in contacts)
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

    return (
        // Negative margins escape dashboard layout padding; h-screen pins both panels to viewport
        <div className="-mx-6 -mt-20 md:-mx-12 md:-mt-12 h-screen overflow-hidden flex gap-0">
            {/* LEFT: Product Browser */}
            <div className="flex-1 flex flex-col border-r border-neutral-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100 shrink-0">
                    <h1 className="text-sm font-bold uppercase tracking-[0.3em] mb-3">Point of Sale</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                        <input
                            type="text" placeholder="Search by name or SKU..." value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-xs border border-neutral-200 focus:outline-none focus:border-black transition-colors"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 content-start">
                    {products.map(p => (
                        <ProductCard key={p.id} product={p} onAdd={addToCart} />
                    ))}
                    {products.length === 0 && (
                        <p className="col-span-full text-[10px] uppercase tracking-widest text-neutral-400 text-center py-12">No products found</p>
                    )}
                </div>
            </div>

            {/* RIGHT: Cart + Customer — fixed height, scrollable cart, sticky footer */}
            <div className="w-[360px] shrink-0 flex flex-col bg-white overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                    <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-500 mb-3">Cart</h2>
                    {cart.length === 0 && (
                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest text-center py-8">Add products from the left</p>
                    )}
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3 py-2 border-b border-neutral-50">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider truncate">{item.name}</p>
                                {(item.size || item.color) && (
                                    <p className="text-[10px] text-neutral-400 mt-0.5">{[item.size, item.color].filter(Boolean).join(' / ')}</p>
                                )}
                                <p className="text-xs text-neutral-500 mt-0.5">GH&#8373;{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 flex items-center justify-center border border-neutral-200 hover:border-black transition-colors"><Minus size={10} /></button>
                                <span className="text-xs w-6 text-center">{item.quantity}</span>
                                <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 flex items-center justify-center border border-neutral-200 hover:border-black transition-colors"><Plus size={10} /></button>
                                <button onClick={() => removeItem(idx)} className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors ml-1"><Trash2 size={10} /></button>
                            </div>
                        </div>
                    ))}
                    {cart.length > 0 && (
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-xs uppercase tracking-widest font-bold">Total</span>
                            <span className="text-sm font-bold">GH&#8373;{cartTotal.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                {/* Sticky bottom: customer + send */}
                <div className="px-5 py-4 border-t border-neutral-100 space-y-3 shrink-0">
                    <div className="flex gap-2">
                        <button onClick={() => setCustomerMode('search')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${customerMode === 'search' ? 'bg-black text-white border-black' : 'border-neutral-200 text-neutral-600 hover:border-black'}`}>
                            <Users size={10} /> Existing
                        </button>
                        <button onClick={() => setCustomerMode('new')} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${customerMode === 'new' ? 'bg-black text-white border-black' : 'border-neutral-200 text-neutral-600 hover:border-black'}`}>
                            <UserPlus size={10} /> New
                        </button>
                    </div>

                    {customerMode === 'search' ? (
                        <div className="space-y-2">
                            <input
                                type="text" placeholder="Search by name, email or phone..." value={contactSearch}
                                onChange={e => {
                                    const val = e.target.value;
                                    setContactSearch(val);
                                    // Only clear the selection if the user has edited away from the contact's name
                                    if (selectedContact && val !== selectedContact.name) {
                                        setSelectedContact(null);
                                    }
                                }}
                                className="w-full px-3 py-2 text-xs border border-neutral-200 focus:outline-none focus:border-black transition-colors"
                            />
                            {contacts.length > 0 && !selectedContact && (
                                <div className="border border-neutral-100 divide-y divide-neutral-50 max-h-28 overflow-y-auto">
                                    {contacts.map(c => (
                                        <button key={c.email} onClick={() => { setSelectedContact(c); setContactSearch(c.name); setContacts([]); }}
                                            className="w-full text-left px-3 py-2 hover:bg-neutral-50 transition-colors">
                                            <p className="text-xs font-semibold">{c.name}</p>
                                            <p className="text-[10px] text-neutral-400">{c.email}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedContact && (
                                <div className="p-2 bg-neutral-50 border border-neutral-100">
                                    <p className="text-xs font-bold">{selectedContact.name}</p>
                                    <p className="text-[10px] text-neutral-500">{selectedContact.email}</p>
                                    {selectedContact.phone && <p className="text-[10px] text-neutral-500">{selectedContact.phone}</p>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {[
                                { key: 'name', placeholder: 'Full Name *', type: 'text' },
                                { key: 'email', placeholder: 'Email *', type: 'email' },
                                { key: 'phone', placeholder: 'Phone', type: 'tel' },
                                { key: 'address', placeholder: 'Address', type: 'text' },
                            ].map(f => (
                                <input key={f.key} type={f.type} placeholder={f.placeholder}
                                    value={(newCustomer as any)[f.key]}
                                    onChange={e => setNewCustomer(p => ({ ...p, [f.key]: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs border border-neutral-200 focus:outline-none focus:border-black transition-colors"
                                />
                            ))}
                        </div>
                    )}

                    <textarea
                        placeholder="Staff notes (optional)" value={notes}
                        onChange={e => setNotes(e.target.value)} rows={2}
                        className="w-full px-3 py-2 text-xs border border-neutral-200 focus:outline-none focus:border-black transition-colors resize-none"
                    />

                    {paymentUrl ? (
                        <div className="space-y-2">
                            <div className="p-3 bg-green-50 border border-green-100">
                                <p className="text-[10px] uppercase tracking-widest text-green-700 font-bold mb-1">Link Sent!</p>
                                <p className="text-[10px] text-green-600 break-all font-mono">{paymentUrl}</p>
                            </div>
                            <button onClick={copyUrl} className="w-full py-2.5 border border-black text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-colors">
                                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy Link'}
                            </button>
                            <button onClick={reset} className="w-full py-2.5 text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-black transition-colors">
                                New Order
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleSend}
                            disabled={sending || cart.length === 0}
                            className="w-full py-3.5 bg-black text-white text-[10px] uppercase tracking-[0.3em] font-black flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Send size={12} />
                            {sending ? 'Sending...' : `Send Link — GH\u20B3${cartTotal.toFixed(2)}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
