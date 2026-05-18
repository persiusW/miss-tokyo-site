"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CustomRequest = {
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    strap_color: string | null;
    sole_tone: string | null;
    stitch_refinement: string | null;
    status: string;
    created_at: string;
};

const STATUS_OPTIONS = [
    { value: "inquiry", label: "Inquiry" },
    { value: "material_confirmation", label: "Material Confirmation" },
    { value: "production", label: "Production" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, string> = {
    inquiry:                "ac-badge-info",
    material_confirmation:  "ac-badge-warn",
    production:             "ac-badge-processing",
    completed:              "ac-badge-ok",
    cancelled:              "ac-badge-cancelled",
};

export default function CustomRequestsPage() {
    const [requests, setRequests] = useState<CustomRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("custom_requests")
            .select("*")
            .order("created_at", { ascending: false });

        if (data) setRequests(data);
        setLoading(false);
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleStatusChange = async (requestId: string, newStatus: string) => {
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));

        const { error } = await supabase
            .from("custom_requests")
            .update({ status: newStatus })
            .eq("id", requestId);

        if (error) {
            console.error("Failed to update status:", error);
            fetchRequests();
        }
    };

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Custom Requests</h1>
                    <p className="ac-page-sub">Manage bespoke orders and client inquiries.</p>
                </div>
            </div>

            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Type</th>
                                <th>Preferences</th>
                                <th>Date Received</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="ac-table-empty">Loading requests...</td></tr>
                            ) : (!requests || requests.length === 0) ? (
                                <tr><td colSpan={5} className="ac-table-empty">No custom requests found.</td></tr>
                            ) : requests.map(req => (
                                <tr key={req.id} style={{ verticalAlign: "top" }}>
                                    <td>
                                        <div style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{req.customer_name || "—"}</div>
                                        {req.customer_email && (
                                            <a href={`mailto:${req.customer_email}`}
                                                style={{ fontSize: 11, color: "var(--ac-ink-4)" }}
                                                onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-ink)")}
                                                onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                {req.customer_email}
                                            </a>
                                        )}
                                    </td>
                                    <td>
                                        <span className="ac-badge ac-badge-inactive">Bespoke</span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "var(--ac-ink-3)" }}>
                                            {req.stitch_refinement && <span>Stitch: {req.stitch_refinement}</span>}
                                            {req.sole_tone && <span>Sole: {req.sole_tone}</span>}
                                            {req.strap_color && <span>Strap: {req.strap_color}</span>}
                                            {!req.stitch_refinement && !req.sole_tone && !req.strap_color && (
                                                <span style={{ color: "var(--ac-ink-4)" }}>None specified</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <select
                                            value={req.status || "inquiry"}
                                            onChange={e => handleStatusChange(req.id, e.target.value)}
                                            className="ac-select"
                                            style={{ fontSize: 11, padding: "4px 8px" }}
                                        >
                                            {STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
