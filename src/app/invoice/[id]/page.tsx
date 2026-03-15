/**
 * Public read-only invoice page — no auth required.
 * Accessible at /invoice/[id] — share this URL with clients.
 */
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function PublicInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [{ data: doc }, { data: biz }] = await Promise.all([
        supabase.from("documents").select("*").eq("id", id).single(),
        supabase.from("business_settings").select("*").eq("id", "default").single(),
    ]);

    if (!doc || doc.type === "quotation") notFound();

    const lineItems: { description: string; qty: number; unit_price: number }[] = doc.line_items || [];
    const subtotal  = lineItems.reduce((s, l) => s + l.qty * l.unit_price, 0);
    const taxRate   = Number(doc.tax_rate || 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total     = subtotal + taxAmount;
    const docNumber = doc.id.substring(0, 8).toUpperCase();
    const issued    = new Date(doc.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const bizName   = biz?.business_name || "Miss Tokyo";

    return (
        <div className="min-h-screen bg-neutral-50 py-16 px-4 font-sans">
            <div className="bg-white border border-neutral-200 p-10 md:p-16 max-w-2xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        {biz?.logo_url && (
                            <img src={biz.logo_url} alt={bizName} className="h-12 w-12 object-cover mb-4" />
                        )}
                        <h1 className="font-serif text-2xl tracking-widest uppercase">{bizName}</h1>
                        {biz?.address && <p className="text-xs text-neutral-500 mt-2 whitespace-pre-line">{biz.address}</p>}
                        {biz?.email   && <p className="text-xs text-neutral-500">{biz.email}</p>}
                        {biz?.contact && <p className="text-xs text-neutral-500">{biz.contact}</p>}
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-1">Invoice</div>
                        <div className="font-mono text-2xl font-bold text-neutral-900">#{docNumber}</div>
                        <div className="text-xs text-neutral-500 mt-2">Issued: {issued}</div>
                        <div className={`mt-3 inline-block px-3 py-1 text-[10px] uppercase tracking-widest font-semibold rounded ${
                            doc.status === "paid"    ? "bg-green-50 text-green-700" :
                            doc.status === "pending" ? "bg-amber-50 text-amber-700" :
                            "bg-neutral-100 text-neutral-500"
                        }`}>
                            {doc.status}
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-100" />

                {/* Bill To */}
                {(doc.customer_name || doc.customer_email) && (
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-3">Bill To</div>
                        {doc.customer_name  && <div className="font-medium text-neutral-900">{doc.customer_name}</div>}
                        {doc.customer_email && <div className="text-sm text-neutral-500">{doc.customer_email}</div>}
                    </div>
                )}

                {/* Line Items */}
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-neutral-200">
                            <th className="text-left text-[10px] uppercase tracking-widest text-neutral-400 font-semibold pb-3">Description</th>
                            <th className="text-center text-[10px] uppercase tracking-widest text-neutral-400 font-semibold pb-3 w-16">Qty</th>
                            <th className="text-right text-[10px] uppercase tracking-widest text-neutral-400 font-semibold pb-3 w-32">Unit Price</th>
                            <th className="text-right text-[10px] uppercase tracking-widest text-neutral-400 font-semibold pb-3 w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                        {lineItems.map((line, i) => (
                            <tr key={i}>
                                <td className="py-3 text-neutral-800">{line.description}</td>
                                <td className="py-3 text-center text-neutral-600">{line.qty}</td>
                                <td className="py-3 text-right text-neutral-600">GH₵ {Number(line.unit_price).toFixed(2)}</td>
                                <td className="py-3 text-right font-medium">GH₵ {(line.qty * line.unit_price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Subtotal</span>
                            <span>GH₵ {subtotal.toFixed(2)}</span>
                        </div>
                        {taxRate > 0 && (
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Tax ({taxRate}%)</span>
                                <span>GH₵ {taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-semibold text-base border-t border-neutral-200 pt-3">
                            <span>Total</span>
                            <span>GH₵ {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {doc.notes && (
                    <div className="border-t border-neutral-100 pt-6">
                        <div className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-2">Notes</div>
                        <p className="text-sm text-neutral-600 whitespace-pre-line">{doc.notes}</p>
                    </div>
                )}

                <div className="border-t border-neutral-100 pt-6 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                        Thank you for your business — {bizName}
                    </p>
                </div>
            </div>
        </div>
    );
}
