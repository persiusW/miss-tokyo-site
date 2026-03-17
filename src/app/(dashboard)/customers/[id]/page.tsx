import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Order = {
    id: string;
    total_amount: number;
    status: string;
    created_at: string;
    items: any[];
    discount_code: string | null;
    discount_amount: number;
};

type ContactInquiry = {
    id: string;
    message: string;
    created_at: string;
};

type Document = {
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
    paid: "bg-green-50 text-green-700",
    pending: "bg-amber-50 text-amber-700",
    cancelled: "bg-red-50 text-red-700",
    shipped: "bg-blue-50 text-blue-700",
    fulfilled: "bg-purple-50 text-purple-700",
    draft: "bg-neutral-100 text-neutral-600",
    sent: "bg-blue-50 text-blue-700",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const email = decodeURIComponent(id);

    if (!email || !email.includes("@")) notFound();

    const [ordersRes, inquiriesRes, documentsRes, profileRes] = await Promise.all([
        supabaseAdmin
            .from("orders")
            .select("id, total_amount, status, created_at, items, discount_code, discount_amount")
            .eq("customer_email", email)
            .order("created_at", { ascending: false }),
        supabaseAdmin
            .from("contact_inquiries")
            .select("id, message, created_at")
            .eq("email", email)
            .order("created_at", { ascending: false }),
        supabaseAdmin
            .from("documents")
            .select("id, type, amount, status, created_at")
            .eq("customer_email", email)
            .order("created_at", { ascending: false }),
        supabaseAdmin
            .from("orders")
            .select("customer_name, customer_phone, shipping_address, customer_metadata")
            .eq("customer_email", email)
            .order("created_at", { ascending: false })
            .limit(1)
            .single(),
    ]);

    const orders: Order[] = ordersRes.data || [];
    const inquiries: ContactInquiry[] = inquiriesRes.data || [];
    const documents: Document[] = documentsRes.data || [];
    const profile = profileRes.data;

    const displayName = profile?.customer_name || null;
    const phone = profile?.customer_phone || null;
    const address = (profile?.shipping_address as any)?.text || null;
    const totalSpend = orders
        .filter(o => o.status === "paid" || o.status === "fulfilled" || o.status === "shipped")
        .reduce((sum, o) => sum + Number(o.total_amount), 0);

    return (
        <div className="space-y-10 max-w-5xl">
            {/* Header */}
            <header className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link
                            href="/customers"
                            className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                        >
                            ← Contacts
                        </Link>
                    </div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase">
                        {displayName || email.split("@")[0]}
                    </h1>
                    <p className="text-neutral-500 text-sm mt-1">{email}</p>
                </div>
                {totalSpend > 0 && (
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Total Spent</p>
                        <p className="font-serif text-2xl">GH₵ {totalSpend.toFixed(2)}</p>
                    </div>
                )}
            </header>

            {/* Contact Info */}
            <div className="bg-white border border-neutral-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Email</p>
                    <p className="text-sm text-neutral-800">{email}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Phone</p>
                    <p className="text-sm text-neutral-800">{phone || <span className="text-neutral-300">—</span>}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Last Shipping Address</p>
                    <p className="text-sm text-neutral-800">{address || <span className="text-neutral-300">—</span>}</p>
                </div>
            </div>

            {/* Order History */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4">
                    Order History <span className="text-neutral-400 font-normal">({orders.length})</span>
                </h2>
                <div className="bg-white border border-neutral-200 overflow-x-auto">
                    {orders.length === 0 ? (
                        <p className="px-6 py-10 text-neutral-400 italic font-serif text-sm text-center">No orders found.</p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500">Order</th>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500">Items</th>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500 text-right">Total</th>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500">Status</th>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {orders.map(order => (
                                    <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/sales/orders/${order.id}`}
                                                className="font-mono text-xs text-neutral-600 hover:text-black hover:underline"
                                            >
                                                #{order.id.substring(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-500 text-xs">
                                            {Array.isArray(order.items) && order.items.length > 0
                                                ? `${order.items.length} item${order.items.length !== 1 ? "s" : ""}`
                                                : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            GH₵ {Number(order.total_amount).toFixed(2)}
                                            {order.discount_code && (
                                                <span className="block text-[10px] text-green-600 tracking-wide">
                                                    -{order.discount_code}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${STATUS_STYLES[order.status] || "bg-neutral-100 text-neutral-600"}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-400 text-xs text-right whitespace-nowrap">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* Contact Form History */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4">
                    Form Submissions <span className="text-neutral-400 font-normal">({inquiries.length})</span>
                </h2>
                <div className="bg-white border border-neutral-200">
                    {inquiries.length === 0 ? (
                        <p className="px-6 py-10 text-neutral-400 italic font-serif text-sm text-center">No form submissions found.</p>
                    ) : (
                        <div className="divide-y divide-neutral-100">
                            {inquiries.map(inq => (
                                <div key={inq.id} className="px-6 py-4">
                                    <p className="text-xs text-neutral-400 mb-1 uppercase tracking-widest">
                                        {new Date(inq.created_at).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm text-neutral-700 leading-relaxed">{inq.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Invoice History */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4">
                    Invoices <span className="text-neutral-400 font-normal">({documents.length})</span>
                </h2>
                <div className="bg-white border border-neutral-200 overflow-x-auto">
                    {documents.length === 0 ? (
                        <p className="px-6 py-10 text-neutral-400 italic font-serif text-sm text-center">No invoices found.</p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500">Invoice</th>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500">Type</th>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500 text-right">Amount</th>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500">Status</th>
                                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest text-neutral-500 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {documents.map(doc => (
                                    <tr key={doc.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/finance/invoices/${doc.id}`}
                                                className="font-mono text-xs text-neutral-600 hover:text-black hover:underline"
                                            >
                                                #{doc.id.substring(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-neutral-500 uppercase tracking-widest">{doc.type}</td>
                                        <td className="px-6 py-4 text-right font-medium">GH₵ {Number(doc.amount).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${STATUS_STYLES[doc.status] || "bg-neutral-100 text-neutral-600"}`}>
                                                {doc.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-400 text-xs text-right whitespace-nowrap">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    );
}
