import { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

export const metadata: Metadata = {
    title: "Track Your Order | Miss Tokyo",
    description: "Enter your order reference and email to track your Miss Tokyo order.",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderItem = {
    name?: string;
    productName?: string;
    price?: number;
    unit_price?: number;
    quantity?: number;
    qty?: number;
    size?: string;
    color?: string;
    stitching?: string;
    imageUrl?: string;
};

type Order = {
    id: string;
    created_at: string;
    total_amount: number | null;
    status: string;
    items: OrderItem[] | null;
    customer_name: string | null;
    shipping_address: { text?: string } | string | null;
    delivery_method: string | null;
};

// ── Status timeline ────────────────────────────────────────────────────────────

const DELIVERY_STEPS = [
    { key: "ordered",    label: "Ordered" },
    { key: "processing", label: "Processing" },
    { key: "packed",     label: "Packed" },
    { key: "shipped",    label: "Shipped" },
    { key: "delivered",  label: "Delivered" },
];

const PICKUP_STEPS = [
    { key: "ordered",          label: "Ordered" },
    { key: "processing",       label: "Processing" },
    { key: "packed",           label: "Packed" },
    { key: "ready_for_pickup", label: "Ready" },
    { key: "collected",        label: "Collected" },
];

function deliveryStatusToStep(status: string): number {
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

function pickupStatusToStep(status: string): number {
    switch (status) {
        case "pending": return 0;
        case "paid":
        case "processing": return 1;
        case "packed": return 2;
        case "ready_for_pickup": return 3;
        case "fulfilled":
        case "delivered": return 4;
        default: return 0;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function itemName(item: OrderItem) { return item.name || item.productName || "Item"; }
function itemPrice(item: OrderItem) { return Number(item.price ?? item.unit_price ?? 0); }
function itemQty(item: OrderItem) { return Number(item.quantity ?? item.qty ?? 1); }
function addressText(addr: Order["shipping_address"]) {
    if (!addr) return null;
    if (typeof addr === "string") return addr;
    return addr.text || null;
}

function statusLabel(status: string): string {
    const map: Record<string, string> = {
        pending: "Pending",
        paid: "Paid",
        processing: "Processing",
        packed: "Packed",
        shipped: "Shipped",
        delivered: "Delivered",
        fulfilled: "Fulfilled",
        ready_for_pickup: "Ready for Pickup",
        collected: "Collected",
        cancelled: "Cancelled",
        refunded: "Refunded",
    };
    return map[status] ?? status;
}

// ── Server-side order lookup ──────────────────────────────────────────────────

async function lookupOrder(ref: string, email: string): Promise<Order | null> {
    if (!ref || !email) return null;

    // Sanitise: ref should be 8 hex chars, email a valid-ish string
    const cleanRef = ref.trim().toUpperCase().replace(/[^A-F0-9]/g, "");
    const cleanEmail = email.trim().toLowerCase();
    if (cleanRef.length !== 8 || !cleanEmail.includes("@")) return null;

    // Match on the first 8 chars of the UUID (the order reference shown in emails)
    // and verify the customer email — both must match
    const { data } = await supabaseAdmin
        .from("orders")
        .select("id, created_at, total_amount, status, items, customer_name, shipping_address, delivery_method")
        .ilike("id", `${cleanRef}%`)
        .ilike("customer_email", cleanEmail)
        .maybeSingle();

    return data ?? null;
}

// ── Timeline Component ────────────────────────────────────────────────────────

function StatusTimeline({ status, deliveryMethod }: { status: string; deliveryMethod: string | null }) {
    const cancelled = status === "cancelled" || status === "refunded";
    if (cancelled) {
        return (
            <div className="flex items-center gap-2 mt-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] uppercase tracking-widest text-red-500 font-semibold capitalize">
                    {statusLabel(status)}
                </span>
            </div>
        );
    }

    const pickup = deliveryMethod?.toLowerCase().includes("pickup") ?? false;
    const steps = pickup ? PICKUP_STEPS : DELIVERY_STEPS;
    const active = pickup ? pickupStatusToStep(status) : deliveryStatusToStep(status);

    return (
        <div className="flex items-center gap-0 mt-4 flex-wrap">
            {steps.map((step, i) => {
                const done = i < active;
                const current = i === active;
                return (
                    <div key={step.key} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                                done ? "bg-black border-black" : current ? "bg-white border-black" : "bg-white border-neutral-300"
                            }`}>
                                {done ? (
                                    <Check size={11} className="text-white" strokeWidth={3} />
                                ) : current ? (
                                    <div className="w-2 h-2 rounded-full bg-black" />
                                ) : null}
                            </div>
                            <span className={`mt-1.5 text-[9px] uppercase tracking-wider whitespace-nowrap font-semibold ${
                                i > active ? "text-neutral-300" : "text-black"
                            }`}>{step.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-[2px] w-8 md:w-14 shrink-0 mx-1 mb-4 ${done ? "bg-black" : "bg-neutral-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TrackOrderPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const params = await searchParams;
    const rawRef = params.ref ?? "";
    const rawEmail = params.email ?? "";

    const hasQuery = rawRef.length > 0 && rawEmail.length > 0;
    const order = hasQuery ? await lookupOrder(rawRef, rawEmail) : null;
    const notFound = hasQuery && !order;

    const orderRef = order ? order.id.substring(0, 8).toUpperCase() : "";
    const items: OrderItem[] = order?.items ?? [];
    const address = order ? addressText(order.shipping_address) : null;
    const isPickup = order?.delivery_method?.toLowerCase().includes("pickup") ?? false;

    return (
        <div className="max-w-xl mx-auto px-4 py-16">
            {/* Header */}
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 mb-2">Miss Tokyo</p>
            <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase mb-8">Track Order</h1>

            {/* Lookup Form */}
            <form method="GET" action="/track" className="space-y-4 mb-10">
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                        Order Reference
                    </label>
                    <input
                        name="ref"
                        defaultValue={rawRef}
                        placeholder="e.g. A1B2C3D4"
                        maxLength={8}
                        required
                        className="w-full border border-neutral-300 px-4 py-3 text-sm tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-black"
                    />
                    <p className="mt-1 text-[10px] text-neutral-400">
                        Your 8-character order reference is in your confirmation email subject line.
                    </p>
                </div>
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                        Email Address
                    </label>
                    <input
                        name="email"
                        type="email"
                        defaultValue={rawEmail}
                        placeholder="you@example.com"
                        required
                        className="w-full border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:border-black"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-black text-white text-[10px] uppercase tracking-[0.2em] py-4 hover:bg-neutral-800 transition-colors"
                >
                    Track Order
                </button>
            </form>

            {/* Not Found */}
            {notFound && (
                <div className="border border-neutral-200 p-6 text-center mb-8">
                    <p className="text-sm text-neutral-600">
                        No order found matching that reference and email address.
                    </p>
                    <p className="mt-2 text-[11px] text-neutral-400">
                        Please check your confirmation email and try again. If you need help,{" "}
                        <Link href="/contact" className="underline">contact us</Link>.
                    </p>
                </div>
            )}

            {/* Order Results */}
            {order && (
                <div className="space-y-8">
                    {/* Reference + Date */}
                    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Order Reference</p>
                            <p className="font-mono font-semibold text-base">#{orderRef}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Date</p>
                            <p className="text-sm">
                                {new Date(order.created_at).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Status + Timeline */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400">Status</p>
                            <span className="text-[10px] uppercase tracking-widest font-semibold">
                                {statusLabel(order.status)}
                            </span>
                        </div>
                        <StatusTimeline status={order.status} deliveryMethod={order.delivery_method} />
                    </div>

                    {/* Delivery Method */}
                    {order.delivery_method && (
                        <div className="border-t border-neutral-100 pt-6">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Delivery Method</p>
                            <p className="text-sm capitalize">{order.delivery_method.replace(/_/g, " ")}</p>
                            {address && !isPickup && (
                                <p className="text-sm text-neutral-500 mt-1">{address}</p>
                            )}
                        </div>
                    )}

                    {/* Items */}
                    {items.length > 0 && (
                        <div className="border-t border-neutral-100 pt-6">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-4">Items Ordered</p>
                            <div className="space-y-4">
                                {items.map((item, i) => (
                                    <div key={i} className="flex gap-4 items-start">
                                        {item.imageUrl && (
                                            <div className="relative w-16 h-20 shrink-0 bg-neutral-50">
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={itemName(item)}
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-snug">{itemName(item)}</p>
                                            <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-neutral-500">
                                                {item.size && <span>Size: {item.size}</span>}
                                                {item.color && <span>Colour: {item.color}</span>}
                                                {item.stitching && <span>Stitching: {item.stitching}</span>}
                                                <span>Qty: {itemQty(item)}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm shrink-0 font-medium">
                                            GH₵ {(itemPrice(item) * itemQty(item)).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Total */}
                    {order.total_amount != null && (
                        <div className="border-t border-neutral-200 pt-4 flex justify-between items-center">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Total Paid</p>
                            <p className="font-semibold text-base">GH₵ {Number(order.total_amount).toFixed(2)}</p>
                        </div>
                    )}

                    {/* Help link */}
                    <div className="border-t border-neutral-100 pt-6 text-center">
                        <p className="text-[11px] text-neutral-400">
                            Questions about your order?{" "}
                            <Link href="/contact" className="underline hover:text-black transition-colors">
                                Contact us
                            </Link>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
