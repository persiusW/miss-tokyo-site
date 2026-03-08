"use client";

import { useState } from "react";

type Template = "order_confirmation" | "admin_new_order";

const BIZ_NAME = "Badu Atelier";
const BIZ_ADDRESS = "Accra, Ghana";

function OrderConfirmationPreview() {
    return (
        <div style={{ fontFamily: "Georgia, serif", background: "#fafaf9", padding: "40px 20px" }}>
            <div style={{ maxWidth: 560, margin: "0 auto", background: "white", border: "1px solid #e5e5e5", padding: 48 }}>
                <h1 style={{ fontSize: 22, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
                    {BIZ_NAME}
                </h1>
                <p style={{ color: "#737373", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 40px" }}>
                    Order Confirmed
                </p>
                <h2 style={{ fontSize: 16, fontWeight: "normal", color: "#171717", margin: "0 0 24px", letterSpacing: "0.05em" }}>
                    Thank you. Your order has been received.
                </h2>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
                    <tbody>
                        {[
                            ["Order Reference", "#A1B2C3D4", false],
                            ["Amount Paid", "GH₵ 300.00", false],
                            ["Status", "Confirmed", true],
                        ].map(([label, value, green]) => (
                            <tr key={String(label)} style={{ borderBottom: "1px solid #f5f5f5" }}>
                                <td style={{ padding: "12px 0", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: "#737373" }}>{String(label)}</td>
                                <td style={{ padding: "12px 0", fontSize: 13, textAlign: "right", fontWeight: 600, color: green ? "#15803d" : "#171717" }}>{String(value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p style={{ fontSize: 13, color: "#525252", lineHeight: 1.8, margin: "0 0 32px" }}>
                    Your piece is now being prepared with care. We will notify you once it has been dispatched. Questions? Reply to this email.
                </p>
                <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: 24 }}>
                    <p style={{ fontSize: 11, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
                        {BIZ_NAME} · {BIZ_ADDRESS}
                    </p>
                </div>
            </div>
        </div>
    );
}

function AdminNewOrderPreview() {
    return (
        <div style={{ fontFamily: "Georgia, serif", background: "#fafaf9", padding: "40px 20px" }}>
            <div style={{ maxWidth: 560, margin: "0 auto", background: "white", border: "1px solid #e5e5e5", padding: 48 }}>
                <h1 style={{ fontSize: 22, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: "Georgia, serif" }}>
                    {BIZ_NAME}
                </h1>
                <p style={{ color: "#737373", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 40px" }}>
                    New Order Received
                </p>
                <h2 style={{ fontSize: 16, fontWeight: "normal", color: "#171717", margin: "0 0 24px", letterSpacing: "0.05em" }}>
                    A new order has been placed and requires your attention.
                </h2>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 32 }}>
                    <tbody>
                        {[
                            ["Order ID", "#A1B2C3D4"],
                            ["Customer", "Abena Mensah"],
                            ["Email", "abena@example.com"],
                            ["Amount", "GH₵ 300.00"],
                            ["Delivery", "Delivery — Accra"],
                            ["Items", "1 × Badu Slide 01 (Size 42, Noir)"],
                        ].map(([label, value]) => (
                            <tr key={label} style={{ borderBottom: "1px solid #f5f5f5" }}>
                                <td style={{ padding: "10px 0", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: "#737373", paddingRight: 24 }}>{label}</td>
                                <td style={{ padding: "10px 0", fontSize: 13, color: "#171717", fontWeight: 500 }}>{value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ background: "#171717", padding: "14px 24px", display: "inline-block", marginBottom: 32 }}>
                    <span style={{ color: "white", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif" }}>
                        View Order in Dashboard →
                    </span>
                </div>
                <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: 24 }}>
                    <p style={{ fontSize: 11, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
                        {BIZ_NAME} · Internal Notification
                    </p>
                </div>
            </div>
        </div>
    );
}

const TEMPLATES: { key: Template; label: string; description: string }[] = [
    {
        key: "order_confirmation",
        label: "Customer Order Confirmation",
        description: "Sent to customers when their payment is confirmed via Paystack webhook.",
    },
    {
        key: "admin_new_order",
        label: "Admin New Order Notification",
        description: "Sent to the atelier team when a new order is placed.",
    },
];

export function EmailsTab() {
    const [active, setActive] = useState<Template>("order_confirmation");

    return (
        <div className="space-y-8">
            <p className="text-neutral-500 text-sm">
                Read-only previews of transactional emails sent via Resend. Edit the HTML in{" "}
                <code className="text-xs bg-neutral-100 px-1 py-0.5">src/app/api/paystack/webhook/route.ts</code>.
            </p>

            {/* Sub-tab toggle */}
            <div className="flex gap-6 border-b border-neutral-200">
                {TEMPLATES.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActive(t.key)}
                        className={`pb-3 text-xs uppercase tracking-widest font-semibold border-b-2 transition-colors -mb-px ${active === t.key ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-neutral-50 border border-neutral-100 px-6 py-4">
                <p className="text-xs tracking-widest uppercase text-neutral-500">
                    {TEMPLATES.find(t => t.key === active)?.description}
                </p>
            </div>

            <div className="border border-neutral-200 overflow-hidden">
                <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-3">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">
                        Preview — from: {"{bizName}"} &lt;no-reply@resend.dev&gt;
                    </span>
                </div>
                <div className="overflow-auto max-h-[600px]">
                    {active === "order_confirmation" ? <OrderConfirmationPreview /> : <AdminNewOrderPreview />}
                </div>
            </div>
        </div>
    );
}
