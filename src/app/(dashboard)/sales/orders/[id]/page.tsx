"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "@/lib/toast";
import { Printer } from "lucide-react";

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
};

const STATUSES = ["pending", "paid", "processing", "shipped", "fulfilled", "delivered", "refunded", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    paid: "bg-green-50 text-green-700",
    processing: "bg-blue-50 text-blue-700",
    shipped: "bg-purple-50 text-purple-700",
    fulfilled: "bg-indigo-50 text-indigo-700",
    delivered: "bg-green-50 text-green-700",
    refunded: "bg-neutral-100 text-neutral-600",
    cancelled: "bg-red-50 text-red-600",
};

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [bizName, setBizName] = useState("Miss Tokyo");
    const [bizContact, setBizContact] = useState<{ email?: string; contact?: string; address?: string }>({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        Promise.all([
            supabase.from("orders").select("*").eq("id", id).single(),
            supabase.from("business_settings").select("business_name, email, contact, address").eq("id", "default").single(),
        ]).then(([{ data: ord }, { data: biz }]) => {
            if (ord) setOrder(ord);
            if (biz?.business_name) setBizName(biz.business_name);
            setBizContact({ email: biz?.email ?? undefined, contact: biz?.contact ?? undefined, address: biz?.address ?? undefined });
            setLoading(false);
        });
    }, [id]);

    const updateStatus = async (newStatus: string) => {
        if (!order) return;
        setUpdating(true);
        const { error } = await supabase
            .from("orders")
            .update({ status: newStatus })
            .eq("id", order.id);

        if (error) {
            toast.error("Failed to update status.");
        } else {
            setOrder(prev => prev ? { ...prev, status: newStatus } : prev);
            toast.success(`Status updated to ${newStatus}.`);

            if (newStatus === "shipped" || newStatus === "fulfilled") {
                setSendingEmail(true);
                try {
                    await fetch("/api/email/fulfillment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: order.id }),
                    });
                    toast.success("Fulfillment email sent.");
                } catch {
                    toast.error("Could not send fulfillment email.");
                } finally {
                    setSendingEmail(false);
                }
            }
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

    return (
        <>
        {/* Print styles */}
        <style>{`
            @media print {
                * { visibility: hidden !important; }
                #admin-receipt-print, #admin-receipt-print * { visibility: visible !important; }
                #admin-receipt-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; border: none !important; }
                .no-print { display: none !important; }
            }
        `}</style>

        <div className="no-print space-y-10 max-w-2xl">
            <div className="flex items-center justify-between">
                <Link href="/sales/orders" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors">
                    ← Orders
                </Link>
                <div className="flex items-center gap-4">
                    <button
                        onClick={copyDetails}
                        className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black border-b border-neutral-300 hover:border-black transition-colors pb-0.5"
                    >
                        Copy Customer Details
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                    >
                        <Printer size={14} /> Print Receipt
                    </button>
                </div>
            </div>

            <header>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Order</p>
                <h1 className="font-serif text-3xl tracking-widest uppercase">
                    #{order.id.substring(0, 8).toUpperCase()}
                </h1>
            </header>

            {/* Details card */}
            <div className="bg-white border border-neutral-200 divide-y divide-neutral-100">
                {[
                    ["Customer", order.customer_name || "—"],
                    ["Email", order.customer_email],
                    ["Phone", order.customer_phone || "—"],
                    ["Amount", `GH₵ ${Number(order.total_amount).toFixed(2)}`],
                    ["Delivery", order.delivery_method || "Delivery"],
                    ["Paystack Ref", order.paystack_reference || "—"],
                    ["Date", new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
                ].map(([label, value]) => (
                    <div key={label} className="px-8 py-4 flex justify-between items-center text-sm">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">{label}</span>
                        <span className="text-neutral-900 font-medium font-mono">{value}</span>
                    </div>
                ))}
                {order.shipping_address?.text && (
                    <div className="px-8 py-4 flex justify-between items-center text-sm">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Shipping Address</span>
                        <span className="text-neutral-900 font-medium text-right max-w-[50%]">{order.shipping_address.text}</span>
                    </div>
                )}
            </div>

            {/* Payment Method & Details */}
            <div className="bg-white border border-neutral-200 divide-y divide-neutral-100">
                <header className="px-8 py-5 border-b border-neutral-100">
                    <h2 className="text-xs uppercase tracking-widest font-semibold">Payment Method &amp; Details</h2>
                </header>
                {[
                    ["Provider",      order.paystack_reference ? "Paystack" : "N/A"],
                    ["Reference ID",  order.paystack_reference || "—"],
                    ["Payment Date",  new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
                    ["Status",        ["paid", "processing", "fulfilled", "delivered"].includes(order.status) ? "Successful" : order.status === "pending" ? "Pending" : "Failed"],
                    ["Amount Paid",   `GH₵ ${Number(order.total_amount).toFixed(2)}`],
                ].map(([label, value]) => (
                    <div key={label} className="px-8 py-4 flex justify-between items-center text-sm">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">{label}</span>
                        <span className={`font-medium font-mono ${label === "Status" && value === "Successful" ? "text-green-700" : label === "Status" && value === "Failed" ? "text-red-600" : "text-neutral-900"}`}>{value}</span>
                    </div>
                ))}
            </div>

            {/* Items */}
            <div className="bg-white border border-neutral-200">
                <header className="px-8 py-6 border-b border-neutral-100">
                    <h2 className="text-xs uppercase tracking-widest font-semibold">Ordered Items</h2>
                </header>
                <div className="divide-y divide-neutral-100">
                    {order.items && order.items.length > 0 ? (
                        order.items.map((item: any, idx: number) => (
                            <div key={idx} className="px-8 py-6 flex gap-6 items-center">
                                {(item.imageUrl || item.image_url) && (
                                    <div className="w-16 h-20 bg-neutral-50 flex-shrink-0 overflow-hidden rounded-sm border border-neutral-100">
                                        <img src={item.imageUrl || item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between">
                                        <h3 className="font-serif text-base">{item.name || "Product"}</h3>
                                        {item.price && (
                                            <span className="font-mono text-sm">GH₵ {(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        {item.size && (
                                            <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                                                Size: <span className="text-neutral-900 font-semibold">{item.size}</span>
                                            </span>
                                        )}
                                        {item.color && (
                                            <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                                                Color: <span className="text-neutral-900 font-semibold">{item.color}</span>
                                            </span>
                                        )}
                                        {item.stitching && (
                                            <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                                                Stitching: <span className="text-neutral-900 font-semibold">{item.stitching}</span>
                                            </span>
                                        )}
                                        <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                                            Qty: <span className="text-neutral-900 font-semibold">{item.quantity || 1}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-8 py-8 space-y-2">
                            <p className="text-neutral-400 italic text-sm font-serif">No line items stored for this order.</p>
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                                Total charged: <span className="text-neutral-700 font-semibold">GH₵ {Number(order.total_amount).toFixed(2)}</span>
                                {order.paystack_reference && (
                                    <> · Ref: <span className="font-mono text-neutral-700">{order.paystack_reference}</span></>
                                )}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Status */}
            <div className="bg-white border border-neutral-200 p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs uppercase tracking-widest font-semibold">Fulfillment Status</h2>
                    <span className={`px-3 py-1 text-[10px] uppercase tracking-widest font-semibold rounded ${STATUS_STYLES[order.status] || "bg-neutral-100 text-neutral-600"}`}>
                        {order.status}
                    </span>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                    {/* Primary actions */}
                    {order.status !== "fulfilled" && order.status !== "delivered" && (
                        <button
                            onClick={() => updateStatus("fulfilled")}
                            disabled={updating}
                            className={`px-6 py-3 text-[11px] uppercase tracking-widest font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50`}
                        >
                            Mark as Fulfilled
                        </button>
                    )}

                    {order.status !== "refunded" && (
                        <button
                            onClick={() => updateStatus("refunded")}
                            disabled={updating}
                            className={`px-6 py-3 text-[11px] uppercase tracking-widest font-bold transition-all bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50`}
                        >
                            Refund Order
                        </button>
                    )}

                    {order.status !== "cancelled" && (
                        <button
                            onClick={() => updateStatus("cancelled")}
                            disabled={updating}
                            className={`px-6 py-3 text-[11px] uppercase tracking-widest font-bold transition-all bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50`}
                        >
                            Cancel Order
                        </button>
                    )}
                </div>

                <div className="pt-8 border-t border-neutral-100 flex flex-col gap-4">
                    <h3 className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">All Status Options</h3>
                    <div className="flex flex-wrap gap-2">
                        {STATUSES.map(s => (
                            <button
                                key={s}
                                onClick={() => updateStatus(s)}
                                disabled={updating || order.status === s}
                                className={`px-4 py-2 text-[10px] uppercase tracking-widest font-semibold transition-colors ${order.status === s
                                    ? "bg-black text-white cursor-default"
                                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                    } disabled:opacity-50`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {(order.status === "shipped" || order.status === "fulfilled") && (
                    <p className="text-[10px] uppercase tracking-widest text-green-700">
                        Fulfillment email {sendingEmail ? "sending..." : "sent to customer."}
                    </p>
                )}
            </div>
        </div>{/* end no-print */}

        {/* ── Print Receipt (screen-hidden, print-visible) ── */}
        <div id="admin-receipt-print" style={{ display: "none" }} className="bg-white p-12 max-w-2xl">

            {/* Header */}
            <div className="flex items-start justify-between mb-8 pb-6 border-b border-neutral-100">
                <div>
                    <h2 className="font-serif text-xl tracking-widest uppercase">{bizName}</h2>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Order Receipt</p>
                </div>
                <div className="text-right">
                    <p className="font-mono text-sm font-bold text-neutral-900">#{orderNum}</p>
                    <p className="text-xs text-neutral-400 mt-1">{dateStr}</p>
                    <span className={`mt-2 inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded ${STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                        {order.status}
                    </span>
                </div>
            </div>

            {/* Customer + Delivery */}
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
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-2">Delivery Address</p>
                            <p className="text-sm text-neutral-700 whitespace-pre-line">{addr}</p>
                            {order.delivery_method && (
                                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">{order.delivery_method}</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Items */}
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
                                const name = item.name || item.productName || "Item";
                                const price = Number(item.price ?? item.unit_price ?? 0);
                                const qty = Number(item.quantity ?? item.qty ?? 1);
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

            {/* Total */}
            <div className="flex justify-end border-t border-neutral-200 pt-4">
                <div className="w-56 space-y-2 text-sm">
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

            {/* Footer */}
            <div className="border-t border-neutral-100 mt-8 pt-6 text-center space-y-1">
                {(bizContact.address || bizContact.contact || bizContact.email) && (
                    <div className="text-xs text-neutral-500 space-y-0.5 mb-3">
                        {bizContact.address && <p>{bizContact.address}</p>}
                        {bizContact.contact && <p>{bizContact.contact}</p>}
                        {bizContact.email && <p>{bizContact.email}</p>}
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
