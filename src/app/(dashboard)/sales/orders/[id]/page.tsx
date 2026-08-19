"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "@/lib/toast";
import { updateOrderStatus, updateFulfillmentStatus } from "../actions";
import { zoneLabel } from "@/lib/delivery";

type Order = {
    id: string;
    customer_email: string;
    customer_name?: string;
    customer_phone?: string;
    delivery_method?: string;
    total_amount: number;
    delivery_fee?: number | null;
    delivery_zone?: string | null;
    status: string;
    payment_status?: string | null;
    fulfillment_status?: string | null;
    paystack_reference: string | null;
    created_at: string;
    shipping_address?: any;
    items?: any[];
    discount_code?: string | null;
    discount_amount?: number | null;
    auto_discount_title?: string | null;
    auto_discount_amount?: number | null;
    customer_metadata?: { whatsapp?: string; instagram?: string; snapchat?: string } | null;
    assigned_rider_id?: string | null;
};

type AssignedRider = {
    full_name: string;
    phone_number: string;
    bike_reg: string | null;
    image_url: string | null;
};

type Rider = {
    id: string;
    full_name: string;
    phone_number: string;
    bike_reg: string | null;
};

const STATUSES = ["pending", "paid", "refunded", "cancelled"];

const STATUS_CLASS: Record<string, string> = {
    pending:          "ac-badge-pending",
    paid:             "ac-badge-paid",
    processing:       "ac-badge-processing",
    packed:           "ac-badge-packed",
    shipped:          "ac-badge-shipped",
    ready_for_pickup: "ac-badge-info",
    fulfilled:        "ac-badge-fulfilled",
    delivered:        "ac-badge-delivered",
    refunded:         "ac-badge-inactive",
    cancelled:        "ac-badge-cancelled",
    failed:           "ac-badge-failed",
};

// Print-only STATUS_STYLES (kept for receipt div)
const STATUS_STYLES: Record<string, string> = {
    pending:          "background:#FEF3C7;color:#92400E",
    paid:             "background:#D1FAE5;color:#065F46",
    processing:       "background:#DBEAFE;color:#1E40AF",
    packed:           "background:#DBEAFE;color:#1E40AF",
    shipped:          "background:#EDE9FE;color:#5B21B6",
    ready_for_pickup: "background:#111827;color:#fff",
    fulfilled:        "background:#E0E7FF;color:#3730A3",
    delivered:        "background:#D1FAE5;color:#065F46",
    refunded:         "background:#F5F5F5;color:#525252",
    cancelled:        "background:#FEE2E2;color:#991B1B",
};

function isPickupOrder(order: Order) {
    return order.delivery_method?.toLowerCase().includes("pickup") ?? false;
}

// ── Inline Rider Picker ───────────────────────────────────────────────────────

function RiderPicker({
    orderId,
    customerName,
    onConfirm,
    onCancel,
}: {
    orderId: string;
    customerName?: string;
    onConfirm: (riderId: string, notifyRider: boolean) => void;
    onCancel: () => void;
}) {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [selectedRider, setSelectedRider] = useState("");
    const [notifyRider, setNotifyRider] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from("riders").select("id, full_name, phone_number, bike_reg")
            .eq("is_active", true).order("full_name")
            .then(({ data }: { data: any }) => {
                setRiders(data ?? []);
                if (data && data.length > 0) setSelectedRider(data[0].id);
                setLoading(false);
            });
    }, []);

    return (
        <div className="ac-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 className="ac-card-title">Assign Dispatch Rider</h3>
                <button onClick={onCancel} className="ac-modal-close" style={{ position: "static" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            {loading ? (
                <p style={{ fontSize: 12, color: "var(--ac-ink-4)", fontStyle: "italic" }}>Loading riders…</p>
            ) : riders.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--ac-danger)" }}>No active riders. Add riders in Settings → Riders.</p>
            ) : (
                <select
                    value={selectedRider}
                    onChange={e => setSelectedRider(e.target.value)}
                    className="ac-select"
                >
                    {riders.map(r => (
                        <option key={r.id} value={r.id}>
                            {r.full_name} · {r.phone_number}{r.bike_reg ? ` · ${r.bike_reg}` : ""}
                        </option>
                    ))}
                </select>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                    type="checkbox"
                    checked={notifyRider}
                    onChange={e => setNotifyRider(e.target.checked)}
                    className="ac-checkbox"
                />
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-2)" }}>
                    Notify rider via SMS
                </span>
            </label>

            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                <button onClick={onCancel} className="ac-btn ac-btn-ghost" type="button">Cancel</button>
                <button
                    onClick={() => selectedRider && onConfirm(selectedRider, notifyRider)}
                    disabled={!selectedRider || riders.length === 0}
                    className="ac-btn ac-btn-primary"
                    type="button"
                >
                    Confirm & Ship
                </button>
            </div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [bizName, setBizName] = useState("Miss Tokyo");
    const [bizContact, setBizContact] = useState<{ email?: string; contact?: string; address?: string }>({});
    const [pickupSettings, setPickupSettings] = useState<{ instructions: string; address: string; phone: string; wait: string } | null>(null);
    const [pickupPanelOpen, setPickupPanelOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [notifStatus, setNotifStatus] = useState<"idle" | "sending" | "sent">("idle");
    const [showRiderPicker, setShowRiderPicker] = useState(false);
    const [assignedRider, setAssignedRider] = useState<AssignedRider | null>(null);
    const [productSkus, setProductSkus] = useState<Record<string, string>>({});

    useEffect(() => {
        Promise.all([
            supabase.from("orders").select("id, customer_email, customer_name, customer_phone, delivery_method, total_amount, status, payment_status, fulfillment_status, paystack_reference, created_at, shipping_address, items, delivery_fee, delivery_zone, discount_code, discount_amount, auto_discount_title, auto_discount_amount, customer_metadata, assigned_rider_id").eq("id", id).single(),
            supabase.from("business_settings").select("business_name, email, contact, address").eq("id", "default").single(),
            supabase.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").single(),
        ]).then(async ([{ data: ord }, { data: biz }, { data: ss }]) => {
            if (ord) {
                setOrder(ord);
                if (ord.items && Array.isArray(ord.items)) {
                    const productIds = ord.items
                        .map((i: any) => i.productId)
                        .filter(Boolean) as string[];
                    if (productIds.length > 0) {
                        supabase
                            .from("products")
                            .select("id, sku")
                            .in("id", productIds)
                            .then(({ data: skuData }: { data: any }) => {
                                if (skuData) {
                                    const map: Record<string, string> = {};
                                    for (const p of skuData) {
                                        if (p.sku) map[p.id] = p.sku;
                                    }
                                    setProductSkus(map);
                                }
                            });
                    }
                }
                if (ord.assigned_rider_id) {
                    const { data: riderData } = await supabase
                        .from("riders")
                        .select("full_name, phone_number, bike_reg, image_url")
                        .eq("id", ord.assigned_rider_id)
                        .single();
                    if (riderData) setAssignedRider(riderData as AssignedRider);
                }
            }
            if (biz?.business_name) setBizName(biz.business_name);
            setBizContact({ email: biz?.email ?? undefined, contact: biz?.contact ?? undefined, address: biz?.address ?? undefined });
            if (ss?.pickup_enabled) {
                setPickupSettings({
                    instructions: ss.pickup_instructions || "",
                    address: ss.pickup_address || biz?.address || "",
                    phone: ss.pickup_contact_phone || biz?.contact || "",
                    wait: ss.pickup_estimated_wait || "24 hours",
                });
            }
            setLoading(false);
        });
    }, [id]);

    const updateStatus = async (newStatus: string) => {
        if (!order) return;
        setUpdating(true);
        if (newStatus === "fulfilled" || newStatus === "cancelled") setNotifStatus("sending");

        const res = await updateOrderStatus(order.id, newStatus);

        if (!res.success) {
            toast.error(res.error || "Failed to update status.");
            setNotifStatus("idle");
        } else {
            const PAYMENT_STATUSES = ["pending", "paid", "refunded", "cancelled"];
            setOrder(prev => prev ? {
                ...prev,
                status: newStatus,
                ...(PAYMENT_STATUSES.includes(newStatus) ? { payment_status: newStatus } : {}),
            } : prev);
            toast.success(`Status updated to ${newStatus}.`);

            if (newStatus === "fulfilled" || newStatus === "cancelled") {
                try {
                    await fetch("/api/email/fulfillment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: order.id, type: newStatus }),
                    });
                    setNotifStatus("sent");
                } catch (e) {
                    console.error("Auto-email failed:", e);
                    setNotifStatus("idle");
                }
            }
        }
        setUpdating(false);
    };

    const updateFulfillmentStatusLocal = async (newFulfillmentStatus: string) => {
        if (!order) return;
        setUpdating(true);
        const res = await updateFulfillmentStatus(order.id, newFulfillmentStatus);
        if (!res.success) {
            toast.error(res.error || "Failed to update fulfillment status.");
        } else {
            setOrder(prev => prev ? { ...prev, fulfillment_status: newFulfillmentStatus } : prev);
            toast.success(`Fulfillment status updated to ${newFulfillmentStatus}.`);
        }
        setUpdating(false);
    };

    const handlePickupReady = async () => {
        if (!order) return;
        setUpdating(true);
        setNotifStatus("sending");
        try {
            const res = await fetch("/api/pickup-ready", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds: [order.id] }),
            });
            if (!res.ok) throw new Error("API error");
            setOrder(prev => prev ? { ...prev, status: "ready_for_pickup" } : prev);
            setNotifStatus("sent");
            toast.success("Order marked ready for pickup — customer notified via email & SMS.");
        } catch {
            toast.error("Failed to send pickup notification.");
            setNotifStatus("idle");
        }
        setUpdating(false);
    };

    const handleDispatch = async (riderId: string, notifyRider: boolean) => {
        if (!order) return;
        setUpdating(true);
        setShowRiderPicker(false);
        setNotifStatus("sending");
        try {
            const res = await fetch("/api/dispatch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds: [order.id], riderId, notifyRider }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Dispatch failed");
            setOrder(prev => prev ? { ...prev, status: "shipped", assigned_rider_id: riderId } : prev);
            supabase.from("riders").select("full_name, phone_number, bike_reg, image_url").eq("id", riderId).single()
                .then(({ data: r }: { data: any }) => { if (r) setAssignedRider(r as AssignedRider); });
            setNotifStatus("sent");
            toast.success("Order dispatched — customer & rider notified via email & SMS.");
        } catch (err: any) {
            toast.error(err.message || "Dispatch failed.");
            setNotifStatus("idle");
        }
        setUpdating(false);
    };

    const [resending, setResending] = useState(false);

    const handleResendConfirmation = async () => {
        if (!order) return;
        setResending(true);
        try {
            const res = await fetch("/api/admin/orders/resend-confirmation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.errors?.join(", ") || "Failed to resend");
            toast.success("Order confirmation resent via email & SMS.");
        } catch (err: any) {
            toast.error(err.message || "Failed to resend confirmation.");
        }
        setResending(false);
    };

    const copyDetails = () => {
        if (!order) return;
        const text = [
            `Order: #${order.id.substring(0, 8).toUpperCase()}`,
            `Email: ${order.customer_email}`,
            `Amount: GH₵ ${Number(order.total_amount).toFixed(2)}`,
            `Reference: ${order.paystack_reference || "—"}`,
            `Date: ${new Date(order.created_at).toLocaleDateString()}`,
        ].join("\n");
        navigator.clipboard.writeText(text);
        toast.success("Customer details copied.");
    };

    if (loading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <Link href="/sales/orders" className="ac-text-link" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>← Orders</Link>
                <p style={{ color: "var(--ac-ink-4)", fontFamily: "var(--f-display)", fontStyle: "italic" }}>Loading…</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <Link href="/sales/orders" className="ac-text-link" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>← Orders</Link>
                <p style={{ color: "var(--ac-ink-4)", fontFamily: "var(--f-display)", fontStyle: "italic" }}>Order not found.</p>
            </div>
        );
    }

    const items: any[] = Array.isArray(order?.items) ? order.items : [];
    const orderNum = order.id.substring(0, 8).toUpperCase();
    const dateStr = new Date(order.created_at).toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" });
    const addr = typeof order.shipping_address === "string" ? order.shipping_address : order.shipping_address?.text || null;
    const pickup = isPickupOrder(order);
    const effectiveStatus = (order.payment_status && order.payment_status !== "pending") ? order.payment_status : order.status;

    return (
        <>
        {/* Print styles */}
        <style>{`
            #admin-receipt-print {
                position: fixed;
                left: -9999px;
                top: 0;
                width: 210mm;
                visibility: hidden;
                pointer-events: none;
            }
            @media print {
                * { visibility: hidden !important; }
                #admin-receipt-print, #admin-receipt-print * { visibility: visible !important; }
                #admin-receipt-print {
                    position: static !important;
                    left: auto !important;
                    width: 100% !important;
                    pointer-events: auto !important;
                }
            }
        `}</style>

        <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Page heading */}
            <div className="ac-page-head" style={{ flexWrap: "wrap" }}>
                <div>
                    <Link href="/sales/orders" className="ac-text-link" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>
                        ← Orders
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                        <h1 className="ac-page-h1">#{orderNum}</h1>
                        <span className={`ac-badge ${STATUS_CLASS[effectiveStatus] ?? "ac-badge-inactive"}`}>
                            {effectiveStatus}
                        </span>
                        <span className={`ac-badge ${pickup ? "ac-badge-info" : "ac-badge-inactive"}`}>
                            {pickup ? "Pickup" : "Delivery"}
                        </span>
                    </div>
                    <p className="ac-page-sub">{dateStr}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {order.status === "packed" && (
                        pickup ? (
                            <button onClick={handlePickupReady} disabled={updating} className="ac-btn ac-btn-primary" type="button">
                                {notifStatus === "sending" ? "Sending…" : "Send Pickup Ready Notification"}
                            </button>
                        ) : (
                            <button onClick={() => setShowRiderPicker(v => !v)} disabled={updating} className="ac-btn ac-btn-primary" type="button">
                                Assign Rider & Ship
                            </button>
                        )
                    )}
                    {order.status === "ready_for_pickup" && (
                        <button onClick={() => updateStatus("fulfilled")} disabled={updating} className="ac-btn ac-btn-primary" type="button">
                            Mark Collected
                        </button>
                    )}
                    {order.status === "shipped" && (
                        <button onClick={() => updateStatus("fulfilled")} disabled={updating} className="ac-btn ac-btn-primary" type="button">
                            Mark Fulfilled
                        </button>
                    )}
                    {order.status !== "refunded" && order.status !== "cancelled" && (
                        <button onClick={() => updateStatus("refunded")} disabled={updating} className="ac-btn ac-btn-ghost" type="button">
                            Refund
                        </button>
                    )}
                    {order.status !== "cancelled" && (
                        <button onClick={() => updateStatus("cancelled")} disabled={updating} className="ac-btn ac-btn-sm" type="button"
                            style={{ background: "color-mix(in oklab, var(--ac-danger) 12%, transparent)", color: "var(--ac-danger)", borderColor: "color-mix(in oklab, var(--ac-danger) 25%, transparent)" }}>
                            Cancel
                        </button>
                    )}
                    <button onClick={copyDetails} className="ac-btn ac-btn-ghost" type="button">Copy Details</button>
                    {["paid", "processing", "packed", "shipped", "ready_for_pickup", "fulfilled", "delivered"].includes(order.status) && (
                        <button onClick={handleResendConfirmation} disabled={resending} className="ac-btn ac-btn-ghost" type="button">
                            {resending ? "Sending…" : "Resend Confirmation"}
                        </button>
                    )}
                    <button onClick={() => window.print()} className="ac-btn ac-btn-primary" type="button">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Print Receipt
                    </button>
                </div>
            </div>

            {/* Inline rider picker */}
            {showRiderPicker && order.status === "packed" && !pickup && (
                <RiderPicker
                    orderId={order.id}
                    customerName={order.customer_name}
                    onConfirm={handleDispatch}
                    onCancel={() => setShowRiderPicker(false)}
                />
            )}

            {/* Notification sent banner */}
            {notifStatus === "sent" && (
                <div style={{
                    background: "color-mix(in oklab, var(--ac-accent) 10%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--ac-accent) 25%, transparent)",
                    borderRadius: "var(--r-md)",
                    padding: "12px 20px",
                    fontSize: 12,
                    color: "var(--ac-accent)",
                    fontWeight: 600,
                    letterSpacing: ".06em",
                }}>
                    ✓ Customer notified via email &amp; SMS
                </div>
            )}

            {/* 2-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

                {/* LEFT: Customer Details + Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="ac-card">
                        <div className="ac-card-head">
                            <h2 className="ac-card-title">Customer Details</h2>
                        </div>
                        {([
                            ["Customer", order.customer_name || "—"],
                            ["Email",    order.customer_email],
                            ["Phone",    order.customer_phone || "—"],
                            ...(order.customer_metadata?.whatsapp ? [["WhatsApp", order.customer_metadata.whatsapp]] : []),
                            ...(order.customer_metadata?.instagram ? [["Instagram", order.customer_metadata.instagram]] : []),
                            ...(order.customer_metadata?.snapchat ? [["Snapchat", order.customer_metadata.snapchat]] : []),
                            ["Type",     pickup ? "Store Pickup" : (order.delivery_method || "Delivery")],
                            ["Date",     new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
                        ] as [string, string][]).map(([label, value]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: "1px solid var(--ac-line)" }}>
                                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)" }}>{label}</span>
                                <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ac-ink)", fontWeight: 500, textAlign: "right", maxWidth: "60%", wordBreak: "break-all" }}>{value}</span>
                            </div>
                        ))}
                        {order.shipping_address?.text && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "10px 20px", borderTop: "1px solid var(--ac-line)" }}>
                                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)", flexShrink: 0 }}>Address</span>
                                <span style={{ fontSize: 12, color: "var(--ac-ink)", textAlign: "right" }}>{order.shipping_address.text}</span>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="ac-card flush">
                        <div className="ac-card-head" style={{ padding: "16px 20px" }}>
                            <h2 className="ac-card-title">Ordered Items</h2>
                        </div>
                        {order.items && order.items.length > 0 ? (
                            order.items.map((item: any, idx: number) => (
                                <div key={idx} style={{ display: "flex", gap: 16, alignItems: "center", padding: "14px 20px", borderTop: "1px solid var(--ac-line)" }}>
                                    {(item.imageUrl || item.image_url) && (
                                        <div style={{ width: 52, height: 60, flexShrink: 0, overflow: "hidden", borderRadius: "var(--r-sm)", border: "1px solid var(--ac-line)", background: "var(--ac-panel-2)" }}>
                                            <img src={item.imageUrl || item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                            <span style={{ fontFamily: "var(--f-display)", fontSize: 14, color: "var(--ac-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name || "Product"}</span>
                                            {item.price && (
                                                <span style={{ fontFamily: "var(--f-mono)", fontSize: 13, color: "var(--ac-ink)", flexShrink: 0 }}>GH₵ {(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 4 }}>
                                            {item.size && <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>Size: <strong style={{ color: "var(--ac-ink)" }}>{item.size}</strong></span>}
                                            {item.color && <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>Color: <strong style={{ color: "var(--ac-ink)" }}>{item.color}</strong></span>}
                                            {item.brand && <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>Brand: <strong style={{ color: "var(--ac-ink)" }}>{item.brand}</strong></span>}
                                            {(item.sku || (item.productId && productSkus[item.productId])) && (
                                                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>
                                                    SKU: <strong style={{ fontFamily: "var(--f-mono)", color: "var(--ac-ink)" }}>{item.sku || productSkus[item.productId]}</strong>
                                                </span>
                                            )}
                                            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>Qty: <strong style={{ color: "var(--ac-ink)" }}>{item.quantity || 1}</strong></span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: "24px 20px" }}>
                                <p style={{ color: "var(--ac-ink-4)", fontStyle: "italic", fontFamily: "var(--f-display)", fontSize: 14 }}>No line items stored.</p>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginTop: 6 }}>
                                    Total: <strong style={{ color: "var(--ac-ink-2)" }}>GH₵ {Number(order.total_amount).toFixed(2)}</strong>
                                    {order.paystack_reference && <> · Ref: <strong style={{ fontFamily: "var(--f-mono)" }}>{order.paystack_reference}</strong></>}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Payment + Status */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Payment */}
                    <div className="ac-card">
                        <div className="ac-card-head">
                            <h2 className="ac-card-title">Payment</h2>
                        </div>
                        {([
                            ["Provider",  order.paystack_reference ? "Paystack" : "N/A"],
                            ["Reference", order.paystack_reference || "—"],
                            ["Status", (() => {
                                const ps = (!order.payment_status || order.payment_status === "pending")
                                    ? (["paid","processing","packed","shipped","ready_for_pickup","fulfilled","delivered"].includes(order.status) ? "paid" : order.status === "refunded" ? "refunded" : order.status === "cancelled" ? "cancelled" : "pending")
                                    : order.payment_status;
                                return ps === "paid" ? "Successful" : ps === "refunded" ? "Refunded" : ps === "cancelled" ? "Cancelled" : "Pending";
                            })()],
                        ] as [string, string][]).map(([label, value]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: "1px solid var(--ac-line)" }}>
                                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)" }}>{label}</span>
                                <span style={{
                                    fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500,
                                    color: label === "Status" && value === "Successful" ? "var(--ac-accent)"
                                         : label === "Status" && value === "Refunded"   ? "var(--ac-ink-3)"
                                         : label === "Status" && value === "Cancelled"  ? "var(--ac-danger)"
                                         : label === "Status" && value === "Pending"    ? "var(--ac-warn)"
                                         : "var(--ac-ink)",
                                }}>{value}</span>
                            </div>
                        ))}
                        {(
                            (order.discount_code && Number(order.discount_amount ?? 0) > 0) ||
                            (order.auto_discount_title && Number(order.auto_discount_amount ?? 0) > 0)
                        ) && (
                            <>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: "1px solid var(--ac-line)" }}>
                                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)" }}>Subtotal</span>
                                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ac-ink)" }}>GH₵ {(Number(order.total_amount) - Number(order.delivery_fee ?? 0) + Number(order.discount_amount ?? 0) + Number(order.auto_discount_amount ?? 0)).toFixed(2)}</span>
                                </div>
                                {order.auto_discount_title && Number(order.auto_discount_amount ?? 0) > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: "1px solid var(--ac-line)" }}>
                                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)" }}>Auto Discount ({order.auto_discount_title})</span>
                                        <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ac-accent)" }}>-GH₵ {Number(order.auto_discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                {order.discount_code && Number(order.discount_amount ?? 0) > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: "1px solid var(--ac-line)" }}>
                                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)" }}>Discount ({order.discount_code})</span>
                                        <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ac-accent)" }}>-GH₵ {Number(order.discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {Number(order.delivery_fee ?? 0) > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: "1px solid var(--ac-line)" }}>
                                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)" }}>Delivery ({zoneLabel(order.delivery_zone)})</span>
                                <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ac-ink)" }}>GH₵ {Number(order.delivery_fee).toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: "1px solid var(--ac-line)" }}>
                            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, color: "var(--ac-ink-4)" }}>Amount Paid</span>
                            <span style={{ fontFamily: "var(--f-mono)", fontSize: 13, color: "var(--ac-ink)", fontWeight: 600 }}>GH₵ {Number(order.total_amount).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div className="ac-card" style={{ padding: 20 }}>
                        <h2 className="ac-card-title" style={{ marginBottom: 14 }}>Payment Status</h2>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {STATUSES.map(s => {
                                const effectivePaymentStatus =
                                    (order.payment_status && order.payment_status !== "pending")
                                        ? order.payment_status
                                        : order.status;
                                const isActive = effectivePaymentStatus === s;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => updateStatus(s)}
                                        disabled={updating || isActive}
                                        className={`ac-btn ac-btn-sm ${isActive ? "ac-btn-primary" : "ac-btn-ghost"}`}
                                        style={isActive ? {} : {}}
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Fulfillment Status */}
                    <div className="ac-card" style={{ padding: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <h2 className="ac-card-title">Fulfillment Status</h2>
                            {order.fulfillment_status && (
                                <span className={`ac-badge ${STATUS_CLASS[order.fulfillment_status] ?? "ac-badge-info"}`}>
                                    {order.fulfillment_status === "ready_for_pickup" ? "Ready for Pickup" : order.fulfillment_status}
                                </span>
                            )}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {(["inbox", "processing", "packed", "shipped", "ready_for_pickup", "delivered"] as const).map(s => {
                                const isActive = order.fulfillment_status === s;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => updateFulfillmentStatusLocal(s)}
                                        disabled={updating || isActive}
                                        className={`ac-btn ac-btn-sm ${isActive ? "ac-btn-primary" : "ac-btn-ghost"}`}
                                    >
                                        {s === "ready_for_pickup" ? "Ready for Pickup" : s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pickup info panel */}
                    {pickup && pickupSettings && (
                        <div className="ac-card flush">
                            <button
                                onClick={() => setPickupPanelOpen(v => !v)}
                                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", borderBottom: pickupPanelOpen ? "1px solid var(--ac-line)" : "none" }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ac-ink)", display: "inline-block" }} />
                                    <h2 className="ac-card-title">Pickup Instructions</h2>
                                </div>
                                <span style={{ color: "var(--ac-ink-4)", fontSize: 12 }}>{pickupPanelOpen ? "▲" : "▼"}</span>
                            </button>
                            {pickupPanelOpen && (
                                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                                    <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ac-ink-2)", whiteSpace: "pre-wrap" }}>{pickupSettings.instructions}</p>
                                    <div style={{ borderTop: "1px solid var(--ac-line)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                                        {pickupSettings.address && <p style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>📍 {pickupSettings.address}</p>}
                                        {pickupSettings.phone && <p style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>📞 {pickupSettings.phone}</p>}
                                        {pickupSettings.wait && <p style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>⏱ Ready in: {pickupSettings.wait}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Assigned Rider */}
                    {assignedRider && !pickup && (
                        <div className="ac-card flush">
                            <div className="ac-card-head">
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ac-accent)", display: "inline-block" }} />
                                    <h2 className="ac-card-title">Dispatch Rider</h2>
                                </div>
                            </div>
                            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                                {assignedRider.image_url ? (
                                    <img src={assignedRider.image_url} alt={assignedRider.full_name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--ac-line)" }} />
                                ) : (
                                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <span style={{ fontFamily: "var(--f-display)", fontSize: 16, color: "var(--ac-ink-4)" }}>{assignedRider.full_name.charAt(0)}</span>
                                    </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--ac-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assignedRider.full_name}</p>
                                    <p style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 2 }}>{assignedRider.phone_number}</p>
                                    {assignedRider.bike_reg && (
                                        <p style={{ fontSize: 11, fontFamily: "var(--f-mono)", color: "var(--ac-ink-4)", marginTop: 2 }}>{assignedRider.bike_reg}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ── Print Receipt (screen-hidden via fixed position, print-visible) ── */}
        <div id="admin-receipt-print" style={{ backgroundColor: "#fff", padding: 48, maxWidth: 600 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid #e5e5e5" }}>
                <div>
                    <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, letterSpacing: ".1em", textTransform: "uppercase" }}>{bizName}</h2>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "#999", marginTop: 4 }}>Order Receipt</p>
                </div>
                <div style={{ textAlign: "right" }}>
                    <p style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#111" }}>#{orderNum}</p>
                    <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>{dateStr}</p>
                    <span style={{ marginTop: 8, display: "inline-block", padding: "2px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600, ...Object.fromEntries((STATUS_STYLES[order.status] ?? "background:#f5f5f5;color:#666").split(";").filter(Boolean).map(s => { const [k, v] = s.split(":"); return [k?.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v?.trim()]; }).filter(([k]) => k)) }}>
                        {order.status === "ready_for_pickup" ? "Ready for Pickup" : order.status}
                    </span>
                </div>
            </div>

            {(order.customer_name || addr || order.delivery_method) && (
                <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid #e5e5e5", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    {order.customer_name && (
                        <div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700, color: "#999", marginBottom: 8 }}>Customer</p>
                            <p style={{ fontSize: 14, color: "#333", fontWeight: 600 }}>{order.customer_name}</p>
                            {order.customer_phone && <p style={{ fontSize: 12, color: "#666" }}>{order.customer_phone}</p>}
                            {order.customer_email && <p style={{ fontSize: 12, color: "#666" }}>{order.customer_email}</p>}
                        </div>
                    )}
                    {addr && (
                        <div>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700, color: "#999", marginBottom: 8 }}>{pickup ? "Pickup Location" : "Delivery Address"}</p>
                            <p style={{ fontSize: 13, color: "#555", whiteSpace: "pre-line" }}>{pickup ? (bizContact.address || "Store") : addr}</p>
                            {order.delivery_method && <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "#999", marginTop: 4 }}>{order.delivery_method}</p>}
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700, color: "#999", marginBottom: 16 }}>Items Ordered</p>
                {items.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#999", fontStyle: "italic" }}>No item details available.</p>
                ) : (
                    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                                <th style={{ textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "#999", fontWeight: 700, paddingBottom: 8 }}>Item</th>
                                <th style={{ textAlign: "center", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "#999", fontWeight: 700, paddingBottom: 8, width: 48 }}>Qty</th>
                                <th style={{ textAlign: "right", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "#999", fontWeight: 700, paddingBottom: 8, width: 96 }}>Price</th>
                                <th style={{ textAlign: "right", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "#999", fontWeight: 700, paddingBottom: 8, width: 96 }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item: any, i: number) => {
                                const name  = item.name || item.productName || "Item";
                                const price = Number(item.price ?? item.unit_price ?? 0);
                                const qty   = Number(item.quantity ?? item.qty ?? 1);
                                return (
                                    <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                                        <td style={{ padding: "10px 0" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                {(item.imageUrl || item.image_url) && (
                                                    <img src={item.imageUrl || item.image_url} alt={name} style={{ width: 52, height: 52, objectFit: "cover", border: "1px solid #eee" }} />
                                                )}
                                                <div>
                                                    <p style={{ fontWeight: 600, color: "#222" }}>{name}</p>
                                                    {(item.size || item.color || item.brand) && (
                                                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "#999", marginTop: 2 }}>
                                                            {[item.size, item.color, item.brand].filter(Boolean).join(" · ")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 0", textAlign: "center", color: "#555" }}>{qty}</td>
                                        <td style={{ padding: "10px 0", textAlign: "right", color: "#555" }}>GH₵ {price.toFixed(2)}</td>
                                        <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>GH₵ {(price * qty).toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e5e5e5", paddingTop: 16 }}>
                <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                    {(
                        (order.discount_code && Number(order.discount_amount ?? 0) > 0) ||
                        (order.auto_discount_title && Number(order.auto_discount_amount ?? 0) > 0)
                    ) && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
                                <span>Subtotal</span>
                                <span>GH₵ {(Number(order.total_amount ?? 0) - Number(order.delivery_fee ?? 0) + Number(order.discount_amount ?? 0) + Number(order.auto_discount_amount ?? 0)).toFixed(2)}</span>
                            </div>
                            {order.auto_discount_title && Number(order.auto_discount_amount ?? 0) > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                                    <span>Auto Discount ({order.auto_discount_title})</span>
                                    <span>-GH₵ {Number(order.auto_discount_amount ?? 0).toFixed(2)}</span>
                                </div>
                            )}
                            {order.discount_code && Number(order.discount_amount ?? 0) > 0 && (
                                <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                                    <span>Discount ({order.discount_code})</span>
                                    <span>-GH₵ {Number(order.discount_amount ?? 0).toFixed(2)}</span>
                                </div>
                            )}
                        </>
                    )}
                    {Number(order.delivery_fee ?? 0) > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#666" }}>
                            <span>Delivery ({zoneLabel(order.delivery_zone)})</span>
                            <span>GH₵ {Number(order.delivery_fee ?? 0).toFixed(2)}</span>
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid #e5e5e5", paddingTop: 8 }}>
                        <span>Total Paid</span>
                        <span>GH₵ {Number(order.total_amount ?? 0).toFixed(2)}</span>
                    </div>
                    {order.paystack_reference && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#999", fontSize: 11 }}>
                            <span>Ref</span>
                            <span style={{ fontFamily: "monospace" }}>{order.paystack_reference.substring(0, 16)}</span>
                        </div>
                    )}
                </div>
            </div>

            {pickup && pickupSettings && (
                <div style={{ marginTop: 32, backgroundColor: "#F7F2EC", padding: 16, border: "1px solid #E8E4DE" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 10 }}>
                        📦 Store Pickup Instructions
                    </p>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: "#404040", whiteSpace: "pre-wrap", marginBottom: 12 }}>
                        {pickupSettings.instructions}
                    </p>
                    <div style={{ borderTop: "1px solid #DDD8D1", paddingTop: 10, fontSize: 12, color: "#525252", lineHeight: 2 }}>
                        {pickupSettings.address && <div>📍 {pickupSettings.address}</div>}
                        {pickupSettings.phone && <div>📞 {pickupSettings.phone}</div>}
                        {pickupSettings.wait && <div>⏱ Ready in: {pickupSettings.wait}</div>}
                    </div>
                </div>
            )}

            <div style={{ borderTop: "1px solid #e5e5e5", marginTop: 32, paddingTop: 24, textAlign: "center" }}>
                {(bizContact.address || bizContact.contact || bizContact.email) && (
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.8 }}>
                        {bizContact.address && <div>{bizContact.address}</div>}
                        {bizContact.contact && <div>{bizContact.contact}</div>}
                        {bizContact.email && <div>{bizContact.email}</div>}
                    </div>
                )}
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "#aaa" }}>
                    Thank you for your order — {bizName}
                </p>
            </div>
        </div>
        </>
    );
}
