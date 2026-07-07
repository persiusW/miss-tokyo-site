"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { saveAutoDiscount, toggleAutoDiscount, deleteAutoDiscount } from "./actions";

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
            supabase
                .from("orders")
                .select("auto_discount_title")
                .not("auto_discount_title", "is", null),
        ]);

        const usageMap: Record<string, number> = {};
        for (const o of discountOrders ?? []) {
            if (!o.auto_discount_title) continue;
            for (const t of o.auto_discount_title.split(",")) {
                const title = t.trim();
                if (title) usageMap[title] = (usageMap[title] ?? 0) + 1;
            }
        }

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

        const result = await saveAutoDiscount(payload, editingId);
        setSaving(false);
        if (result.error) {
            toast.error("Failed to save: " + result.error);
        } else {
            toast.success(editingId ? "Updated." : "Created.");
            closeForm();
            fetchAll();
            fetch("/api/admin/revalidate-discounts", { method: "POST" });
        }
    };

    const toggleActive = async (rule: AutoDiscount) => {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
        const result = await toggleAutoDiscount(rule.id, rule.is_active, rule.title);
        if (result.error) {
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: rule.is_active } : r));
            toast.error("Failed to update.");
        } else {
            fetch("/api/admin/revalidate-discounts", { method: "POST" });
        }
    };

    const deleteRule = async (id: string) => {
        if (!confirm("Delete this automatic discount rule?")) return;
        const title = rules.find(r => r.id === id)?.title ?? "";
        const result = await deleteAutoDiscount(id, title);
        if (result.error) {
            toast.error("Failed to delete.");
        } else {
            toast.success("Deleted.");
            setRules(prev => prev.filter(r => r.id !== id));
            fetch("/api/admin/revalidate-discounts", { method: "POST" });
        }
    };

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
        const from = rule.starts_at ? new Date(rule.starts_at).toLocaleDateString("en-GB") : "—";
        const to = rule.ends_at ? new Date(rule.ends_at).toLocaleDateString("en-GB") : "No end";
        return `${from} → ${to}`;
    }

    const filteredProducts = productSearch.trim()
        ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
        : products;

    const toggleStyle = (active: boolean) => ({
        position: "relative" as const,
        display: "inline-flex",
        height: 20,
        width: 36,
        alignItems: "center",
        borderRadius: 10,
        background: active ? "var(--ac-accent)" : "var(--ac-line)",
        border: "none",
        cursor: "pointer",
        transition: "background .2s",
        flexShrink: 0,
    });

    const toggleKnobStyle = (active: boolean) => ({
        display: "inline-block",
        height: 14,
        width: 14,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        transform: active ? "translateX(18px)" : "translateX(3px)",
        transition: "transform .2s",
    });

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Auto Discounts</h1>
                    <p className="ac-page-sub">Rules that apply automatically at checkout — no code required.</p>
                </div>
                <button onClick={openCreate} className="ac-btn ac-btn-primary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New Rule
                </button>
            </div>

            {loading ? (
                <div className="ac-card">
                    <div className="ac-empty"><p className="ac-empty-title">Loading…</p></div>
                </div>
            ) : rules.length === 0 ? (
                <div className="ac-card">
                    <div className="ac-empty">
                        <p className="ac-empty-title">No automatic discount rules yet.</p>
                        <button onClick={openCreate} className="ac-btn ac-btn-ghost" style={{ marginTop: 12 }}>Create your first rule</button>
                    </div>
                </div>
            ) : (
                <div className="ac-card flush">
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Discount</th>
                                    <th>Applies To</th>
                                    <th>Min Qty</th>
                                    <th className="r">Uses</th>
                                    <th className="r">Active</th>
                                    <th style={{ width: 40 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map(rule => (
                                    <tr key={rule.id} style={{ cursor: "pointer" }} onClick={() => openEdit(rule)}>
                                        <td>
                                            <div style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{rule.title}</div>
                                            <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2 }}>{formatDates(rule)}</div>
                                        </td>
                                        <td>
                                            <span className={`ac-badge ${rule.discount_type === "PERCENTAGE" ? "ac-badge-info" : "ac-badge-warn"}`}>
                                                {formatDiscount(rule)}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: "var(--ac-ink-3)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {formatScope(rule)}
                                        </td>
                                        <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                            {rule.min_quantity}×
                                            <span style={{ color: "var(--ac-ink-4)", marginLeft: 4, fontSize: 11 }}>
                                                {rule.quantity_scope === "ACROSS_TARGET" ? "(across)" : "(per item)"}
                                            </span>
                                        </td>
                                        <td className="r" style={{ fontSize: 13 }}>{rule.usage_count}</td>
                                        <td className="r" onClick={e => { e.stopPropagation(); toggleActive(rule); }}>
                                            <button type="button" style={toggleStyle(rule.is_active)} aria-pressed={rule.is_active}>
                                                <span style={toggleKnobStyle(rule.is_active)} />
                                            </button>
                                        </td>
                                        <td>
                                            <button
                                                className="ac-btn ac-btn-ghost ac-btn-sm"
                                                style={{ padding: "4px 8px" }}
                                                onClick={e => { e.stopPropagation(); openEdit(rule); }}
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Form Drawer ── */}
            {showForm && (
                <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
                    <div style={{ flex: 1, background: "rgba(0,0,0,.5)" }} onClick={closeForm} />
                    <div style={{
                        width: "100%", maxWidth: 480,
                        background: "var(--ac-panel)",
                        borderLeft: "1px solid var(--ac-line)",
                        overflowY: "auto",
                        display: "flex", flexDirection: "column",
                        boxShadow: "-8px 0 40px rgba(0,0,0,.3)",
                    }}>
                        {/* Drawer header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--ac-line)", flexShrink: 0 }}>
                            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, color: "var(--ac-ink)", letterSpacing: ".04em" }}>
                                {editingId ? "Edit Rule" : "New Rule"}
                            </h2>
                            <button onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", fontSize: 22, lineHeight: 1 }}>×</button>
                        </div>

                        <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
                            <div>
                                <label className="ac-label">Title (customer-visible)</label>
                                <input type="text" value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="ac-input" style={{ marginTop: 4 }}
                                    placeholder='e.g. "3 for 120"' />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <label className="ac-label">Discount Type</label>
                                    <select value={form.discount_type}
                                        onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as "PERCENTAGE" | "FIXED" }))}
                                        className="ac-select" style={{ marginTop: 4 }}>
                                        <option value="PERCENTAGE">Percentage %</option>
                                        <option value="FIXED">Fixed GH₵</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="ac-label">Value ({form.discount_type === "PERCENTAGE" ? "%" : "GH₵"})</label>
                                    <input type="number" min="0" step="0.01" value={form.discount_value}
                                        onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                                        className="ac-input" style={{ marginTop: 4 }}
                                        placeholder={form.discount_type === "PERCENTAGE" ? "e.g. 20" : "e.g. 30"} />
                                </div>
                            </div>

                            <div>
                                <label className="ac-label">Applies To</label>
                                <select value={form.applies_to}
                                    onChange={e => setForm(f => ({ ...f, applies_to: e.target.value as AutoDiscountForm["applies_to"] }))}
                                    className="ac-select" style={{ marginTop: 4 }}>
                                    <option value="ALL_PRODUCTS">All Products</option>
                                    <option value="SPECIFIC_CATEGORIES">Specific Categories</option>
                                    <option value="SPECIFIC_PRODUCTS">Specific Products</option>
                                </select>
                            </div>

                            {form.applies_to === "SPECIFIC_CATEGORIES" && (
                                <div>
                                    <label className="ac-label">Target Categories</label>
                                    <div style={{ border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                                        {categories.map(cat => (
                                            <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--ac-line)" }}>
                                                <input type="checkbox" className="ac-checkbox"
                                                    checked={form.target_category_ids.includes(cat.id)}
                                                    onChange={() => toggleCat(cat.id)} />
                                                <span style={{ fontSize: 13, color: "var(--ac-ink)" }}>{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {form.applies_to === "SPECIFIC_PRODUCTS" && (
                                <div>
                                    <label className="ac-label">Target Products</label>
                                    <input type="text" value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        placeholder="Search products…"
                                        className="ac-input" style={{ marginTop: 4, marginBottom: 8 }} />
                                    <div style={{ border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", maxHeight: 200, overflowY: "auto" }}>
                                        {filteredProducts.map(prod => (
                                            <label key={prod.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--ac-line)" }}>
                                                <input type="checkbox" className="ac-checkbox"
                                                    checked={form.target_product_ids.includes(prod.id)}
                                                    onChange={() => toggleProd(prod.id)} />
                                                <span style={{ fontSize: 13, color: "var(--ac-ink)" }}>{prod.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {form.target_product_ids.length > 0 && (
                                        <p style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 4 }}>{form.target_product_ids.length} product(s) selected</p>
                                    )}
                                </div>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <label className="ac-label">Min Quantity</label>
                                    <input type="number" min="1" step="1" value={form.min_quantity}
                                        onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))}
                                        className="ac-input" style={{ marginTop: 4 }} />
                                </div>
                                <div>
                                    <label className="ac-label">Qty Scope</label>
                                    <select value={form.quantity_scope}
                                        onChange={e => setForm(f => ({ ...f, quantity_scope: e.target.value as "ACROSS_TARGET" | "PER_PRODUCT" }))}
                                        className="ac-select" style={{ marginTop: 4 }}>
                                        <option value="ACROSS_TARGET">Across All Matching Items</option>
                                        <option value="PER_PRODUCT">Per Individual Product</option>
                                    </select>
                                </div>
                            </div>

                            <p style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: -12 }}>
                                {form.quantity_scope === "ACROSS_TARGET"
                                    ? "Combined quantity of all matching items must reach the minimum."
                                    : "Each product line must individually meet the minimum quantity."}
                            </p>

                            <div>
                                <label className="ac-label">Min Order Amount (GH₵, optional)</label>
                                <input type="number" min="0" step="0.01" value={form.min_order_amount}
                                    onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                                    className="ac-input" style={{ marginTop: 4 }}
                                    placeholder="Leave blank for no minimum" />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <label className="ac-label">Start Date</label>
                                    <input type="datetime-local" value={form.starts_at}
                                        onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                                        className="ac-input" style={{ marginTop: 4 }} />
                                </div>
                                <div>
                                    <label className="ac-label">End Date</label>
                                    <input type="datetime-local" value={form.ends_at}
                                        onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                                        className="ac-input" style={{ marginTop: 4 }} />
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>Active</span>
                                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                    style={toggleStyle(form.is_active)} aria-pressed={form.is_active}>
                                    <span style={toggleKnobStyle(form.is_active)} />
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--ac-line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
                            {editingId && (
                                <button type="button" onClick={() => deleteRule(editingId)}
                                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-danger)", background: "none", border: "none", cursor: "pointer" }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                    Delete
                                </button>
                            )}
                            <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                                <button type="button" onClick={closeForm} className="ac-btn ac-btn-ghost">Cancel</button>
                                <button type="button" onClick={save} disabled={saving} className="ac-btn ac-btn-primary">
                                    {saving ? "Saving…" : (editingId ? "Update" : "Create")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
