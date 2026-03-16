"use client";

import { useState } from "react";

type Template = "order_confirmation" | "admin_new_order";

const BIZ_NAME = "Miss Tokyo";
const BIZ_ADDRESS = "Accra, Ghana";

export function EmailsTab() {
    const [active, setActive] = useState<Template>("order_confirmation");

    return (
        <div className="space-y-10">
            <div className="bg-gray-50 p-6 border border-gray-100">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 leading-relaxed font-bold">
                    Email Architecture Previews. Transactions are dispatched via Resend. 
                    <br/>To modify logic, edit <code className="bg-white px-1 font-mono">src/app/api/paystack/webhook/route.ts</code>.
                </p>
            </div>

            <div className="flex gap-10 border-b border-gray-100">
                {(["order_confirmation", "admin_new_order"] as const).map(key => (
                    <button
                        key={key}
                        onClick={() => setActive(key)}
                        className={`pb-4 text-[11px] uppercase tracking-[0.2em] font-bold transition-all -mb-px ${active === key ? "border-b-2 border-black text-black" : "text-gray-300 hover:text-black"}`}
                    >
                        {key.replace(/_/g, " ")}
                    </button>
                ))}
            </div>

            <div className="bg-white border border-gray-100 overflow-hidden shadow-sm">
                <div className="bg-black py-2 px-6">
                    <span className="text-[9px] uppercase tracking-widest text-white font-bold">Preview Instance — MT-MAIL-CONFIRM</span>
                </div>
                <div className="overflow-auto max-h-[700px]">
                    {active === "order_confirmation" ? <ConfirmationPreview /> : <AdminPreview />}
                </div>
            </div>
        </div>
    );
}

function ConfirmationPreview() {
    return (
        <div className="p-12 bg-[#F9F9F9] font-serif">
            <div className="max-w-xl mx-auto bg-white border border-gray-100 p-12 text-center">
                <h1 className="text-2xl uppercase tracking-[0.3em] font-bold mb-2">{BIZ_NAME}</h1>
                <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-12">Gratitude from the Atelier</p>
                
                <h2 className="text-sm font-medium mb-8">We have successfully received your request for Miss Tokyo pieces.</h2>
                
                <table className="w-full mb-10 text-[11px] uppercase tracking-widest border-t border-b border-gray-50">
                    <tbody>
                        <tr className="border-b border-gray-50">
                            <td className="py-4 text-left text-gray-400">Reference</td>
                            <td className="py-4 text-right font-bold">#ORD-LIVE-001</td>
                        </tr>
                        <tr>
                            <td className="py-4 text-left text-gray-400">Investment</td>
                            <td className="py-4 text-right font-bold text-black">GH₵ 1,200.00</td>
                        </tr>
                    </tbody>
                </table>

                <p className="text-xs text-gray-500 leading-loose italic mb-12">
                    Your selected items are now being examined for perfection. Notification will follow upon dispatch.
                </p>

                <div className="border-t border-gray-50 pt-6">
                    <p className="text-[9px] uppercase tracking-widest text-gray-300">
                        {BIZ_NAME} · {BIZ_ADDRESS}
                    </p>
                </div>
            </div>
        </div>
    );
}

function AdminPreview() {
    return (
        <div className="p-12 bg-[#000000] font-sans">
            <div className="max-w-xl mx-auto bg-white p-12">
                <h1 className="text-xl uppercase tracking-[0.2em] font-bold mb-2">{BIZ_NAME}</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-12">Internal Transmission</p>
                
                <h2 className="text-sm font-bold mb-8">Alert: A new order has been logged in the vault.</h2>
                
                <div className="bg-gray-50 p-6 mb-8 mt-4 space-y-4">
                     {[
                        ["ID", "#ORD-8821"],
                        ["Patron", "Abena Mensah"],
                        ["Credit", "GH₵ 5,400.00"],
                     ].map(([l, v]) => (
                        <div key={l} className="flex justify-between text-[11px] uppercase tracking-widest">
                            <span className="text-gray-400">{l}</span>
                            <span className="font-bold">{v}</span>
                        </div>
                     ))}
                </div>

                <div className="bg-black text-white text-[10px] uppercase tracking-widest py-4 px-8 inline-block font-bold">
                    Engage Dashboard →
                </div>
            </div>
        </div>
    );
}
