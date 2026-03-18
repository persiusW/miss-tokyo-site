"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
    images: string[];
    name: string;
    badge?: string | null;
    isSale?: boolean;
}

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533'%3E%3Crect width='400' height='533' fill='%23E8D5C4'/%3E%3C/svg%3E";

export function ProductGallery({ images, name, badge, isSale }: Props) {
    const imgs = images.length > 0 ? images : [FALLBACK];
    const [current, setCurrent] = useState(0);

    const prev = () => setCurrent(i => (i - 1 + imgs.length) % imgs.length);
    const next = () => setCurrent(i => (i + 1) % imgs.length);

    const badgeLabel = isSale ? "Sale" : badge;
    const badgeBg = isSale ? "var(--accent, #E8485A)" : "var(--ink, #141210)";

    return (
        <div className="pdp-gallery" style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 10, position: "sticky", top: "calc(64px + 16px)" }}>
            {/* Thumbnail column */}
            <div className="pdp-thumb-col" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {imgs.map((img, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        aria-label={`View image ${i + 1}`}
                        style={{
                            width: 72, aspectRatio: "3/4", borderRadius: 3, overflow: "hidden",
                            cursor: "pointer",
                            border: `1.5px solid ${i === current ? "var(--ink, #141210)" : "transparent"}`,
                            transition: "border-color 0.18s", flexShrink: 0,
                            background: "var(--blush, #E8D5C4)", position: "relative", padding: 0,
                        }}
                    >
                        <Image
                            src={img}
                            alt={`${name} ${i + 1}`}
                            fill
                            sizes="72px"
                            loading="lazy"
                            style={{ objectFit: "cover", transition: "transform 0.3s" }}
                        />
                    </button>
                ))}
            </div>

            {/* Main image */}
            <div style={{ position: "relative", borderRadius: 4, overflow: "hidden", background: "var(--blush, #E8D5C4)", aspectRatio: "3/4" }}>
                <Image
                    src={imgs[current]}
                    alt={name}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ objectFit: "cover", transition: "opacity 0.3s" }}
                />

                {/* Badge */}
                {badgeLabel && (
                    <span style={{
                        position: "absolute", top: 16, left: 16,
                        background: badgeBg, color: "#fff",
                        fontSize: 10, fontWeight: 500, letterSpacing: "0.1em",
                        textTransform: "uppercase", padding: "5px 12px", borderRadius: 2, zIndex: 1,
                    }}>
                        {badgeLabel}
                    </span>
                )}

                {/* Zoom hint */}
                <div style={{
                    position: "absolute", bottom: 16, right: 16,
                    background: "rgba(20,18,16,0.6)", color: "#fff",
                    fontSize: 10, letterSpacing: "0.08em", padding: "6px 10px",
                    borderRadius: 2, display: "flex", alignItems: "center", gap: 5,
                    pointerEvents: "none",
                }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    Tap to zoom
                </div>

                {/* Nav arrows */}
                {imgs.length > 1 && (
                    <>
                        <button
                            onClick={prev}
                            aria-label="Previous image"
                            style={{
                                position: "absolute", top: "50%", left: 12,
                                transform: "translateY(-50%)", width: 36, height: 36,
                                background: "rgba(255,255,255,0.88)", border: "none",
                                borderRadius: "50%", display: "flex", alignItems: "center",
                                justifyContent: "center", cursor: "pointer", zIndex: 2,
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#141210" strokeWidth="2" strokeLinecap="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <button
                            onClick={next}
                            aria-label="Next image"
                            style={{
                                position: "absolute", top: "50%", right: 12,
                                transform: "translateY(-50%)", width: 36, height: 36,
                                background: "rgba(255,255,255,0.88)", border: "none",
                                borderRadius: "50%", display: "flex", alignItems: "center",
                                justifyContent: "center", cursor: "pointer", zIndex: 2,
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#141210" strokeWidth="2" strokeLinecap="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
