"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/store/useCart";
import { supabase } from "@/lib/supabase";

interface OrderItem {
    name: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
    imageUrl?: string;
}

interface Order {
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    shipping_address: { text?: string; country?: string; region?: string } | null;
    delivery_method: string | null;
    total_amount: number;
    items: OrderItem[];
    discount_code: string | null;
    discount_amount: number;
    status: string;
}

function CheckIcon() {
    return (
        <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, #059669, #10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 4px 24px rgba(5,150,105,0.25)",
        }}>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        </div>
    );
}

function GuestModal({ onClose }: { onClose: () => void }) {
    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: "fixed", inset: 0, background: "rgba(20,18,16,0.6)",
                zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
                padding: 20, backdropFilter: "blur(4px)",
            }}
        >
            <div style={{
                background: "#fff", width: "100%", maxWidth: 440,
                padding: "40px 36px", position: "relative",
                borderRadius: 4,
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute", top: 16, right: 16, width: 32, height: 32,
                        border: "none", background: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    aria-label="Close"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#141210" strokeWidth="1.8">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "#f0fdf4", display: "flex", alignItems: "center",
                    justifyContent: "center", marginBottom: 20,
                }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#059669" strokeWidth="1.8">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                </div>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 400, marginBottom: 12, color: "#141210" }}>
                    Check your inbox
                </p>
                <p style={{ fontSize: 14, color: "#525252", lineHeight: 1.7, marginBottom: 28 }}>
                    We&apos;ve sent a secure account setup link to your email address. Click the link in that email to set up your password and start tracking your order.
                </p>
                <button
                    onClick={onClose}
                    style={{
                        width: "100%", padding: "13px 24px",
                        background: "#141210", color: "#fff",
                        border: "none", fontSize: 11,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        cursor: "pointer", borderRadius: 2,
                    }}
                >
                    Got It
                </button>
            </div>
        </div>
    );
}

function Receipt({ order, orderRef }: { order: Order; orderRef: string }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [guestModalOpen, setGuestModalOpen] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }: { data: any }) => {
            setIsLoggedIn(!!session?.user);
        });
    }, []);

    const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
    const hasDiscount = order.discount_amount > 0;
    const subtotalBeforeDiscount = hasDiscount ? order.total_amount + order.discount_amount : null;
    const deliveryLabel = order.delivery_method?.toLowerCase().includes("pickup") ? "Store Pickup" : "Standard Delivery";

    return (
        <div style={{
            minHeight: "100vh", background: "#fafaf9",
            padding: "60px 20px", display: "flex", justifyContent: "center",
        }}>
            <div style={{ width: "100%", maxWidth: 560 }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <CheckIcon />
                    <p style={{
                        fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
                        color: "#737373", marginBottom: 8,
                    }}>
                        Order Confirmed
                    </p>
                    <h1 style={{
                        fontFamily: "Georgia, serif", fontSize: 32,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: "#141210", margin: "0 0 8px",
                    }}>
                        Thank You
                    </h1>
                    <p style={{ fontSize: 13, color: "#737373" }}>
                        Order <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#141210" }}>#{orderRef}</span>
                    </p>
                </div>

                {/* Receipt card */}
                <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
                    {/* Items */}
                    {items.length > 0 && (
                        <div style={{ padding: "24px 24px 0" }}>
                            <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 16 }}>
                                Items Ordered
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                {items.map((item, i) => (
                                    <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 16, borderBottom: "1px solid #f5f5f5" }}>
                                        {item.imageUrl && (
                                            <div style={{
                                                width: 60, height: 80, flexShrink: 0,
                                                background: "#f5f5f5", overflow: "hidden", borderRadius: 2,
                                            }}>
                                                <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            </div>
                                        )}
                                        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 500, color: "#141210", marginBottom: 4 }}>{item.name}</p>
                                                {(item.size || item.color) && (
                                                    <p style={{ fontSize: 11, color: "#737373", letterSpacing: "0.05em" }}>
                                                        {[item.size, item.color].filter(Boolean).join(" · ")} × {item.quantity}
                                                    </p>
                                                )}
                                            </div>
                                            <p style={{ fontSize: 13, fontWeight: 500, color: "#141210", flexShrink: 0 }}>
                                                GH₵{(item.price * item.quantity).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Totals */}
                    <div style={{ padding: "20px 24px", borderTop: items.length > 0 ? "none" : "none" }}>
                        {subtotalBeforeDiscount && (
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: "#737373" }}>Subtotal</span>
                                <span style={{ fontSize: 12, color: "#737373" }}>GH₵{subtotalBeforeDiscount.toFixed(2)}</span>
                            </div>
                        )}
                        {hasDiscount && (
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: "#16a34a" }}>
                                    Discount{order.discount_code ? ` (${order.discount_code})` : ""}
                                </span>
                                <span style={{ fontSize: 12, color: "#16a34a" }}>−GH₵{order.discount_amount.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #f5f5f5" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#141210", letterSpacing: "0.05em", textTransform: "uppercase" }}>Total</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#141210" }}>GH₵{order.total_amount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Delivery */}
                    <div style={{ padding: "20px 24px", borderTop: "1px solid #f5f5f5", background: "#fafaf9" }}>
                        <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a3a3a3", marginBottom: 12 }}>
                            Delivery
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#141210", marginBottom: 4 }}>{deliveryLabel}</p>
                        {order.shipping_address?.text && (
                            <p style={{ fontSize: 12, color: "#737373", lineHeight: 1.6 }}>
                                {order.shipping_address.text}
                                {order.shipping_address.region && `, ${order.shipping_address.region}`}
                                {order.shipping_address.country && `, ${order.shipping_address.country}`}
                            </p>
                        )}
                        {order.customer_name && (
                            <p style={{ fontSize: 12, color: "#737373", marginTop: 4 }}>{order.customer_name}</p>
                        )}
                    </div>
                </div>

                {/* Track Order CTA */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                    {isLoggedIn ? (
                        <Link
                            href={`/account/orders/${order.id}`}
                            style={{
                                display: "block", width: "100%", padding: "15px 24px",
                                background: "#141210", color: "#fff",
                                textAlign: "center", textDecoration: "none",
                                fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
                                borderRadius: 2,
                            }}
                        >
                            Track My Order →
                        </Link>
                    ) : (
                        <button
                            onClick={() => setGuestModalOpen(true)}
                            style={{
                                width: "100%", padding: "15px 24px",
                                background: "#141210", color: "#fff",
                                border: "none", fontSize: 11,
                                letterSpacing: "0.18em", textTransform: "uppercase",
                                cursor: "pointer", borderRadius: 2,
                            }}
                        >
                            Track My Order →
                        </button>
                    )}

                    <Link
                        href="/shop"
                        style={{
                            display: "block", textAlign: "center",
                            fontSize: 11, color: "#737373",
                            letterSpacing: "0.15em", textTransform: "uppercase",
                            textDecoration: "none", borderBottom: "1px solid #e5e5e5",
                            paddingBottom: 2, width: "fit-content", margin: "0 auto",
                        }}
                    >
                        Return to Collection
                    </Link>
                </div>
            </div>

            {guestModalOpen && <GuestModal onClose={() => setGuestModalOpen(false)} />}
        </div>
    );
}

function Skeleton() {
    return (
        <div style={{ minHeight: "100vh", background: "#fafaf9", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
            <div style={{ textAlign: "center", maxWidth: 420 }}>
                <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    border: "2px solid #e5e5e5", borderTopColor: "#141210",
                    margin: "0 auto 24px", animation: "spin 0.8s linear infinite",
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#737373" }}>
                    Verifying Payment…
                </p>
            </div>
        </div>
    );
}

function FallbackConfirm({ orderRef }: { orderRef: string }) {
    return (
        <div style={{ minHeight: "100vh", background: "#fafaf9", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
            <div style={{ textAlign: "center", maxWidth: 480 }}>
                <CheckIcon />
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, letterSpacing: "0.1em", textTransform: "uppercase", color: "#141210", marginBottom: 12 }}>
                    Thank You
                </h1>
                <p style={{ fontSize: 13, color: "#737373", marginBottom: 8 }}>
                    Your payment has been received. Your order is being processed.
                </p>
                <p style={{ fontSize: 12, color: "#a3a3a3", marginBottom: 32 }}>
                    Order Reference: <span style={{ fontFamily: "monospace", color: "#141210", fontWeight: 600 }}>#{orderRef}</span>
                </p>
                <p style={{ fontSize: 11, color: "#a3a3a3", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 32 }}>
                    Check your email for your receipt and tracking details.
                </p>
                <Link
                    href="/shop"
                    style={{ fontSize: 11, color: "#141210", letterSpacing: "0.15em", textTransform: "uppercase", borderBottom: "1px solid #141210", paddingBottom: 2, textDecoration: "none" }}
                >
                    Return to Collection
                </Link>
            </div>
        </div>
    );
}

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const trxref = searchParams.get("trxref");
    const ref = searchParams.get("reference");
    const reference = ref || trxref || "";
    const { clearCart } = useCart();

    const [order, setOrder] = useState<Order | null>(null);
    const [orderRef, setOrderRef] = useState("");
    const [loading, setLoading] = useState(true);
    const [attempts, setAttempts] = useState(0);

    const verify = useCallback(async () => {
        if (!reference) { setLoading(false); return; }
        try {
            const res = await fetch(`/api/paystack/verify?reference=${reference}`);
            const data = await res.json();
            if (data?.order) {
                setOrder(data.order);
                setOrderRef((data.order.id as string).substring(0, 8).toUpperCase());
                setLoading(false);
            } else if (data?.orderId) {
                // Order exists but full data not returned — use reference as fallback ref
                setOrderRef((data.orderId as string).substring(0, 8).toUpperCase());
                setLoading(false);
            }
        } catch {
            // handled by fallback UI
        }
    }, [reference]);

    useEffect(() => {
        clearCart();
        verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Poll up to 5 times (every 2s) if order not yet confirmed
    useEffect(() => {
        if (!loading || !reference || attempts >= 5) {
            if (attempts >= 5) setLoading(false);
            return;
        }
        const id = setTimeout(() => {
            setAttempts(a => a + 1);
            verify();
        }, 2000);
        return () => clearTimeout(id);
    }, [loading, reference, attempts, verify]);

    if (loading) return <Skeleton />;
    if (order) return <Receipt order={order} orderRef={orderRef || reference.substring(0, 8).toUpperCase()} />;
    return <FallbackConfirm orderRef={orderRef || reference.substring(0, 8).toUpperCase()} />;
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fafaf9" }} />}>
            <CheckoutSuccessContent />
        </Suspense>
    );
}
