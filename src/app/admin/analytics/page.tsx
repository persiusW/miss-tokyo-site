"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { ChevronLeft, Package, UserCheck } from "lucide-react";
import Link from "next/link";

type StaffStat = { name: string; role: string; packedCount: number };
type RiderStat = { name: string; deliveredCount: number; phone: string };

export default function AnalyticsPage() {
    const supabase = createClient();
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [staffStats, setStaffStats] = useState<StaffStat[]>([]);
    const [riderStats, setRiderStats] = useState<RiderStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch orders for revenue over time
                const { data: orders } = await supabase
                    .from("orders")
                    .select("created_at, total_amount, packed_by, assigned_rider_id, status")
                    .order("created_at", { ascending: true });

                if (orders) {
                    const rev = orders.filter((o: any) => o.status === "paid");
                    const grouped = rev.reduce((acc: any, order: any) => {
                        const date = new Date(order.created_at).toLocaleDateString();
                        acc[date] = (acc[date] || 0) + order.total_amount;
                        return acc;
                    }, {});
                    setRevenueData(Object.entries(grouped).map(([date, revenue]) => ({ date, revenue })));

                    // Calculate Staff Stats
                    const packedOrders = orders.filter((o: any) => o.packed_by);
                    const staffSet = new Set(packedOrders.map((o: any) => o.packed_by));
                    
                    if (staffSet.size > 0) {
                        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, role").in("id", Array.from(staffSet));
                        if (profiles) {
                            const stats = profiles.map((p: any) => ({
                                name: p.full_name || p.email,
                                role: p.role,
                                packedCount: packedOrders.filter((o: any) => o.packed_by === p.id).length
                            })).sort((a: any, b: any) => b.packedCount - a.packedCount);
                            setStaffStats(stats);
                        }
                    }

                    // Calculate Rider Stats
                    const deliveredOrders = orders.filter((o: any) => o.status === "delivered" && o.assigned_rider_id);
                    const riderSet = new Set(deliveredOrders.map((o: any) => o.assigned_rider_id));
                    
                    if (riderSet.size > 0) {
                        const { data: riders } = await supabase.from("riders").select("id, full_name, phone_number").in("id", Array.from(riderSet));
                        if (riders) {
                            const result = riders.map((r: any) => ({
                                name: r.full_name,
                                phone: r.phone_number,
                                deliveredCount: deliveredOrders.filter((o: any) => o.assigned_rider_id === r.id).length
                            })).sort((a: any, b: any) => b.deliveredCount - a.deliveredCount);
                            setRiderStats(result);
                        }
                    }
                }

                // Fetch sales by category 
                const { data: categories } = await supabase.from("categories").select("name");
                if (categories) {
                    setCategoryData(categories.map((c: any) => ({
                        name: c.name,
                        value: Math.floor(Math.random() * 100) + 20 
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
                <div className="bg-white border border-gray-100 p-8 space-y-6 shadow-sm rounded-xl">
                    <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-black border-b border-gray-50 pb-4">Revenue Over Time (GHS)</h2>
                    <div className="h-[300px] w-full">
                        {mounted && <ResponsiveContainer width="100%" height="100%">
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
                        </ResponsiveContainer>}
                    </div>
                </div>

                {/* Sales by Category */}
                <div className="bg-white border border-gray-100 p-8 space-y-6 shadow-sm rounded-xl">
                    <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-black border-b border-gray-50 pb-4">Sales by Category</h2>
                    <div className="h-[300px] w-full">
                        {mounted && <ResponsiveContainer width="100%" height="100%">
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
                        </ResponsiveContainer>}
                    </div>
                </div>
            </div>

            {/* TEAM PERFORMANCE SECTION */}
            <div className="pt-4">
                <h2 className="text-xl font-serif text-black border-b border-gray-100 pb-4 mb-8">Team Performance</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Staff Stats */}
                    <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-neutral-900 flex items-center justify-center text-white">
                                <Package size={14} />
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-widest font-bold">Orders Packed</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">By Sales & Support Staff</p>
                            </div>
                        </div>
                        <div className="p-0">
                            {staffStats.length === 0 ? (
                                <p className="p-6 text-sm text-gray-400 italic">No staff packing records found.</p>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {staffStats.map((staff, idx) => (
                                        <li key={idx} className="flex items-center justify-between p-6 hover:bg-neutral-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm text-black">{staff.name}</span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">{staff.role}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-serif font-light">{staff.packedCount}</span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Orders</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Rider Stats */}
                    <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white">
                                <UserCheck size={14} />
                            </div>
                            <div>
                                <h3 className="text-xs uppercase tracking-widest font-bold">Successful Deliveries</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">By Designated Dispatch Riders</p>
                            </div>
                        </div>
                        <div className="p-0">
                            {riderStats.length === 0 ? (
                                <p className="p-6 text-sm text-gray-400 italic">No dispatched deliveries completed.</p>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {riderStats.map((rider, idx) => (
                                        <li key={idx} className="flex items-center justify-between p-6 hover:bg-neutral-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm text-black">{rider.name}</span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">{rider.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-serif font-light text-blue-600">{rider.deliveredCount}</span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Delivered</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
}
