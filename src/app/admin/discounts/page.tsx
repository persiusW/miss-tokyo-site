"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, Search, Tag, Percent, Truck, ShoppingBag, Gift, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/ui/miss-tokyo/ConfirmationModal";

type DiscountType = "fixed" | "percentage" | "free_shipping" | "sale_price" | "buy_x_get_y";

type Coupon = {
  id: string;
  code: string;
  discount_type: DiscountType;
  value?: number;
  min_order_value?: number;
  usage_limit?: number;
  times_used: number;
  is_active: boolean;
  expires_at?: string;
  buy_quantity?: number;
  get_quantity?: number;
  target_category_id?: string | null;
  single_use_per_customer?: boolean;
};

const TYPE_CONFIG: Record<DiscountType, { label: string; icon: any; color: string }> = {
  fixed: { label: "Fixed", icon: Tag, color: "bg-blue-50 text-blue-700" },
  percentage: { label: "Percentage", icon: Percent, color: "bg-purple-50 text-purple-700" },
  free_shipping: { label: "Free Shipping", icon: Truck, color: "bg-green-50 text-green-700" },
  sale_price: { label: "Sale Price", icon: ShoppingBag, color: "bg-amber-50 text-amber-700" },
  buy_x_get_y: { label: "BOGO", icon: Gift, color: "bg-indigo-50 text-indigo-700" },
};

export default function AdminDiscounts() {
  const supabase = createClient();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Coupon>>({
    code: "",
    discount_type: "percentage",
    value: 10,
    min_order_value: 0,
    usage_limit: undefined,
    expires_at: "",
    buy_quantity: 1,
    get_quantity: 1,
    target_category_id: null,
    single_use_per_customer: false
  });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (data) setCoupons(data as Coupon[]);
    } catch (err) {
      console.error("Fetch coupons error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("id, name");
    if (data) setCategories(data);
  }, [supabase]);

  useEffect(() => {
    fetchCoupons();
    fetchCategories();
  }, [fetchCoupons, fetchCategories]);

  const handleToggle = async (id: string, current: boolean) => {
    const { error } = await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    if (!error) {
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c));
      toast.success(current ? "Promotion paused." : "Promotion live.");
    }
  };

  const handleDelete = async (id: string) => {
    const deletePromise = async () => {
        const { error } = await supabase.from("coupons").delete().eq("id", id);
        if (error) throw error;
    };

    toast.promise(deletePromise(), {
      loading: 'Terminating campaign...',
      success: 'Promotion successfully removed.',
      error: (err) => `Termination failed: ${err.message}`,
    }).then(() => {
      setCoupons(prev => prev.filter(c => c.id !== id));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const savePromise = async () => {
        const { data, error } = await supabase.from("coupons").insert([{
            ...form,
            code: form.code?.toUpperCase().trim(),
            is_active: true,
            times_used: 0
        }]).select().single();

        if (error) throw error;
        return data;
    };

    toast.promise(savePromise(), {
      loading: 'Registering campaign...',
      success: 'Promotion successfully established.',
      error: (err) => `Failed to save: ${err.message}`,
    }).then(() => {
      setShowAddModal(false);
      fetchCoupons();
    }).finally(() => {
      setSaving(false);
    });
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Promotions</h1>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>Discounts & Campaigns</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-widest px-5 py-2.5 hover:bg-gray-900 transition-colors"
          style={{ fontFamily: "Arial, sans-serif" }}>
          <Plus size={13} strokeWidth={2} /> New Promotion
        </button>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search codes…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-100 pl-8 pr-3 py-2 text-xs outline-none focus:border-black transition-colors"
              style={{ fontFamily: "Arial, sans-serif" }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Code", "Type", "Benefit", "Conditions", "Usage", "Status", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-20 text-xs text-gray-400 italic font-serif">Querying promotion archives...</td></tr>
              ) : filteredCoupons.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-xs text-gray-400 italic">No promotions found.</td></tr>
              ) : (
                filteredCoupons.map(c => {
                  const config = TYPE_CONFIG[c.discount_type] || TYPE_CONFIG.percentage;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-xs font-mono font-bold text-gray-900">{c.code}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${config.color} font-bold`} style={{ fontFamily: "Arial, sans-serif" }}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-gray-900">
                        {c.discount_type === "percentage" ? `${c.value}% OFF` : 
                         c.discount_type === "fixed" ? `GH₵ ${c.value} OFF` :
                         c.discount_type === "free_shipping" ? "FREE DELIVERY" :
                         c.discount_type === "sale_price" ? `FIXED GH₵ ${c.value}` :
                         `BUY ${c.buy_quantity} GET ${c.get_quantity}`}
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>
                        {c.min_order_value ? `Min: GH₵ ${c.min_order_value}` : "No minimum"}
                        {c.expires_at && ` · Exp: ${new Date(c.expires_at).toLocaleDateString()}`}
                      </td>
                      <td className="px-5 py-4">
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-gray-600 font-medium">{c.times_used} {c.usage_limit ? `/ ${c.usage_limit}` : "total"}</span>
                            {c.usage_limit && <div className="h-0.5 bg-gray-100 w-12"><div className="h-full bg-black" style={{ width: `${(c.times_used / c.usage_limit) * 100}%` }} /></div>}
                         </div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <button onClick={() => handleToggle(c.id, c.is_active)} className="text-gray-400 hover:text-black">
                          {c.is_active ? <ToggleRight size={18} className="text-black" /> : <ToggleLeft size={18} />}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => setDeleteId(c.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Terminate Campaign"
        message="Are you sure you want to permanently remove this promotion? This action cannot be reversed."
        confirmLabel="Permanent Delete"
      />

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-xl border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>New Promotion</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-black transition-colors"><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Coupon Code</label>
                <input type="text" required placeholder="OFF10" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black font-mono transition-colors" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Promotion Type</label>
                <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as DiscountType }))}
                  className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors">
                  <option value="percentage">Percentage %</option>
                  <option value="fixed">Fixed GH₵ Off</option>
                  <option value="free_shipping">Free Shipping</option>
                  <option value="sale_price">Fixed Sale Price</option>
                  <option value="buy_x_get_y">Buy X Get Y (BOGO)</option>
                </select>
              </div>

              {(form.discount_type === "percentage" || form.discount_type === "fixed" || form.discount_type === "sale_price") && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">{form.discount_type === "percentage" ? "Value (%)" : "Value (GH₵)"}</label>
                  <input type="number" required value={form.value} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
                    className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors" />
                </div>
              )}

              {form.discount_type === "buy_x_get_y" && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Buy Quantity</label>
                    <input type="number" required value={form.buy_quantity} onChange={e => setForm(f => ({ ...f, buy_quantity: Number(e.target.value) }))}
                      className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Get Quantity (Free)</label>
                    <input type="number" required value={form.get_quantity} onChange={e => setForm(f => ({ ...f, get_quantity: Number(e.target.value) }))}
                      className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors" />
                  </div>
                </>
              )}

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Minimum Order Value</label>
                <input type="number" value={form.min_order_value} onChange={e => setForm(f => ({ ...f, min_order_value: Number(e.target.value) }))}
                  className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors" />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Max Usage Limit</label>
                <input type="number" placeholder="Unlimited" value={form.usage_limit || ""} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors" />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Expiry Date (Optional)</label>
                <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors" />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Applies to Category (Optional)</label>
                <select value={form.target_category_id || ""} onChange={e => setForm(f => ({ ...f, target_category_id: e.target.value || null }))}
                  className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors bg-transparent">
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={form.single_use_per_customer} 
                    onChange={e => setForm(f => ({ ...f, single_use_per_customer: e.target.checked }))}
                    className="w-4 h-4 accent-black" 
                  />
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-gray-900 group-hover:text-black transition-colors">Single use per customer</span>
                    <span className="block text-[9px] text-gray-400 mt-1 uppercase tracking-widest">Restrict one redemption per unique shopper account</span>
                  </div>
                </label>
              </div>

              <div className="col-span-2 pt-4">
                <button type="submit" disabled={saving} className="w-full bg-black text-white text-[10px] uppercase tracking-widest py-4 hover:bg-gray-900 transition-colors disabled:opacity-50">
                  {saving ? "Saving Campaign..." : "Save Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
