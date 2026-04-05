"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, ChevronDown } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ItemRow = {
    name: string;
    productId: string;
    units: number;
    revenue: number;
};

export type VariantRow = {
    name: string;
    productId: string;
    size: string;
    color: string;
    units: number;
    revenue: number;
};

export type SourceRow = {
    source: string;
    orders: number;
    revenue: number;
};

export type DiscountOrderDetail = {
    orderId: string;
    reference: string | null;
    customer: string;
    amount: number;
    date: string;
};

export type DiscountRow = {
    code: string;
    name: string;
    type: string;
    uses: number;
    savings: number;
    revenue: number;
    orders: DiscountOrderDetail[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function exportToCSV(data: Record<string, unknown>[], filename: string) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(h => {
            const val = row[h] ?? "";
            return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val);
        }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function CollapsibleTable({
    label,
    rowCount,
    onExport,
    exportDisabled,
    defaultOpen = true,
    children,
}: {
    label: string;
    rowCount: number;
    onExport: () => void;
    exportDisabled: boolean;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div
                className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 cursor-pointer select-none hover:bg-neutral-50 transition-colors"
                onClick={() => setOpen(o => !o)}
            >
                <div className="flex items-center gap-3">
                    <ChevronDown
                        size={14}
                        className={`text-neutral-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
                    />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{label}</h3>
                    {rowCount > 0 && (
                        <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-medium">
                            {rowCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={e => { e.stopPropagation(); onExport(); }}
                    disabled={exportDisabled}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-semibold border border-neutral-200 text-neutral-500 hover:text-black hover:border-black rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Download size={12} />
                    Export CSV
                </button>
            </div>
            {open && children}
        </div>
    );
}

// ─── Report Tables ────────────────────────────────────────────────────────────

export function SalesByItemTable({ items, dateLabel }: { items: ItemRow[]; dateLabel: string }) {
    return (
        <CollapsibleTable
            label="Sales by Item"
            rowCount={items.length}
            defaultOpen={false}
            onExport={() => exportToCSV(
                items.map(i => ({ Product: i.name, "Product ID": i.productId, "Units Sold": i.units, "Revenue (GH₵)": i.revenue.toFixed(2) })),
                `sales-by-item_${dateLabel}.csv`
            )}
            exportDisabled={items.length === 0}
        >
            {items.length === 0 ? (
                <p className="px-6 py-10 text-neutral-400 italic font-serif text-sm text-center">No sales data for this period.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Product</th>
                            <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Units Sold</th>
                            <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {items.map((row, i) => (
                            <tr key={row.productId + i} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-3.5 font-medium text-neutral-800">{row.name}</td>
                                <td className="px-4 py-3.5 text-right text-neutral-600">{row.units}</td>
                                <td className="px-6 py-3.5 text-right font-semibold text-neutral-900">GH₵ {row.revenue.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-neutral-200 bg-neutral-50">
                        <tr>
                            <td className="px-6 py-3 text-xs font-semibold text-neutral-500">Total</td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-neutral-700">
                                {items.reduce((s, r) => s + r.units, 0)}
                            </td>
                            <td className="px-6 py-3 text-right text-xs font-semibold text-neutral-900">
                                GH₵ {items.reduce((s, r) => s + r.revenue, 0).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            )}
        </CollapsibleTable>
    );
}

export function SalesByVariantTable({ variants, dateLabel }: { variants: VariantRow[]; dateLabel: string }) {
    return (
        <CollapsibleTable
            label="Sales by Variant"
            rowCount={variants.length}
            defaultOpen={false}
            onExport={() => exportToCSV(
                variants.map(v => ({
                    Product: v.name,
                    Size: v.size || "—",
                    Color: v.color || "—",
                    "Units Sold": v.units,
                    "Revenue (GH₵)": v.revenue.toFixed(2),
                })),
                `sales-by-variant_${dateLabel}.csv`
            )}
            exportDisabled={variants.length === 0}
        >
            {variants.length === 0 ? (
                <p className="px-6 py-10 text-neutral-400 italic font-serif text-sm text-center">No variant data for this period.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Product</th>
                            <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Size</th>
                            <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Color</th>
                            <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Units</th>
                            <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {variants.map((row, i) => (
                            <tr key={`${row.productId}-${row.size}-${row.color}-${i}`} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-3.5 font-medium text-neutral-800">{row.name}</td>
                                <td className="px-4 py-3.5 text-neutral-500 text-xs">{row.size || "—"}</td>
                                <td className="px-4 py-3.5 text-neutral-500 text-xs">{row.color || "—"}</td>
                                <td className="px-4 py-3.5 text-right text-neutral-600">{row.units}</td>
                                <td className="px-6 py-3.5 text-right font-semibold text-neutral-900">GH₵ {row.revenue.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-neutral-200 bg-neutral-50">
                        <tr>
                            <td colSpan={3} className="px-6 py-3 text-xs font-semibold text-neutral-500">Total</td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-neutral-700">
                                {variants.reduce((s, r) => s + r.units, 0)}
                            </td>
                            <td className="px-6 py-3 text-right text-xs font-semibold text-neutral-900">
                                GH₵ {variants.reduce((s, r) => s + r.revenue, 0).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            )}
        </CollapsibleTable>
    );
}

export function SalesBySourceTable({ rows, dateLabel }: { rows: SourceRow[]; dateLabel: string }) {
    const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

    return (
        <CollapsibleTable
            label="Sales by Channel"
            rowCount={rows.length}
            defaultOpen={false}
            onExport={() => exportToCSV(
                rows.map(r => ({
                    Channel: r.source === "pos" ? "Point of Sale" : "Online Store",
                    Orders: r.orders,
                    "Revenue (GH₵)": r.revenue.toFixed(2),
                })),
                `sales-by-channel_${dateLabel}.csv`
            )}
            exportDisabled={rows.length === 0}
        >
            {rows.length === 0 ? (
                <p className="px-6 py-10 text-neutral-400 italic font-serif text-sm text-center">No channel data for this period.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Channel</th>
                            <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Orders</th>
                            <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Share</th>
                            <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {rows.map(row => (
                            <tr key={row.source} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-3.5 font-medium text-neutral-800">
                                    {row.source === "pos" ? "Point of Sale" : "Online Store"}
                                </td>
                                <td className="px-4 py-3.5 text-right text-neutral-600">{row.orders}</td>
                                <td className="px-4 py-3.5 text-right text-neutral-500">
                                    {totalOrders > 0 ? `${Math.round((row.orders / totalOrders) * 100)}%` : "—"}
                                </td>
                                <td className="px-6 py-3.5 text-right font-semibold text-neutral-900">GH₵ {row.revenue.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-neutral-200 bg-neutral-50">
                        <tr>
                            <td className="px-6 py-3 text-xs font-semibold text-neutral-500">Total</td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-neutral-700">{totalOrders}</td>
                            <td className="px-4 py-3 text-right text-xs text-neutral-400">100%</td>
                            <td className="px-6 py-3 text-right text-xs font-semibold text-neutral-900">GH₵ {totalRevenue.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            )}
        </CollapsibleTable>
    );
}

function DiscountCodeRow({ row }: { row: DiscountRow }) {
    const [open, setOpen] = useState(false);
    const typeLabel = row.type === "automatic" ? "Auto" : "Coupon";
    const typeBg = row.type === "automatic" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700";

    return (
        <>
            <tr
                className="hover:bg-neutral-50 transition-colors cursor-pointer"
                onClick={() => setOpen(o => !o)}
            >
                <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                        <ChevronDown
                            size={13}
                            className={`text-neutral-400 flex-shrink-0 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
                        />
                        <div>
                            {row.name !== row.code && (
                                <div className="font-medium text-neutral-800 text-xs mb-0.5">{row.name}</div>
                            )}
                            <div className="font-mono text-xs text-neutral-500 uppercase">{row.code}</div>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3.5">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-widest ${typeBg}`}>
                        {typeLabel}
                    </span>
                </td>
                <td className="px-4 py-3.5 text-right text-neutral-600">{row.uses}</td>
                <td className="px-4 py-3.5 text-right text-rose-600 font-medium">−GH₵ {row.savings.toFixed(2)}</td>
                <td className="px-6 py-3.5 text-right font-semibold text-neutral-900">GH₵ {row.revenue.toFixed(2)}</td>
            </tr>
            {open && row.orders.length > 0 && (
                <tr>
                    <td colSpan={5} className="px-0 py-0 bg-neutral-50 border-t border-neutral-100">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-neutral-200">
                                    <th className="px-10 py-2 text-left text-[9px] uppercase tracking-widest font-semibold text-neutral-400">Order Ref</th>
                                    <th className="px-4 py-2 text-left text-[9px] uppercase tracking-widest font-semibold text-neutral-400">Customer</th>
                                    <th className="px-4 py-2 text-right text-[9px] uppercase tracking-widest font-semibold text-neutral-400">Amount</th>
                                    <th className="px-6 py-2 text-right text-[9px] uppercase tracking-widest font-semibold text-neutral-400">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {row.orders.map((o) => (
                                    <tr key={o.orderId} className="hover:bg-neutral-100 transition-colors">
                                        <td className="px-10 py-2 font-mono">
                                            <Link
                                                href={`/sales/orders/${o.orderId}`}
                                                className="text-neutral-700 hover:text-black hover:underline underline-offset-2 transition-colors"
                                            >
                                                {o.orderId.substring(0, 8)}…
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2 text-neutral-600 truncate max-w-[180px]">{o.customer}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-neutral-700">GH₵ {o.amount.toFixed(2)}</td>
                                        <td className="px-6 py-2 text-right text-neutral-400">{o.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </td>
                </tr>
            )}
        </>
    );
}

export function DiscountPerformanceTable({ rows, dateLabel }: { rows: DiscountRow[]; dateLabel: string }) {
    return (
        <CollapsibleTable
            label="Discount / Promo Performance"
            rowCount={rows.length}
            defaultOpen={false}
            onExport={() => exportToCSV(
                rows.flatMap(r => r.orders.map(o => ({
                    "Discount Code": r.code,
                    "Discount Name": r.name,
                    Type: r.type,
                    "Order Ref": o.reference || o.orderId,
                    Customer: o.customer,
                    "Order Amount (GH₵)": o.amount.toFixed(2),
                    "Savings (GH₵)": (r.savings / r.uses).toFixed(2),
                    Date: o.date,
                }))),
                `discount-performance_${dateLabel}.csv`
            )}
            exportDisabled={rows.length === 0}
        >
            {rows.length === 0 ? (
                <p className="px-6 py-10 text-neutral-400 italic font-serif text-sm text-center">
                    No discount codes used in this period.
                </p>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Code / Name</th>
                            <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Type</th>
                            <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Uses</th>
                            <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Savings Given</th>
                            <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {rows.map((row) => (
                            <DiscountCodeRow key={row.code} row={row} />
                        ))}
                    </tbody>
                    <tfoot className="border-t border-neutral-200 bg-neutral-50">
                        <tr>
                            <td colSpan={2} className="px-6 py-3 text-xs font-semibold text-neutral-500">Total</td>
                            <td className="px-4 py-3 text-right text-xs font-semibold text-neutral-700">
                                {rows.reduce((s, r) => s + r.uses, 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-medium text-rose-600">
                                −GH₵ {rows.reduce((s, r) => s + r.savings, 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-3 text-right text-xs font-semibold text-neutral-900">
                                GH₵ {rows.reduce((s, r) => s + r.revenue, 0).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            )}
        </CollapsibleTable>
    );
}
