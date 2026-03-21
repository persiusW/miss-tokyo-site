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

function ManagedVideo({ src, active, alwaysPlay = false, priority = false }: { src: string; active: boolean; alwaysPlay?: boolean; priority?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);

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
            className="w-full h-full object-cover"
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
            {/*
             * Layout:
             *   Mobile  → flex column: [main image] then [thumb row]
             *   Desktop → CSS grid with thumbs on left, main image on right
             *             (handled by the *parent* pdp-layout in page.tsx)
             *
             * We use a flex-col wrapper here which naturally gives mobile
             * the correct order, and on md+ we switch to the sidebar grid
             * via the .pdp-gallery class in globals.css.
             */}
            <div className="pdp-gallery flex flex-col gap-2 w-full min-w-0">

                {/* ── Main image ── */}
                <div
                    className="relative w-full aspect-[3/4] overflow-hidden rounded-none md:rounded-sm bg-[var(--blush,#E8D5C4)] cursor-zoom-in"
                    onClick={openLightbox}
                    role="button"
                    aria-label="Tap to zoom image"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") openLightbox(); }}
                >
                    {/* Image stack */}
                    <div className="absolute inset-0">
                        {imgs.map((img, i) => {
                            const active = i === current;
                            return (
                                <div
                                    key={i}
                                    className="absolute inset-0 transition-opacity duration-200"
                                    style={{
                                        opacity: active ? 1 : 0,
                                        pointerEvents: active ? "auto" : "none",
                                        zIndex: active ? 1 : 0,
                                        visibility: active || Math.abs(current - i) <= 1 ? "visible" : "hidden",
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
                                            className="object-cover"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Badge */}
                    {badgeLabel && (
                        <span
                            className="absolute top-4 left-4 z-[2] text-white text-[10px] font-medium tracking-widest uppercase px-3 py-1 rounded-sm"
                            style={{ background: badgeBg }}
                        >
                            {badgeLabel}
                        </span>
                    )}

                    {/* Zoom hint */}
                    <div className="absolute bottom-4 right-4 z-[2] flex items-center gap-1 bg-black/60 text-white text-[10px] tracking-wide px-2.5 py-1.5 rounded-sm pointer-events-none">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="1.5">
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
                                className="absolute top-1/2 left-3 -translate-y-1/2 z-[2] w-9 h-9 rounded-full bg-white/88 flex items-center justify-center cursor-pointer border-none"
                                style={{ background: "rgba(255,255,255,0.88)" }}
                            >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#141210" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); next(); }}
                                aria-label="Next image"
                                className="absolute top-1/2 right-3 -translate-y-1/2 z-[2] w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none"
                                style={{ background: "rgba(255,255,255,0.88)" }}
                            >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#141210" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>

                {/* ── Thumbnail strip ── */}
                <div className="flex flex-row overflow-x-auto gap-2 px-4 md:px-0 md:flex-col hide-scrollbar w-full">
                    {imgs.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            aria-label={`View image ${i + 1}`}
                            className="flex-shrink-0 relative overflow-hidden rounded-sm p-0 cursor-pointer transition-all duration-150"
                            style={{
                                width: 60,
                                aspectRatio: "3/4",
                                background: "var(--blush, #E8D5C4)",
                                border: `2px solid ${i === current ? "var(--ink, #141210)" : "transparent"}`,
                            }}
                        >
                            {isVideo(img) ? (
                                <ManagedVideo src={img} active={false} alwaysPlay={true} />
                            ) : (
                                <Image
                                    src={img}
                                    alt={`${name} ${i + 1}`}
                                    fill
                                    sizes="64px"
                                    loading="lazy"
                                    unoptimized={true}
                                    className="object-cover"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Lightbox ── */}
            {lightboxOpen && (
                <div
                    onClick={closeLightbox}
                    className="fixed inset-0 z-[400] flex items-center justify-center p-5 bg-black/95 backdrop-blur-sm"
                    style={{ animation: "lb-in 0.2s ease" }}
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

                    {/* Close */}
                    <button
                        onClick={closeLightbox}
                        aria-label="Close zoom view"
                        className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer z-[2] transition-colors"
                        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.8">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    {/* Counter */}
                    {imgs.length > 1 && (
                        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-white/50 tracking-widest">
                            {current + 1} / {imgs.length}
                        </p>
                    )}

                    {/* Media */}
                    {isVideo(imgs[current]) ? (
                        <video
                            src={imgs[current]}
                            autoPlay muted loop playsInline controls
                            onClick={e => e.stopPropagation()}
                            className="max-w-full max-h-[90vh] object-contain rounded-sm shadow-2xl"
                        />
                    ) : (
                        <img
                            src={imgs[current]}
                            alt={name}
                            onClick={e => e.stopPropagation()}
                            className="max-w-full max-h-[90vh] object-contain rounded-sm shadow-2xl"
                        />
                    )}

                    {/* Lightbox nav */}
                    {imgs.length > 1 && (
                        <>
                            <button
                                onClick={e => { e.stopPropagation(); prev(); }}
                                aria-label="Previous image"
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer z-[2]"
                                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <button
                                onClick={e => { e.stopPropagation(); next(); }}
                                aria-label="Next image"
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer z-[2]"
                                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
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
