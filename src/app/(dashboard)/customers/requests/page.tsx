"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CustomRequest = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    request_type: string;
    status: string;
    details: string;
    created_at: string;
    preferences: {
        stitchColor?: string;
        soleTone?: string;
    }
};

const STATUS_OPTIONS = [
    { value: "inquiry", label: "Inquiry" },
    { value: "material_confirmation", label: "Material Confirmation" },
    { value: "production", label: "Production" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];

export default function CustomRequestsPage() {
    const [requests, setRequests] = useState<CustomRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("custom_requests")
            .select("*")
            .order("created_at", { ascending: false });

        if (data) {
            setRequests(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleStatusChange = async (requestId: string, newStatus: string) => {
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));

        const { error } = await supabase
            .from("custom_requests")
            .update({ status: newStatus })
            .eq("id", requestId);

        if (error) {
            console.error("Failed to update status:", error);
            fetchRequests(); // Revert on error
        }
    };

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Custom Requests</h1>
                <p className="text-neutral-500">Manage bespoke orders and client inquiries.</p>
            </header>

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Client</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Type</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Preferences</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Date Received</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    Loading requests...
                                </td>
                            </tr>
                        ) : (!requests || requests.length === 0) ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 italic font-serif">
                                    No custom requests found.
                                </td>
                            </tr>
                        ) : (
                            requests.map((req) => (
                                <tr key={req.id} className="hover:bg-neutral-50 transition-colors align-top group">
                                    <td className="px-6 py-4 max-w-[200px]">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-neutral-900">{req.first_name} {req.last_name}</span>
                                            <a href={`mailto:${req.email}`} className="text-xs text-neutral-500 border-b border-transparent hover:border-neutral-500 transition-colors self-start mt-1">
                                                {req.email}
                                            </a>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="capitalize">{req.request_type.replace('_', ' ')}</span>
                                    </td>
                                    <td className="px-6 py-4 max-w-[250px] truncate">
                                        <div className="flex flex-col gap-1 text-xs">
                                            {req.preferences?.stitchColor && <span>Stitch: {req.preferences.stitchColor}</span>}
                                            {req.preferences?.soleTone && <span>Sole: {req.preferences.soleTone}</span>}
                                            {!req.preferences?.stitchColor && !req.preferences?.soleTone && <span className="text-neutral-400">None specified</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-600">
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={req.status || 'inquiry'}
                                            onChange={(e) => handleStatusChange(req.id, e.target.value)}
                                            className="border-b border-neutral-300 bg-transparent py-1 text-xs uppercase tracking-widest outline-none focus:border-black transition-colors appearance-none cursor-pointer"
                                        >
                                            {STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
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
