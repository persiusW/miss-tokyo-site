"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

type DiscountType = "fixed" | "percentage" | "free_shipping" | "sale_price" | "buy_x_get_y";

type Coupon = {
    id: string;
    code: string;
    discount_type: DiscountType;
    discount_value: number | null;
    min_order_value: number | null;
    is_active: boolean;
    usage_limit: number | null;
    used_count: number;
    expires_at: string | null;
    buy_quantity: number | null;
    get_quantity: number | null;
    free_shipping: boolean;
    created_at: string;
};

type CouponForm = {
    code: string;
    discount_type: DiscountType;
    discount_value: string;
    min_order_value: string;
    usage_limit: string;
    expires_at: string;
    buy_quantity: string;
    get_quantity: string;
};

const EMPTY_FORM: CouponForm = {
    code: "", discount_type: "percentage", discount_value: "",
    min_order_value: "", usage_limit: "", expires_at: "",
    buy_quantity: "", get_quantity: "",
};

const TYPE_LABELS: Record<DiscountType, string> = {
    fixed:       "Fixed Discount",
    percentage:  "Percentage Off",
    free_shipping: "Free Shipping",
    sale_price:  "Sale Price",
    buy_x_get_y: "Buy X Get Y",
};

const TYPE_STYLES: Record<DiscountType, string> = {
    fixed:         "bg-blue-50 text-blue-700",
    percentage:    "bg-purple-50 text-purple-700",
    free_shipping: "bg-green-50 text-green-700",
    sale_price:    "bg-orange-50 text-orange-700",
    buy_x_get_y:   "bg-pink-50 text-pink-700",
};

function formatValue(coupon: Coupon): string {
    switch (coupon.discount_type) {
        case "fixed":        return coupon.discount_value ? `GH₵ ${coupon.discount_value}` : "—";
        case "percentage":   return coupon.discount_value ? `${coupon.discount_value}%` : "—";
        case "free_shipping": return "Free shipping";
        case "sale_price":   return coupon.discount_value ? `GH₵ ${coupon.discount_value}` : "—";
        case "buy_x_get_y":  return `Buy ${coupon.buy_quantity ?? "?"} Get ${coupon.get_quantity ?? "?"}`;
    }
}

function genCode(): string {
    return `MISS${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

export default function DiscountsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchCoupons = async () => {
        setLoading(true);
        const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
        if (data) setCoupons(data);
        setLoading(false);
    };

    useEffect(() => { fetchCoupons(); }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code) return;
        setSaving(true);

        const payload: any = {
            code: form.code.toUpperCase(),
            discount_type: form.discount_type,
            is_active: true,
            used_count: 0,
            discount_value: form.discount_value ? Number(form.discount_value) : null,
            min_order_value: form.min_order_value ? Number(form.min_order_value) : null,
            usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
            expires_at: form.expires_at || null,
            free_shipping: form.discount_type === "free_shipping",
            buy_quantity: form.buy_quantity ? Number(form.buy_quantity) : null,
            get_quantity: form.get_quantity ? Number(form.get_quantity) : null,
        };

        const { error } = await supabase.from("coupons").insert([payload]);
        if (error) {
            toast.error(error.message || "Failed to create discount.");
        } else {
            toast.success("Discount created.");
            setForm(EMPTY_FORM);
            setIsAdding(false);
            await fetchCoupons();
        }
        setSaving(false);
    };

    const toggleActive = async (id: string, is_active: boolean) => {
        setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
        await supabase.from("coupons").update({ is_active: !is_active }).eq("id", id);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("coupons").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete discount.");
        } else {
            toast.success("Discount deleted.");
            setCoupons(prev => prev.filter(c => c.id !== id));
        }
        setConfirmDeleteId(null);
    };

    return (
        <div className="space-y-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Discounts</h1>
                    <p className="text-neutral-500">Create and manage coupon codes and promotions.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    <Plus size={13} /> {isAdding ? "Cancel" : "New Discount"}
                </button>
            </header>

            {/* Add form */}
            {isAdding && (
                <form onSubmit={handleAdd} className="bg-white border border-neutral-200 p-8 space-y-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">New Discount</h2>

                    {/* Type selector */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-3">Discount Type</label>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(TYPE_LABELS) as DiscountType[]).map(t => (
                                <button
                                    key={t} type="button"
                                    onClick={() => setForm(p => ({ ...p, discount_type: t }))}
                                    className={`px-4 py-2 text-xs uppercase tracking-widest border transition-colors ${
                                        form.discount_type === t
                                            ? "bg-black text-white border-black"
                                            : "bg-white text-neutral-500 border-neutral-200 hover:border-black"
                                    }`}
                                >
                                    {TYPE_LABELS[t]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Code */}
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Coupon Code</label>
                            <div className="flex gap-2">
                                <input required type="text" value={form.code}
                                    onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                    className="flex-1 border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black font-mono text-sm uppercase"
                                    placeholder="MISS20" />
                                <button type="button" onClick={() => setForm(p => ({ ...p, code: genCode() }))}
                                    className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-black border-b border-neutral-200 px-2">
                                    Generate
                                </button>
                            </div>
                        </div>

                        {/* Value — hidden for free_shipping */}
                        {form.discount_type !== "free_shipping" && form.discount_type !== "buy_x_get_y" && (
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">
                                    {form.discount_type === "percentage" ? "Discount %" : "Discount Value (GH₵)"}
                                </label>
                                <input type="number" min="0" step="0.01" value={form.discount_value}
                                    onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black"
                                    placeholder={form.discount_type === "percentage" ? "20" : "50"} />
                            </div>
                        )}

                        {/* Buy X Get Y */}
                        {form.discount_type === "buy_x_get_y" && (
                            <>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Buy Quantity</label>
                                    <input type="number" min="1" value={form.buy_quantity}
                                        onChange={e => setForm(p => ({ ...p, buy_quantity: e.target.value }))}
                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black"
                                        placeholder="2" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Get Quantity (Free)</label>
                                    <input type="number" min="1" value={form.get_quantity}
                                        onChange={e => setForm(p => ({ ...p, get_quantity: e.target.value }))}
                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black"
                                        placeholder="1" />
                                </div>
                            </>
                        )}

                        {/* Min order */}
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Min Order (GH₵)</label>
                            <input type="number" min="0" step="0.01" value={form.min_order_value}
                                onChange={e => setForm(p => ({ ...p, min_order_value: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black"
                                placeholder="0 = no minimum" />
                        </div>

                        {/* Usage limit */}
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Usage Limit</label>
                            <input type="number" min="1" value={form.usage_limit}
                                onChange={e => setForm(p => ({ ...p, usage_limit: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black"
                                placeholder="Blank = unlimited" />
                        </div>

                        {/* Expiry */}
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Expiry Date</label>
                            <input type="date" value={form.expires_at}
                                onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm" />
                        </div>
                    </div>

                    <div className="flex justify-end border-t border-neutral-100 pt-6">
                        <button type="submit" disabled={saving}
                            className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50">
                            {saving ? "Creating..." : "Create Discount"}
                        </button>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Code</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Type</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Value</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Min Order</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Used</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Expires</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-6 py-4 w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={8} className="px-6 py-12 text-center text-neutral-400 italic font-serif">Loading...</td></tr>
                        ) : coupons.length === 0 ? (
                            <tr><td colSpan={8} className="px-6 py-16 text-center text-neutral-400 italic font-serif">No discounts yet.</td></tr>
                        ) : coupons.map(c => (
                            <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4 font-mono font-semibold text-sm">{c.code}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${TYPE_STYLES[c.discount_type]}`}>
                                        {TYPE_LABELS[c.discount_type]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-neutral-700">{formatValue(c)}</td>
                                <td className="px-6 py-4 text-neutral-500 text-xs">
                                    {c.min_order_value ? `GH₵ ${c.min_order_value}` : "None"}
                                </td>
                                <td className="px-6 py-4 text-neutral-500 text-xs">
                                    {c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}
                                </td>
                                <td className="px-6 py-4 text-neutral-400 text-xs">
                                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => toggleActive(c.id, c.is_active)}
                                        className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${c.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                                        {c.is_active ? "Active" : "Inactive"}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3 justify-end">
                                        {confirmDeleteId === c.id ? (
                                            <>
                                                <button onClick={() => handleDelete(c.id)}
                                                    className="text-xs uppercase tracking-widest text-red-600 font-semibold hover:text-red-800">Yes</button>
                                                <button onClick={() => setConfirmDeleteId(null)}
                                                    className="text-xs uppercase tracking-widest text-neutral-400 hover:text-black">No</button>
                                            </>
                                        ) : (
                                            <button onClick={() => setConfirmDeleteId(c.id)}
                                                className="text-neutral-400 hover:text-red-600 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
