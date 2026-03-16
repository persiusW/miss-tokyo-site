"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
    const supabase = createClient();
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch orders for revenue over time
                const { data: orders } = await supabase
                    .from("orders")
                    .select("created_at, total_amount")
                    .eq("status", "paid")
                    .order("created_at", { ascending: true });

                if (orders) {
                    const grouped = orders.reduce((acc: any, order) => {
                        const date = new Date(order.created_at).toLocaleDateString();
                        acc[date] = (acc[date] || 0) + order.total_amount;
                        return acc;
                    }, {});

                    setRevenueData(Object.entries(grouped).map(([date, revenue]) => ({ date, revenue })));
                }

                // Fetch sales by category (simplified mock for now until we have proper joins)
                const { data: categories } = await supabase.from("categories").select("name");
                if (categories) {
                    setCategoryData(categories.map(c => ({
                        name: c.name,
                        value: Math.floor(Math.random() * 100) + 20 // Simulated data
                    })));
                }
            } catch (err) {
                console.error("Analytics fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [supabase]);

    if (loading) return (
        <div className="p-8 space-y-12">
            <div className="h-8 w-48 bg-gray-100 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-64 bg-gray-50 animate-pulse" />
                <div className="h-64 bg-gray-50 animate-pulse" />
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12">
            <Link href="/admin" className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-8 group">
                <ChevronLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Back to Overview
            </Link>

            <header>
                <h1 className="text-3xl font-bold text-black" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Analytics</h1>
                <p className="text-xs text-gray-400 mt-2 font-mono uppercase tracking-widest italic">Performance Metrics — Monochromatic Audit v1.0</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Revenue Over Time */}
                <div className="bg-white border border-gray-100 p-8 space-y-6">
                    <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-black border-b border-gray-50 pb-4">Revenue Over Time (GHS)</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="date" 
                                    hide 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#999' }} 
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: 0, border: '1px solid #000', fontSize: '10px', textTransform: 'uppercase' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#000" 
                                    strokeWidth={2} 
                                    dot={false}
                                    activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales by Category */}
                <div className="bg-white border border-gray-100 p-8 space-y-6">
                    <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-black border-b border-gray-50 pb-4">Sales by Category</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#000" : "#ddd"} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: 0, border: '1px solid #000', fontSize: '10px', textTransform: 'uppercase' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    align="center"
                                    iconType="rect"
                                    formatter={(value) => <span className="text-[10px] uppercase tracking-widest font-bold text-black">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
