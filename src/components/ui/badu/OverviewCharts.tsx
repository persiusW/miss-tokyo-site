"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const DONUT_COLORS = ["#1a1a1a", "#525252", "#737373", "#a3a3a3", "#c5c5c5", "#e5e5e5"];

type CategoryEntry = [string, number];
type FunnelStep = { label: string; value: number; h: number };

function CustomLegend({ payload }: { payload?: any[] }) {
    if (!payload) return null;
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
            {payload.map((entry: any, i: number) => (
                <span key={i} className="flex items-center gap-1.5 text-[10px] text-neutral-500 capitalize">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}
                </span>
            ))}
        </div>
    );
}

export function CategoryDonutChart({
    categoryEntries,
    totalProducts,
}: {
    categoryEntries: CategoryEntry[];
    totalProducts: number;
}) {
    const data = categoryEntries.map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
    }));

    if (data.length === 0) {
        return <p className="text-neutral-400 italic text-sm font-serif">No active products yet.</p>;
    }

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={100}
                        dataKey="value"
                        paddingAngle={2}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            fontSize: 11,
                            borderRadius: 8,
                            border: "1px solid #e5e5e5",
                            background: "#fff",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                        formatter={(value, name) => [`${value} product${Number(value) !== 1 ? "s" : ""}`, String(name)]}
                    />
                    <Legend content={<CustomLegend />} />
                </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: 0, bottom: 32 }}>
                <span className="text-2xl font-serif text-neutral-900">{totalProducts}</span>
                <span className="text-[9px] uppercase tracking-widest text-neutral-400 mt-0.5">Products</span>
            </div>
        </div>
    );
}

export function ConversionFunnelChart({
    funnelSteps,
    conversionRate,
}: {
    funnelSteps: FunnelStep[];
    conversionRate: string | number;
}) {
    if (!funnelSteps[0] || funnelSteps[0].value === 0) {
        return (
            <p className="text-neutral-400 italic text-sm font-serif">
                No activity yet. Funnel will populate as orders come in.
            </p>
        );
    }

    const stepStyles = [
        { bar: "#e5e5e5", text: "text-neutral-500" },
        { bar: "#737373", text: "text-neutral-600" },
        { bar: "#1a1a1a", text: "text-neutral-900" },
    ];

    return (
        <div className="space-y-4">
            {funnelSteps.map((step, i) => (
                <div key={step.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className={`capitalize font-medium ${stepStyles[i]?.text ?? "text-neutral-700"}`}>
                            {step.label}
                        </span>
                        <span className="font-semibold text-neutral-800">{step.value}</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
                        <div
                            className="h-3 rounded-full transition-all duration-700"
                            style={{
                                width: `${Math.max(step.h, 2)}%`,
                                backgroundColor: stepStyles[i]?.bar ?? "#000",
                            }}
                        />
                    </div>
                </div>
            ))}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs text-neutral-500">Order-to-Fulfillment Rate</span>
                <span className="text-sm font-semibold text-neutral-900">{conversionRate}%</span>
            </div>
        </div>
    );
}
