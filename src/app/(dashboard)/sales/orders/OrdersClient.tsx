"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { MoreHorizontal, Copy, Printer, Eye, Truck, X, Search, Store, ChevronLeft, ChevronRight } from "lucide-react";
import { updateOrderStatus, bulkUpdateOrderStatus } from "./actions";
// From ordersFilters, never ordersQuery: that module imports supabaseAdmin,
// and pulling it into this client bundle threw "supabaseKey is required" at
// module evaluation, which took the whole orders page down in production.
import { PAYMENT_FILTERS, type PaymentFilter } from "./ordersFilters";

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
    /** Absent until the cash migration lands — treat undefined as gateway-paid. */
    payment_method?: string | null;
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

const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
    abandoned: { label: "Abandoned",    className: "text-neutral-400" },
    failed:    { label: "Payment Failed", className: "text-red-400" },
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

// Legacy client-side filtering — used only when the page does not pass
// server-computed counts (pre-orders, test-orders reuse this component).
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
        return q ? orders.filter(o => matchesSearch(o, q)) : orders.filter(o => o.status === "paid");
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

function computeLocalCounts(orders: Order[]): Record<Tab, number> {
    return {
        all:          orders.filter(o => o.status === "paid").length,
        packed:       orders.filter(o => o.status === "packed").length,
        pickups:      orders.filter(o => o.status === "ready_for_pickup").length,
        shipped:      orders.filter(o => o.status === "shipped").length,
        fulfilled:    orders.filter(o => ["fulfilled", "delivered"].includes(o.status)).length,
        cancelled:    orders.filter(o => ["cancelled", "failed"].includes(o.status)).length,
        refunded:     orders.filter(o => o.status === "refunded").length,
        "all-orders": orders.length,
    };
}

// ─── Dispatch Modal ───────────────────────────────────────────────────────────

function DispatchModal({
    orders,
    onClose,
    onConfirm,
}: {
    orders: Order[];
    onClose: () => void;
    onConfirm: (riderId: string, notifyRider: boolean, notifyCustomer: boolean) => void;
}) {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [selectedRider, setSelectedRider] = useState<string>("");
    const [notifyRider, setNotifyRider] = useState(true);
    const [notifyCustomer, setNotifyCustomer] = useState(true);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        supabase.from("riders").select("id, full_name, phone_number, bike_reg, image_url, is_active").eq("is_active", true).order("full_name")
            .then(({ data, error }: { data: any, error: any }) => {
                if (error) {
                    console.error("Failed to load riders:", error);
                    toast.error("Failed to load active riders for dispatch.");
                }
                setRiders(data ?? []);
                if (data && data.length > 0) setSelectedRider(data[0].id);
                setLoading(false);
            });
    }, []);

    const handleConfirm = async () => {
        if (!selectedRider) { toast.error("Select a rider first."); return; }
        setConfirming(true);
        onConfirm(selectedRider, notifyRider, notifyCustomer);
    };

    return (
        <div className="ac-modal-scrim" onClick={onClose}>
            <div className="ac-modal" style={{ maxWidth: 512 }} onClick={e => e.stopPropagation()}>
                <div className="ac-modal-head">
                    <div>
                        <h2 className="ac-modal-title">Assign Dispatch Rider</h2>
                        <p style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 2 }}>{orders.length} order{orders.length !== 1 ? "s" : ""} to dispatch</p>
                    </div>
                    <button onClick={onClose} className="ac-modal-close"><X size={16} /></button>
                </div>

                <div className="ac-modal-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ background: "var(--ac-bg)", border: "1px solid var(--ac-line)", borderRadius: 8, padding: 12, maxHeight: 128, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                        {orders.map(o => (
                            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ac-ink-3)" }}>
                                <span className="ac-mono">{o.id.substring(0, 8).toUpperCase()}</span>
                                <span>{o.customer_name || o.customer_email}</span>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="ac-label" style={{ marginBottom: 8, display: "block" }}>Select Rider</label>
                        {loading ? (
                            <p style={{ fontSize: 12, color: "var(--ac-ink-4)", fontStyle: "italic" }}>Loading riders…</p>
                        ) : riders.length === 0 ? (
                            <p style={{ fontSize: 12, color: "var(--ac-danger)" }}>No active riders. Add riders in Settings → Riders.</p>
                        ) : (
                            <select value={selectedRider} onChange={e => setSelectedRider(e.target.value)} className="ac-select">
                                {riders.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.full_name} · {r.phone_number}{r.bike_reg ? ` · ${r.bike_reg}` : ""}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                        <input type="checkbox" checked={notifyRider} onChange={e => setNotifyRider(e.target.checked)} className="ac-checkbox" />
                        <div>
                            <span className="ac-label">Notify Rider via SMS</span>
                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 2 }}>Sends customer name, phone, and delivery address to rider. Does not affect the customer.</p>
                        </div>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                        <input type="checkbox" checked={notifyCustomer} onChange={e => setNotifyCustomer(e.target.checked)} className="ac-checkbox" />
                        <div>
                            <span className="ac-label">Notify Customer (Email + SMS)</span>
                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)", marginTop: 2 }}>
                                {notifyCustomer
                                    ? "Sends the dispatch email, SMS, and app notification with rider details."
                                    : "Dispatches silently — no email, SMS, or app notification to the customer."}
                            </p>
                        </div>
                    </label>
                </div>

                <div className="ac-modal-foot">
                    <button onClick={onClose} className="ac-btn ac-btn-ghost">Cancel</button>
                    <button onClick={handleConfirm} disabled={confirming || !selectedRider || riders.length === 0} className="ac-btn ac-btn-primary">
                        {confirming ? "Dispatching…" : "Confirm Dispatch"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type OrdersClientProps = {
    orders: Order[];
    // Server-pagination props — when omitted (pre-orders, test-orders), the
    // component falls back to legacy client-side filtering over `orders`.
    tab?: Tab;
    search?: string;
    payment?: PaymentFilter;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
    totalCount?: number;
    tabCounts?: Record<Tab, number>;
};

export function OrdersClient({
    orders: initialOrders,
    tab: tabProp,
    search: serverSearch = "",
    payment: serverPayment = "all",
    dateFrom: serverDateFrom = "",
    dateTo: serverDateTo = "",
    page = 1,
    pageSize = 100,
    totalCount = 0,
    tabCounts: serverTabCounts,
}: OrdersClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const serverMode = serverTabCounts !== undefined;

    const [orders, setOrders] = useState(initialOrders);
    // In client mode these drive filtering; in server mode the tab comes from the URL
    // and this search box mirrors it (navigation is debounced).
    const [clientTab, setClientTab] = useState<Tab>("all");
    const [search, setSearch] = useState(serverSearch);
    // Dates are held locally while the staff member picks both ends, then
    // pushed to the URL — navigating on the first pick would fire a query for
    // a half-chosen range.
    const [dateFrom, setDateFrom] = useState(serverDateFrom);
    const [dateTo, setDateTo] = useState(serverDateTo);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
    const [showDispatch, setShowDispatch] = useState(false);
    const [dispatchOrders, setDispatchOrders] = useState<Order[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    // Re-sync when the server sends a new page (tab/search/page nav or router.refresh)
    useEffect(() => { setOrders(initialOrders); }, [initialOrders]);
    useEffect(() => { setSearch(serverSearch); }, [serverSearch]);
    useEffect(() => { setDateFrom(serverDateFrom); }, [serverDateFrom]);
    useEffect(() => { setDateTo(serverDateTo); }, [serverDateTo]);

    const activeTab: Tab = serverMode ? (tabProp ?? "all") : clientTab;

    // Server mode: current page IS the visible set. Client mode: filter locally.
    const visibleOrders = serverMode ? orders : filterOrders(orders, clientTab, search);
    const allSelected = visibleOrders.length > 0 && visibleOrders.every(o => selected.has(o.id));

    const tabCounts: Record<Tab, number> = serverMode ? serverTabCounts! : computeLocalCounts(orders);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    type NavParams = { tab?: Tab; q?: string; page?: number; payment?: PaymentFilter; from?: string; to?: string };

    const buildUrl = (next: NavParams) => {
        const params = new URLSearchParams();
        const t = next.tab ?? activeTab;
        const q = next.q ?? search;
        const p = next.page ?? 1;
        // Filters persist across tab, search and page navigation — losing the
        // date range on page 2 would make the range useless for counting a day.
        const pay = next.payment ?? serverPayment;
        const df = next.from ?? dateFrom;
        const dt = next.to ?? dateTo;
        if (t !== "all") params.set("tab", t);
        if (q.trim()) params.set("q", q.trim());
        if (pay !== "all") params.set("payment", pay);
        if (df) params.set("from", df);
        if (dt) params.set("to", dt);
        if (p > 1) params.set("page", String(p));
        const qs = params.toString();
        return `/sales/orders${qs ? `?${qs}` : ""}`;
    };

    const navigate = (next: NavParams) => {
        startTransition(() => router.push(buildUrl(next)));
    };

    const goToTab = (tab: Tab) => {
        setSelected(new Set());
        if (serverMode) navigate({ tab, page: 1 });
        else setClientTab(tab);
    };

    // Debounce search-box → URL navigation (server mode only)
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onSearchChange = (value: string) => {
        setSearch(value);
        if (!serverMode) { setSelected(new Set()); return; }
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            setSelected(new Set());
            navigate({ q: value, page: 1 });
        }, 350);
    };

    useEffect(() => { setSelected(new Set()); }, [page]);

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

        const result = await bulkUpdateOrderStatus(ids, status);
        if (!result.success) {
            toast.error("Failed to update orders.");
            setBulkLoading(false);
            return;
        }

        toast.success(`${ids.length} order${ids.length > 1 ? "s" : ""} → ${status}.`);
        setOrders(prev => prev.map(o => selected.has(o.id) ? { ...o, status } : o));
        setSelected(new Set());
        router.refresh();

        if (status === "fulfilled" || status === "cancelled" || status === "packed") {
            await Promise.all(ids.map(async orderId => {
                try {
                    const res = await fetch("/api/email/fulfillment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId, type: status }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                } catch (err) {
                    console.error("Auto-email failed for", orderId, err);
                    toast.error(`Notification failed for order ${orderId.substring(0, 8).toUpperCase()}`);
                }
            }));
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
            router.refresh();
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

    const handleDispatchConfirm = async (riderId: string, notifyRider: boolean, notifyCustomer: boolean) => {
        const ids = dispatchOrders.map(o => o.id);
        try {
            const res = await fetch("/api/dispatch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds: ids, riderId, notifyRider, notifyCustomer }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Dispatch failed");

            toast.success(
                `${ids.length} order${ids.length > 1 ? "s" : ""} dispatched${notifyCustomer ? "." : " — customer not notified."}`
            );
            setOrders(prev => prev.map(o =>
                ids.includes(o.id) ? { ...o, status: "shipped" } : o
            ));
            setSelected(new Set());
            setShowDispatch(false);
            setDispatchOrders([]);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Dispatch failed.");
        }
    };

    const markFulfilledForOrder = async (order: Order) => {
        setOpenDropdown(null);
        setDropdownPos(null);
        const result = await updateOrderStatus(order.id, "fulfilled");
        if (!result.success) { toast.error("Failed to mark fulfilled."); return; }
        toast.success("Order marked fulfilled.");
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "fulfilled" } : o));
        router.refresh();
        try {
            const res = await fetch("/api/email/fulfillment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id, type: "fulfilled" }),
            });
            if (!res.ok) throw new Error(await res.text());
        } catch (err) {
            console.error("Fulfillment notification failed", err);
            toast.error("Order updated but notification failed.");
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
            router.refresh();
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
        <>
            {/* Search + Tabs row */}
            <div className="ac-tabs" style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 0, overflowX: "auto", flex: 1 }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => goToTab(tab.key)}
                            className={`ac-tab ${activeTab === tab.key ? "active" : ""}`}
                        >
                            {tab.label}
                            <span className="ac-tab-count">{tabCounts[tab.key]}</span>
                        </button>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", paddingBottom: 8 }}>
                        <Search size={13} style={{ color: "var(--ac-ink-4)", flexShrink: 0 }} />
                        <input
                            type="text"
                            value={search}
                            onChange={e => onSearchChange(e.target.value)}
                            placeholder="Search order ref, name, email, phone…"
                            className="ac-input-line"
                            style={{ width: 260, fontSize: 11 }}
                        />
                        {search && (
                            <button onClick={() => onSearchChange("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", display: "inline-flex" }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment method + date range. Server mode only: both filters are
                applied in the query, so client-filtered pages (pre-orders,
                test-orders) have nothing to bind them to. */}
            {serverMode && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "4px 4px 0" }}>
                    <div style={{ display: "flex", gap: 0 }}>
                        {PAYMENT_FILTERS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => { setSelected(new Set()); navigate({ payment: f.key, page: 1 }); }}
                                className={`ac-tab ${serverPayment === f.key ? "active" : ""}`}
                                style={{ fontSize: 10 }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>From</span>
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={e => { setDateFrom(e.target.value); setSelected(new Set()); navigate({ from: e.target.value, page: 1 }); }}
                            className="ac-input-line"
                            style={{ fontSize: 11 }}
                        />
                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>To</span>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={e => { setDateTo(e.target.value); setSelected(new Set()); navigate({ to: e.target.value, page: 1 }); }}
                            className="ac-input-line"
                            style={{ fontSize: 11 }}
                        />
                        {(dateFrom || dateTo) && (
                            <button
                                onClick={() => { setDateFrom(""); setDateTo(""); setSelected(new Set()); navigate({ from: "", to: "", page: 1 }); }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", display: "inline-flex" }}
                                title="Clear dates"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Active filter summary — the tab counts already reflect these, so
                say out loud what is narrowing them. */}
            {serverMode && (serverPayment !== "all" || dateFrom || dateTo) && (
                <div style={{ padding: "8px 4px", fontSize: 10, color: "var(--ac-ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    {totalCount} order{totalCount !== 1 ? "s" : ""}
                    {serverPayment !== "all" ? ` paid by ${PAYMENT_FILTERS.find(f => f.key === serverPayment)?.label.toLowerCase()}` : ""}
                    {dateFrom ? ` from ${dateFrom}` : ""}
                    {dateTo ? ` to ${dateTo}` : ""}
                </div>
            )}

            {/* Search context indicator */}
            {search && (
                <div style={{ padding: "8px 4px", fontSize: 10, color: "var(--ac-ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    {(serverMode ? totalCount : visibleOrders.length)} result{(serverMode ? totalCount : visibleOrders.length) !== 1 ? "s" : ""}{activeTab === "all" ? " across all statuses" : ""} for &ldquo;{search}&rdquo;
                </div>
            )}

            {/* Pickups tab info banner */}
            {activeTab === "pickups" && visibleOrders.length > 0 && (
                <div style={{ padding: "10px 14px", background: "var(--ac-ink)", color: "var(--ac-bg)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 8, borderRadius: 8 }}>
                    <Store size={12} style={{ display: "inline", marginRight: 8, marginBottom: 2 }} />
                    {visibleOrders.length} order{visibleOrders.length !== 1 ? "s" : ""} awaiting in-store pickup
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedCount > 0 && (
                <div className="ac-bulk-bar" style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
                    <span className="ac-bulk-label" style={{ marginRight: 8 }}>{selectedCount} selected</span>

                    {activeTab === "packed" ? (
                        <>
                            {hasPickupSelected && (
                                <button onClick={bulkMarkPickupReady} disabled={bulkLoading} className="ac-btn ac-btn-ghost ac-btn-sm">
                                    <Store size={14} /> Mark Ready for Pickup
                                </button>
                            )}
                            {hasDeliverySelected && (
                                <button onClick={openDispatchForSelected} disabled={bulkLoading} className="ac-btn ac-btn-accent ac-btn-sm">
                                    <Truck size={14} /> Assign Rider & Ship
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button onClick={() => bulkUpdate("packed")} disabled={bulkLoading} className="ac-btn ac-btn-ghost ac-btn-sm">
                                Mark Packed
                            </button>
                            <button onClick={openDispatchForSelected} disabled={bulkLoading} className="ac-btn ac-btn-accent ac-btn-sm">
                                <Truck size={14} /> Mark Shipped
                            </button>
                            <button onClick={() => bulkUpdate("fulfilled")} disabled={bulkLoading} className="ac-btn ac-btn-primary ac-btn-sm">
                                Mark Fulfilled
                            </button>
                        </>
                    )}

                    <button onClick={() => setSelected(new Set())} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", display: "inline-flex" }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="ac-card flush" style={{ marginTop: 12 }}>
                <div className="ac-table-wrap">
                <table className="ac-table">
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}>
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="ac-checkbox" style={{ cursor: "pointer" }} />
                            </th>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Type</th>
                            <th className="r">Amount</th>
                            <th>Status</th>
                            <th>Reference</th>
                            <th className="r">Date</th>
                            <th style={{ width: 48 }}></th>
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
                                style={{ cursor: "pointer" }}
                            >
                                <td onClick={e => e.stopPropagation()}>
                                    <input type="checkbox" checked={selected.has(order.id)}
                                        onChange={() => toggleOne(order.id)}
                                        className="ac-checkbox" style={{ cursor: "pointer" }} />
                                </td>
                                <td>
                                    <span className="ac-mono" style={{ fontSize: 12, color: "var(--ac-ink-2)" }}>
                                        {order.id.substring(0, 8).toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ color: "var(--ac-ink-2)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <span>{order.customer_name || order.customer_email || "—"}</span>
                                        {/* Cash has no gateway record, so the row is the only place
                                            it shows. Card sales stay unlabelled — they are the norm. */}
                                        {order.payment_method === "cash" && (
                                            <span className="ac-badge" title="Paid in cash at the till">Cash</span>
                                        )}
                                        {order.payment_method === "gift_card" && (
                                            <span className="ac-badge" title="Covered by a gift card">Gift card</span>
                                        )}
                                        {order.is_mixed_order ? (
                                            <>
                                                <span className="ac-badge ac-badge-mixed">Mixed</span>
                                                {(() => {
                                                    const dispatched = order.customer_metadata?.regular_items_dispatched_at;
                                                    if (!dispatched) return null;
                                                    const isFulfilled = ["fulfilled", "delivered"].includes(order.status);
                                                    return (
                                                        <span
                                                            title={isFulfilled ? "Fully fulfilled" : "In-stock items shipped · Pre-order items pending"}
                                                            style={{ fontSize: 11, color: isFulfilled ? "var(--ac-accent)" : "#6aa6ff" }}
                                                        >
                                                            ●
                                                        </span>
                                                    );
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
                                <td className="r" style={{ fontWeight: 500, color: "var(--ac-ink)" }}>
                                    GH₵ {Number(order.total_amount ?? 0).toFixed(2)}
                                </td>
                                <td>
                                    <span className={`ac-badge ac-badge-${order.status}`}>
                                        {order.status === "ready_for_pickup" ? "Ready for Pickup" : order.status}
                                    </span>
                                    {order.payment_status && PAYMENT_STATUS_LABELS[order.payment_status] && (
                                        <span className={`block text-[9px] uppercase tracking-widest mt-0.5 ${PAYMENT_STATUS_LABELS[order.payment_status].className}`}>
                                            {PAYMENT_STATUS_LABELS[order.payment_status].label}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span className="ac-mono" style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                        {order.paystack_reference || "—"}
                                    </span>
                                </td>
                                <td className="r" style={{ color: "var(--ac-ink-3)", fontSize: 12 }}>
                                    {new Date(order.created_at).toLocaleDateString("en-GB")}
                                </td>
                                <td className="r" style={{ position: "relative" }} onClick={e => e.stopPropagation()} data-dropdown>
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
                                        style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", display: "inline-flex" }}
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>
                                    {openDropdown === order.id && dropdownPos && (
                                        <div style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right }} className="ac-dropdown">
                                            <button onClick={() => copyOrderId(order.id)} className="ac-dropdown-item">
                                                <Copy size={13} /> Copy Order ID
                                            </button>
                                            <Link href={`/sales/orders/${order.id}?print=1`} className="ac-dropdown-item" onClick={() => setOpenDropdown(null)}>
                                                <Printer size={13} /> Print Invoice
                                            </Link>
                                            <div className="ac-dropdown-sep" />

                                            {/* Packed-stage contextual action */}
                                            {order.status === "packed" && (
                                                isPickup(order) ? (
                                                    <button onClick={() => markPickupReadyForOrder(order)} className="ac-dropdown-item" style={{ color: "var(--ac-ink)", fontWeight: 600 }}>
                                                        <Store size={13} /> Mark Ready for Pickup
                                                    </button>
                                                ) : (
                                                    <button onClick={() => openDispatchForOrder(order)} className="ac-dropdown-item" style={{ color: "#6aa6ff", fontWeight: 600 }}>
                                                        <Truck size={13} /> Assign Rider & Ship
                                                    </button>
                                                )
                                            )}

                                            <button onClick={() => markFulfilledForOrder(order)} className="ac-dropdown-item" style={{ color: "var(--ac-accent)" }}>
                                                Mark Fulfilled
                                            </button>
                                            <Link href={`/sales/orders/${order.id}`} className="ac-dropdown-item" onClick={() => setOpenDropdown(null)}>
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
                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderTop: "1px solid var(--ac-line)" }}>
                        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>
                            Page {page} of {totalPages} · {totalCount} order{totalCount !== 1 ? "s" : ""}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => navigate({ page: page - 1 })} disabled={page <= 1 || isPending} className="ac-btn ac-btn-ghost ac-btn-sm">
                                <ChevronLeft size={13} /> Prev
                            </button>
                            <button onClick={() => navigate({ page: page + 1 })} disabled={page >= totalPages || isPending} className="ac-btn ac-btn-ghost ac-btn-sm">
                                Next <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>{/* end ac-card */}

            {showDispatch && (
                <DispatchModal
                    orders={dispatchOrders}
                    onClose={() => { setShowDispatch(false); setDispatchOrders([]); }}
                    onConfirm={handleDispatchConfirm}
                />
            )}
        </>
    );
}
