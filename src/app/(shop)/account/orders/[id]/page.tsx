"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Check, Printer, ArrowLeft } from "lucide-react";

// ── Status timeline (same logic as orders list) ───────────────────────────────

const TIMELINE_STEPS = [
    { key: "ordered", label: "Ordered" },
    { key: "processing", label: "Processing" },
    { key: "packed", label: "Packed" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
];

function statusToStep(status: string) {
    switch (status) {
        case "pending": return 0;
        case "paid":
        case "processing": return 1;
        case "packed": return 2;
        case "shipped": return 3;
        case "delivered":
        case "fulfilled": return 4;
        default: return 0;
    }
}

function StatusTimeline({ status }: { status: string }) {
    const cancelled = status === "cancelled" || status === "refunded";
    if (cancelled) {
        return (
            <div className="flex items-center gap-2 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] uppercase tracking-widest text-red-500 font-semibold capitalize">{status}</span>
            </div>
        );
    }
    const active = statusToStep(status);
    return (
        <div className="flex items-center gap-0 mt-4 flex-wrap">
            {TIMELINE_STEPS.map((step, i) => {
                const done = i < active;
                const current = i === active;
                return (
                    <div key={step.key} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${done ? "bg-black border-black" : current ? "bg-white border-black" : "bg-white border-neutral-300"
                                }`}>
                                {done ? <Check size={11} className="text-white" strokeWidth={3} /> :
                                    current ? <div className="w-2 h-2 rounded-full bg-black" /> : null}
                            </div>
                            <span className={`mt-1.5 text-[9px] uppercase tracking-wider whitespace-nowrap font-semibold ${i > active ? "text-neutral-300" : "text-black"
                                }`}>{step.label}</span>
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                            <div className={`h-[2px] w-8 md:w-14 shrink-0 mx-1 mb-4 ${done ? "bg-black" : "bg-neutral-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderItem = {
    productId?: string;
    name?: string;
    productName?: string;
    price?: number;
    unit_price?: number;
    quantity?: number;
    qty?: number;
    size?: string;
    color?: string;
    imageUrl?: string;
};

type Order = {
    id: string;
    created_at: string;
    total_amount: number | null;
    status: string;
    paystack_reference: string | null;
    items: OrderItem[] | null;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    shipping_address: { text?: string } | string | null;
    delivery_method: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemName(item: OrderItem) {
    return item.name || item.productName || "Item";
}
function itemPrice(item: OrderItem) {
    return Number(item.price ?? item.unit_price ?? 0);
}
function itemQty(item: OrderItem) {
    return Number(item.quantity ?? item.qty ?? 1);
}
function addressText(addr: Order["shipping_address"]) {
    if (!addr) return null;
    if (typeof addr === "string") return addr;
    return addr.text || null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [bizName, setBizName] = useState("Miss Tokyo");
    const [bizContact, setBizContact] = useState<{ email?: string; contact?: string; address?: string }>({});
    const [loading, setLoading] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => { window.scrollTo({ top: 0 }); }, []);

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.replace("/login"); return; }

            const [{ data: ord }, { data: biz }] = await Promise.all([
                supabase
                    .from("orders")
                    .select("id, created_at, total_amount, status, paystack_reference, items, customer_name, customer_phone, customer_email, shipping_address, delivery_method")
                    .eq("id", id)
                    // Security: only show this order if it belongs to the user
                    .or(`customer_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`)
                    .single(),
                supabase.from("business_settings").select("business_name, email, contact, address").eq("id", "default").single(),
            ]);

            if (!ord) { router.replace("/account/orders"); return; }
            setOrder(ord);
            if (biz?.business_name) setBizName(biz.business_name);
            setBizContact({ email: biz?.email ?? undefined, contact: biz?.contact ?? undefined, address: biz?.address ?? undefined });
            setLoading(false);
        });
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePrint = () => window.print();

    if (loading) return (
        <div className="animate-pulse space-y-4">
            <div className="h-4 bg-neutral-100 w-48 rounded" />
            <div className="h-32 bg-neutral-100 rounded" />
        </div>
    );

    if (!order) return null;

    const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
    const orderNum = order.id.substring(0, 8).toUpperCase();
    const dateStr = new Date(order.created_at).toLocaleDateString("en-GH", {
        year: "numeric", month: "long", day: "numeric",
    });
    const addr = addressText(order.shipping_address);

    return (
        <>
            {/* Print styles */}
            <style>{`
                @media print {
                    * { visibility: hidden !important; }
                    #receipt-print, #receipt-print * { visibility: visible !important; }
                    #receipt-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; border: none !important; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* Back + Print toolbar */}
            <div className="no-print flex items-center justify-between mb-8">
                <Link
                    href="/account/orders"
                    className="flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                >
                    <ArrowLeft size={14} /> Back to Orders
                </Link>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    <Printer size={14} /> Print Receipt
                </button>
            </div>

            {/* Receipt card */}
            <div id="receipt-print" ref={printRef} className="bg-white border border-neutral-200 p-8 md:p-12 max-w-2xl">

                {/* Header */}
                <div className="flex items-start justify-between mb-8 pb-6 border-b border-neutral-100">
                    <div>
                        <h2 className="font-serif text-xl tracking-widest uppercase">{bizName}</h2>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 mt-1">Order Receipt</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-sm font-bold text-neutral-900">#{orderNum}</p>
                        <p className="text-xs text-neutral-400 mt-1">{dateStr}</p>
                        <span className={`mt-2 inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded ${order.status === "delivered" || order.status === "fulfilled" ? "bg-emerald-100 text-emerald-700" :
                                order.status === "shipped" ? "bg-indigo-50 text-indigo-700" :
                                    order.status === "packed" ? "bg-blue-50 text-blue-700" :
                                        order.status === "paid" || order.status === "processing" ? "bg-blue-50 text-blue-700" :
                                            order.status === "cancelled" ? "bg-red-50 text-red-600" :
                                                "bg-amber-50 text-amber-700"
                            }`}>
                            {order.status}
                        </span>
                    </div>
                </div>

                {/* Status timeline */}
                <div className="mb-8 pb-6 border-b border-neutral-100 no-print">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-2">Order Status</p>
                    <StatusTimeline status={order.status} />
                </div>

                {/* Customer + Delivery */}
                {(order.customer_name || addr || order.delivery_method) && (
                    <div className="mb-8 pb-6 border-b border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {order.customer_name && (
                            <div>
                                <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-2">Customer</p>
                                <p className="text-sm text-neutral-800 font-medium">{order.customer_name}</p>
                                {order.customer_phone && <p className="text-xs text-neutral-500">{order.customer_phone}</p>}
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

                {/* Items table */}
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
                                {items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-3">
                                            <div className="flex items-center gap-3">
                                                {item.imageUrl && (
                                                    <div className="relative w-14 h-14 flex-shrink-0 bg-neutral-50 border border-neutral-100 overflow-hidden">
                                                        <Image
                                                            src={item.imageUrl}
                                                            alt={itemName(item)}
                                                            fill
                                                            className="object-cover"
                                                            sizes="56px"
                                                        />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-neutral-800">{itemName(item)}</p>
                                                    {(item.size || item.color) && (
                                                        <p className="text-[10px] uppercase tracking-wider text-neutral-400 mt-0.5">
                                                            {[item.size, item.color].filter(Boolean).join(" · ")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 text-center text-neutral-600">{itemQty(item)}</td>
                                        <td className="py-3 text-right text-neutral-600">GH₵ {itemPrice(item).toFixed(2)}</td>
                                        <td className="py-3 text-right font-medium">GH₵ {(itemPrice(item) * itemQty(item)).toFixed(2)}</td>
                                    </tr>
                                ))}
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
                            {bizContact.address && <p>{bizContact.address}|</p>}
                            {bizContact.contact && <p>{bizContact.contact}|</p>}
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
