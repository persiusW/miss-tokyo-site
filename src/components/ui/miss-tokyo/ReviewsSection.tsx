"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import type { ProductReview, RatingDistribution } from "@/lib/products";

interface Props {
    reviews: ProductReview[];
    distribution: RatingDistribution[];
    reviewCount: number;
    ratingAverage: number;
}

const PAGE = 3;

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
    return (
        <div style={{ display: "flex", gap: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} style={{ fontSize: size, color: i <= rating ? "var(--gold, #C9A96E)" : "rgba(201,169,110,0.25)" }}>★</span>
            ))}
        </div>
    );
}

export function ReviewsSection({ reviews, distribution, reviewCount, ratingAverage }: Props) {
    const [shown, setShown] = useState(PAGE);

    return (
        <section id="reviews" style={{ background: "var(--sand, #F7F2EC)", padding: "64px 0" }}>
            <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40, gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted, #7A7167)", marginBottom: 10 }}>
                            What customers say
                        </div>
                        <h2 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 300, lineHeight: 1 }}>
                            Reviews{" "}
                            <em style={{ fontStyle: "italic", color: "var(--gold, #C9A96E)" }}>({reviewCount})</em>
                        </h2>
                    </div>
                    <button
                        onClick={() => toast.info("Opening review form…")}
                        style={{
                            fontSize: 12, fontWeight: 500, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "var(--ink, #141210)",
                            border: "none", borderBottom: "1px solid var(--ink, #141210)",
                            background: "none", cursor: "pointer", paddingBottom: 2,
                        }}
                    >
                        Write a review
                    </button>
                </div>

                {/* Rating summary */}
                {reviewCount > 0 && (
                    <div style={{
                        display: "grid", gridTemplateColumns: "200px 1fr", gap: 48,
                        alignItems: "center", marginBottom: 48, paddingBottom: 40,
                        borderBottom: "1px solid rgba(20,18,16,0.1)",
                    }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{
                                fontFamily: "var(--font-display, Georgia, serif)",
                                fontSize: 72, fontWeight: 300, lineHeight: 1,
                                color: "var(--ink, #141210)",
                            }}>
                                {ratingAverage.toFixed(1)}
                            </div>
                            <div style={{ display: "flex", justifyContent: "center", gap: 3, margin: "6px 0" }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <span key={i} style={{ fontSize: 18, color: i <= Math.round(ratingAverage) ? "var(--gold, #C9A96E)" : "rgba(201,169,110,0.25)" }}>★</span>
                                ))}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--muted, #7A7167)" }}>Based on {reviewCount} reviews</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {distribution.map(({ star, count, pct }) => (
                                <div key={star} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--muted, #7A7167)" }}>
                                    <span style={{ width: 8, textAlign: "right", flexShrink: 0 }}>{star}</span>
                                    <div style={{ flex: 1, height: 4, background: "var(--sand-dark, #EDE6DC)", borderRadius: 2, overflow: "hidden" }}>
                                        <div style={{ height: "100%", background: "var(--gold, #C9A96E)", borderRadius: 2, width: `${pct}%`, transition: "width 0.6s ease" }} />
                                    </div>
                                    <span style={{ width: 28, flexShrink: 0 }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Review cards */}
                {reviews.length > 0 && (
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                            {reviews.slice(0, shown).map(r => (
                                <div key={r.id} style={{ background: "#fff", borderRadius: 4, padding: 24, position: "relative" }}>
                                    {/* Opening quote */}
                                    <div style={{
                                        fontFamily: "var(--font-display, Georgia, serif)", fontSize: 64,
                                        color: "var(--sand-dark, #EDE6DC)", position: "absolute",
                                        top: 10, left: 18, lineHeight: 1, userSelect: "none", pointerEvents: "none",
                                    }}>
                                        &ldquo;
                                    </div>
                                    <Stars rating={r.rating} />
                                    <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink, #141210)", margin: "12px 0 16px", position: "relative", zIndex: 1 }}>
                                        &ldquo;{r.comment}&rdquo;
                                    </p>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid rgba(20,18,16,0.1)", paddingTop: 14 }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: "50%",
                                            background: r.avatar_color || "#E8D5C4",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 13, fontWeight: 500, color: "#fff", flexShrink: 0,
                                        }}>
                                            {r.author_initials || r.author_name?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink, #141210)" }}>{r.author_name}</div>
                                            {r.location && <div style={{ fontSize: 11, color: "var(--muted, #7A7167)", marginTop: 1 }}>{r.location}</div>}
                                        </div>
                                        {r.is_verified && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#059669", marginLeft: "auto", fontWeight: 500 }}>
                                                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#059669" strokeWidth="2">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                Verified
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {shown < reviews.length && (
                            <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
                                <button
                                    onClick={() => setShown(s => s + PAGE)}
                                    style={{
                                        padding: "12px 32px", border: "1px solid rgba(20,18,16,0.15)",
                                        borderRadius: 2, background: "transparent",
                                        fontSize: 12, fontWeight: 500, letterSpacing: "0.08em",
                                        textTransform: "uppercase", cursor: "pointer",
                                        color: "var(--ink, #141210)", transition: "all 0.18s",
                                    }}
                                >
                                    Load more reviews ({reviews.length - shown})
                                </button>
                            </div>
                        )}
                    </>
                )}

                {reviewCount === 0 && (
                    <p style={{ color: "var(--muted, #7A7167)", fontSize: 14, textAlign: "center", paddingTop: 16 }}>
                        No reviews yet. Be the first to write one!
                    </p>
                )}
            </div>
        </section>
    );
}
