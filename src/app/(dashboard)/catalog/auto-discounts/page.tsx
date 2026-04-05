"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Plus, Trash2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AutoDiscount = {
    id: string;
    title: string;
    is_active: boolean;
    discount_type: "PERCENTAGE" | "FIXED";
    discount_value: number;
    applies_to: "ALL_PRODUCTS" | "SPECIFIC_CATEGORIES" | "SPECIFIC_PRODUCTS";
    target_category_ids: string[];
    target_product_ids: string[];
    min_quantity: number;
    quantity_scope: "ACROSS_TARGET" | "PER_PRODUCT";
    min_order_amount: number | null;
    starts_at: string | null;
    ends_at: string | null;
    usage_count: number;
    created_at: string;
};

type Category = { id: string; name: string };
type Product  = { id: string; name: string };

type AutoDiscountForm = {
    title: string;
    discount_type: "PERCENTAGE" | "FIXED";
    discount_value: string;
    applies_to: "ALL_PRODUCTS" | "SPECIFIC_CATEGORIES" | "SPECIFIC_PRODUCTS";
    target_category_ids: string[];
    target_product_ids: string[];
    min_quantity: string;
    quantity_scope: "ACROSS_TARGET" | "PER_PRODUCT";
    min_order_amount: string;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
};

const EMPTY_FORM: AutoDiscountForm = {
    title: "",
    discount_type: "PERCENTAGE",
    discount_value: "",
    applies_to: "ALL_PRODUCTS",
    target_category_ids: [],
    target_product_ids: [],
    min_quantity: "1",
    quantity_scope: "ACROSS_TARGET",
    min_order_amount: "",
    starts_at: "",
    ends_at: "",
    is_active: true,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AutoDiscountsPage() {
    const [rules, setRules]           = useState<AutoDiscount[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts]     = useState<Product[]>([]);
    const [loading, setLoading]       = useState(true);
    const [showForm, setShowForm]     = useState(false);
    const [form, setForm]             = useState<AutoDiscountForm>(EMPTY_FORM);
    const [editingId, setEditingId]   = useState<string | null>(null);
    const [saving, setSaving]         = useState(false);
    const [productSearch, setProductSearch] = useState("");

    const fetchAll = async () => {
        setLoading(true);
        const [{ data: ruleData }, { data: catData }, { data: prodData }, { data: discountOrders }] = await Promise.all([
            supabase
                .from("automatic_discounts")
                .select("*")
                .order("created_at", { ascending: false }),
            supabase
                .from("categories")
                .select("id, name")
                .eq("is_active", true)
                .order("name"),
            supabase
                .from("products")
                .select("id, name")
                .or("is_active.eq.true,is_active.is.null")
                .order("name")
                .limit(200),
            // Count actual usage from orders (auto_discount_title is comma-separated rule titles)
            supabase
                .from("orders")
                .select("auto_discount_title")
                .not("auto_discount_title", "is", null),
        ]);

        // Build title → order count map from real order data
        const usageMap: Record<string, number> = {};
        for (const o of discountOrders ?? []) {
            if (!o.auto_discount_title) continue;
            for (const t of o.auto_discount_title.split(",")) {
                const title = t.trim();
                if (title) usageMap[title] = (usageMap[title] ?? 0) + 1;
            }
        }

        // Merge computed usage into rules (overrides stale webhook-tracked usage_count)
        const rulesWithUsage = (ruleData ?? []).map((r: AutoDiscount) => ({
            ...r,
            usage_count: usageMap[r.title] ?? 0,
        }));

        setRules(rulesWithUsage);
        setCategories(catData ?? []);
        setProducts(prodData ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    // ── Form helpers ──────────────────────────────────────────────────────────

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEdit = (rule: AutoDiscount) => {
        setEditingId(rule.id);
        setForm({
            title: rule.title,
            discount_type: rule.discount_type,
            discount_value: String(rule.discount_value),
            applies_to: rule.applies_to,
            target_category_ids: rule.target_category_ids ?? [],
            target_product_ids: rule.target_product_ids ?? [],
            min_quantity: String(rule.min_quantity),
            quantity_scope: rule.quantity_scope,
            min_order_amount: rule.min_order_amount != null ? String(rule.min_order_amount) : "",
            starts_at: rule.starts_at ? rule.starts_at.substring(0, 16) : "",
            ends_at: rule.ends_at ? rule.ends_at.substring(0, 16) : "",
            is_active: rule.is_active,
        });
        setShowForm(true);
    };

    const closeForm = () => { setShowForm(false); setEditingId(null); };

    const toggleCat = (id: string) => {
        setForm(f => ({
            ...f,
            target_category_ids: f.target_category_ids.includes(id)
                ? f.target_category_ids.filter(c => c !== id)
                : [...f.target_category_ids, id],
        }));
    };

    const toggleProd = (id: string) => {
        setForm(f => ({
            ...f,
            target_product_ids: f.target_product_ids.includes(id)
                ? f.target_product_ids.filter(p => p !== id)
                : [...f.target_product_ids, id],
        }));
    };

    // ── Save ──────────────────────────────────────────────────────────────────

    const save = async () => {
        if (!form.title.trim()) { toast.error("Title is required."); return; }
        if (!form.discount_value || Number(form.discount_value) <= 0) {
            toast.error("Discount value must be greater than 0."); return;
        }
        if (form.applies_to === "SPECIFIC_CATEGORIES" && form.target_category_ids.length === 0) {
            toast.error("Select at least one category."); return;
        }
        if (form.applies_to === "SPECIFIC_PRODUCTS" && form.target_product_ids.length === 0) {
            toast.error("Select at least one product."); return;
        }

        setSaving(true);
        const payload = {
            title: form.title.trim(),
            is_active: form.is_active,
            discount_type: form.discount_type,
            discount_value: Number(form.discount_value),
            applies_to: form.applies_to,
            target_category_ids: form.target_category_ids,
            target_product_ids: form.target_product_ids,
            min_quantity: Number(form.min_quantity) || 1,
            quantity_scope: form.quantity_scope,
            min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
            starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
            ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        };

        const { error } = editingId
            ? await supabase.from("automatic_discounts").update(payload).eq("id", editingId)
            : await supabase.from("automatic_discounts").insert([payload]);

        setSaving(false);
        if (error) {
            toast.error("Failed to save: " + error.message);
        } else {
            toast.success(editingId ? "Updated." : "Created.");
            closeForm();
            fetchAll();
        }
    };

    // ── Toggle active ─────────────────────────────────────────────────────────

    const toggleActive = async (rule: AutoDiscount) => {
        const { error } = await supabase
            .from("automatic_discounts")
            .update({ is_active: !rule.is_active })
            .eq("id", rule.id);
        if (error) {
            toast.error("Failed to update.");
        } else {
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────

    const deleteRule = async (id: string) => {
        if (!confirm("Delete this automatic discount rule?")) return;
        const { error } = await supabase.from("automatic_discounts").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete.");
        } else {
            toast.success("Deleted.");
            setRules(prev => prev.filter(r => r.id !== id));
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    function formatDiscount(rule: AutoDiscount) {
        return rule.discount_type === "PERCENTAGE"
            ? `${rule.discount_value}% off`
            : `GH₵ ${rule.discount_value} off`;
    }

    function formatScope(rule: AutoDiscount) {
        if (rule.applies_to === "ALL_PRODUCTS") return "All products";
        if (rule.applies_to === "SPECIFIC_CATEGORIES") {
            const names = categories
                .filter(c => rule.target_category_ids?.includes(c.id))
                .map(c => c.name)
                .join(", ");
            return names || "Specific categories";
        }
        const names = products
            .filter(p => rule.target_product_ids?.includes(p.id))
            .map(p => p.name)
            .join(", ");
        return names || "Specific products";
    }

    function formatDates(rule: AutoDiscount) {
        const from = rule.starts_at ? new Date(rule.starts_at).toLocaleDateString() : "—";
        const to = rule.ends_at ? new Date(rule.ends_at).toLocaleDateString() : "No end";
        return `${from} → ${to}`;
    }

    const filteredProducts = productSearch.trim()
        ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
        : products;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="p-6 md:p-10 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-serif text-2xl tracking-widest uppercase">Auto Discounts</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Rules that apply automatically at checkout — no code required.
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    <Plus size={14} />
                    New Rule
                </button>
            </div>

            {/* ── List ── */}
            {loading ? (
                <p className="text-neutral-400 italic font-serif">Loading…</p>
            ) : rules.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-neutral-200">
                    <p className="text-neutral-400 italic">No automatic discount rules yet.</p>
                    <button onClick={openCreate} className="mt-4 text-xs uppercase tracking-widest underline underline-offset-4 text-neutral-600 hover:text-black transition-colors">
                        Create your first rule
                    </button>
                </div>
            ) : (
                <div className="border border-neutral-200 divide-y divide-neutral-100">
                    {/* Header row */}
                    <div className="hidden md:grid grid-cols-[2fr_1fr_2fr_1fr_80px_80px] gap-4 px-5 py-3 bg-neutral-50 text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
                        <span>Title</span>
                        <span>Discount</span>
                        <span>Applies To</span>
                        <span>Min Qty</span>
                        <span>Uses</span>
                        <span className="text-right">Active</span>
                    </div>

                    {rules.map(rule => (
                        <div
                            key={rule.id}
                            className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_1fr_80px_80px] gap-4 px-5 py-4 items-center hover:bg-neutral-50 transition-colors cursor-pointer"
                            onClick={() => openEdit(rule)}
                        >
                            <div>
                                <p className="font-medium text-sm">{rule.title}</p>
                                <p className="text-[11px] text-neutral-400 mt-0.5">{formatDates(rule)}</p>
                            </div>
                            <div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.discount_type === "PERCENTAGE" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                                    {formatDiscount(rule)}
                                </span>
                            </div>
                            <div className="text-xs text-neutral-600 truncate">{formatScope(rule)}</div>
                            <div className="text-xs text-neutral-600">
                                {rule.min_quantity}×
                                <span className="text-neutral-400 ml-1">
                                    {rule.quantity_scope === "ACROSS_TARGET" ? "(across)" : "(per item)"}
                                </span>
                            </div>
                            <div className="text-sm text-neutral-600">{rule.usage_count}</div>
                            <div className="flex justify-end" onClick={e => { e.stopPropagation(); toggleActive(rule); }}>
                                <button
                                    type="button"
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${rule.is_active ? "bg-black" : "bg-neutral-200"}`}
                                    aria-pressed={rule.is_active}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${rule.is_active ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Form Drawer ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/40" onClick={closeForm} />
                    <div className="w-full max-w-xl bg-white overflow-y-auto flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-100 flex-shrink-0">
                            <h2 className="font-serif text-lg tracking-widest uppercase">
                                {editingId ? "Edit Rule" : "New Rule"}
                            </h2>
                            <button onClick={closeForm} className="text-neutral-400 hover:text-black transition-colors text-2xl leading-none">×</button>
                        </div>

                        <div className="flex-1 px-8 py-6 space-y-6">

                            {/* Title */}
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Title (customer-visible)</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm"
                                    placeholder='e.g. "3 for 120"'
                                />
                            </div>

                            {/* Discount type + value */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Discount Type</label>
                                    <select
                                        value={form.discount_type}
                                        onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as "PERCENTAGE" | "FIXED" }))}
                                        className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm"
                                    >
                                        <option value="PERCENTAGE">Percentage %</option>
                                        <option value="FIXED">Fixed GH₵</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">
                                        Value ({form.discount_type === "PERCENTAGE" ? "%" : "GH₵"})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.discount_value}
                                        onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                                        className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm"
                                        placeholder={form.discount_type === "PERCENTAGE" ? "e.g. 20" : "e.g. 30"}
                                    />
                                </div>
                            </div>

                            {/* Applies to */}
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Applies To</label>
                                <select
                                    value={form.applies_to}
                                    onChange={e => setForm(f => ({ ...f, applies_to: e.target.value as AutoDiscountForm["applies_to"] }))}
                                    className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm"
                                >
                                    <option value="ALL_PRODUCTS">All Products</option>
                                    <option value="SPECIFIC_CATEGORIES">Specific Categories</option>
                                    <option value="SPECIFIC_PRODUCTS">Specific Products</option>
                                </select>
                            </div>

                            {/* Category multi-select */}
                            {form.applies_to === "SPECIFIC_CATEGORIES" && (
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Target Categories</label>
                                    <div className="border border-neutral-200 max-h-48 overflow-y-auto divide-y divide-neutral-100">
                                        {categories.map(cat => (
                                            <label key={cat.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-neutral-50">
                                                <input
                                                    type="checkbox"
                                                    checked={form.target_category_ids.includes(cat.id)}
                                                    onChange={() => toggleCat(cat.id)}
                                                    className="accent-black"
                                                />
                                                <span className="text-sm">{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Product multi-select */}
                            {form.applies_to === "SPECIFIC_PRODUCTS" && (
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Target Products</label>
                                    <input
                                        type="text"
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        placeholder="Search products…"
                                        className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm mb-2"
                                    />
                                    <div className="border border-neutral-200 max-h-48 overflow-y-auto divide-y divide-neutral-100">
                                        {filteredProducts.map(prod => (
                                            <label key={prod.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-neutral-50">
                                                <input
                                                    type="checkbox"
                                                    checked={form.target_product_ids.includes(prod.id)}
                                                    onChange={() => toggleProd(prod.id)}
                                                    className="accent-black"
                                                />
                                                <span className="text-sm">{prod.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {form.target_product_ids.length > 0 && (
                                        <p className="text-[11px] text-neutral-500 mt-1">{form.target_product_ids.length} product(s) selected</p>
                                    )}
                                </div>
                            )}

                            {/* Min quantity + scope */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Min Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={form.min_quantity}
                                        onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))}
                                        className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Qty Scope</label>
                                    <select
                                        value={form.quantity_scope}
                                        onChange={e => setForm(f => ({ ...f, quantity_scope: e.target.value as "ACROSS_TARGET" | "PER_PRODUCT" }))}
                                        className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm"
                                    >
                                        <option value="ACROSS_TARGET">Across All Matching Items</option>
                                        <option value="PER_PRODUCT">Per Individual Product</option>
                                    </select>
                                </div>
                            </div>

                            {/* Qty scope hint */}
                            <p className="text-[11px] text-neutral-400 -mt-4">
                                {form.quantity_scope === "ACROSS_TARGET"
                                    ? "Combined quantity of all matching items must reach the minimum."
                                    : "Each product line must individually meet the minimum quantity."}
                            </p>

                            {/* Min order amount */}
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Min Order Amount (GH₵, optional)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.min_order_amount}
                                    onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                                    className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm"
                                    placeholder="Leave blank for no minimum"
                                />
                            </div>

                            {/* Start / End dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        value={form.starts_at}
                                        onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                                        className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2">End Date</label>
                                    <input
                                        type="datetime-local"
                                        value={form.ends_at}
                                        onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                                        className="w-full border-b border-neutral-300 focus:border-black bg-transparent py-2 outline-none rounded-none text-sm"
                                        placeholder="Leave blank = no end"
                                    />
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-medium">Active</span>
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${form.is_active ? "bg-black" : "bg-neutral-200"}`}
                                    aria-pressed={form.is_active}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-neutral-100 flex items-center justify-between gap-4 flex-shrink-0">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={() => deleteRule(editingId)}
                                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest"
                                >
                                    <Trash2 size={13} />
                                    Delete
                                </button>
                            )}
                            <div className="flex gap-3 ml-auto">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="px-5 py-2.5 text-xs uppercase tracking-widest border border-neutral-200 hover:bg-neutral-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                >
                                    {saving ? "Saving…" : (editingId ? "Update" : "Create")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
