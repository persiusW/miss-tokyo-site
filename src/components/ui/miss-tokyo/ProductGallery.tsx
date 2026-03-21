"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface Props {
    images: string[];
    name: string;
    badge?: string | null;
    isSale?: boolean;
}

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533'%3E%3Crect width='400' height='533' fill='%23E8D5C4'/%3E%3C/svg%3E";

const isVideo = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.m4v');
};

// Helper component to handle play/pause reliably
function ManagedVideo({ src, active, alwaysPlay = false, priority = false }: { src: string; active: boolean; alwaysPlay?: boolean; priority?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Initial mount and prop changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (active || alwaysPlay) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }, [active, alwaysPlay]);

    return (
        <video
            ref={videoRef}
            src={src}
            muted={true}
            loop={true}
            playsInline={true}
            autoPlay={active || alwaysPlay}
            preload={priority || active ? "auto" : "metadata"}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
    );
}

export function ProductGallery({ images, name, badge, isSale }: Props) {
    const imgs = images.length > 0 ? images : [FALLBACK];
    const [current, setCurrent] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const prev = () => setCurrent(i => (i - 1 + imgs.length) % imgs.length);
    const next = () => setCurrent(i => (i + 1) % imgs.length);

    const openLightbox = () => setLightboxOpen(true);
    const closeLightbox = () => setLightboxOpen(false);

    // Close lightbox on ESC
    useEffect(() => {
        if (!lightboxOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
        window.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [lightboxOpen]);

    const badgeLabel = isSale ? "Sale" : badge;
    const badgeBg = isSale ? "var(--accent, #E8485A)" : "var(--ink, #141210)";

    return (
        <>
            <div className="pdp-gallery" style={{ 
                display: "grid", 
                gridTemplateColumns: "var(--pdp-cols, 72px 1fr)", 
                gap: 10, 
                position: "sticky", 
                top: "calc(64px + 16px)" 
            }}>
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
                                border: `2px solid ${i === current ? "var(--ink, #141210)" : "transparent"}`,
                                transition: "border-color 0.18s", flexShrink: 0,
                                background: "var(--blush, #E8D5C4)", position: "relative", padding: 0,
                            }}
                        >
                            {isVideo(img) ? (
                                <ManagedVideo src={img} active={false} alwaysPlay={true} />
                            ) : (
                                <Image
                                    src={img}
                                    alt={`${name} ${i + 1}`}
                                    fill
                                    sizes="72px"
                                    loading="lazy"
                                    style={{ objectFit: "cover", transition: "transform 0.3s" }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Main image */}
                <div
                    style={{
                        position: "relative", borderRadius: 4, overflow: "hidden",
                        background: "var(--blush, #E8D5C4)", aspectRatio: "3/4",
                        cursor: "zoom-in",
                    }}
                    onClick={openLightbox}
                    role="button"
                    aria-label="Tap to zoom image"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openLightbox(); }}
                >
                    <div className="relative w-full h-full">
                        {imgs.map((img, i) => {
                            const active = i === current;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        opacity: active ? 1 : 0,
                                        transition: "opacity 0.2s ease-in-out",
                                        pointerEvents: active ? "auto" : "none",
                                        zIndex: active ? 1 : 0,
                                        visibility: active || Math.abs(current - i) <= 1 ? "visible" : "hidden" // Help with browser background task management
                                    }}
                                >
                                    {isVideo(img) ? (
                                        <ManagedVideo src={img} active={active} priority={i === 0} />
                                    ) : (
                                        <Image
                                            src={img}
                                            alt={name}
                                            fill
                                            priority={i === 0}
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            unoptimized={true}
                                            style={{
                                                objectFit: "cover"
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

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
                        pointerEvents: "none", transition: "opacity 0.2s",
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
                                onClick={e => { e.stopPropagation(); prev(); }}
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
                                onClick={e => { e.stopPropagation(); next(); }}
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

            {/* Lightbox */}
            {lightboxOpen && (
                <div
                    onClick={closeLightbox}
                    style={{
                        position: "fixed", inset: 0, zIndex: 400,
                        background: "rgba(10,8,6,0.95)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 20, backdropFilter: "blur(4px)",
                        animation: "lb-in 0.2s ease",
                    }}
                    aria-modal="true"
                    role="dialog"
                    aria-label="Image zoom view"
                >
                    <style>{`
                        @keyframes lb-in {
                            from { opacity: 0; transform: scale(0.97); }
                            to   { opacity: 1; transform: scale(1); }
                        }
                    `}</style>

                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        aria-label="Close zoom view"
                        style={{
                            position: "absolute", top: 20, right: 20,
                            width: 44, height: 44, borderRadius: "50%",
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", zIndex: 2, transition: "background 0.15s",
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.8">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    {/* Image counter */}
                    {imgs.length > 1 && (
                        <p style={{
                            position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
                            fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em",
                        }}>
                            {current + 1} / {imgs.length}
                        </p>
                    )}

                    {/* Main lightbox image */}
                    {isVideo(imgs[current]) ? (
                        <video
                            src={imgs[current]}
                            autoPlay={true}
                            muted={true}
                            loop={true}
                            playsInline={true}
                            controls={true}
                            onClick={e => e.stopPropagation()}
                            style={{
                                maxWidth: "100%", maxHeight: "90vh",
                                objectFit: "contain", borderRadius: 2,
                                boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
                            }}
                        />
                    ) : (
                        <img
                            src={imgs[current]}
                            alt={name}
                            onClick={e => e.stopPropagation()}
                            style={{
                                maxWidth: "100%", maxHeight: "90vh",
                                objectFit: "contain", borderRadius: 2,
                                boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
                            }}
                        />
                    )}

                    {/* Lightbox nav arrows */}
                    {imgs.length > 1 && (
                        <>
                            <button
                                onClick={e => { e.stopPropagation(); prev(); }}
                                aria-label="Previous image"
                                style={{
                                    position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                                    width: 44, height: 44, borderRadius: "50%",
                                    background: "rgba(255,255,255,0.12)",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", zIndex: 2,
                                }}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); next(); }}
                                aria-label="Next image"
                                style={{
                                    position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                                    width: 44, height: 44, borderRadius: "50%",
                                    background: "rgba(255,255,255,0.12)",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", zIndex: 2,
                                }}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
