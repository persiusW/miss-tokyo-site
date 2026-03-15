"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import { Link2, ExternalLink } from "lucide-react";

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
        <div className="flex items-center gap-3">
            <button
                onClick={copyPublicLink}
                className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest border border-neutral-200 text-neutral-600 hover:border-black hover:text-black transition-colors"
                title="Copy a read-only URL to share with your client"
            >
                <Link2 size={13} /> Public Link
            </button>

            <button
                onClick={generatePaystackLink}
                disabled={generatingPaystack}
                className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest bg-black text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
                {generatingPaystack ? "Generating..." : "Paystack Link"}
            </button>

            {paystackUrl && (
                <a
                    href={paystackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                    <ExternalLink size={12} /> Open
                </a>
            )}
        </div>
    );
}
