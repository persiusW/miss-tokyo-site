"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Contact = {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    source: "order" | "custom_request" | "newsletter";
    created_at: string;
};

export default function CustomersPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAggregatedContacts();
    }, []);

    const fetchAggregatedContacts = async () => {
        setLoading(true);
        try {
            // Fetch from orders
            const { data: ordersData, error: ordersError } = await supabase.from("orders").select("id, email, first_name, last_name, created_at");
            const orders = ordersError ? [] : ordersData;

            // Fetch from custom requests
            const { data: customReqsData, error: customReqsError } = await supabase.from("custom_requests").select("id, email, first_name, last_name, created_at");
            const customReqs = customReqsError ? [] : customReqsData;

            // Fetch from newsletter
            const { data: newslettersData, error: newslettersError } = await supabase.from("newsletter_subs").select("id, email, created_at");
            const newsletters = newslettersError ? [] : newslettersData;

            const aggregated: Contact[] = [];

            (orders || []).forEach((o: any) => {
                aggregated.push({ ...o, source: "order" });
            });
            (customReqs || []).forEach((c: any) => {
                aggregated.push({ ...c, source: "custom_request" });
            });
            (newsletters || []).forEach((n: any) => {
                aggregated.push({ ...n, source: "newsletter" });
            });

            // Sort by newest first
            aggregated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Basic deduping by email (keeping newest)
            const uniqueContacts = Array.from(new Map(aggregated.map(item => [item.email, item])).values());

            setContacts(uniqueContacts);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Contacts</h1>
                    <p className="text-neutral-500">A unified view of your clientele across orders, requests, and subscriptions.</p>
                </div>
                <button
                    className="bg-black text-white px-6 py-3 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    Export CSV
                </button>
            </header>

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Contact</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Email</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Primary Source</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Added On</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    Aggregating clientele data...
                                </td>
                            </tr>
                        ) : (!contacts || contacts.length === 0) ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    No contacts found in the system.
                                </td>
                            </tr>
                        ) : (
                            contacts.map((contact, idx) => (
                                <tr key={`${contact.id}-${idx}`} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-neutral-900">
                                            {contact.first_name ? `${contact.first_name} ${contact.last_name || ""}` : "Unnamed Contact"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a href={`mailto:${contact.email}`} className="text-neutral-600 hover:text-black hover:underline">
                                            {contact.email}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${contact.source === 'order' ? 'bg-green-50 text-green-700' :
                                            contact.source === 'custom_request' ? 'bg-amber-50 text-amber-700' :
                                                'bg-blue-50 text-blue-700'
                                            }`}>
                                            {contact.source.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-500 text-xs text-right">
                                        {new Date(contact.created_at).toLocaleDateString()}
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
