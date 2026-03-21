"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "@/lib/toast";
import { updateOrderStatus } from "../actions";

import { Printer, X } from "lucide-react";

type Order = {
    id: string;
    customer_email: string;
    customer_name?: string;
    customer_phone?: string;
    delivery_method?: string;
    total_amount: number;
    status: string;
    paystack_reference: string | null;
    created_at: string;
    shipping_address?: any;
    items?: any[];
    discount_code?: string | null;
    discount_amount?: number | null;
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

const STATUSES = ["pending", "paid", "processing", "packed", "shipped", "ready_for_pickup", "fulfilled", "delivered", "refunded", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
    pending:          "bg-amber-50 text-amber-700",
    paid:             "bg-green-50 text-green-700",
    processing:       "bg-blue-50 text-blue-700",
    packed:           "bg-blue-50 text-blue-700",
    shipped:          "bg-purple-50 text-purple-700",
    ready_for_pickup: "bg-neutral-900 text-white",
    fulfilled:        "bg-indigo-50 text-indigo-700",
    delivered:        "bg-green-50 text-green-700",
    refunded:         "bg-neutral-100 text-neutral-600",
    cancelled:        "bg-red-50 text-red-600",
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
        <div className="bg-neutral-50 border border-neutral-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest">Assign Dispatch Rider</h3>
                <button onClick={onCancel} className="text-neutral-400 hover:text-black">
                    <X size={16} />
                </button>
            </div>

            {loading ? (
                <p className="text-xs text-neutral-400 italic">Loading riders...</p>
            ) : riders.length === 0 ? (
                <p className="text-xs text-red-500">No active riders. Add riders in Settings → Riders.</p>
            ) : (
                <select
                    value={selectedRider}
                    onChange={e => setSelectedRider(e.target.value)}
                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm"
                >
                    {riders.map(r => (
                        <option key={r.id} value={r.id}>
                            {r.full_name} · {r.phone_number}{r.bike_reg ? ` · ${r.bike_reg}` : ""}
                        </option>
                    ))}
                </select>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={notifyRider}
                    onChange={e => setNotifyRider(e.target.checked)}
                    className="w-4 h-4 accent-black"
                />
                <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-700">
                    Notify rider via SMS
                </span>
            </label>

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onCancel}
                    className="px-5 py-2.5 text-xs uppercase tracking-widest border border-neutral-200 hover:border-black text-neutral-500 hover:text-black transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={() => selectedRider && onConfirm(selectedRider, notifyRider)}
                    disabled={!selectedRider || riders.length === 0}
                    className="px-6 py-2.5 bg-blue-600 text-white text-xs uppercase tracking-widest font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
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

    useEffect(() => {
        Promise.all([
            supabase.from("orders").select("*").eq("id", id).single(),
            supabase.from("business_settings").select("business_name, email, contact, address").eq("id", "default").single(),
            supabase.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").single(),
        ]).then(async ([{ data: ord }, { data: biz }, { data: ss }]) => {
            if (ord) {
                setOrder(ord);
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

    // Plain status update (for status panel buttons, refund, cancel, collected)
    const updateStatus = async (newStatus: string) => {
        if (!order) return;
        setUpdating(true);
        
        const res = await updateOrderStatus(order.id, newStatus);
        
        if (!res.success) {
            toast.error(res.error || "Failed to update status.");
        } else {
            // Optimistic update was local, but we know it worked now
            setOrder(prev => prev ? { ...prev, status: newStatus } : prev);
            toast.success(`Status updated to ${newStatus}.`);
        }
        setUpdating(false);
    };

    // Pickup-ready: API handles DB update + email + SMS
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

    // Dispatch: API handles DB update (status → shipped) + email + SMS
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
            // Load the newly assigned rider for the UI card
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
            <div className="space-y-8">
                <Link href="/sales/orders" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black">← Orders</Link>
                <p className="text-neutral-400 italic font-serif">Loading...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="space-y-8">
                <Link href="/sales/orders" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black">← Orders</Link>
                <p className="text-neutral-500 italic font-serif">Order not found.</p>
            </div>
        );
    }

    const items: any[] = Array.isArray(order?.items) ? order.items : [];
    const orderNum = order.id.substring(0, 8).toUpperCase();
    const dateStr = new Date(order.created_at).toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" });
    const addr = typeof order.shipping_address === "string" ? order.shipping_address : order.shipping_address?.text || null;
    const pickup = isPickupOrder(order);

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

        <div className="no-print space-y-8">
            {/* Top bar */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <Link href="/sales/orders" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors">
                        ← Orders
                    </Link>
                    <div className="flex items-center gap-3 mt-3">
                        <h1 className="font-serif text-3xl tracking-widest uppercase">
                            #{orderNum}
                        </h1>
                        <span className={`px-3 py-1 text-[10px] uppercase tracking-widest font-semibold rounded ${STATUS_STYLES[order.status] || "bg-neutral-100 text-neutral-600"}`}>
                            {order.status === "ready_for_pickup" ? "Ready for Pickup" : order.status}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded-sm ${pickup ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>
                            {pickup ? "Pickup" : "Delivery"}
                        </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{dateStr}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Packed-stage primary action */}
                    {order.status === "packed" && (
                        pickup ? (
                            <button
                                onClick={handlePickupReady}
                                disabled={updating}
                                className="px-5 py-2.5 text-[11px] uppercase tracking-widest font-bold bg-neutral-900 text-white hover:bg-black transition-colors disabled:opacity-50"
                            >
                                {notifStatus === "sending" ? "Sending..." : "Send Pickup Ready Notification"}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowRiderPicker(v => !v)}
                                disabled={updating}
                                className="px-5 py-2.5 text-[11px] uppercase tracking-widest font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                Assign Rider & Ship
                            </button>
                        )
                    )}

                    {/* Collected button for ready_for_pickup */}
                    {order.status === "ready_for_pickup" && (
                        <button onClick={() => updateStatus("fulfilled")} disabled={updating}
                            className="px-5 py-2.5 text-[11px] uppercase tracking-widest font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                            Mark Collected
                        </button>
                    )}

                    {/* Mark Fulfilled for shipped orders */}
                    {order.status === "shipped" && (
                        <button onClick={() => updateStatus("fulfilled")} disabled={updating}
                            className="px-5 py-2.5 text-[11px] uppercase tracking-widest font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                            Mark Fulfilled
                        </button>
                    )}

                    {order.status !== "refunded" && order.status !== "cancelled" && (
                        <button onClick={() => updateStatus("refunded")} disabled={updating}
                            className="px-5 py-2.5 text-[11px] uppercase tracking-widest font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors disabled:opacity-50">
                            Refund
                        </button>
                    )}
                    {order.status !== "cancelled" && (
                        <button onClick={() => updateStatus("cancelled")} disabled={updating}
                            className="px-5 py-2.5 text-[11px] uppercase tracking-widest font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                    )}
                    <button onClick={copyDetails}
                        className="px-5 py-2.5 text-xs uppercase tracking-widest border border-neutral-200 hover:border-black text-neutral-500 hover:text-black transition-colors">
                        Copy Details
                    </button>
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors">
                        <Printer size={14} /> Print Receipt
                    </button>
                </div>
            </div>

            {/* Inline rider picker (delivery orders, packed status) */}
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
                <div className="bg-green-50 border border-green-200 px-5 py-3 text-xs uppercase tracking-widest text-green-700 font-semibold">
                    ✓ Customer notified via email & SMS
                </div>
            )}

            {/* 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* LEFT: Customer Details + Items */}
                <div className="space-y-6">
                    <div className="bg-white border border-neutral-200 divide-y divide-neutral-100">
                        <div className="px-6 py-4 border-b border-neutral-100">
                            <h2 className="text-xs uppercase tracking-widest font-semibold">Customer Details</h2>
                        </div>
                        {[
                            ["Customer", order.customer_name || "—"],
                            ["Email",    order.customer_email],
                            ["Phone",    order.customer_phone || "—"],
                            ...(order.customer_metadata?.whatsapp ? [["WhatsApp", order.customer_metadata.whatsapp]] : []),
                            ...(order.customer_metadata?.instagram ? [["Instagram", order.customer_metadata.instagram]] : []),
                            ...(order.customer_metadata?.snapchat ? [["Snapchat", order.customer_metadata.snapchat]] : []),
                            ["Type",     pickup ? "Store Pickup" : (order.delivery_method || "Delivery")],
                            ["Date",     new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
                        ].map(([label, value]) => (
                            <div key={label} className="px-6 py-3 flex justify-between items-center text-sm">
                                <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">{label}</span>
                                <span className="text-neutral-900 font-medium font-mono text-right max-w-[60%] break-all">{value}</span>
                            </div>
                        ))}
                        {order.shipping_address?.text && (
                            <div className="px-6 py-3 flex justify-between items-start text-sm gap-4">
                                <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 shrink-0">Address</span>
                                <span className="text-neutral-900 font-medium text-right">{order.shipping_address.text}</span>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="bg-white border border-neutral-200">
                        <div className="px-6 py-4 border-b border-neutral-100">
                            <h2 className="text-xs uppercase tracking-widest font-semibold">Ordered Items</h2>
                        </div>
                        <div className="divide-y divide-neutral-100">
                            {order.items && order.items.length > 0 ? (
                                order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="px-6 py-4 flex gap-4 items-center">
                                        {(item.imageUrl || item.image_url) && (
                                            <div className="w-14 h-16 bg-neutral-50 flex-shrink-0 overflow-hidden border border-neutral-100">
                                                <img src={item.imageUrl || item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <div className="flex justify-between gap-2">
                                                <h3 className="font-serif text-sm truncate">{item.name || "Product"}</h3>
                                                {item.price && (
                                                    <span className="font-mono text-sm shrink-0">GH₵ {(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                                {item.size && <span className="text-[10px] uppercase tracking-widest text-neutral-500">Size: <span className="text-neutral-900 font-semibold">{item.size}</span></span>}
                                                {item.color && <span className="text-[10px] uppercase tracking-widest text-neutral-500">Color: <span className="text-neutral-900 font-semibold">{item.color}</span></span>}
                                                {item.stitching && <span className="text-[10px] uppercase tracking-widest text-neutral-500">Stitching: <span className="text-neutral-900 font-semibold">{item.stitching}</span></span>}
                                                <span className="text-[10px] uppercase tracking-widest text-neutral-500">Qty: <span className="text-neutral-900 font-semibold">{item.quantity || 1}</span></span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-6 py-6 space-y-1">
                                    <p className="text-neutral-400 italic text-sm font-serif">No line items stored.</p>
                                    <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                                        Total: <span className="text-neutral-700 font-semibold">GH₵ {Number(order.total_amount).toFixed(2)}</span>
                                        {order.paystack_reference && <> · Ref: <span className="font-mono text-neutral-700">{order.paystack_reference}</span></>}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Payment + Status */}
                <div className="space-y-6">
                    <div className="bg-white border border-neutral-200 divide-y divide-neutral-100">
                        <div className="px-6 py-4 border-b border-neutral-100">
                            <h2 className="text-xs uppercase tracking-widest font-semibold">Payment</h2>
                        </div>
                        {[
                            ["Provider",    order.paystack_reference ? "Paystack" : "N/A"],
                            ["Reference",   order.paystack_reference || "—"],
                            ["Status",      ["paid", "processing", "fulfilled", "delivered"].includes(order.status) ? "Successful" : order.status === "pending" ? "Pending" : "Failed"],
                        ].map(([label, value]) => (
                            <div key={label} className="px-6 py-3 flex justify-between items-center text-sm">
                                <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">{label}</span>
                                <span className={`font-medium font-mono ${label === "Status" && value === "Successful" ? "text-green-700" : label === "Status" && value === "Failed" ? "text-red-600" : "text-neutral-900"}`}>
                                    {value}
                                </span>
                            </div>
                        ))}
                        {order.discount_code && Number(order.discount_amount ?? 0) > 0 && (
                            <>
                                <div className="px-6 py-3 flex justify-between items-center text-sm">
                                    <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Subtotal</span>
                                    <span className="font-medium font-mono text-neutral-900">GH₵ {(Number(order.total_amount) + Number(order.discount_amount)).toFixed(2)}</span>
                                </div>
                                <div className="px-6 py-3 flex justify-between items-center text-sm">
                                    <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Discount ({order.discount_code})</span>
                                    <span className="font-medium font-mono text-green-600">-GH₵ {Number(order.discount_amount).toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        <div className="px-6 py-3 flex justify-between items-center text-sm">
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Amount Paid</span>
                            <span className="font-medium font-mono text-neutral-900">GH₵ {Number(order.total_amount).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="bg-white border border-neutral-200 p-6 space-y-5">
                        <h2 className="text-xs uppercase tracking-widest font-semibold">Change Status</h2>
                        <div className="flex flex-wrap gap-2">
                            {STATUSES.map(s => (
                                <button
                                    key={s}
                                    onClick={() => updateStatus(s)}
                                    disabled={updating || order.status === s}
                                    className={`px-4 py-2 text-[10px] uppercase tracking-widest font-semibold transition-colors ${
                                        order.status === s
                                            ? "bg-black text-white cursor-default"
                                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                    } disabled:opacity-50`}
                                >
                                    {s === "ready_for_pickup" ? "Ready for Pickup" : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pickup info panel (pickup orders) */}
                    {pickup && pickupSettings && (
                        <div className="bg-white border border-neutral-200">
                            <button
                                onClick={() => setPickupPanelOpen(v => !v)}
                                className="w-full px-6 py-4 flex items-center justify-between border-b border-neutral-100"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="inline-block w-2 h-2 rounded-full bg-neutral-900" />
                                    <h2 className="text-xs uppercase tracking-widest font-semibold">Pickup Instructions</h2>
                                </div>
                                <span className="text-neutral-400 text-sm">{pickupPanelOpen ? "▲" : "▼"}</span>
                            </button>
                            {pickupPanelOpen && (
                                <div className="px-6 py-4 space-y-3">
                                    <p className="text-sm leading-relaxed text-neutral-700" style={{ whiteSpace: "pre-wrap" }}>
                                        {pickupSettings.instructions}
                                    </p>
                                    <div className="text-[11px] text-neutral-500 space-y-1 pt-2 border-t border-neutral-100">
                                        {pickupSettings.address && <p>📍 {pickupSettings.address}</p>}
                                        {pickupSettings.phone && <p>📞 {pickupSettings.phone}</p>}
                                        {pickupSettings.wait && <p>⏱ Ready in: {pickupSettings.wait}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Assigned Rider card (delivery orders that have been shipped/fulfilled) */}
                    {assignedRider && !pickup && (
                        <div className="bg-white border border-neutral-200 divide-y divide-neutral-100">
                            <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
                                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                                <h2 className="text-xs uppercase tracking-widest font-semibold">Dispatch Rider</h2>
                            </div>
                            <div className="px-6 py-4 flex items-center gap-4">
                                {assignedRider.image_url ? (
                                    <img src={assignedRider.image_url} alt={assignedRider.full_name} className="w-12 h-12 rounded-full object-cover shrink-0 border border-neutral-100" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-serif font-semibold text-neutral-400">{assignedRider.full_name.charAt(0)}</span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-neutral-900 truncate">{assignedRider.full_name}</p>
                                    <p className="text-xs text-neutral-500 mt-0.5">{assignedRider.phone_number}</p>
                                    {assignedRider.bike_reg && (
                                        <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{assignedRider.bike_reg}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ── Print Receipt (screen-hidden via fixed position, print-visible) ── */}
        <div id="admin-receipt-print" className="bg-white p-12 max-w-2xl">
            <div className="flex items-start justify-between mb-8 pb-6 border-b border-neutral-100">
                <div>
                    <h2 className="font-serif text-xl tracking-widest uppercase">{bizName}</h2>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Order Receipt</p>
                </div>
                <div className="text-right">
                    <p className="font-mono text-sm font-bold text-neutral-900">#{orderNum}</p>
                    <p className="text-xs text-neutral-400 mt-1">{dateStr}</p>
                    <span className={`mt-2 inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded ${STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                        {order.status === "ready_for_pickup" ? "Ready for Pickup" : order.status}
                    </span>
                </div>
            </div>

            {(order.customer_name || addr || order.delivery_method) && (
                <div className="mb-8 pb-6 border-b border-neutral-100 grid grid-cols-2 gap-6">
                    {order.customer_name && (
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-2">Customer</p>
                            <p className="text-sm text-neutral-800 font-medium">{order.customer_name}</p>
                            {order.customer_phone && <p className="text-xs text-neutral-500">{order.customer_phone}</p>}
                            {order.customer_email && <p className="text-xs text-neutral-500">{order.customer_email}</p>}
                        </div>
                    )}
                    {addr && (
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-2">{pickup ? "Pickup Location" : "Delivery Address"}</p>
                            <p className="text-sm text-neutral-700 whitespace-pre-line">{pickup ? (bizContact.address || "Store") : addr}</p>
                            {order.delivery_method && (
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">{order.delivery_method}</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="mb-8">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-4">Items Ordered</p>
                {items.length === 0 ? (
                    <p className="text-sm text-neutral-400 italic">No item details available.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-100">
                                <th className="text-left text-[10px] uppercase tracking-widest text-neutral-400 font-semibold pb-2">Item</th>
                                <th className="text-center text-[10px] uppercase tracking-widest text-neutral-400 font-semibold pb-2 w-12">Qty</th>
                                <th className="text-right text-[10px] uppercase tracking-widest text-neutral-400 font-semibold pb-2 w-28">Price</th>
                                <th className="text-right text-[10px] uppercase tracking-widest text-neutral-400 font-semibold pb-2 w-28">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {items.map((item: any, i: number) => {
                                const name  = item.name || item.productName || "Item";
                                const price = Number(item.price ?? item.unit_price ?? 0);
                                const qty   = Number(item.quantity ?? item.qty ?? 1);
                                return (
                                    <tr key={i}>
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                {(item.imageUrl || item.image_url) && (
                                                    <img src={item.imageUrl || item.image_url} alt={name} className="w-14 h-14 object-cover border border-neutral-100" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-neutral-800">{name}</p>
                                                    {(item.size || item.color) && (
                                                        <p className="text-[10px] uppercase tracking-wider text-neutral-400 mt-0.5">
                                                            {[item.size, item.color].filter(Boolean).join(" · ")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 text-center text-neutral-600">{qty}</td>
                                        <td className="py-3 text-right text-neutral-600">GH₵ {price.toFixed(2)}</td>
                                        <td className="py-3 text-right font-medium">GH₵ {(price * qty).toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="flex justify-end border-t border-neutral-200 pt-4">
                <div className="w-56 space-y-2 text-sm">
                    {order.discount_code && Number(order.discount_amount ?? 0) > 0 && (
                        <>
                            <div className="flex justify-between text-neutral-500">
                                <span>Subtotal</span>
                                <span>GH₵ {(Number(order.total_amount ?? 0) + Number(order.discount_amount ?? 0)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                                <span>Discount ({order.discount_code})</span>
                                <span>-GH₵ {Number(order.discount_amount ?? 0).toFixed(2)}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between font-semibold text-base">
                        <span>Total Paid</span>
                        <span>GH₵ {Number(order.total_amount ?? 0).toFixed(2)}</span>
                    </div>
                    {order.paystack_reference && (
                        <div className="flex justify-between text-neutral-400 text-xs">
                            <span>Ref</span>
                            <span className="font-mono">{order.paystack_reference.substring(0, 16)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Pickup instructions on print receipt */}
            {pickup && pickupSettings && (
                <div className="mt-8" style={{ backgroundColor: "#F7F2EC", padding: "16px", border: "1px solid #E8E4DE" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>
                        📦 Store Pickup Instructions
                    </p>
                    <p style={{ fontSize: "13px", lineHeight: 1.7, color: "#404040", whiteSpace: "pre-wrap", marginBottom: "12px" }}>
                        {pickupSettings.instructions}
                    </p>
                    <div style={{ borderTop: "1px solid #DDD8D1", paddingTop: "10px", fontSize: "12px", color: "#525252", lineHeight: 2 }}>
                        {pickupSettings.address && <div>📍 {pickupSettings.address}</div>}
                        {pickupSettings.phone && <div>📞 {pickupSettings.phone}</div>}
                        {pickupSettings.wait && <div>⏱ Ready in: {pickupSettings.wait}</div>}
                    </div>
                </div>
            )}

            <div className="border-t border-neutral-100 mt-8 pt-6 text-center space-y-1">
                {(bizContact.address || bizContact.contact || bizContact.email) && (
                    <div className="text-xs text-neutral-500 space-y-0.5 mb-3">
                        {bizContact.address && <p>{bizContact.address}</p>}
                        {bizContact.contact && <p>{bizContact.contact}</p>}
                        {bizContact.email  && <p>{bizContact.email}</p>}
                    </div>
                )}
                <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                    Thank you for your order — {bizName}
                </p>
            </div>
        </div>
        </>
    );
}
