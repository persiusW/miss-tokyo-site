"use client";

import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export type DailyPoint = { date: string; value: number };

export type TopItem = {
    name: string;
    units: number;
    revenue: number;
};

const CHART_TOOLTIP_STYLE = {
    contentStyle: {
        fontSize: 11,
        borderRadius: 8,
        border: "1px solid #e5e5e5",
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    },
};

function EmptyState({ message }: { message: string }) {
    return <p className="text-neutral-400 italic text-sm font-serif py-8 text-center">{message}</p>;
}

export function RevenueLineChart({ data }: { data: DailyPoint[] }) {
    if (data.length === 0) return <EmptyState message="No revenue data for this period." />;
    return (
        <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `₵${(v / 1000).toFixed(1)}k` : `₵${v}`}
                />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v) => [`GH₵ ${Number(v).toFixed(2)}`, "Revenue"]} />
                <Line type="monotone" dataKey="value" stroke="#1a1a1a" strokeWidth={2}
                    dot={{ r: 3, fill: "#1a1a1a", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#1a1a1a" }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

export function OrdersBarChart({ data }: { data: DailyPoint[] }) {
    if (data.length === 0) return <EmptyState message="No order data for this period." />;
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v) => [Number(v), "Orders"]} />
                <Bar dataKey="value" fill="#1a1a1a" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function TopItemsList({ items }: { items: TopItem[] }) {
    if (items.length === 0) return <EmptyState message="No sales data for this period." />;
    const maxRev = Math.max(...items.map(i => i.revenue), 1);
    return (
        <div className="space-y-4">
            {items.map((item, idx) => {
                const pct = Math.round((item.revenue / maxRev) * 100);
                return (
                    <div key={item.name + idx}>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-neutral-700 truncate max-w-[55%] font-medium">{item.name}</span>
                            <span className="text-neutral-500 flex-shrink-0">
                                {item.units} units ·{" "}
                                <span className="font-semibold text-neutral-800">GH₵ {item.revenue.toFixed(0)}</span>
                            </span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-2 rounded-full bg-neutral-800 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
