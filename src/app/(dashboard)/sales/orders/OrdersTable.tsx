"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

const STATUS_BADGE: Record<string, string> = {
    paid:        "ac-badge ac-badge-paid",
    processing:  "ac-badge ac-badge-processing",
    pending:     "ac-badge ac-badge-pending",
    fulfilled:   "ac-badge ac-badge-fulfilled",
    delivered:   "ac-badge ac-badge-delivered",
    cancelled:   "ac-badge ac-badge-cancelled",
    refunded:    "ac-badge ac-badge-refunded",
};

type Order = {
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    total_amount: number | null;
    status: string;
    paystack_reference: string | null;
    created_at: string;
};

type Props = { orders: Order[] };

export function OrdersTable({ orders: initialOrders }: Props) {
    const router = useRouter();
    const [orders, setOrders] = useState(initialOrders);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [bulkLoading, setBulkLoading] = useState(false);
    const dropdownRef = useRef<HTMLTableSectionElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const allSelected = orders.length > 0 && selected.size === orders.length;

    const toggleAll = () => {
        if (allSelected) { setSelected(new Set()); }
        else { setSelected(new Set(orders.map(o => o.id))); }
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
            toast.success(`${ids.length} order${ids.length > 1 ? "s" : ""} updated to "${status}".`);
            setOrders(prev => prev.map(o => selected.has(o.id) ? { ...o, status } : o));
            setSelected(new Set());
        }
        setBulkLoading(false);
    };

    const copyOrderId = (id: string) => {
        navigator.clipboard.writeText(id);
        toast.success("Order ID copied.");
        setOpenDropdown(null);
    };

    const handleRowClick = (e: React.MouseEvent, orderId: string) => {
        const target = e.target as HTMLElement;
        if (target.closest("input, button, a, [data-no-nav]")) return;
        router.push(`/sales/orders/${orderId}`);
    };

    return (
        <div style={{ position: "relative" }}>
            {/* Bulk Actions Bar */}
            {selected.size > 0 && (
                <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: 10, background: "var(--ac-ink)", color: "var(--ac-bg)", padding: "14px 20px", boxShadow: "0 8px 32px rgba(0,0,0,.4)", borderRadius: "var(--r-md)" }}>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginRight: 8 }}>
                        {selected.size} selected
                    </span>
                    <button onClick={() => bulkUpdate("fulfilled")} disabled={bulkLoading}
                        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", padding: "6px 14px", background: "var(--ac-accent)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer", opacity: bulkLoading ? 0.5 : 1 }}>
                        Mark Completed
                    </button>
                    <button onClick={() => bulkUpdate("processing")} disabled={bulkLoading}
                        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", padding: "6px 14px", background: "color-mix(in oklab, #3b82f6 80%, transparent)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer", opacity: bulkLoading ? 0.5 : 1 }}>
                        Mark Shipped
                    </button>
                    <button onClick={() => bulkUpdate("cancelled")} disabled={bulkLoading}
                        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", padding: "6px 14px", background: "var(--ac-panel-2)", color: "var(--ac-bg)", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer", opacity: bulkLoading ? 0.5 : 1 }}>
                        Archive
                    </button>
                    <button onClick={() => setSelected(new Set())}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginLeft: 4 }}>
                        Cancel
                    </button>
                </div>
            )}

            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th style={{ width: 44 }}>
                                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="ac-checkbox" />
                                </th>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th className="r">Amount</th>
                                <th>Status</th>
                                <th>Reference</th>
                                <th className="r">Date</th>
                                <th style={{ width: 48 }}></th>
                            </tr>
                        </thead>
                        <tbody ref={dropdownRef}>
                            {orders.length === 0 ? (
                                <tr><td colSpan={8} className="ac-table-empty">No orders have been placed yet.</td></tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} onClick={e => handleRowClick(e, order.id)}
                                        className={selected.has(order.id) ? "selected" : ""}
                                        style={{ cursor: "pointer" }}>
                                        <td onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={selected.has(order.id)}
                                                onChange={() => toggleOne(order.id)} className="ac-checkbox" />
                                        </td>
                                        <td>
                                            <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-3)" }}>
                                                {order.id.substring(0, 8).toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ color: "var(--ac-ink-2)" }}>
                                            {order.customer_name || order.customer_email || "—"}
                                        </td>
                                        <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500, color: "var(--ac-ink-2)" }}>
                                            GH₵ {Number(order.total_amount ?? 0).toFixed(2)}
                                        </td>
                                        <td>
                                            <span className={STATUS_BADGE[order.status] ?? "ac-badge ac-badge-inactive"}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--ac-ink-4)" }}>
                                                {order.paystack_reference || "—"}
                                            </span>
                                        </td>
                                        <td className="r" style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ textAlign: "right", position: "relative" }} onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", padding: 4, display: "flex", alignItems: "center" }}
                                                title="Actions"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                                            </button>

                                            {openDropdown === order.id && (
                                                <div style={{ position: "absolute", right: 8, top: "calc(100% + 4px)", zIndex: 20, background: "var(--ac-panel)", border: "1px solid var(--ac-line)", boxShadow: "0 8px 24px rgba(0,0,0,.15)", minWidth: 180, borderRadius: "var(--r-md)", padding: "4px 0", overflow: "hidden" }}>
                                                    <button onClick={() => copyOrderId(order.id)}
                                                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-2)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                                        Copy Order ID
                                                    </button>
                                                    <Link href={`/sales/orders/${order.id}?print=1`}
                                                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-2)", textDecoration: "none" }}
                                                        onClick={() => setOpenDropdown(null)}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                                        Print Invoice
                                                    </Link>
                                                    <div style={{ borderTop: "1px solid var(--ac-line)", margin: "4px 0" }} />
                                                    <Link href={`/sales/orders/${order.id}`}
                                                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-2)", textDecoration: "none" }}
                                                        onClick={() => setOpenDropdown(null)}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                                                        View Details
                                                    </Link>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
