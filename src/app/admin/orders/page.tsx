"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Trash2, Search, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchOrderStats } from "@/lib/utils/metrics";
import { toast } from "@/lib/toast";

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  item_count?: number;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-blue-100 text-blue-800",
  fulfilled: "bg-green-50 text-green-700",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-50 text-red-600",
};

type Tab = "Pending" | "Shipped" | "Fulfilled" | "All";
const TABS: Tab[] = ["Pending", "Shipped", "Fulfilled", "All"];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchOrdersAndStats = useCallback(async () => {
    setLoading(true);
    const [ordersRes, statsRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      fetchOrderStats()
    ]);

    if (ordersRes.data) setOrders(ordersRes.data as Order[]);
    if (statsRes) setStats(statsRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrdersAndStats();
  }, [fetchOrdersAndStats]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
        o.customer_email.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      if (activeTab === "All") return true;
      if (activeTab === "Pending") return ["pending", "processing"].includes(o.status.toLowerCase());
      return o.status.toLowerCase() === activeTab.toLowerCase();
    });
  }, [orders, activeTab, search]);

  const toggleAll = () => {
    if (selected.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus.toLowerCase() })
      .in("id", Array.from(selected));
    
    if (error) {
      toast.error(`Failed to update ${selected.size} orders.`);
    } else {
      toast.success(`Updated ${selected.size} orders to ${newStatus}.`);
      setSelected(new Set());
      await fetchOrdersAndStats();
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selected.size} orders?`)) return;
    const { error } = await supabase.from("orders").delete().in("id", Array.from(selected));
    if (error) {
      toast.error("Failed to delete orders.");
    } else {
      toast.success("Orders deleted.");
      setSelected(new Set());
      await fetchOrdersAndStats();
    }
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Orders</h1>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>Fulfillment Pipeline</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Revenue" value={`GH₵ ${stats?.totalRevenue?.toLocaleString() || "0"}`} />
        <StatCard label="Unfulfilled" value={String((stats?.pendingCount || 0) + (stats?.processingCount || 0))} highlight />
        <StatCard label="Fulfilled" value={String(stats?.fulfilledCount || 0)} />
        <StatCard label="Cancelled" value={String(stats?.cancelledCount || 0)} />
      </div>

      <div className="flex gap-0 border-b border-gray-200 mb-0">
        {TABS.map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelected(new Set()); }}
            className={`px-5 py-3 text-[11px] uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === tab ? "border-black text-black font-semibold" : "border-transparent text-gray-400 hover:text-black"
            }`}
            style={{ fontFamily: "Arial, sans-serif" }}>
            {tab}
          </button>
        ))}
      </div>

      <div className={`border border-t-0 border-gray-200 bg-gray-50 px-5 py-3 flex items-center gap-3 transition-all ${
        selected.size > 0 ? "opacity-100" : "opacity-0 pointer-events-none h-0 py-0 border-0 overflow-hidden"
      }`}>
        <span className="text-[11px] text-gray-500 mr-2" style={{ fontFamily: "Arial, sans-serif" }}>{selected.size} selected</span>
        <button onClick={() => bulkUpdateStatus("shipped")} className="bg-black text-white text-[11px] uppercase tracking-widest px-4 py-2 hover:bg-gray-900 transition-colors" style={{ fontFamily: "Arial, sans-serif" }}>Mark Shipped</button>
        <button onClick={() => bulkUpdateStatus("fulfilled")} className="bg-black text-white text-[11px] uppercase tracking-widest px-4 py-2 hover:bg-gray-900 transition-colors" style={{ fontFamily: "Arial, sans-serif" }}>Mark Fulfilled</button>
        <button onClick={bulkDelete} className="bg-red-600 text-white text-[11px] uppercase tracking-widest px-4 py-2 hover:bg-red-700 transition-colors ml-auto" style={{ fontFamily: "Arial, sans-serif" }}>Delete</button>
      </div>

      <div className="bg-white border border-t-0 border-gray-200 overflow-x-auto">
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 pl-8 pr-3 py-2 text-xs outline-none focus:border-black transition-colors"
              style={{ fontFamily: "Arial, sans-serif" }} />
          </div>
        </div>

        <table className="w-full min-w-[750px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="pl-5 pr-3 py-3 w-10">
                <input type="checkbox" checked={filteredOrders.length > 0 && selected.size === filteredOrders.length} onChange={toggleAll} className="cursor-pointer accent-black" />
              </th>
              {["Order", "Customer", "Status", "Total", "Date", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-20 text-xs text-gray-400 italic">Syncing with headquarters...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-20 text-xs text-gray-400 italic uppercase tracking-widest">No {activeTab.toLowerCase()} orders found</td></tr>
            ) : (
              filteredOrders.map(o => (
                <tr key={o.id} className={`hover:bg-gray-50 transition-colors ${selected.has(o.id) ? "bg-gray-50" : ""}`}>
                  <td className="pl-5 pr-3 py-3.5">
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} className="cursor-pointer accent-black" />
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-gray-900">
                    <Link href={`/admin/orders/${o.id}`} className="hover:underline uppercase">{o.id.slice(0, 8)}</Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>{o.customer_name || "Guest"}</p>
                    <p className="text-[10px] text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{o.customer_email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${STATUS_STYLES[o.status.toLowerCase()] || "bg-gray-100 text-gray-500"}`} style={{ fontFamily: "Arial, sans-serif" }}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>GH₵ {Number(o.total_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/admin/orders/${o.id}`} className="text-gray-400 hover:text-black transition-colors"><ChevronRight size={16} /></Link>
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

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 p-5">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2" style={{ fontFamily: "Arial, sans-serif" }}>{label}</p>
      <p className={`text-2xl font-semibold ${highlight ? 'text-amber-600' : 'text-gray-900'}`} style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>{value}</p>
    </div>
  );
}
