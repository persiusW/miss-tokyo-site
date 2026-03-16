"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { MoreHorizontal, Copy, Printer, Eye, Truck, X, Search, Store } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    total_amount: number | null;
    status: string;
    paystack_reference: string | null;
    shipping_address: Record<string, string> | null;
    delivery_method: string | null;
    created_at: string;
};

type Rider = {
    id: string;
    full_name: string;
    phone_number: string;
    bike_reg: string | null;
    image_url: string | null;
    is_active: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPickup(order: Order) {
    return order.delivery_method?.toLowerCase().includes("pickup") ?? false;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    paid:              "bg-green-50 text-green-700",
    packed:            "bg-blue-50 text-blue-700",
    shipped:           "bg-indigo-50 text-indigo-700",
    processing:        "bg-blue-50 text-blue-700",
    pending:           "bg-amber-50 text-amber-700",
    fulfilled:         "bg-emerald-50 text-emerald-700",
    delivered:         "bg-emerald-100 text-emerald-800",
    cancelled:         "bg-red-50 text-red-600",
    refunded:          "bg-neutral-100 text-neutral-600",
    ready_for_pickup:  "bg-neutral-900 text-white",
};

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

function matchesSearch(order: Order, q: string): boolean {
    const s = q.toLowerCase();
    return (
        (order.customer_name?.toLowerCase().includes(s) ?? false) ||
        (order.customer_email?.toLowerCase().includes(s) ?? false) ||
        order.id.toLowerCase().includes(s)
    );
}

function filterOrders(orders: Order[], tab: Tab, search: string): Order[] {
    const q = search.trim();
    if (tab === "all") {
        return q
            ? orders.filter(o => matchesSearch(o, q))
            : orders.filter(o => o.status === "paid");
    }
    const baseFilter = (() => {
        switch (tab) {
            case "packed":    return orders.filter(o => o.status === "packed");
            case "pickups":   return orders.filter(o => o.status === "ready_for_pickup");
            case "shipped":   return orders.filter(o => o.status === "shipped");
            case "fulfilled": return orders.filter(o => ["fulfilled", "delivered"].includes(o.status));
            case "cancelled": return orders.filter(o => ["cancelled", "failed"].includes(o.status));
            case "refunded":  return orders.filter(o => o.status === "refunded");
            case "all-orders": return orders;
            default: return orders;
        }
    })();
    return q ? baseFilter.filter(o => matchesSearch(o, q)) : baseFilter;
}

// ─── Dispatch Modal ───────────────────────────────────────────────────────────

function DispatchModal({
    orders,
    onClose,
    onConfirm,
}: {
    orders: Order[];
    onClose: () => void;
    onConfirm: (riderId: string, notifyRider: boolean) => void;
}) {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [selectedRider, setSelectedRider] = useState<string>("");
    const [notifyRider, setNotifyRider] = useState(true);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        supabase.from("riders").select("*").eq("is_active", true).order("full_name")
            .then(({ data }) => {
                setRiders(data ?? []);
                if (data && data.length > 0) setSelectedRider(data[0].id);
                setLoading(false);
            });
    }, []);

    const handleConfirm = async () => {
        if (!selectedRider) { toast.error("Select a rider first."); return; }
        setConfirming(true);
        onConfirm(selectedRider, notifyRider);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-lg border border-neutral-200 shadow-2xl">
                <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-200">
                    <div>
                        <h2 className="font-serif text-xl tracking-widest uppercase">Assign Dispatch Rider</h2>
                        <p className="text-xs text-neutral-500 mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""} to dispatch</p>
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-black transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-8 py-6 space-y-6">
                    <div className="bg-neutral-50 border border-neutral-100 p-4 max-h-32 overflow-y-auto space-y-1">
                        {orders.map(o => (
                            <div key={o.id} className="flex justify-between text-xs text-neutral-600">
                                <span className="font-mono">{o.id.substring(0, 8).toUpperCase()}</span>
                                <span>{o.customer_name || o.customer_email}</span>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Select Rider</label>
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
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notifyRider}
                            onChange={e => setNotifyRider(e.target.checked)}
                            className="w-4 h-4 accent-black"
                        />
                        <div>
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-700">Notify Rider via SMS</span>
                            <p className="text-[10px] text-neutral-400 mt-0.5">Sends customer name, phone, and delivery address to rider.</p>
                        </div>
                    </label>
                </div>

                <div className="px-8 py-5 border-t border-neutral-200 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-xs uppercase tracking-widest text-neutral-500 hover:text-black border border-neutral-200 hover:border-black transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={confirming || !selectedRider || riders.length === 0}
                        className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {confirming ? "Dispatching..." : "Confirm Dispatch"}
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
            const target = e.target as HTMLElement;
            if (!target.closest("[data-dropdown]")) { setOpenDropdown(null); setDropdownPos(null); }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggleAll = () => {
        setSelected(allSelected ? new Set() : new Set(visibleOrders.map(o => o.id)));
    };

    const toggleOne = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const bulkUpdate = async (status: string) => {
        setBulkLoading(true);
        const ids = [...selected];
        const { error } = await supabase.from("orders").update({ status }).in("id", ids);
        if (error) {
            toast.error("Failed to update orders.");
        } else {
            toast.success(`${ids.length} order${ids.length > 1 ? "s" : ""} → ${status}.`);
            setOrders(prev => prev.map(o => selected.has(o.id) ? { ...o, status } : o));
            setSelected(new Set());
        }
        setBulkLoading(false);
    };

    const bulkMarkPickupReady = async () => {
        const pickupIds = visibleOrders
            .filter(o => selected.has(o.id) && isPickup(o))
            .map(o => o.id);
        if (!pickupIds.length) { toast.error("No pickup orders in selection."); return; }
        setBulkLoading(true);
        try {
            const res = await fetch("/api/pickup-ready", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds: pickupIds }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            toast.success(`${pickupIds.length} order${pickupIds.length > 1 ? "s" : ""} marked ready for pickup.`);
            setOrders(prev => prev.map(o => pickupIds.includes(o.id) ? { ...o, status: "ready_for_pickup" } : o));
            setSelected(new Set());
        } catch (err: any) {
            toast.error(err.message || "Failed to mark pickup ready.");
        }
        setBulkLoading(false);
    };

    const openDispatchForSelected = () => {
        const deliveryOrders = visibleOrders.filter(o => selected.has(o.id) && !isPickup(o));
        if (!deliveryOrders.length) { toast.error("No delivery orders in selection."); return; }
        setDispatchOrders(deliveryOrders);
        setShowDispatch(true);
    };

    const openDispatchForOrder = (order: Order) => {
        setDispatchOrders([order]);
        setShowDispatch(true);
        setOpenDropdown(null);
        setDropdownPos(null);
    };

    const handleDispatchConfirm = async (riderId: string, notifyRider: boolean) => {
        const ids = dispatchOrders.map(o => o.id);
        try {
            const res = await fetch("/api/dispatch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds: ids, riderId, notifyRider }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Dispatch failed");

            toast.success(`${ids.length} order${ids.length > 1 ? "s" : ""} dispatched.`);
            setOrders(prev => prev.map(o =>
                ids.includes(o.id) ? { ...o, status: "shipped" } : o
            ));
            setSelected(new Set());
            setShowDispatch(false);
            setDispatchOrders([]);
        } catch (err: any) {
            toast.error(err.message || "Dispatch failed.");
        }
    };

    const markPickupReadyForOrder = async (order: Order) => {
        setOpenDropdown(null);
        setDropdownPos(null);
        try {
            const res = await fetch("/api/pickup-ready", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds: [order.id] }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            toast.success("Order marked ready for pickup.");
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "ready_for_pickup" } : o));
        } catch (err: any) {
            toast.error(err.message || "Failed.");
        }
    };

    const copyOrderId = (id: string) => {
        navigator.clipboard.writeText(id);
        toast.success("Order ID copied.");
        setOpenDropdown(null);
        setDropdownPos(null);
    };

    const handleRowClick = (e: React.MouseEvent, orderId: string) => {
        const target = e.target as HTMLElement;
        if (target.closest("input, button, a, [data-no-nav]")) return;
        router.push(`/sales/orders/${orderId}`);
    };

    const selectedCount = selected.size;
    const hasPickupSelected = visibleOrders.some(o => selected.has(o.id) && isPickup(o));
    const hasDeliverySelected = visibleOrders.some(o => selected.has(o.id) && !isPickup(o));

    return (
        <div className="space-y-0">
            {/* Search + Tabs row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 border-b border-neutral-200 pb-0">
                <div className="flex gap-0 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
                                activeTab === tab.key
                                    ? "border-black text-black"
                                    : "border-transparent text-neutral-400 hover:text-black"
                            }`}
                        >
                            {tab.label}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                activeTab === tab.key ? "bg-black text-white" : "bg-neutral-100 text-neutral-500"
                            }`}>
                                {tabCounts[tab.key]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 pb-3 sm:ml-auto">
                    <Search size={13} className="text-neutral-400 shrink-0" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="SEARCH BY NAME, EMAIL OR ORDER ID"
                        className="border-b border-neutral-300 bg-transparent outline-none focus:border-black text-[10px] uppercase tracking-widest py-1 w-64 placeholder:text-neutral-400"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="text-neutral-400 hover:text-black">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Search context indicator */}
            {search && (
                <div className="px-4 py-2 bg-neutral-50 border border-neutral-200 border-t-0 text-[10px] text-neutral-500 uppercase tracking-widest">
                    Showing {visibleOrders.length} result{visibleOrders.length !== 1 ? "s" : ""} across all statuses for &ldquo;{search}&rdquo;
                </div>
            )}

            {/* Pickups tab info banner */}
            {activeTab === "pickups" && visibleOrders.length > 0 && (
                <div className="px-4 py-3 bg-neutral-900 text-white text-[10px] uppercase tracking-widest border-b border-neutral-700">
                    <Store size={12} className="inline mr-2 mb-0.5" />
                    {visibleOrders.length} order{visibleOrders.length !== 1 ? "s" : ""} awaiting in-store pickup
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedCount > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black text-white px-6 py-4 shadow-2xl">
                    <span className="text-xs uppercase tracking-widest text-neutral-300 mr-2">
                        {selectedCount} selected
                    </span>

                    {activeTab === "packed" ? (
                        <>
                            {hasPickupSelected && (
                                <button
                                    onClick={bulkMarkPickupReady}
                                    disabled={bulkLoading}
                                    className="flex items-center gap-2 text-xs uppercase tracking-widest px-4 py-2 bg-neutral-700 hover:bg-neutral-600 transition-colors disabled:opacity-50"
                                >
                                    <Store size={14} /> Mark Ready for Pickup
                                </button>
                            )}
                            {hasDeliverySelected && (
                                <button
                                    onClick={openDispatchForSelected}
                                    disabled={bulkLoading}
                                    className="flex items-center gap-2 text-xs uppercase tracking-widest px-4 py-2 bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
                                >
                                    <Truck size={14} /> Assign Rider & Ship
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button onClick={() => bulkUpdate("packed")} disabled={bulkLoading}
                                className="text-xs uppercase tracking-widest px-4 py-2 bg-neutral-700 hover:bg-neutral-600 transition-colors disabled:opacity-50">
                                Mark Packed
                            </button>
                            <button onClick={openDispatchForSelected} disabled={bulkLoading}
                                className="flex items-center gap-2 text-xs uppercase tracking-widest px-4 py-2 bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50">
                                <Truck size={14} /> Mark Shipped
                            </button>
                            <button onClick={() => bulkUpdate("fulfilled")} disabled={bulkLoading}
                                className="text-xs uppercase tracking-widest px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50">
                                Mark Fulfilled
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => setSelected(new Set())}
                        className="ml-2 text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-neutral-200 border-t-0 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-4 py-4 w-10">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                                    className="w-4 h-4 cursor-pointer accent-black" />
                            </th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Order ID</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Customer</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Type</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Amount</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Reference</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Date</th>
                            <th className="px-4 py-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {visibleOrders.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-16 text-center text-neutral-500 italic font-serif">
                                    {search ? "No orders match your search." : "No orders in this category."}
                                </td>
                            </tr>
                        ) : visibleOrders.map((order) => (
                            <tr
                                key={order.id}
                                onClick={(e) => handleRowClick(e, order.id)}
                                className={`hover:bg-neutral-50 transition-colors cursor-pointer ${selected.has(order.id) ? "bg-neutral-50" : ""}`}
                            >
                                <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                    <input type="checkbox" checked={selected.has(order.id)}
                                        onChange={() => toggleOne(order.id)}
                                        className="w-4 h-4 cursor-pointer accent-black" />
                                </td>
                                <td className="px-4 py-4">
                                    <span className="font-mono text-xs text-neutral-600">
                                        {order.id.substring(0, 8).toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-neutral-700">
                                    {order.customer_name || order.customer_email || "—"}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded-sm ${
                                        isPickup(order)
                                            ? "bg-neutral-900 text-white"
                                            : "bg-neutral-100 text-neutral-600"
                                    }`}>
                                        {isPickup(order) ? "Pickup" : "Delivery"}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right font-medium">
                                    GH₵ {Number(order.total_amount ?? 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                                        {order.status === "ready_for_pickup" ? "Ready for Pickup" : order.status}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="font-mono text-xs text-neutral-500">
                                        {order.paystack_reference || "—"}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right text-neutral-500 text-xs">
                                    {new Date(order.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-4 text-right relative" onClick={e => e.stopPropagation()} data-dropdown>
                                    <button
                                        onClick={(e) => {
                                            if (openDropdown === order.id) {
                                                setOpenDropdown(null);
                                                setDropdownPos(null);
                                            } else {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                                setOpenDropdown(order.id);
                                            }
                                        }}
                                        className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>
                                    {openDropdown === order.id && dropdownPos && (
                                        <div style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right }} className="z-[9999] bg-white border border-neutral-200 shadow-lg min-w-[190px] py-1">
                                            <button onClick={() => copyOrderId(order.id)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 text-left">
                                                <Copy size={13} /> Copy Order ID
                                            </button>
                                            <Link href={`/sales/orders/${order.id}?print=1`}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest text-neutral-600 hover:bg-neutral-50"
                                                onClick={() => setOpenDropdown(null)}>
                                                <Printer size={13} /> Print Invoice
                                            </Link>
                                            <div className="border-t border-neutral-100 my-1" />

                                            {/* Packed-stage contextual action */}
                                            {order.status === "packed" && (
                                                isPickup(order) ? (
                                                    <button
                                                        onClick={() => markPickupReadyForOrder(order)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest text-neutral-900 font-semibold hover:bg-neutral-50 text-left"
                                                    >
                                                        <Store size={13} /> Mark Ready for Pickup
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => openDispatchForOrder(order)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest text-blue-700 font-semibold hover:bg-neutral-50 text-left"
                                                    >
                                                        <Truck size={13} /> Assign Rider & Ship
                                                    </button>
                                                )
                                            )}

                                            <button onClick={() => { bulkUpdate("fulfilled"); setOpenDropdown(null); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest text-emerald-600 hover:bg-neutral-50 text-left">
                                                Mark Fulfilled
                                            </button>
                                            <Link href={`/sales/orders/${order.id}`}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest text-neutral-600 hover:bg-neutral-50"
                                                onClick={() => setOpenDropdown(null)}>
                                                <Eye size={13} /> View Details
                                            </Link>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
