import Link from "next/link";
import { fetchOrderStats, fetchRecentActivity } from "@/lib/utils/metrics";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminOverview() {
  const supabase = await createClient();

  const [stats, recentActivity, productsCountRes] = await Promise.all([
    fetchOrderStats(supabase),
    fetchRecentActivity(5, supabase),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const activeProductCount = productsCountRes.count;

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900" 
          style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>
          Overview
        </h1>
        <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>
          Dashboard summary — Last updated {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Total Revenue" 
          value={`GH₵ ${stats.totalRevenue.toLocaleString()}`} 
          sub="LIFETIME CONFIRMED SALES" 
        />
        <StatCard 
          label="Orders Today" 
          value={String(stats.revenueOrderCount)} 
          sub="PAID ORDERS" 
        />
        <StatCard 
          label="Pending Orders" 
          value={String(stats.pendingCount + stats.processingCount)} 
          sub="AWAITING FULFILLMENT" 
          highlight={stats.pendingCount + stats.processingCount > 0}
        />
        <StatCard 
          label="Active Products" 
          value={String(activeProductCount ?? 0)} 
          sub="VISIBLE IN STORE" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-[11px] uppercase tracking-widest font-semibold text-black"
              style={{ fontFamily: "Arial, sans-serif" }}>
              Recent Activity
            </h2>
            <Link href="/admin/orders" className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
               style={{ fontFamily: "Arial, sans-serif" }}>
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Order/Request", "Customer", "Status", "Total"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[9px] uppercase tracking-[0.1em] text-gray-400 font-medium"
                      style={{ fontFamily: "Arial, sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentActivity.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-[11px] text-gray-500 font-mono">
                      {activity.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>{activity.label}</p>
                      <p className="text-[9px] text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${getStatusColor(activity.status)}`}
                        style={{ fontFamily: "Arial, sans-serif" }}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-medium text-gray-900"
                      style={{ fontFamily: "Arial, sans-serif" }}>
                      {activity.sub}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links / Actions */}
        <div className="space-y-4">
          <div className="bg-black text-white p-6">
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold mb-4"
              style={{ fontFamily: "Arial, sans-serif" }}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              <ActionButton label="Add New Product" href="/admin/products/new" />
              <ActionButton label="Manage Discounts" href="/admin/discounts" />
              <ActionButton label="Store Settings" href="/admin/settings" />
              <ActionButton label="View Analytics" href="/admin/analytics" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlight = false }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2"
        style={{ fontFamily: "Arial, sans-serif" }}>{label}</p>
      <p className={`text-2xl font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}
        style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-gray-300 mt-2"
        style={{ fontFamily: "Arial, sans-serif" }}>{sub}</p>
    </div>
  );
}

function ActionButton({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="block w-full text-left px-4 py-3 border border-gray-800 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all"
      style={{ fontFamily: "Arial, sans-serif" }}>
      {label}
    </Link>
  );
}

function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (["paid", "fulfilled", "delivered"].includes(s)) return "bg-green-50 text-green-700";
  if (["processing", "shipped"].includes(s)) return "bg-blue-50 text-blue-700";
  if (["pending", "inquiry"].includes(s)) return "bg-amber-50 text-amber-700";
  if (["cancelled", "unpaid", "refunded"].includes(s)) return "bg-red-50 text-red-600";
  return "bg-gray-100 text-gray-600";
}
