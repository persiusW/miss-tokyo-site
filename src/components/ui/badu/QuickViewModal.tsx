"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ProductCheckoutForm } from "./ProductCheckoutForm";
import Image from "next/image";

export function QuickViewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from("products").select("*").eq("slug", slug).single()
            .then(({ data }: { data: any }) => {
                setProduct(data);
                setLoading(false);
            });
    }, [slug]);

    if (!slug) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row relative">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-neutral-100 rounded-full transition-colors text-black"
                >
                    <span className="sr-only">Close</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                
                {loading || !product ? (
                    <div className="w-full flex items-center justify-center p-24">
                        <p className="text-xs uppercase tracking-widest text-neutral-400">Loading...</p>
                    </div>
                ) : (
                    <>
                        {/* Image side */}
                        <div className="w-full md:w-1/2 relative bg-neutral-50 h-64 md:h-auto">
                            {product.image_urls?.[0] ? (
                                <Image 
                                    src={product.image_urls[0]} 
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-xs uppercase tracking-widest">
                                    No image
                                </div>
                            )}
                        </div>
                        
                        {/* Details side */}
                        <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
                            <h2 className="font-serif text-3xl tracking-widest uppercase mb-2">{product.name}</h2>
                            <p className="text-sm tracking-wider text-neutral-500 mb-8">{product.price_ghs} GHS</p>
                            
                            <ProductCheckoutForm
                                productId={product.id}
                                productName={product.name}
                                productSlug={product.slug}
                                productImageUrl={product.image_urls?.[0] || ""}
                                priceNum={product.price_ghs}
                                price={`${product.price_ghs} GHS`}
                                colors={product.available_colors || ["Noir", "Cognac", "Sand"]}
                                // stitching={product.available_stitching || ["Tonal", "Contrast White"]}
                                availableSizes={product.available_sizes || null}
                                onAddedToCart={onClose}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
