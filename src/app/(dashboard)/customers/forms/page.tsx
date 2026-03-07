"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CustomerFormsPage() {
    const [inquiries, setInquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        setLoading(true);
        // Assuming a 'contact_inquiries' table was built on the retail side. Falling back safely if not.
        const { data, error } = await supabase
            .from("contact_inquiries")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) setInquiries(data);
        setLoading(false);
    };

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Form Submissions</h1>
                <p className="text-neutral-500">Review inquiries submitted through the 'Contact Us' page.</p>
            </header>

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Name</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Email</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Message</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    Loading inquiries...
                                </td>
                            </tr>
                        ) : (!inquiries || inquiries.length === 0) ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    No inquiries found.
                                </td>
                            </tr>
                        ) : (
                            inquiries.map((inq) => (
                                <tr key={inq.id} className="hover:bg-neutral-50 transition-colors align-top">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-neutral-900">{inq.name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a href={`mailto:${inq.email}`} className="text-neutral-600 hover:text-black hover:underline">
                                            {inq.email}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 max-w-sm whitespace-normal">
                                        <p className="text-neutral-600 leading-relaxed line-clamp-2 hover:line-clamp-none transition-all cursor-pointer">
                                            {inq.message}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-500 text-xs text-right whitespace-nowrap">
                                        {new Date(inq.created_at).toLocaleDateString()}
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
