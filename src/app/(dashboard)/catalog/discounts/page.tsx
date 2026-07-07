"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { createCoupon, toggleCoupon, deleteCoupon } from "./actions";

type DiscountType = "fixed" | "percentage" | "free_shipping" | "sale_price" | "buy_x_get_y";

type Category = { id: string; name: string; slug: string };

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
    category_id: string | null;
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
    category_id: string;
};

const EMPTY_FORM: CouponForm = {
    code: "", discount_type: "percentage", discount_value: "",
    min_order_value: "", usage_limit: "", expires_at: "",
    buy_quantity: "", get_quantity: "", category_id: "",
};

const TYPE_LABELS: Record<DiscountType, string> = {
    fixed:         "Fixed Discount",
    percentage:    "Percentage Off",
    free_shipping: "Free Shipping",
    sale_price:    "Sale Price",
    buy_x_get_y:   "Buy X Get Y",
};

const TYPE_BADGE: Record<DiscountType, string> = {
    fixed:         "ac-badge ac-badge-info",
    percentage:    "ac-badge ac-badge-info",
    free_shipping: "ac-badge ac-badge-ok",
    sale_price:    "ac-badge ac-badge-warn",
    buy_x_get_y:   "ac-badge ac-badge-info",
};

function formatValue(coupon: Coupon): string {
    switch (coupon.discount_type) {
        case "fixed":         return coupon.discount_value ? `GH₵ ${coupon.discount_value}` : "—";
        case "percentage":    return coupon.discount_value ? `${coupon.discount_value}%` : "—";
        case "free_shipping": return "Free shipping";
        case "sale_price":    return coupon.discount_value ? `GH₵ ${coupon.discount_value}` : "—";
        case "buy_x_get_y":   return `Buy ${coupon.buy_quantity ?? "?"} Get ${coupon.get_quantity ?? "?"}`;
    }
}

function genCode(): string {
    return `MISS${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

export default function DiscountsPage() {
    const [coupons, setCoupons]           = useState<Coupon[]>([]);
    const [categories, setCategories]     = useState<Category[]>([]);
    const [loading, setLoading]           = useState(true);
    const [isAdding, setIsAdding]         = useState(false);
    const [saving, setSaving]             = useState(false);
    const [form, setForm]                 = useState<CouponForm>(EMPTY_FORM);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchAll = async () => {
        setLoading(true);
        const [{ data: couponData }, { data: catData }] = await Promise.all([
            supabase.from("coupons").select("*").order("created_at", { ascending: false }),
            supabase.from("categories").select("id, name, slug").eq("is_active", true).order("name"),
        ]);
        if (couponData) setCoupons(couponData);
        if (catData)    setCategories(catData);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code) return;
        setSaving(true);

        const payload: any = {
            code:            form.code.toUpperCase(),
            discount_type:   form.discount_type,
            is_active:       true,
            used_count:      0,
            discount_value:  form.discount_value  ? Number(form.discount_value)  : null,
            min_order_value: form.min_order_value ? Number(form.min_order_value) : null,
            usage_limit:     form.usage_limit     ? Number(form.usage_limit)     : null,
            expires_at:      form.expires_at      || null,
            free_shipping:   form.discount_type === "free_shipping",
            buy_quantity:    form.buy_quantity    ? Number(form.buy_quantity)    : null,
            get_quantity:    form.get_quantity    ? Number(form.get_quantity)    : null,
            category_id:     form.category_id     || null,
        };

        const result = await createCoupon(payload);
        if (result.error) {
            toast.error(result.error || "Failed to create discount.");
        } else {
            toast.success("Discount created.");
            setForm(EMPTY_FORM);
            setIsAdding(false);
            await fetchAll();
        }
        setSaving(false);
    };

    const toggleActive = async (id: string, is_active: boolean) => {
        const code = coupons.find(c => c.id === id)?.code ?? "";
        setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
        const result = await toggleCoupon(id, is_active, code);
        if (result.error) {
            // Roll back optimistic update
            setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active } : c));
            toast.error("Failed to update.");
        }
    };

    const handleDelete = async (id: string) => {
        const code = coupons.find(c => c.id === id)?.code ?? "";
        const result = await deleteCoupon(id, code);
        if (result.error) {
            toast.error("Failed to delete discount.");
        } else {
            toast.success("Discount deleted.");
            setCoupons(prev => prev.filter(c => c.id !== id));
            setConfirmDeleteId(null);
        }
    };

    const categoryName = (id: string | null) =>
        id ? (categories.find(c => c.id === id)?.name ?? "—") : null;

    const supportsCategory = (t: DiscountType) => t !== "free_shipping";

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Discounts</h1>
                    <p className="ac-page-sub">Create and manage coupon codes and promotions.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="ac-btn ac-btn-primary"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {isAdding ? "Cancel" : "New Discount"}
                </button>
            </div>

            {/* Add form */}
            {isAdding && (
                <form onSubmit={handleAdd}>
                    <div className="ac-card" style={{ marginBottom: 24 }}>
                        <div className="ac-card-head">
                            <span className="ac-card-title">New Discount</span>
                        </div>
                        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
                            {/* Type selector */}
                            <div>
                                <label className="ac-label">Discount Type</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                                    {(Object.keys(TYPE_LABELS) as DiscountType[]).map(t => (
                                        <button
                                            key={t} type="button"
                                            onClick={() => setForm(p => ({ ...p, discount_type: t, category_id: "" }))}
                                            className={`ac-btn ac-btn-sm ${form.discount_type === t ? "ac-btn-primary" : "ac-btn-ghost"}`}
                                        >
                                            {TYPE_LABELS[t]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                                {/* Code */}
                                <div>
                                    <label className="ac-label">Coupon Code</label>
                                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                        <input required type="text" value={form.code}
                                            onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                            className="ac-input"
                                            style={{ flex: 1, fontFamily: "var(--f-mono)", textTransform: "uppercase" }}
                                            placeholder="MISS20" />
                                        <button type="button" onClick={() => setForm(p => ({ ...p, code: genCode() }))}
                                            className="ac-btn ac-btn-ghost ac-btn-sm">
                                            Gen
                                        </button>
                                    </div>
                                </div>

                                {/* Value — hidden for free_shipping */}
                                {form.discount_type !== "free_shipping" && form.discount_type !== "buy_x_get_y" && (
                                    <div>
                                        <label className="ac-label">
                                            {form.discount_type === "percentage" ? "Discount %" : "Discount Value (GH₵)"}
                                        </label>
                                        <input type="number" min="0" step="0.01" value={form.discount_value}
                                            onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))}
                                            className="ac-input"
                                            style={{ marginTop: 4 }}
                                            placeholder={form.discount_type === "percentage" ? "20" : "50"} />
                                    </div>
                                )}

                                {/* Buy X Get Y */}
                                {form.discount_type === "buy_x_get_y" && (
                                    <>
                                        <div>
                                            <label className="ac-label">Buy Quantity</label>
                                            <input type="number" min="1" value={form.buy_quantity}
                                                onChange={e => setForm(p => ({ ...p, buy_quantity: e.target.value }))}
                                                className="ac-input"
                                                style={{ marginTop: 4 }}
                                                placeholder="2" />
                                        </div>
                                        <div>
                                            <label className="ac-label">Get Quantity (Free)</label>
                                            <input type="number" min="1" value={form.get_quantity}
                                                onChange={e => setForm(p => ({ ...p, get_quantity: e.target.value }))}
                                                className="ac-input"
                                                style={{ marginTop: 4 }}
                                                placeholder="1" />
                                        </div>
                                    </>
                                )}

                                {/* Category (optional, not for free_shipping) */}
                                {supportsCategory(form.discount_type) && (
                                    <div>
                                        <label className="ac-label">
                                            Apply to Category <span style={{ fontWeight: 400, color: "var(--ac-ink-4)", textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                                        </label>
                                        <select value={form.category_id}
                                            onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                                            className="ac-select"
                                            style={{ marginTop: 4 }}>
                                            <option value="">All categories</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Min order */}
                                <div>
                                    <label className="ac-label">Min Order (GH₵)</label>
                                    <input type="number" min="0" step="0.01" value={form.min_order_value}
                                        onChange={e => setForm(p => ({ ...p, min_order_value: e.target.value }))}
                                        className="ac-input"
                                        style={{ marginTop: 4 }}
                                        placeholder="0 = no minimum" />
                                </div>

                                {/* Usage limit */}
                                <div>
                                    <label className="ac-label">Usage Limit</label>
                                    <input type="number" min="1" value={form.usage_limit}
                                        onChange={e => setForm(p => ({ ...p, usage_limit: e.target.value }))}
                                        className="ac-input"
                                        style={{ marginTop: 4 }}
                                        placeholder="Blank = unlimited" />
                                </div>

                                {/* Expiry */}
                                <div>
                                    <label className="ac-label">Expiry Date</label>
                                    <input type="date" value={form.expires_at}
                                        onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                                        className="ac-input"
                                        style={{ marginTop: 4 }} />
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--ac-line)", paddingTop: 16 }}>
                                <button type="submit" disabled={saving} className="ac-btn ac-btn-primary">
                                    {saving ? "Creating..." : "Create Discount"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>Category</th>
                                <th>Min Order</th>
                                <th>Used</th>
                                <th>Expires</th>
                                <th>Status</th>
                                <th style={{ width: 80 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="ac-table-empty">Loading...</td></tr>
                            ) : coupons.length === 0 ? (
                                <tr><td colSpan={9} className="ac-table-empty">No discounts yet.</td></tr>
                            ) : coupons.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontFamily: "var(--f-mono)", fontWeight: 600, fontSize: 13 }}>{c.code}</td>
                                    <td>
                                        <span className={TYPE_BADGE[c.discount_type]}>
                                            {TYPE_LABELS[c.discount_type]}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: "var(--f-mono)", fontSize: 12 }}>{formatValue(c)}</td>
                                    <td>
                                        {categoryName(c.category_id) ? (
                                            <span className="ac-badge ac-badge-inactive">{categoryName(c.category_id)}</span>
                                        ) : (
                                            <span style={{ color: "var(--ac-ink-4)", fontSize: 11 }}>All</span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                        {c.min_order_value ? `GH₵ ${c.min_order_value}` : "None"}
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                        {c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--ac-ink-4)" }}>
                                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-GB") : "—"}
                                    </td>
                                    <td>
                                        <button onClick={() => toggleActive(c.id, c.is_active)}
                                            className={`ac-badge ${c.is_active ? "ac-badge-ok" : "ac-badge-inactive"}`}
                                            style={{ cursor: "pointer", border: "none", background: "none" }}>
                                            {c.is_active ? "Active" : "Inactive"}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                                            {confirmDeleteId === c.id ? (
                                                <>
                                                    <button onClick={() => handleDelete(c.id)}
                                                        style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-danger)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Yes</button>
                                                    <button onClick={() => setConfirmDeleteId(null)}
                                                        style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer" }}>No</button>
                                                </>
                                            ) : (
                                                <button onClick={() => setConfirmDeleteId(c.id)}
                                                    style={{ color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-danger)")}
                                                    onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
        </>
    );
}
