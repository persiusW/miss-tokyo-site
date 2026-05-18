import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LowStockPage() {
    const { data: products } = await supabase
        .from("products")
        .select("id, name, category_type, inventory_count, image_urls, price_ghs")
        .eq("is_active", true)
        .eq("track_inventory", true)
        .lt("inventory_count", 5)
        .order("inventory_count", { ascending: true });

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ac-ink-3)", marginBottom: 8 }}>
                        <Link href="/catalog/products" className="ac-text-link">Products</Link>
                        <span>/</span>
                        <span style={{ color: "var(--ac-ink)" }}>Low Stock</span>
                    </div>
                    <h1 className="ac-page-h1">Low Stock</h1>
                    <p className="ac-page-sub">
                        {products?.length ?? 0} product{products?.length !== 1 ? "s" : ""} with fewer than 5 units remaining.
                    </p>
                </div>
                <Link href="/catalog/products" className="ac-btn ac-btn-ghost">← All Products</Link>
            </div>

            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th className="r">Price</th>
                                <th className="r">Stock</th>
                                <th style={{ width: 40 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {!products || products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="ac-table-empty">All products are sufficiently stocked.</td>
                                </tr>
                            ) : (
                                products.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <div style={{ width: 44, height: 44, background: "var(--ac-panel-2)", borderRadius: "var(--r-sm)", overflow: "hidden", flexShrink: 0, border: "1px solid var(--ac-line)" }}>
                                                    {p.image_urls?.[0] ? (
                                                        <img src={p.image_urls[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    ) : null}
                                                </div>
                                                <span style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>{p.category_type || "—"}</td>
                                        <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>GH₵ {Number(p.price_ghs).toFixed(2)}</td>
                                        <td className="r">
                                            {p.inventory_count === 0 ? (
                                                <span className="ac-badge ac-badge-danger">Out of stock</span>
                                            ) : (
                                                <span className="ac-badge ac-badge-warn">{p.inventory_count} remaining</span>
                                            )}
                                        </td>
                                        <td>
                                            <Link
                                                href={`/catalog/products/${p.id}/edit`}
                                                className="ac-btn ac-btn-ghost ac-btn-sm"
                                                style={{ padding: "4px 8px" }}
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
