"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Mail, Check, ChevronDown, ChevronRight, Package, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type StockRequest = {
  id: string;
  product_id: string;
  email: string;
  created_at: string;
  status: "pending" | "notified";
  product_name?: string;
};

type GroupedRequest = {
  product_id: string;
  product_name: string;
  requests: StockRequest[];
};

export default function BackInStock() {
  const [groupedRequests, setGroupedRequests] = useState<GroupedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [notifying, setNotifying] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data: requestsData, error } = await supabase
      .from("back_in_stock_requests")
      .select(`*, products(name)`)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch requests.");
    } else {
      // Group by product
      const groups: Record<string, GroupedRequest> = {};
      (requestsData || []).forEach(r => {
        const pId = r.product_id;
        const pName = (r.products as any)?.name || "Unknown Product";
        if (!groups[pId]) {
          groups[pId] = { product_id: pId, product_name: pName, requests: [] };
        }
        groups[pId].requests.push({
          ...r,
          product_name: pName
        });
      });
      setGroupedRequests(Object.values(groups));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleNotify = async (productId: string) => {
    setNotifying(productId);
    try {
      const response = await fetch("/api/notify-back-in-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId })
      });
      
      if (response.ok) {
        toast.success("Notification sequence initiated.");
        fetchRequests();
      } else {
        toast.error("Notification dispatch failed.");
      }
    } catch (e) {
      toast.error("Network error on dispatch.");
    } finally {
      setNotifying(null);
    }
  };

  const pendingCount = groupedRequests.reduce((acc, g) => acc + g.requests.filter(r => r.status === "pending").length, 0);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Back in Stock</h1>
        <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>
          {pendingCount} customers awaiting restoration alerts
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-gray-200" size={30} />
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-serif">Syncing Interest Logs...</p>
        </div>
      ) : groupedRequests.length === 0 ? (
        <div className="bg-white border border-gray-100 text-center py-20 text-xs italic text-gray-400">
          No back-in-stock requests recorded yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedRequests.map(group => {
            const hasPending = group.requests.some(r => r.status === "pending");
            const isExpanded = expanded.includes(group.product_id);

            return (
              <div key={group.product_id} className="bg-white border border-gray-200 overflow-hidden">
                <div className={`flex items-center justify-between p-5 ${isExpanded ? "border-b border-gray-50" : ""} hover:bg-gray-50 transition-colors cursor-pointer`}
                  onClick={() => toggleExpand(group.product_id)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center ${hasPending ? "bg-black text-white" : "bg-gray-50 text-gray-300"}`}>
                      <Package size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide" style={{ fontFamily: "Arial, sans-serif" }}>{group.product_name}</h3>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest" style={{ fontFamily: "Arial, sans-serif" }}>
                        {group.requests.filter(r => r.status === "pending").length} Pending · {group.requests.length} Total
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {hasPending && (
                       <button onClick={(e) => { e.stopPropagation(); handleNotify(group.product_id); }} disabled={notifying === group.product_id}
                        className="bg-black text-white text-[10px] uppercase tracking-widest px-4 py-2 hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                         {notifying === group.product_id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                         Send Notifications
                       </button>
                    )}
                    <div className="text-gray-300">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="divide-y divide-gray-50 bg-gray-50/30">
                    {group.requests.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-10 py-3.5">
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-gray-700" style={{ fontFamily: "Arial, sans-serif" }}>{r.email}</p>
                          <span className="text-[9px] text-gray-300">·</span>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${r.status === "notified" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`} style={{ fontFamily: "Arial, sans-serif" }}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
