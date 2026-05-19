"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";

type Props = {
    docId: string;
    docAmount: number;
    customerEmail: string | null;
};

export function InvoiceActions({ docId, docAmount, customerEmail }: Props) {
    const [generatingPaystack, setGeneratingPaystack] = useState(false);
    const [paystackUrl, setPaystackUrl] = useState<string | null>(null);

    const copyPublicLink = () => {
        const url = `${window.location.origin}/invoice/${docId}`;
        navigator.clipboard.writeText(url);
        toast.success("Public link copied to clipboard.");
    };

    const generatePaystackLink = async () => {
        setGeneratingPaystack(true);
        try {
            const res = await fetch("/api/invoice/paystack-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceId: docId,
                    amount: docAmount,
                    customerEmail: customerEmail || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");

            setPaystackUrl(data.link);
            navigator.clipboard.writeText(data.link);
            toast.success("Paystack link generated and copied.");
        } catch (err: any) {
            toast.error(err.message || "Could not generate Paystack link.");
        }
        setGeneratingPaystack(false);
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
                onClick={copyPublicLink}
                className="ac-btn ac-btn-ghost"
                title="Copy a read-only URL to share with your client"
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Public Link
            </button>

            <button
                onClick={generatePaystackLink}
                disabled={generatingPaystack}
                className="ac-btn ac-btn-primary"
            >
                {generatingPaystack ? "Generating…" : "Paystack Link"}
            </button>

            {paystackUrl && (
                <a
                    href={paystackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ac-text-link"
                    style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Open
                </a>
            )}
        </div>
    );
}
