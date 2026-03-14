"use client";

import { useState, useEffect } from "react";
import { Clock, Mail, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

interface AbandonedOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  created_at: string;
  items: any[];
}

export default function AbandonedCarts() {
  const [orders, setOrders] = useState<AbandonedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAbandoned = async () => {
    setLoading(true);
    // Fetch orders with 'pending' status — these are considered abandoned in this context
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_email, total_amount, created_at, items")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Security clearance error — could not retrieve abandoned logs.");
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAbandoned();
  }, []);

  const filtered = orders.filter(o => 
    (o.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_email || "").toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Abandoned Carts</h1>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>
            Incomplete transactions awaiting recovery.
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-100 pl-8 pr-3 py-2 text-xs outline-none focus:border-black transition-colors" 
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-200" size={32} />
            <p className="text-[10px] uppercase tracking-widest text-gray-400 italic">Accessing archives...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 py-24 text-center">
             <p className="text-[10px] uppercase tracking-[0.3em] text-gray-300 font-bold italic">No abandoned collection found</p>
          </div>
        ) : (
          filtered.map(o => (
            <div key={o.id} className="bg-white border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center shrink-0">
                  <Clock size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>{o.customer_name || "Guest Shopper"}</p>
                    <span className="text-[10px] text-gray-300 font-mono">#{o.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5" style={{ fontFamily: "Arial, sans-serif" }}>{o.customer_email} · {new Date(o.created_at).toLocaleDateString()}</p>
                  <p className="text-[10px] text-gray-500 mt-2 italic max-w-md truncate" style={{ fontFamily: "Arial, sans-serif" }}>
                    {o.items?.map((i: any) => i.name).join(" · ") || "Incomplete Bag"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 sm:shrink-0">
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-gray-300 mb-0.5" style={{ fontFamily: "Arial, sans-serif" }}>Subtotal</p>
                    <span className="text-sm font-bold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>
                        GH₵{o.total_amount?.toLocaleString()}
                    </span>
                </div>
                <a href={`mailto:${o.customer_email}?subject=Miss%20Tokyo%20-%20Your%20Incomplete%20Order`}
                  className="flex items-center gap-2 bg-black text-white text-[10px] uppercase tracking-[0.2em] px-6 py-3 hover:bg-neutral-800 transition-all font-bold"
                  style={{ fontFamily: "Arial, sans-serif" }}>
                  <Mail size={12} strokeWidth={2} /> Recover
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
