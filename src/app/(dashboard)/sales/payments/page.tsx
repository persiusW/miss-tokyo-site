import { supabase } from "@/lib/supabase";

export default async function PaymentsPage() {
    const { data: allOrders } = await supabase
        .from("orders")
        .select("id, customer_email, total_amount, paystack_reference, created_at, status, payment_status")
        .order("created_at", { ascending: false });

    const LEGACY_PAID = ["paid", "processing", "fulfilled", "delivered", "packed", "ready_for_pickup", "shipped"];
    const payments = (allOrders || []).filter((p: any) =>
        p.payment_status === "paid" || (!p.payment_status && LEGACY_PAID.includes(p.status ?? ""))
    );

    const total = payments.reduce((sum: number, p: any) => sum + Number(p.total_amount), 0);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const monthlyTotal = (payments || [])
        .filter((p: any) => new Date(p.created_at) >= thisMonth)
        .reduce((sum: number, p: any) => sum + Number(p.total_amount), 0);

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Payments</h1>
                <p className="text-neutral-500">Confirmed Paystack transactions.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Total Collected</span>
                    <span className="text-3xl font-serif">GH₵ {total.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">ALL TIME</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">This Month</span>
                    <span className="text-3xl font-serif">GH₵ {monthlyTotal.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">CURRENT PERIOD</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Transactions</span>
                    <span className="text-3xl font-serif">{payments?.length || 0}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">CONFIRMED PAYMENTS</span>
                </div>
            </div>

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Paystack Ref</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Customer</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Amount</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {(!payments || payments.length === 0) ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-16 text-center text-neutral-500 italic font-serif">
                                    No confirmed payments on record.
                                </td>
                            </tr>
                        ) : (
                            payments.map((p: any) => (
                                <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs text-neutral-600 bg-neutral-50 px-2 py-1 rounded">
                                            {p.paystack_reference || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a href={`mailto:${p.customer_email}`} className="text-neutral-700 hover:text-black hover:underline">
                                            {p.customer_email}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-green-700">
                                        GH₵ {Number(p.total_amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-neutral-500 text-xs">
                                        {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
