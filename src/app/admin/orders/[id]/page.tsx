"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { ChevronLeft, Copy, Mail, CheckCircle, Clock, Truck, XCircle, AlertCircle } from "lucide-react";

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

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-600 bg-amber-50" },
  processing: { label: "Processing", icon: Clock, color: "text-blue-600 bg-blue-50" },
  shipped: { label: "Shipped", icon: Truck, color: "text-blue-700 bg-blue-100" },
  fulfilled: { label: "Fulfilled", icon: CheckCircle, color: "text-green-700 bg-green-50" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "text-green-800 bg-green-100" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-600 bg-red-50" },
  refunded: { label: "Refunded", icon: AlertCircle, color: "text-gray-600 bg-gray-100" },
};

export default function AdminOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    
    if (data) setOrder(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

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
      toast.success(`Order #${order.id.slice(0, 8)} marked as ${newStatus}.`);

      if (["shipped", "fulfilled"].includes(newStatus)) {
        try {
          await fetch("/api/email/fulfillment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id }),
          });
          toast.success("Confirmation email sent.");
        } catch {
          console.error("Email trigger failed.");
        }
      }
    }
    setUpdating(false);
  };

  const copyRef = () => {
    if (!order?.paystack_reference) return;
    navigator.clipboard.writeText(order.paystack_reference);
    toast.success("Reference copied.");
  };

  if (loading) return <div className="p-8 text-xs text-gray-400 font-serif italic">Accessing archive...</div>;
  if (!order) return <div className="p-8 text-xs text-red-600">Order not found. <Link href="/admin/orders" className="underline">Back to pipeline</Link></div>;

  const currentStatus = STATUS_CONFIG[order.status.toLowerCase()] || STATUS_CONFIG.pending;

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <Link href="/admin/orders" className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-black mb-10 transition-colors">
        <ChevronLeft size={12} /> Back to Orders
      </Link>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Info */}
        <div className="flex-1 space-y-12">
          <header>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
              <span className="text-[10px] text-gray-300 font-mono">{new Date(order.created_at).toLocaleString()}</span>
            </div>
            <h1 className="text-3xl font-semibold uppercase tracking-tight" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>
              #{order.id.slice(0, 8)}
            </h1>
          </header>

          <section>
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold border-b border-gray-100 pb-3 mb-6">Customer Details</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Name</p>
                <p className="text-[13px] font-medium">{order.customer_name || "Guest Checkout"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Email</p>
                <p className="text-[13px] font-medium">{order.customer_email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Phone</p>
                <p className="text-[13px] font-medium">{order.customer_phone || "—"}</p>
              </div>
              {order.paystack_reference && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Payment Reference</p>
                  <button onClick={copyRef} className="text-[12px] font-mono text-gray-500 hover:text-black flex items-center gap-2 transition-colors">
                    {order.paystack_reference} <Copy size={11} />
                  </button>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold border-b border-gray-100 pb-3 mb-6">Order Items</h2>
            <div className="space-y-6">
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 border-b border-gray-50 pb-6">
                    <div className="w-16 h-20 bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                      {(item.imageUrl || item.image_url) && <img src={item.imageUrl || item.image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-semibold uppercase tracking-tight">{item.name}</p>
                        <p className="text-sm font-medium">GH₵ {((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                         {item.size && <span>Size: <span className="text-black">{item.size}</span></span>}
                         {item.color && <span>Color: <span className="text-black">{item.color}</span></span>}
                         <span>Qty: <span className="text-black">{item.quantity || 1}</span></span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No item data found for this order.</p>
              )}
              <div className="flex justify-between pt-4">
                <p className="text-[11px] uppercase tracking-widest font-bold">Total Amount</p>
                <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>
                   GH₵ {Number(order.total_amount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Actions */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white border border-gray-200 p-6 space-y-6">
            <h3 className="text-[11px] uppercase tracking-widest font-bold text-black border-b border-gray-50 pb-3">Update Status</h3>
            <div className="space-y-2">
              {["Pending", "Processing", "Shipped", "Fulfilled", "Cancelled", "Refunded"].map(s => (
                <button
                  key={s}
                  onClick={() => updateStatus(s.toLowerCase())}
                  disabled={updating || order.status.toLowerCase() === s.toLowerCase()}
                  className={`w-full text-left px-4 py-3 text-[10px] uppercase tracking-widest transition-all border ${
                    order.status.toLowerCase() === s.toLowerCase()
                      ? "bg-black text-white border-black font-bold cursor-default"
                      : "bg-white text-gray-500 border-gray-100 hover:border-black hover:text-black"
                  } disabled:opacity-50`}
                  style={{ fontFamily: "Arial, sans-serif" }}
                >
                  {s}
                  {order.status.toLowerCase() === s.toLowerCase() && <span className="float-right text-[8px] opacity-70">Current</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 p-6 space-y-4">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Shipping Info</h3>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Method</p>
              <p className="text-[12px] font-medium">{order.delivery_method || "Standard Delivery"}</p>
            </div>
            {order.shipping_address?.text && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Address</p>
                <p className="text-[12px] text-gray-600 leading-relaxed font-serif italic">{order.shipping_address.text}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
