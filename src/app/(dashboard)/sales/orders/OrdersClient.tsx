"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { updateOrderStatus, bulkUpdateOrderStatus } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    total_amount: number | null;
    status: string;
    payment_status?: string | null;
    paystack_reference: string | null;
    shipping_address: Record<string, string> | null;
    delivery_method: string | null;
    created_at: string;
    has_preorder?: boolean;
    is_mixed_order?: boolean;
    customer_metadata?: Record<string, any> | null;
};

type Rider = {
    id: string;
    full_name: string;
    phone_number: string;
    bike_reg: string | null;
    image_url: string | null;
    is_active: boolean;
};

function isPickup(order: Order) {
    return order.delivery_method?.toLowerCase().includes("pickup") ?? false;
}

// ─── Badge helper ──────────────────────────────────────────────────────────────

const STATUS_CLASS: Record<string, string> = {
    paid:              "ac-badge-paid",
    packed:            "ac-badge-packed",
    shipped:           "ac-badge-shipped",
    processing:        "ac-badge-processing",
    pending:           "ac-badge-pending",
    fulfilled:         "ac-badge-fulfilled",
    delivered:         "ac-badge-delivered",
    cancelled:         "ac-badge-cancelled",
    failed:            "ac-badge-failed",
    refunded:          "ac-badge-refunded",
    ready_for_pickup:  "ac-badge-ready_for_pickup",
};

const STATUS_LABEL: Record<string, string> = {
    ready_for_pickup: "Ready for Pickup",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "all" | "packed" | "pickups" | "shipped" | "fulfilled" | "cancelled" | "refunded" | "all-orders";

const TABS: { key: Tab; label: string }[] = [
    { key: "all",         label: "Inbox" },
    { key: "packed",      label: "Packed" },
    { key: "pickups",     label: "Pickups" },
    { key: "shipped",     label: "Shipped" },
    { key: "fulfilled",   label: "Fulfilled" },
    { key: "cancelled",   label: "Cancelled" },
    { key: "refunded",    label: "Refunds" },
    { key: "all-orders",  label: "All" },
];

function matchesSearch(order: Order, q: string) {
    const s = q.toLowerCase();
    return (
        (order.customer_name?.toLowerCase().includes(s) ?? false) ||
        (order.customer_email?.toLowerCase().includes(s) ?? false) ||
        order.id.toLowerCase().includes(s)
    );
}

function filterOrders(orders: Order[], tab: Tab, search: string) {
    const q = search.trim();
    if (tab === "all") return q ? orders.filter(o => matchesSearch(o, q)) : orders.filter(o => o.status === "paid");
    const base = (() => {
        switch (tab) {
            case "packed":    return orders.filter(o => o.status === "packed");
            case "pickups":   return orders.filter(o => o.status === "ready_for_pickup");
            case "shipped":   return orders.filter(o => o.status === "shipped");
            case "fulfilled": return orders.filter(o => ["fulfilled", "delivered"].includes(o.status));
            case "cancelled": return orders.filter(o => ["cancelled", "failed"].includes(o.status));
            case "refunded":  return orders.filter(o => o.status === "refunded");
            default:          return orders;
        }
    })();
    return q ? base.filter(o => matchesSearch(o, q)) : base;
}

// ─── Dispatch Modal ───────────────────────────────────────────────────────────

function DispatchModal({ orders, onClose, onConfirm }: { orders: Order[]; onClose: () => void; onConfirm: (riderId: string, notifyRider: boolean) => void }) {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [selectedRider, setSelectedRider] = useState("");
    const [notifyRider, setNotifyRider] = useState(true);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        supabase.from("riders").select("id, full_name, phone_number, bike_reg, image_url, is_active").eq("is_active", true).order("full_name")
            .then(({ data, error }: { data: any, error: any }) => {
                if (error) { console.error("Failed to load riders:", error); toast.error("Failed to load active riders."); }
                setRiders(data ?? []);
                if (data && data.length > 0) setSelectedRider(data[0].id);
                setLoading(false);
            });
    }, []);

    return (
        <div className="ac-modal-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ac-modal">
                <div className="ac-modal-head">
                    <div>
                        <div className="ac-modal-title">Assign Rider</div>
                        <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 4 }}>
                            {orders.length} order{orders.length !== 1 ? "s" : ""} to dispatch
                        </div>
                    </div>
                    <button className="ac-modal-close" onClick={onClose} type="button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                <div className="ac-modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Order list */}
                    <div style={{
                        background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)",
                        borderRadius: "var(--r-md)", padding: "10px 14px",
                        maxHeight: 120, overflowY: "auto",
                        display: "flex", flexDirection: "column", gap: 4,
                    }}>
                        {orders.map(o => (
                            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                <span style={{ fontFamily: "var(--f-mono)", color: "var(--ac-ink-3)" }}>{o.id.substring(0, 8).toUpperCase()}</span>
                                <span style={{ color: "var(--ac-ink-2)" }}>{o.customer_name || o.customer_email}</span>
                            </div>
                        ))}
                    </div>

                    {/* Rider select */}
                    <div>
                        <label className="ac-label">Select Rider</label>
                        {loading ? (
                            <p style={{ fontSize: 12, color: "var(--ac-ink-3)", fontStyle: "italic" }}>Loading riders…</p>
                        ) : riders.length === 0 ? (
                            <p style={{ fontSize: 12, color: "var(--ac-danger)" }}>No active riders. Add in Settings → Riders.</p>
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
                    </div>

                    {/* Notify checkbox */}
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                        <input
                            type="checkbox" checked={notifyRider}
                            onChange={e => setNotifyRider(e.target.checked)}
                            className="ac-checkbox" style={{ marginTop: 2 }}
                        />
                        <div>
                            <div style={{ fontSize: 12, color: "var(--ac-ink-2)", fontWeight: 500 }}>Notify Rider via SMS</div>
                            <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2 }}>Sends customer name, phone, and delivery address.</div>
                        </div>
                    </label>
                </div>

                <div className="ac-modal-foot">
                    <button className="ac-btn ac-btn-ghost" onClick={onClose} type="button">Cancel</button>
                    <button
                        className="ac-btn ac-btn-primary"
                        onClick={() => { setConfirming(true); onConfirm(selectedRider, notifyRider); }}
                        disabled={confirming || !selectedRider || riders.length === 0}
                        type="button"
                    >
                        {confirming ? "Dispatching…" : "Confirm Dispatch"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrdersClient({ orders: initialOrders }: { orders: Order[] }) {
    const router = useRouter();
    const [orders, setOrders] = useState(initialOrders);
    const [activeTab, setActiveTab] = useState<Tab>("all");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
    const [showDispatch, setShowDispatch] = useState(false);
    const [dispatchOrders, setDispatchOrders] = useState<Order[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    const visibleOrders = filterOrders(orders, activeTab, search);
    const allSelected = visibleOrders.length > 0 && visibleOrders.every(o => selected.has(o.id));

    const tabCounts: Record<Tab, number> = {
        all:          orders.filter(o => o.status === "paid").length,
        packed:       orders.filter(o => o.status === "packed").length,
        pickups:      orders.filter(o => o.status === "ready_for_pickup").length,
        shipped:      orders.filter(o => o.status === "shipped").length,
        fulfilled:    orders.filter(o => ["fulfilled", "delivered"].includes(o.status)).length,
        cancelled:    orders.filter(o => ["cancelled", "failed"].includes(o.status)).length,
        refunded:     orders.filter(o => o.status === "refunded").length,
        "all-orders": orders.length,
    };

    useEffect(() => { setSelected(new Set()); }, [activeTab, search]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest("[data-dropdown]")) { setOpenDropdown(null); setDropdownPos(null); }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visibleOrders.map(o => o.id)));
    const toggleOne = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const bulkUpdate = async (status: string) => {
        setBulkLoading(true);
        const ids = [...selected];
        const result = await bulkUpdateOrderStatus(ids, status);
        if (!result.success) { toast.error("Failed to update orders."); setBulkLoading(false); return; }
        toast.success(`${ids.length} order${ids.length > 1 ? "s" : ""} → ${status}.`);
        setOrders(prev => prev.map(o => selected.has(o.id) ? { ...o, status } : o));
        setSelected(new Set());
        if (status === "fulfilled" || status === "cancelled" || status === "packed") {
            await Promise.all(ids.map(async orderId => {
                try {
                    const res = await fetch("/api/email/fulfillment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, type: status }) });
                    if (!res.ok) throw new Error(await res.text());
                } catch (err) { console.error("Auto-email failed for", orderId, err); toast.error(`Notification failed for order ${orderId.substring(0, 8).toUpperCase()}`); }
            }));
        }
        setBulkLoading(false);
    };

    const bulkMarkPickupReady = async () => {
        const pickupIds = visibleOrders.filter(o => selected.has(o.id) && isPickup(o)).map(o => o.id);
        if (!pickupIds.length) { toast.error("No pickup orders in selection."); return; }
        setBulkLoading(true);
        try {
            const res = await fetch("/api/pickup-ready", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds: pickupIds }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            toast.success(`${pickupIds.length} order${pickupIds.length > 1 ? "s" : ""} marked ready for pickup.`);
            setOrders(prev => prev.map(o => pickupIds.includes(o.id) ? { ...o, status: "ready_for_pickup" } : o));
            setSelected(new Set());
        } catch (err: any) { toast.error(err.message || "Failed to mark pickup ready."); }
        setBulkLoading(false);
    };

    const openDispatchForSelected = () => {
        const deliveryOrders = visibleOrders.filter(o => selected.has(o.id) && !isPickup(o));
        if (!deliveryOrders.length) { toast.error("No delivery orders in selection."); return; }
        setDispatchOrders(deliveryOrders); setShowDispatch(true);
    };

    const openDispatchForOrder = (order: Order) => {
        setDispatchOrders([order]); setShowDispatch(true);
        setOpenDropdown(null); setDropdownPos(null);
    };

    const handleDispatchConfirm = async (riderId: string, notifyRider: boolean) => {
        const ids = dispatchOrders.map(o => o.id);
        try {
            const res = await fetch("/api/dispatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds: ids, riderId, notifyRider }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Dispatch failed");
            toast.success(`${ids.length} order${ids.length > 1 ? "s" : ""} dispatched.`);
            setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status: "shipped" } : o));
            setSelected(new Set()); setShowDispatch(false); setDispatchOrders([]);
        } catch (err: any) { toast.error(err.message || "Dispatch failed."); }
    };

    const markFulfilledForOrder = async (order: Order) => {
        setOpenDropdown(null); setDropdownPos(null);
        const result = await updateOrderStatus(order.id, "fulfilled");
        if (!result.success) { toast.error("Failed to mark fulfilled."); return; }
        toast.success("Order marked fulfilled.");
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "fulfilled" } : o));
        try {
            const res = await fetch("/api/email/fulfillment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, type: "fulfilled" }) });
            if (!res.ok) throw new Error(await res.text());
        } catch (err) { console.error("Fulfillment notification failed", err); toast.error("Order updated but notification failed."); }
    };

    const markPickupReadyForOrder = async (order: Order) => {
        setOpenDropdown(null); setDropdownPos(null);
        try {
            const res = await fetch("/api/pickup-ready", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds: [order.id] }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            toast.success("Order marked ready for pickup.");
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "ready_for_pickup" } : o));
        } catch (err: any) { toast.error(err.message || "Failed."); }
    };

    const copyOrderId = (id: string) => {
        navigator.clipboard.writeText(id); toast.success("Order ID copied.");
        setOpenDropdown(null); setDropdownPos(null);
    };

    const handleRowClick = (e: React.MouseEvent, orderId: string) => {
        if ((e.target as HTMLElement).closest("input, button, a, [data-no-nav]")) return;
        router.push(`/sales/orders/${orderId}`);
    };

    const selectedCount = selected.size;
    const hasPickupSelected = visibleOrders.some(o => selected.has(o.id) && isPickup(o));
    const hasDeliverySelected = visibleOrders.some(o => selected.has(o.id) && !isPickup(o));

    return (
        <div className="ac-card flush" style={{ display: "flex", flexDirection: "column" }}>
            {/* Tab + search row */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 0 0 0",
                borderBottom: "1px solid var(--ac-line)",
                flexWrap: "wrap", gap: 0,
            }}>
                <div className="ac-tabs" style={{ border: "none", flex: "1 1 auto" }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            className={`ac-tab${activeTab === tab.key ? " active" : ""}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                            <span className="ac-tab-count">{tabCounts[tab.key]}</span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderLeft: "1px solid var(--ac-line)", flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ac-ink-4)" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                    <input
                        type="text" value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Name, email or order ID…"
                        style={{
                            background: "transparent", border: "none", outline: "none",
                            color: "var(--ac-ink)", fontFamily: "var(--f-mono)",
                            fontSize: 11, letterSpacing: ".08em", width: 200,
                        }}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", padding: 0, display: "flex" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Context banners */}
            {search && (
                <div style={{ padding: "8px 16px", background: "var(--ac-panel-2)", borderBottom: "1px solid var(--ac-line)", fontSize: 11, color: "var(--ac-ink-3)", fontFamily: "var(--f-mono)", letterSpacing: ".08em" }}>
                    {visibleOrders.length} result{visibleOrders.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
                </div>
            )}
            {activeTab === "pickups" && visibleOrders.length > 0 && (
                <div style={{ padding: "10px 16px", background: "var(--ac-ink)", borderBottom: "1px solid var(--ac-line)", fontSize: 11, color: "var(--ac-bg)", fontFamily: "var(--f-mono)", letterSpacing: ".1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    {visibleOrders.length} order{visibleOrders.length !== 1 ? "s" : ""} awaiting in-store pickup
                </div>
            )}

            {/* Table */}
            <div className="ac-table-wrap">
                <table className="ac-table">
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}>
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="ac-checkbox" />
                            </th>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Type</th>
                            <th className="r">Amount</th>
                            <th>Status</th>
                            <th>Reference</th>
                            <th className="r">Date</th>
                            <th style={{ width: 44 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleOrders.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="ac-table-empty">
                                    {search ? "No orders match your search." : "No orders in this category."}
                                </td>
                            </tr>
                        ) : visibleOrders.map((order) => (
                            <tr
                                key={order.id}
                                onClick={(e) => handleRowClick(e, order.id)}
                                className={selected.has(order.id) ? "selected" : ""}
                            >
                                <td onClick={e => e.stopPropagation()}>
                                    <input type="checkbox" checked={selected.has(order.id)} onChange={() => toggleOne(order.id)} className="ac-checkbox" />
                                </td>
                                <td>
                                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-3)", letterSpacing: ".04em" }}>
                                        {order.id.substring(0, 8).toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <span style={{ color: "var(--ac-ink-2)" }}>{order.customer_name || order.customer_email || "—"}</span>
                                        {order.is_mixed_order ? (
                                            <>
                                                <span className="ac-badge ac-badge-mixed">Mixed</span>
                                                {(() => {
                                                    const dispatched = order.customer_metadata?.regular_items_dispatched_at;
                                                    if (!dispatched) return null;
                                                    const isFulfilled = ["fulfilled", "delivered"].includes(order.status);
                                                    return <span title={isFulfilled ? "Fully fulfilled" : "In-stock shipped · Pre-order pending"} style={{ fontSize: 11, color: isFulfilled ? "var(--ac-accent)" : "var(--ac-info)" }}>●</span>;
                                                })()}
                                            </>
                                        ) : order.has_preorder ? (
                                            <span className="ac-badge ac-badge-preorder">Pre-Order</span>
                                        ) : null}
                                    </div>
                                </td>
                                <td>
                                    <span className={`ac-badge ${isPickup(order) ? "ac-badge-pickup" : "ac-badge-delivery"}`}>
                                        {isPickup(order) ? "Pickup" : "Delivery"}
                                    </span>
                                </td>
                                <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--ac-ink-2)" }}>
                                    GH₵&nbsp;{Number(order.total_amount ?? 0).toFixed(2)}
                                </td>
                                <td>
                                    <span className={`ac-badge ${STATUS_CLASS[order.status] ?? "ac-badge-info"}`}>
                                        {STATUS_LABEL[order.status] ?? order.status}
                                    </span>
                                    {order.payment_status === "abandoned" && (
                                        <div style={{ fontSize: 9, color: "var(--ac-ink-4)", marginTop: 2, fontFamily: "var(--f-mono)", letterSpacing: ".08em", textTransform: "uppercase" }}>Abandoned</div>
                                    )}
                                    {order.payment_status === "failed" && (
                                        <div style={{ fontSize: 9, color: "var(--ac-danger)", marginTop: 2, fontFamily: "var(--f-mono)", letterSpacing: ".08em", textTransform: "uppercase" }}>Payment Failed</div>
                                    )}
                                </td>
                                <td>
                                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-4)" }}>
                                        {order.paystack_reference || "—"}
                                    </span>
                                </td>
                                <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-4)" }}>
                                    {new Date(order.created_at).toLocaleDateString()}
                                </td>
                                <td onClick={e => e.stopPropagation()} data-dropdown style={{ position: "relative" }}>
                                    <button
                                        onClick={(e) => {
                                            if (openDropdown === order.id) { setOpenDropdown(null); setDropdownPos(null); }
                                            else {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                                setOpenDropdown(order.id);
                                            }
                                        }}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", padding: "4px 6px", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center" }}
                                        type="button"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>
                                    </button>

                                    {openDropdown === order.id && dropdownPos && (
                                        <div style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }} className="ac-dropdown">
                                            <button className="ac-dropdown-item" onClick={() => copyOrderId(order.id)} type="button">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                                Copy Order ID
                                            </button>
                                            <Link href={`/sales/orders/${order.id}?print=1`} className="ac-dropdown-item" onClick={() => setOpenDropdown(null)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="6" y="3" width="12" height="6"/><rect x="3" y="9" width="18" height="9" rx="1"/><rect x="6" y="15" width="12" height="6"/></svg>
                                                Print Invoice
                                            </Link>
                                            <hr className="ac-dropdown-sep" />
                                            {order.status === "packed" && (
                                                isPickup(order) ? (
                                                    <button className="ac-dropdown-item" onClick={() => markPickupReadyForOrder(order)} type="button">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                                                        Mark Ready for Pickup
                                                    </button>
                                                ) : (
                                                    <button className="ac-dropdown-item" onClick={() => openDispatchForOrder(order)} type="button" style={{ color: "var(--ac-info)" }}>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="7" width="12" height="10" rx="1"/><path d="M14 10h4l3 3v4h-7"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17" cy="18.5" r="1.6"/></svg>
                                                        Assign Rider &amp; Ship
                                                    </button>
                                                )
                                            )}
                                            <button className="ac-dropdown-item" onClick={() => markFulfilledForOrder(order)} type="button" style={{ color: "var(--ac-accent)" }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m5 12 5 5L20 7"/></svg>
                                                Mark Fulfilled
                                            </button>
                                            <Link href={`/sales/orders/${order.id}`} className="ac-dropdown-item" onClick={() => setOpenDropdown(null)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                View Details
                                            </Link>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Bulk action bar */}
            {selectedCount > 0 && (
                <div className="ac-bulk-bar">
                    <span className="ac-bulk-label">{selectedCount} selected</span>

                    {activeTab === "packed" ? (
                        <>
                            {hasPickupSelected && (
                                <button className="ac-btn ac-btn-ghost ac-btn-sm" onClick={bulkMarkPickupReady} disabled={bulkLoading} type="button">
                                    Mark Ready
                                </button>
                            )}
                            {hasDeliverySelected && (
                                <button className="ac-btn ac-btn-sm" onClick={openDispatchForSelected} disabled={bulkLoading} type="button" style={{ background: "var(--ac-info)", color: "#fff", border: "none" }}>
                                    Assign &amp; Ship
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button className="ac-btn ac-btn-ghost ac-btn-sm" onClick={() => bulkUpdate("packed")} disabled={bulkLoading} type="button">Pack</button>
                            <button className="ac-btn ac-btn-sm" onClick={openDispatchForSelected} disabled={bulkLoading} type="button" style={{ background: "var(--ac-info)", color: "#fff", border: "none" }}>Ship</button>
                            <button className="ac-btn ac-btn-accent ac-btn-sm" onClick={() => bulkUpdate("fulfilled")} disabled={bulkLoading} type="button">Fulfilled</button>
                        </>
                    )}

                    <button onClick={() => setSelected(new Set())} type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-3)", marginLeft: 4, display: "flex", alignItems: "center" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            )}

            {showDispatch && (
                <DispatchModal
                    orders={dispatchOrders}
                    onClose={() => { setShowDispatch(false); setDispatchOrders([]); }}
                    onConfirm={handleDispatchConfirm}
                />
            )}
        </div>
    );
}
