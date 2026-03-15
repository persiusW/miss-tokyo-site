import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PrintButton } from "./PrintButton";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [{ data: doc }, { data: biz }] = await Promise.all([
        supabase.from("documents").select("*").eq("id", id).single(),
        supabase.from("business_settings").select("*").eq("id", "default").single(),
    ]);

    if (!doc) notFound();

    const lineItems: { description: string; qty: number; unit_price: number }[] = doc.line_items || [];
    const subtotal = lineItems.reduce((s, l) => s + l.qty * l.unit_price, 0);
    const taxRate = Number(doc.tax_rate || 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const docNumber = doc.id.substring(0, 8).toUpperCase();
    const issued = new Date(doc.created_at).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
    });

    return (
        <div>
            {/* Toolbar — hidden on print */}
            <div className="no-print flex items-center justify-between mb-8">
                <Link
                    href="/finance/invoices"
                    className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
                >
                    ← Back to Invoices
                </Link>
                <PrintButton />
            </div>

            {/* Invoice Document */}
            <div id="invoice-print" className="bg-white border border-neutral-200 p-12 max-w-3xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        {biz?.logo_url && (
                            <img src={biz.logo_url} alt={biz.business_name} className="h-12 w-12 object-cover mb-4" />
                        )}
                        <h1 className="font-serif text-2xl tracking-widest uppercase">
                            {biz?.business_name || "Miss Tokyo"}
                        </h1>
                        {biz?.address && (
                            <p className="text-xs text-neutral-500 mt-2 whitespace-pre-line">{biz.address}</p>
                        )}
                        {biz?.email && (
                            <p className="text-xs text-neutral-500">{biz.email}</p>
                        )}
                        {biz?.contact && (
                            <p className="text-xs text-neutral-500">{biz.contact}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-1">
                            {doc.type}
                        </div>
                        <div className="font-mono text-2xl font-bold text-neutral-900">#{docNumber}</div>
                        <div className="text-xs text-neutral-500 mt-2">Issued: {issued}</div>
                        <div className={`mt-3 inline-block px-3 py-1 text-[10px] uppercase tracking-widest font-semibold rounded ${
                            doc.status === "paid" ? "bg-green-50 text-green-700" :
                            doc.status === "pending" ? "bg-amber-50 text-amber-700" :
                            doc.status === "draft" ? "bg-neutral-100 text-neutral-500" :
                            "bg-red-50 text-red-600"
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
                        {doc.customer_name && (
                            <div className="font-medium text-neutral-900">{doc.customer_name}</div>
                        )}
                        {doc.customer_email && (
                            <div className="text-sm text-neutral-500">{doc.customer_email}</div>
                        )}
                    </div>
                )}

                {/* Line Items */}
                <div>
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
                            {lineItems.length > 0 ? (
                                lineItems.map((line, i) => (
                                    <tr key={i}>
                                        <td className="py-3 text-neutral-800">{line.description}</td>
                                        <td className="py-3 text-center text-neutral-600">{line.qty}</td>
                                        <td className="py-3 text-right text-neutral-600">GH₵ {Number(line.unit_price).toFixed(2)}</td>
                                        <td className="py-3 text-right font-medium">GH₵ {(line.qty * line.unit_price).toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-6 text-neutral-400 italic text-center">No line items</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

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
                        <div className="flex justify-between font-semibold text-base border-t border-neutral-200 pt-3 mt-1">
                            <span>Total</span>
                            <span>GH₵ {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {doc.notes && (
                    <div className="border-t border-neutral-100 pt-6">
                        <div className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-2">Notes</div>
                        <p className="text-sm text-neutral-600 whitespace-pre-line">{doc.notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="border-t border-neutral-100 pt-6 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                        Thank you for your business — {biz?.business_name || "Miss Tokyo"}
                    </p>
                </div>
            </div>
        </div>
    );
}
