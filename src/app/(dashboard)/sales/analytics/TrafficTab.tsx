"use client";

import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    LineChart, Line,
} from "recharts";

const TOOLTIP_STYLE = {
    contentStyle: {
        fontSize: 11,
        borderRadius: 8,
        border: "1px solid #e5e5e5",
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    },
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6">{title}</h2>
            {children}
        </div>
    );
}

function EmptyChart({ message }: { message: string }) {
    return <p className="text-neutral-400 italic text-sm font-serif py-8 text-center">{message}</p>;
}

export type HourlyPoint = { hour: string; value: number };
export type WeekdayPoint = { day: string; value: number };
export type SourceRow = { source: string; orders: number; revenue: number };
export type RegionRow = { region: string; orders: number };
export type DemandSignals = {
    newsletterSignups: number;
    customRequests: number;
    uniqueCustomers: number;
    repeatBuyers: number;
};
export type NewCustomerPoint = { date: string; value: number };

interface TrafficTabProps {
    loading: boolean;
    hourlyOrders: HourlyPoint[];
    weekdayOrders: WeekdayPoint[];
    sourceRows: SourceRow[];
    regionRows: RegionRow[];
    newCustomers: NewCustomerPoint[];
    demandSignals: DemandSignals;
}

export function TrafficTab({
    loading,
    hourlyOrders,
    weekdayOrders,
    sourceRows,
    regionRows,
    newCustomers,
    demandSignals,
}: TrafficTabProps) {
    const pulse = "h-[220px] bg-neutral-50 rounded-xl animate-pulse";

    const totalOrders = sourceRows.reduce((s, r) => s + r.orders, 0);
    const totalRevenue = sourceRows.reduce((s, r) => s + r.revenue, 0);

    return (
        <div className="space-y-6">
            {/* Note */}
            <div className="bg-neutral-50 rounded-xl px-5 py-3 flex items-start gap-3">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mt-0.5 flex-shrink-0">Note</span>
                <p className="text-xs text-neutral-500">
                    Demand intelligence derived from order data. For page-view traffic (visitors, bounce rate, referrers), check Vercel Analytics in your deployment dashboard.
                </p>
            </div>

            {/* Row 1: Peak Hours + Peak Days */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Peak Ordering Hours">
                    {loading ? <div className={pulse} /> : hourlyOrders.length === 0
                        ? <EmptyChart message="No orders in this period." />
                        : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={hourlyOrders} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#a3a3a3" }} axisLine={false} tickLine={false} interval={2} />
                                    <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [Number(v), "Orders"]} labelFormatter={(l) => `${l}:00`} />
                                    <Bar dataKey="value" fill="#1a1a1a" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                </SectionCard>

                <SectionCard title="Peak Ordering Days">
                    {loading ? <div className={pulse} /> : weekdayOrders.length === 0
                        ? <EmptyChart message="No orders in this period." />
                        : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={weekdayOrders} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [Number(v), "Orders"]} />
                                    <Bar dataKey="value" fill="#525252" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                </SectionCard>
            </div>

            {/* Row 2: New Customer Acquisition */}
            <SectionCard title="New Customer Acquisition">
                {loading ? <div className={pulse} /> : newCustomers.length === 0
                    ? <EmptyChart message="No customer data for this period." />
                    : (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={newCustomers} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [Number(v), "New Customers"]} />
                                <Line type="monotone" dataKey="value" stroke="#1a1a1a" strokeWidth={2}
                                    dot={{ r: 3, fill: "#1a1a1a", strokeWidth: 0 }}
                                    activeDot={{ r: 5, fill: "#1a1a1a" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
            </SectionCard>

            {/* Row 3: Channel Split + Geographic */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Sales Channel Split">
                    {loading ? <div className="h-24 bg-neutral-50 rounded-xl animate-pulse" /> : (
                        <div className="space-y-4">
                            {sourceRows.length === 0 ? (
                                <EmptyChart message="No order source data available." />
                            ) : sourceRows.map(r => {
                                const pct = totalOrders > 0 ? Math.round((r.orders / totalOrders) * 100) : 0;
                                const label = r.source === "pos" ? "Point of Sale" : "Online Store";
                                return (
                                    <div key={r.source}>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="font-medium text-neutral-700">{label}</span>
                                            <span className="text-neutral-500">
                                                {r.orders} orders ·{" "}
                                                <span className="font-semibold text-neutral-800">
                                                    GH₵ {r.revenue.toFixed(0)}
                                                </span>
                                                <span className="ml-2 text-neutral-400">{pct}%</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-neutral-100 rounded-full h-2.5">
                                            <div className="h-2.5 rounded-full bg-neutral-800 transition-all duration-500"
                                                style={{ width: `${Math.max(pct, 2)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                            {totalRevenue > 0 && (
                                <div className="pt-3 border-t border-neutral-100 flex justify-between text-xs">
                                    <span className="text-neutral-500">Total</span>
                                    <span className="font-semibold text-neutral-800">GH₵ {totalRevenue.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Top Regions">
                    {loading ? <div className="h-24 bg-neutral-50 rounded-xl animate-pulse" /> : (
                        regionRows.length === 0
                            ? <EmptyChart message="No location data available — add region to checkout." />
                            : (
                                <div className="space-y-3">
                                    {regionRows.slice(0, 8).map((r, i) => {
                                        const maxOrders = regionRows[0]?.orders ?? 1;
                                        const pct = Math.round((r.orders / maxOrders) * 100);
                                        return (
                                            <div key={r.region + i}>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-neutral-700 truncate max-w-[60%]">{r.region}</span>
                                                    <span className="text-neutral-500 font-semibold">{r.orders}</span>
                                                </div>
                                                <div className="w-full bg-neutral-100 rounded-full h-1.5">
                                                    <div className="h-1.5 rounded-full bg-neutral-600 transition-all duration-500"
                                                        style={{ width: `${Math.max(pct, 2)}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                    )}
                </SectionCard>
            </div>

            {/* Row 4: Demand Signals */}
            <SectionCard title="Demand Signals">
                {loading ? <div className="h-20 bg-neutral-50 rounded-xl animate-pulse" /> : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Unique Customers", value: demandSignals.uniqueCustomers },
                            { label: "Repeat Buyers", value: demandSignals.repeatBuyers },
                            { label: "Newsletter Signups", value: demandSignals.newsletterSignups },
                            { label: "Bespoke Inquiries", value: demandSignals.customRequests },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-neutral-50 rounded-xl p-4">
                                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-2">{label}</span>
                                <span className="text-2xl font-serif text-neutral-900">{value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
