"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, Volume2, VolumeX, Loader2 } from "lucide-react";
import { QuickViewModal } from "@/components/ui/miss-tokyo/QuickViewModal";

interface GalleryClientProps {
    products: any[];
}

function VideoCard({ 
    product, 
    isMuted, 
    priority, 
    onOpenModal 
}: { 
    product: any, 
    isMuted: boolean, 
    priority: boolean,
    onOpenModal: (slug: string) => void
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
                if (entry.isIntersecting) {
                    videoRef.current?.play().catch(() => {});
                } else {
                    if (videoRef.current) {
                        videoRef.current.pause();
                        videoRef.current.currentTime = 0;
                    }
                }
            },
            { threshold: 0.8 }
        );

        if (videoRef.current) observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="relative h-full w-full snap-start overflow-hidden bg-neutral-900">
            {/* Loading Overlay */}
            {!isLoaded && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
                </div>
            )}

            {/* Video Layer */}
            <video
                ref={videoRef}
                src={product.video_url}
                poster={product.image_urls?.[0]}
                muted={isMuted}
                loop
                playsInline
                preload={priority ? "auto" : "metadata"}
                onCanPlayThrough={() => setIsLoaded(true)}
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}
            />

            {/* Shoppable Overlay */}
            <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-10 bg-gradient-to-t from-black/95 via-black/40 to-transparent text-white">
                <div className="flex flex-col gap-2 mb-6">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/60 font-medium">
                        {product.category_name || "New Arrival"}
                    </span>
                    <h2 className="font-serif text-2xl md:text-3xl tracking-widest uppercase leading-tight max-w-[80%]">
                        {product.name}
                    </h2>
                    <p className="text-sm font-light tracking-widest opacity-90">
                        GH₵{product.price_ghs.toFixed(2)}
                    </p>
                </div>

                {/* Action Row */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onOpenModal(product.slug)}
                        className="flex-1 bg-white text-black text-[10px] font-bold uppercase tracking-[0.2em] py-4 rounded-none hover:bg-neutral-100 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={14} /> Add to Bag
                    </button>
                    <Link 
                        href={`/products/${product.slug}`}
                        className="w-14 h-14 border border-white/20 backdrop-blur-md flex items-center justify-center group hover:bg-white hover:text-black transition-all"
                    >
                        <span className="text-[10px] font-black uppercase tracking-tighter">View</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export function GalleryClient({ products }: GalleryClientProps) {
    const [isMuted, setIsMuted] = useState(true);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

    if (!products || products.length === 0) {
        return (
            <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-black p-8 text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-widest mb-6 font-light">The video archive is currently empty.</p>
                <Link href="/shop" className="text-white text-[10px] uppercase tracking-[0.4em] font-bold border-b border-white pb-1 hover:text-white/70 transition-colors">
                    Return to Shop
                </Link>
            </div>
        );
    }

    return (
        <div className="relative bg-black h-[100dvh] overflow-hidden overscroll-none">
            {/* Header: Global UI */}
            <div className="absolute top-0 left-0 w-full z-30 p-6 md:p-10 flex items-center justify-between pointer-events-none">
                <Link href="/shop" className="text-white p-2 pointer-events-auto bg-black/20 backdrop-blur-lg rounded-full border border-white/10 hover:bg-white hover:text-black transition-all">
                    <ChevronLeft size={20} />
                </Link>
                
                <div className="flex items-center gap-4 pointer-events-auto">
                    <h1 className="text-white font-serif uppercase tracking-[0.4em] text-[10px] md:text-xs">Gallery Feed</h1>
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-white bg-black/20 backdrop-blur-lg p-3 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all shadow-xl"
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Snapping Container */}
            <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth hide-scrollbar">
                {products.map((product, index) => (
                    <VideoCard 
                        key={product.id} 
                        product={product} 
                        isMuted={isMuted}
                        priority={index < 2}
                        onOpenModal={setSelectedSlug}
                    />
                ))}
            </div>

            {/* Selection Drawer (Modal Overlay) */}
            {selectedSlug && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                    <QuickViewModal 
                        slug={selectedSlug} 
                        onClose={() => setSelectedSlug(null)} 
                    />
                </div>
            )}
        </div>
    );
}
