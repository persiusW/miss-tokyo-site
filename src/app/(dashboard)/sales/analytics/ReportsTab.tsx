"use client";

import { Download } from "lucide-react";

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

function TableHeader({ label, onExport, disabled }: { label: string; onExport: () => void; disabled: boolean }) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{label}</h3>
            <button
                onClick={onExport}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-semibold border border-neutral-200 text-neutral-500 hover:text-black hover:border-black rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Download size={12} />
                Export CSV
            </button>
        </div>
    );
}

export function SalesByItemTable({ items, dateLabel }: { items: ItemRow[]; dateLabel: string }) {
    const handleExport = () => {
        exportToCSV(
            items.map(i => ({ Product: i.name, "Product ID": i.productId, "Units Sold": i.units, "Revenue (GH₵)": i.revenue.toFixed(2) })),
            `sales-by-item_${dateLabel}.csv`
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <TableHeader label="Sales by Item" onExport={handleExport} disabled={items.length === 0} />
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
        </div>
    );
}

export function SalesByVariantTable({ variants, dateLabel }: { variants: VariantRow[]; dateLabel: string }) {
    const handleExport = () => {
        exportToCSV(
            variants.map(v => ({
                Product: v.name,
                Size: v.size || "—",
                Color: v.color || "—",
                "Units Sold": v.units,
                "Revenue (GH₵)": v.revenue.toFixed(2),
            })),
            `sales-by-variant_${dateLabel}.csv`
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <TableHeader label="Sales by Variant" onExport={handleExport} disabled={variants.length === 0} />
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
        </div>
    );
}
