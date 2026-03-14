"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Copy, XCircle, Search, Mail, Gift, User, MessageCircle, Calendar, Hash, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";

type GiftCard = {
  id: string;
  code: string;
  initial_value: number;
  remaining_value: number;
  recipient_email: string;
  recipient_name?: string;
  sender_name?: string;
  message?: string;
  delivery_date?: string;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
};

function generateCode() {
  const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MTGC-${seg()}-${seg()}`;
}

export default function AdminGiftCards() {
  const supabase = createClient();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    recipient_email: "",
    recipient_name: "",
    sender_name: "",
    message: "",
    amount: 500,
    delivery_date: new Date().toISOString().split('T')[0],
    expires_at: "",
    never_expires: true
  });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("gift_cards").select("*").order("created_at", { ascending: false });
      if (data) setCards(data as GiftCard[]);
    } catch (err) {
      console.error("Fetch cards error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied.");
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const code = generateCode();

    const savePromise = async () => {
        const { data, error } = await supabase.from("gift_cards").insert([{
            code,
            initial_value: form.amount,
            remaining_value: form.amount,
            recipient_email: form.recipient_email,
            recipient_name: form.recipient_name,
            sender_name: form.sender_name,
            message: form.message,
            delivery_date: form.delivery_date,
            expires_at: form.never_expires ? null : (form.expires_at || null),
            is_active: true
        }]).select().single();

        if (error) throw error;
        return data;
    };

    toast.promise(savePromise(), {
      loading: 'Authorizing issuance...',
      success: `Gift Card ${code} recorded.`,
      error: (err) => `Issuance failed: ${err.message}`,
    }).then(() => {
      setShowAddModal(false);
      setForm({
        recipient_email: "",
        recipient_name: "",
        sender_name: "",
        message: "",
        amount: 500,
        delivery_date: new Date().toISOString().split('T')[0],
        expires_at: "",
        never_expires: true
      });
      fetchCards();
    }).finally(() => {
      setSaving(false);
    });
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("gift_cards").update({ is_active: !current }).eq("id", id);
    if (error) {
      toast.error("Failed to update status.");
    } else {
      setCards(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c));
      toast.success(current ? "Card deactivated." : "Card reactivated.");
    }
  };

  const filteredCards = cards.filter(c => 
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
    (c.recipient_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Gift Cards</h1>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>Store Credit & Gifting</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-widest px-5 py-2.5 hover:bg-gray-900 transition-colors"
          style={{ fontFamily: "Arial, sans-serif" }}>
          <Plus size={13} strokeWidth={2} /> Issue New Card
        </button>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search codes or clients…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-100 pl-8 pr-3 py-2 text-xs outline-none focus:border-black transition-colors"
              style={{ fontFamily: "Arial, sans-serif" }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Code", "Recipient", "Balance", "Remaining", "Date", "Status", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-20 text-xs text-gray-400 italic">Accessing secure ledgers...</td></tr>
              ) : filteredCards.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-xs text-gray-400 italic">No gift cards found.</td></tr>
              ) : (
                filteredCards.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-900">{c.code}</span>
                        <button onClick={() => handleCopy(c.code)} className="text-gray-400 hover:text-black transition-colors"><Copy size={11} /></button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-gray-900 font-medium" style={{ fontFamily: "Arial, sans-serif" }}>{c.recipient_name || "Guest"}</p>
                      <p className="text-[10px] text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{c.recipient_email}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>GH₵ {c.initial_value?.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-xs font-semibold ${c.remaining_value === 0 ? "text-red-500" : "text-black"}`} style={{ fontFamily: "Arial, sans-serif" }}>
                          GH₵ {c.remaining_value?.toLocaleString()}
                        </span>
                        <div className="h-0.5 bg-gray-100 w-16 overflow-hidden">
                          <div className="h-full bg-black" style={{ width: `${(c.remaining_value / c.initial_value) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${c.is_active ? "bg-green-50 text-green-700 font-bold" : "bg-gray-100 text-gray-500"}`} style={{ fontFamily: "Arial, sans-serif" }}>
                        {c.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => toggleActive(c.id, c.is_active)} className="text-gray-400 hover:text-black"><XCircle size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-lg border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Issue Gift Card</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-black transition-colors"><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleIssue} className="p-8 grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Recipient Email</label>
                <div className="relative">
                  <Mail size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type="email" required value={form.recipient_email} onChange={e => setForm(f => ({ ...f, recipient_email: e.target.value }))}
                    className="w-full border-b border-gray-100 pl-5 py-2 text-xs outline-none focus:border-black transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Recipient Name</label>
                <div className="relative">
                  <User size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type="text" value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                    className="w-full border-b border-gray-100 pl-5 py-2 text-xs outline-none focus:border-black transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Sender Name</label>
                <div className="relative">
                  <User size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type="text" value={form.sender_name} onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))}
                    className="w-full border-b border-gray-100 pl-5 py-2 text-xs outline-none focus:border-black transition-colors" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Message (Optional)</label>
                <div className="relative">
                  <MessageCircle size={12} className="absolute left-0 top-3 text-gray-300" />
                  <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={2}
                    className="w-full border-b border-gray-100 pl-5 py-2 text-xs outline-none focus:border-black transition-colors resize-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Amount (GH₵)</label>
                <div className="relative">
                  <Hash size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type="number" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                    className="w-full border-b border-gray-100 pl-5 py-2 text-xs outline-none focus:border-black transition-colors" />
                </div>
              </div>
               <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Delivery Date</label>
                <div className="relative">
                  <Calendar size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type="date" required value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))}
                    className="w-full border-b border-gray-100 pl-5 py-2 text-xs outline-none focus:border-black transition-colors" />
                </div>
              </div>

              <div className="col-span-2 pt-2">
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={form.never_expires} 
                            onChange={e => setForm(f => ({ ...f, never_expires: e.target.checked }))}
                            className="w-4 h-4 accent-black" 
                        />
                        <span className="block text-[10px] uppercase tracking-widest font-bold text-gray-900 group-hover:text-black transition-colors">Never Expires</span>
                    </label>
                    
                    {!form.never_expires && (
                        <div className="flex-1 ml-8">
                             <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 text-right">Expiration Date</label>
                             <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                                className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors text-right" />
                        </div>
                    )}
                </div>
              </div>
              <div className="col-span-2 pt-4">
                <button type="submit" disabled={saving} className="w-full bg-black text-white text-[10px] uppercase tracking-widest py-4 hover:bg-gray-900 transition-colors disabled:opacity-50">
                  {saving ? "Signing Ledger..." : "Authorize Issuance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
