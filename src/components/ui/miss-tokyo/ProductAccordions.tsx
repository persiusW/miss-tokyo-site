"use client";

import { useState } from "react";

interface AccItemProps {
    label: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

function AccItem({ label, defaultOpen = false, children }: AccItemProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div style={{ borderBottom: "1px solid rgba(20,18,16,0.1)" }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 0", cursor: "pointer", fontSize: 12, fontWeight: 500,
                    letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink, #141210)",
                    userSelect: "none", gap: 12, background: "none", border: "none",
                    width: "100%", textAlign: "left",
                }}
            >
                {label}
                <svg
                    viewBox="0 0 24 24" width="14" height="14"
                    fill="none" stroke="var(--muted, #7A7167)" strokeWidth="1.8"
                    style={{
                        flexShrink: 0,
                        transition: "transform 0.25s",
                        transform: open ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
            <div style={{
                maxHeight: open ? 600 : 0,
                overflow: "hidden",
                transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
            }}>
                <div style={{ paddingBottom: 18, fontSize: 13, color: "var(--muted, #7A7167)", lineHeight: 1.8 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

interface Props {
    description: string | null;
    featuresList: string[] | null;
    careInstructions: string[] | null;
    sku: string | null;
    showProductDetails?: boolean;
    showCare?: boolean;
    showDelivery?: boolean;
}

export function ProductAccordions({ description, featuresList, careInstructions, sku, showProductDetails = true, showCare = true, showDelivery = true }: Props) {
    return (
        <div style={{ borderTop: "1px solid rgba(20,18,16,0.1)" }}>
            {showProductDetails && (
                <AccItem label="Product Details" defaultOpen>
                    {description && <p style={{ marginBottom: featuresList?.length ? 10 : 0 }}>{description}</p>}
                    {featuresList && featuresList.length > 0 && (
                        <ul style={{ paddingLeft: 16, marginTop: description ? 6 : 0 }}>
                            {featuresList.map((f, i) => (
                                <li key={i} style={{ marginBottom: 5 }}>{f}</li>
                            ))}
                        </ul>
                    )}
                    {sku && (
                        <ul style={{ paddingLeft: 16, marginTop: 6 }}>
                            <li style={{ marginBottom: 5 }}>
                                <strong style={{ color: "var(--ink, #141210)", fontWeight: 500 }}>SKU:</strong> {sku}
                            </li>
                        </ul>
                    )}
                </AccItem>
            )}

            {showCare && (
                <AccItem label="Care Instructions">
                    {careInstructions && careInstructions.length > 0 ? (
                        <ul style={{ paddingLeft: 16 }}>
                            {careInstructions.map((c, i) => <li key={i} style={{ marginBottom: 5 }}>{c}</li>)}
                        </ul>
                    ) : (
                        <ul style={{ paddingLeft: 16 }}>
                            <li style={{ marginBottom: 5 }}>Machine wash cold (30°C) on gentle cycle</li>
                            <li style={{ marginBottom: 5 }}>Turn inside out before washing to protect the print</li>
                            <li style={{ marginBottom: 5 }}>Do not tumble dry — air dry flat</li>
                            <li style={{ marginBottom: 5 }}>Do not bleach or iron directly on print</li>
                            <li style={{ marginBottom: 5 }}>Wash with similar colours</li>
                        </ul>
                    )}
                </AccItem>
            )}

            {showDelivery && (
                <AccItem label="Delivery & Returns">
                    <p>
                        <strong style={{ color: "var(--ink, #141210)", fontWeight: 500 }}>Delivery in Accra:</strong>{" "}
                        1–2 business days · Free on orders over GH₵150
                    </p>
                    <p style={{ marginTop: 8 }}>
                        <strong style={{ color: "var(--ink, #141210)", fontWeight: 500 }}>Nationwide delivery:</strong>{" "}
                        3–5 business days · Standard rates apply
                    </p>
                    <p style={{ marginTop: 8 }}>
                        <strong style={{ color: "var(--ink, #141210)", fontWeight: 500 }}>Returns:</strong>{" "}
                        Accepted within 7 days of delivery for unworn, unwashed items in original condition.
                        Email orders@misstokyo.shop to start a return.
                    </p>
                </AccItem>
            )}
        </div>
    );
}
