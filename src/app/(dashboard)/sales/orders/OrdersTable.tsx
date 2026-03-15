"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { MoreHorizontal, Copy, Printer, RefreshCw, Eye } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
    paid:        "bg-green-50 text-green-700",
    processing:  "bg-blue-50 text-blue-700",
    pending:     "bg-amber-50 text-amber-700",
    fulfilled:   "bg-emerald-50 text-emerald-700",
    delivered:   "bg-emerald-100 text-emerald-800",
    cancelled:   "bg-red-50 text-red-600",
    refunded:    "bg-neutral-100 text-neutral-600",
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
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
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
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(orders.map(o => o.id)));
        }
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
        const { error } = await supabase
            .from("orders")
            .update({ status })
            .in("id", ids);

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
        // Don't navigate if clicking checkbox, button, link, or input
        const target = e.target as HTMLElement;
        if (target.closest("input, button, a, [data-no-nav]")) return;
        router.push(`/sales/orders/${orderId}`);
    };

    return (
        <div className="relative">
            {/* Bulk Actions Bar */}
            {selected.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black text-white px-6 py-4 shadow-2xl">
                    <span className="text-xs uppercase tracking-widest text-neutral-300 mr-2">
                        {selected.size} selected
                    </span>
                    <button
                        onClick={() => bulkUpdate("fulfilled")}
                        disabled={bulkLoading}
                        className="text-xs uppercase tracking-widest px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50"
                    >
                        Mark Completed
                    </button>
                    <button
                        onClick={() => bulkUpdate("processing")}
                        disabled={bulkLoading}
                        className="text-xs uppercase tracking-widest px-4 py-2 bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
                    >
                        Mark Shipped
                    </button>
                    <button
                        onClick={() => bulkUpdate("cancelled")}
                        disabled={bulkLoading}
                        className="text-xs uppercase tracking-widest px-4 py-2 bg-neutral-700 hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                        Archive
                    </button>
                    <button
                        onClick={() => setSelected(new Set())}
                        className="ml-2 text-neutral-400 hover:text-white transition-colors text-xs uppercase tracking-widest"
                    >
                        Cancel
                    </button>
                </div>
            )}

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-4 py-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    className="w-4 h-4 cursor-pointer accent-black"
                                />
                            </th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Order ID</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Customer</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Amount</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Reference</th>
                            <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Date</th>
                            <th className="px-4 py-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100" ref={dropdownRef}>
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-16 text-center text-neutral-500 italic font-serif">
                                    No orders have been placed yet.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr
                                    key={order.id}
                                    onClick={(e) => handleRowClick(e, order.id)}
                                    className={`hover:bg-neutral-50 transition-colors cursor-pointer ${selected.has(order.id) ? "bg-neutral-50" : ""}`}
                                >
                                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(order.id)}
                                            onChange={() => toggleOne(order.id)}
                                            className="w-4 h-4 cursor-pointer accent-black"
                                        />
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="font-mono text-xs text-neutral-600">
                                            {order.id.substring(0, 8).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-neutral-700">
                                            {order.customer_name || order.customer_email || "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right font-medium">
                                        GH₵ {Number(order.total_amount ?? 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                                            {order.status}
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
                                    <td className="px-4 py-4 text-right relative" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                                            className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
                                            title="Actions"
                                        >
                                            <MoreHorizontal size={16} />
                                        </button>

                                        {openDropdown === order.id && (
                                            <div className="absolute right-4 top-12 z-20 bg-white border border-neutral-200 shadow-lg min-w-[180px] py-1">
                                                <button
                                                    onClick={() => copyOrderId(order.id)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors text-left"
                                                >
                                                    <Copy size={13} /> Copy Order ID
                                                </button>
                                                <Link
                                                    href={`/sales/orders/${order.id}?print=1`}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors"
                                                    onClick={() => setOpenDropdown(null)}
                                                >
                                                    <Printer size={13} /> Print Invoice
                                                </Link>
                                                <div className="border-t border-neutral-100 my-1" />
                                                <Link
                                                    href={`/sales/orders/${order.id}`}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors"
                                                    onClick={() => setOpenDropdown(null)}
                                                >
                                                    <Eye size={13} /> View Details
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
    );
}
